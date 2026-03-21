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
    const machineId = req.params.machineId;
    try {
        const { sensorName, measurement, measuredAt } = req.body;

        // Find the sensor by name and machineId
        const sensor = await Sensor.findOne({ name: sensorName, machine: machineId });

        if (!sensor) {
            return res.status(404).json({ message: 'Sensor not found' });
        }

        // Create the reading with the sensor's id
        const reading = new Reading({
            sensor: sensor._id,
            measurement,
            measuredAt: measuredAt ? new Date(measuredAt) : new Date()
        });

        const newReading = await reading.save();
        res.status(201).json(newReading);
    } catch (err) {
        res.status(400).json({ message: err.message });
    }
};

exports.getReadingsLast24Hours = async (req, res) => {
    try {
        const sensorId = req.params.sensorId;
        const since = new Date(Date.now() - 24 * 60 * 60 * 1000);

        const readings = await Reading.find({ sensor: sensorId, measuredAt: { $gte: since } })
            .sort({ measuredAt: 1 });

        res.json(readings);
    } catch (err) {
        res.status(500).json({ message: err.message });
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

exports.getDailyConsumptionLast7Days = async (req, res) => {
    try {
        const sensorId = req.params.sensorId;

        // Find the sensor and check if its unit is kW
        const sensor = await Sensor.findById(sensorId);
        if (!sensor) {
            return res.status(404).json({ message: 'Sensor not found' });
        }
        if (sensor.unit !== 'kW') {
            return res.status(400).json({ message: 'Sensor unit is not kW' });
        }

        // Build the last 7 days array (starting from 6 days ago up to today)
        const days = [];
        for (let i = 6; i >= 0; i--) {
            const date = new Date();
            date.setDate(date.getDate() - i);
            days.push(date);
        }

        // Fetch readings for the last 7 days
        const since = new Date(days[0]);
        since.setHours(0, 0, 0, 0);
        const readings = await Reading.find({
            sensor: sensorId,
            measuredAt: { $gte: since }
        }).sort({ measuredAt: 1 });

        // Group readings by day and sum measurements
        const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
        const kwData = days.map(day => {
            const dayStart = new Date(day);
            dayStart.setHours(0, 0, 0, 0);
            const dayEnd = new Date(day);
            dayEnd.setHours(23, 59, 59, 999);

            const dailyTotal = readings
                .filter(r => r.measuredAt >= dayStart && r.measuredAt <= dayEnd)
                .reduce((sum, r) => sum + r.measurement, 0);

            return {
                name: dayNames[day.getDay()],
                kw: dailyTotal
            };
        });

        res.json(kwData);
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
};