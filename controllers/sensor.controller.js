const Sensor = require('../models/sensor.model');

// Get all sensors
exports.getAllSensors = async (req, res) => {
    try {
        const sensors = await Sensor.find();
        res.status(200).json(sensors);
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
};

exports.getSensorsByMachine = async (req, res) => {
    try {
        const sensors = await Sensor.find({ machineId: req.params.machineId });
        res.status(200).json(sensors);
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
};

// Get a single sensor by ID
exports.getSensorById = async (req, res) => {
    try {
        const sensor = await Sensor.findById(req.params.id);
        if (!sensor) return res.status(404).json({ message: 'Sensor not found' });
        res.json(sensor);
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
};

// Create a new sensor
exports.createSensor = async (req, res) => {
    const sensor = new Sensor(req.body);
    try {
        const newSensor = await sensor.save();
        res.status(201).json({newSensor});
    } catch (err) {
        res.status(400).json({ message: err.message });
    }
};

// Update a sensor
exports.updateSensor = async (req, res) => {
    try {
        const updatedSensor = await Sensor.findByIdAndUpdate(
            req.params.id,
            req.body,
            { new: true, runValidators: true }
        );
        if (!updatedSensor) return res.status(404).json({ message: 'Sensor not found' });
        res.json(updatedSensor);
    } catch (err) {
        res.status(400).json({ message: err.message });
    }
};

// Delete a sensor
exports.deleteSensor = async (req, res) => {
    try {
        const deletedSensor = await Sensor.findByIdAndDelete(req.params.id);
        if (!deletedSensor) return res.status(404).json({ message: 'Sensor not found' });
        res.json({ message: 'Sensor deleted' });
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
};