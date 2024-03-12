import express from 'express';
import AppController from '../controllers/AppController';
import AuthController from '../controllers/AuthController';
import FilesController from '../controllers/FilesController';

function controllerRouting(app) {
    const router = express.Router();
    app.use('/', router);
  
    router.get('/status', (req, res) => {
      AppController.getStatus(req, res);
    });
  
    router.get('/stats', (req, res) => {
      AppController.getStats(req, res);
    });

    router.get('/connect', (req, res) => {
        AuthController.getConnect(req, res);
      });
    
      router.get('/disconnect', (req, res) => {
        AuthController.getDisconnect(req, res);
      })};
