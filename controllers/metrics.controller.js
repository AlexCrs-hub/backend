const { getTotalDowntime, getCycleCount } = require('../services/metrics.service');

exports.getCycles = async (req, res) => {
    try {
        const { machineId, period } = req.params;
        const result = await getCycleCount(machineId, period);
        res.json(result);
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
};

exports.getDowntime = async (req, res) => {
    try {
        const { machineId, period } = req.params;
        const result = await getTotalDowntime(machineId, period);
        res.json(result);
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
};

exports.getUtilization = async (req, res) => {
    try {
        const { machineId, period } = req.params;
        const result = await getUtilization(machineId, period);
        res.json(result);
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
};

exports.getCuttingAndIdleTime = async (req, res) => {
    try {
        const { machineId, period } = req.params;
        const result = await getCuttingAndIdleTime(machineId, period);
        res.json(result);
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
};
