import sha1 from 'sha1';
import DBClient from '../utils/db';

const Bull = require('bull');

class UsersController {
  static async postNew(request, response) {
    const userQueue = new Bull('userQueue');

    const userEmail = request.body.email;
    if (!userEmail) return response.status(400).send({ error: 'Missing email' });

    const userPassword = request.body.password;
    if (!userPassword) return response.status(400).send({ error: 'Missing password' });

    const oldUserEmail = await DBClient.db.collection('users').findOne({ email: userEmail });
    if (oldUserEmail) return response.status(400).send({ error: 'Already exist' });

    const shaUserPassword = sha1(userPassword);
    const result = await DBClient.db.collection('users').insertOne({ email: userEmail, password: shaUserPassword });

    userQueue.add({
      userId: result.insertedId,
    });

    return response.status(201).send({ id: result.insertedId, email: userEmail });
  }
}

module.exports = UsersController;
