const express = require('express');
const router = express.Router();
const isAuth = require('../middlewares/verifyToken');
const metricsController = require('../controllers/metrics.controller');

router.get('/cycles/:machineId/:period', isAuth.verifyToken, metricsController.getCycles);
router.get('/downtime/:machineId/:period', isAuth.verifyToken, metricsController.getDowntime);

module.exports = router;