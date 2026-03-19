const express = require('express');
const sensorController = require('../controllers/sensor.controller');
const isAuth = require('../middlewares/verifyToken');
const serviceAuth = require('../middlewares/serviceAuth');
const eitherAuth = require('../middlewares/eitherAuth');

const router = express.Router();

// Get all sensors
router.get('/', isAuth.verifyToken, sensorController.getAllSensors);

//get by name 
router.get('/by-name', serviceAuth.verifyServiceKey, sensorController.getSensorByName);

// Create a new sensor
router.post('/', serviceAuth.verifyServiceKey, sensorController.createSensor);

// Update a sensor
router.put('/:id', isAuth.verifyToken, sensorController.updateSensor);

// Delete a sensor
router.delete('/:id', isAuth.verifyToken, sensorController.deleteSensor);

// Get a single sensor by ID
router.get('/:id', isAuth.verifyToken, sensorController.getSensorById);

// Get sensors by machine ID
router.get('/machine/:machineId', eitherAuth.eitherAuth, sensorController.getSensorsByMachine);

module.exports = router;