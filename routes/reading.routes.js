const express = require('express');
const readingController = require('../controllers/reading.controller');

const router = express.Router();

// Controller functions (replace with your actual controller)

// Get all readings
router.get('/', readingController.getAllReadings);

// Create a new reading
router.post('/', readingController.createReading);


module.exports = router;