const express = require('express');
const readingController = require('../controllers/reading.controller');
const isAuth = require('../middlewares/verifyToken');
const serviceAuth = require('../middlewares/serviceAuth');

const router = express.Router();

router.get('/', isAuth.verifyToken, readingController.getAllReadings);
// Windowed raw readings for scrollable charts. Must precede '/:sensorId'.
router.get('/window', isAuth.verifyToken, readingController.getReadingsWindow);
router.get('/:sensorId/last24h', isAuth.verifyToken, readingController.getReadingsLast24Hours);
router.post('/:machineId', serviceAuth.verifyServiceKey, readingController.createReading);
router.get('/:sensorId', isAuth.verifyToken, readingController.getReadingsBySensor);
router.get('/daily-consumption/:sensorId', isAuth.verifyToken, readingController.getDailyConsumptionLast7Days);

module.exports = router;