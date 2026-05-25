const express = require('express');
const downtimeRecordController = require('../controllers/downtimeRecord.controller');
const isAuth = require('../middlewares/verifyToken');
const router = express.Router();

router.patch('/:id/reason', isAuth.verifyToken,downtimeRecordController.updateReason);
router.get('/unresolved/:machineId', isAuth.verifyToken,downtimeRecordController.getUnresolved);
router.get('/stats/:machineId/:period', isAuth.verifyToken,downtimeRecordController.getStats);

module.exports = router;