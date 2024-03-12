import AppController from '../controllers/AppController';
import UsersController from '../controllers/UsersController';

const express = require('express');

const router = (app) => {
  const paths = express.Router();
  app.use(express.json());
  app.use('/', paths);

  paths.get('/status', ((request, response) => AppController.getStatus(request, response)));
  paths.get('/stats', ((request, response) => AppController.getStats(request, response)));
  paths.post('/users', ((request, response) => UsersController.postNew(request, response)));
};

export default router;
