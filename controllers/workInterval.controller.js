const WorkInterval = require('../models/workInterval.model');

exports.start = async (req, res) => {
    try {
        console.log("WORK INTERVAL STARTED");
        const { machineId } = req.params;

        // Check if there's already an open interval
        const existing = await WorkInterval.findOne({
            machine: machineId,
            stoppedAt: null
        });

        if (existing) {
            return res.status(400).json({ message: 'Machine already has an active work interval' });
        }

        const interval = await WorkInterval.create({
            machine: machineId,
            startedAt: new Date()
        });

        res.status(201).json(interval);
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
};

exports.stop = async (req, res) => {
    try {
        const { machineId } = req.params;
        console.log("WORK INTERVAL STOPPED");

        const interval = await WorkInterval.findOneAndUpdate(
            { machine: machineId, stoppedAt: null },
            { stoppedAt: new Date() },
            { new: true }
        );

        if (!interval) {
            return res.status(404).json({ message: 'No active work interval found for this machine' });
        }

        res.json(interval);
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
};