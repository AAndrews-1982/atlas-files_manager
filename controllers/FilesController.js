import { v4 as uuidv4 } from 'uuid';
import RedisClient from '../utils/redis';
import DBClient from '../utils/db';

const { ObjectId } = require('mongodb');
const fs = require('fs');
const Bull = require('bull');

async function getUser(request, response) {
  const token = request.header('X-Token') || null;
  if (!token) {
    response.status(401).send('Unauthorized');
    return null;
  }

  const redisToken = await RedisClient.get(`auth_${token}`);
  if (!redisToken) {
    response.status(401).send({ error: 'Unauthorized' });
    return null;
  }

  const user = await DBClient.db
    .collection('users')
    .findOne({ _id: ObjectId(redisToken) });
  if (!user) {
    response.status(401).send({ error: 'Unauthorized' });
    return null;
  }

  return user;
}

class FilesController {
  static async postUpload(request, response) {
    const fileQueue = new Bull('fileQueue');

    const token = request.header('X-Token') || null;
    if (!token) return response.status(401).send({ error: 'Unauthorized' });

    const redisToken = await RedisClient.get(`auth_${token}`);
    if (!redisToken) return response.status(401).send({ error: 'Unauthorized' });

    const user = await DBClient.db.collection('users').findOne({ _id: ObjectId(redisToken) });
    if (!user) return response.status(401).send({ error: 'Unauthorized' });

    const fileName = request.body.name;
    if (!fileName) return response.status(400).send({ error: 'Missing name' });

    const fileType = request.body.type;
    if (!fileType || !['folder', 'file', 'image'].includes(fileType)) return response.status(400).send({ error: 'Missing type' });

    const fileData = request.body.data;
    if (!fileData && ['file', 'image'].includes(fileType)) return response.status(400).send({ error: 'Missing data' });

    const fileIsPublic = request.body.isPublic || false;
    let fileParentId = request.body.parentId || 0;
    fileParentId = fileParentId === '0' ? 0 : fileParentId;
    if (fileParentId !== 0) {
      const parentFile = await DBClient.db.collection('files').findOne({ _id: ObjectId(fileParentId) });
      if (!parentFile) return response.status(400).send({ error: 'Parent not found' });
      if (!['folder'].includes(parentFile.type)) return response.status(400).send({ error: 'Parent is not a folder' });
    }

    const fileDataDb = {
      userId: user._id,
      name: fileName,
      type: fileType,
      isPublic: fileIsPublic,
      parentId: fileParentId,
    };

    if (['folder'].includes(fileType)) {
      await DBClient.db.collection('files').insertOne(fileDataDb);
      return response.status(201).send({
        id: fileDataDb._id,
        userId: fileDataDb.userId,
        name: fileDataDb.name,
        type: fileDataDb.type,
        isPublic: fileDataDb.isPublic,
        parentId: fileDataDb.parentId,
      });
    }

    const pathDir = process.env.FOLDER_PATH || '/tmp/files_manager';
    const fileUuid = uuidv4();

    const buff = Buffer.from(fileData, 'base64');
    const pathFile = `${pathDir}/${fileUuid}`;

    await fs.mkdir(pathDir, { recursive: true }, (error) => {
      if (error) return response.status(400).send({ error: error.message });
      return true;
    });

    await fs.writeFile(pathFile, buff, (error) => {
      if (error) return response.status(400).send({ error: error.message });
      return true;
    });

    fileDataDb.localPath = pathFile;
    await DBClient.db.collection('files').insertOne(fileDataDb);

    fileQueue.add({
      userId: fileDataDb.userId,
      fileId: fileDataDb._id,
    });

    return response.status(201).send({
      id: fileDataDb._id,
      userId: fileDataDb.userId,
      name: fileDataDb.name,
      type: fileDataDb.type,
      isPublic: fileDataDb.isPublic,
      parentId: fileDataDb.parentId,
    });
  }

  /*
   * Retrieves a file document based on a given ID
   */
  static async getShow(request, response) {
    const imgId = request.params.id;
    const user = await getUser(request, response);
    if (!(user || imgId)) return false;

    const file = await DBClient.db.collection('files').findOne({
      userId: { $eq: user._id },
      _id: { $eq: ObjectId(imgId) },
    });

    if (!file) return response.status(404).send({ error: 'Not found' });
    return response.status(200).send(file);
  }

  /*
   * Gets a file document based on a passed parentid
   */
  static async getIndex(request, response) {
    const itemsPerPage = 20;
    const pagination = parseInt(request.query.page, 10) + 1 || 1;
    let parentId = '';
    const fileCollection = await DBClient.db.collection('files');
    const user = await getUser(request, response);
    if (!user) return;

    try {
      if (request.query.parentId) {
        parentId = ObjectId(request.query.parentId);
      } else {
        parentId = '0';
      }
    } catch (error) {
      parentId = '0';
    }

    console.log(parentId);

    const aggregationPipeline = [
      { $match: { parentId: { $eq: parentId } } },
      {
        $facet: {
          paginatedResults: [
            { $skip: (pagination - 1) * itemsPerPage },
            { $limit: itemsPerPage },
          ],
        },
      },
    ];

    const initRes = await fileCollection
      .aggregate(aggregationPipeline)
      .toArray();

    const results = [];
    for (const r of initRes[0].paginatedResults) {
      const newRes = { ...r };
      newRes.id = r._id;
      delete newRes._id;
      results.push(newRes);
    }

    // console.log(await DBClient.db.collection('files').find({}).toArray());
    console.log(results, initRes[0].paginatedResults);
    response.status(200).send(results);
  }
}

 // Endpoint to set isPublic to true
  static async putPublish(request, response) {
    const user = await getUser(request);
    if (!user) {
      return response.status(401).send({ error: 'Unauthorized' });
    }

    const fileId = request.params.id;
    const file = await DBClient.db.collection('files').findOneAndUpdate(
      { _id: ObjectId(fileId), userId: user._id },
      { $set: { isPublic: true } },
      { returnOriginal: false }
    );

    if (!file.value) {
      return response.status(404).send({ error: 'Not found' });
    }

    response.status(200).send(file.value);
  }

  // Endpoint to set isPublic to false
  static async putUnpublish(request, response) {
    const user = await getUser(request);
    if (!user) {
      return response.status(401).send({ error: 'Unauthorized' });
    }

    const fileId = request.params.id;
    const file = await DBClient.db.collection('files').findOneAndUpdate(
      { _id: ObjectId(fileId), userId: user._id },
      { $set: { isPublic: false } },
      { returnOriginal: false }
    );

    if (!file.value) {
      return response.status(404).send({ error: 'Not found' });
    }

    response.status(200).send(file.value);
  }
}

 // Endpoint to set isPublic to true
  static async putPublish(request, response) {
    const user = await getUser(request);
    if (!user) {
      return response.status(401).send({ error: 'Unauthorized' });
    }

    const fileId = request.params.id;
    const file = await DBClient.db.collection('files').findOneAndUpdate(
      { _id: ObjectId(fileId), userId: user._id },
      { $set: { isPublic: true } },
      { returnOriginal: false }
    );

    if (!file.value) {
      return response.status(404).send({ error: 'Not found' });
    }

    response.status(200).send(file.value);
  }

module.exports = FilesController;
