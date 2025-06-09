const Reading = require('../models/reading.model');

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
        const newReading = await reading.save();
        res.status(201).json(newReading);
    } catch (err) {
        res.status(400).json({ message: err.message });
    }
};