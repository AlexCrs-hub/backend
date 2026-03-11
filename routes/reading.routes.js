const express = require('express');
const readingController = require('../controllers/reading.controller');
const isAuth = require('../middlewares/verifyToken');
const serviceAuth = require('../middlewares/serviceAuth');

const router = express.Router();

router.get('/', isAuth.verifyToken, readingController.getAllReadings);
router.post('/:machineId', serviceAuth.verifyServiceKey, readingController.createReading);
router.get('/:sensorId', isAuth.verifyToken, readingController.getReadingsBySensor);

module.exports = router;