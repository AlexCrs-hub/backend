const Reading = require('../models/reading.model');
const Sensor = require('../models/sensor.model');

// Get all readings
exports.getAllReadings = async (req, res) => {
    try {
        const readings = await Reading.find();
        res.json(readings);
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
};

// Create a new reading
exports.createReading = async (req, res) => {
    const reading = new Reading(req.body);
    try {
        const { sensorName, measurement } = req.body;

        // Find the sensor by name
        const sensor = await Sensor.findOne({ name: sensorName });
        if (!sensor) {
            return res.status(404).json({ message: 'Sensor not found' });
        }

        // Create the reading with the sensor's id
        const reading = new Reading({
            sensor: sensor._id,
            measurement
        });

        const newReading = await reading.save();
        res.status(201).json(newReading);
    } catch (err) {
        res.status(400).json({ message: err.message });
    }
};

// Get all readings for a specific sensor
exports.getReadingsBySensor = async (req, res) => {
    try {
        const sensorId = req.params.sensorId;
        const readings = await Reading.find({ sensor: sensorId });
        res.json(readings);
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
};