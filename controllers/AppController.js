const { isRedisAlive, isDbAlive, countUsers, countFiles } = require('./utils');

const AppController = {
  getStatus: async (req, res) => {
    try {
      const redisAlive = await isRedisAlive();
      const dbAlive = await isDbAlive();

      res.status(200).json({ redis: redisAlive, db: dbAlive });
    } catch (error) {
      res.status(500).json({ error: 'Internal Server Error' });
    }
  },

  getStats: async (req, res) => {
    try {
      const userCount = await countUsers();
      const fileCount = await countFiles();

      res.status(200).json({ users: userCount, files: fileCount });
    } catch (error) {
      res.status(500).json({ error: 'Internal Server Error' });
    }
  }
};

module.exports = AppController;
