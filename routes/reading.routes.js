const express = require('express');
const readingController = require('../controllers/reading.controller');
const isAuth = require('../middlewares/verifyToken');

const router = express.Router();

// Controller functions (replace with your actual controller)

// Get all readings
router.get('/', isAuth.verifyToken, readingController.getAllReadings);

// Create a new reading
router.post('/', readingController.createReading);


module.exports = router;