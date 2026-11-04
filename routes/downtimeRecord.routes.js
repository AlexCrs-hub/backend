const express = require('express');
const downtimeRecordController = require('../controllers/downtimeRecord.controller');
const isAuth = require('../middlewares/verifyToken');
const router = express.Router();

router.patch('/:id/reason', isAuth.verifyToken,downtimeRecordController.updateReason);
router.get('/unresolved/:machineId', isAuth.verifyToken,downtimeRecordController.getUnresolved);
router.get('/stats/:machineId/:period', isAuth.verifyToken,downtimeRecordController.getStats);
router.get('/reportable-summary', isAuth.verifyToken, downtimeRecordController.getReportableSummary);
router.get('/reportable/:machineId', isAuth.verifyToken, downtimeRecordController.getReportable);
router.get('/timeline/:machineId', isAuth.verifyToken, downtimeRecordController.getTimeline);
router.get('/breakdown/:period', isAuth.verifyToken, downtimeRecordController.getBreakdown);

module.exports = router;