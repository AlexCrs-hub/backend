const express = require('express');
const readingController = require('../controllers/reading.controller');
const isAuth = require('../middlewares/verifyToken');

const router = express.Router();

// Controller functions (replace with your actual controller)

router.get('/', isAuth.verifyToken, readingController.getAllReadings);
router.post('/', readingController.createReading);
router.get('/:sensorId', isAuth.verifyToken, readingController.getReadingsBySensor);

module.exports = router;