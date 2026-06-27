const express = require('express');
const router = express.Router();
const isAuth = require('../middlewares/verifyToken');
const metricsController = require('../controllers/metrics.controller');

// deprecated: kept for compatibiity
router.get('/cycles/:machineId/:period', isAuth.verifyToken, metricsController.getCycles);
router.get('/downtime/:machineId/:period', isAuth.verifyToken, metricsController.getDowntime);
router.get('/utilization/:machineId/:period', isAuth.verifyToken, metricsController.getUtilisation);
router.get('/cutting/:machineId/:period', isAuth.verifyToken, metricsController.getCuttingTime);
router.get('/planned-unplanned/:machineId/:period', isAuth.verifyToken, metricsController.getPlannedUnplannedDowntime);

// the new V2 a single summary endpoint for all metrics
router.get(
  "/summary/:machineId/:period",
  isAuth.verifyToken,
  metricsController.getSummary,
);

module.exports = router;