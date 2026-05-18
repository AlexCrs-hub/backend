const { getCycleCount } = require('../services/metrics.service');

exports.getCycles = async (req, res) => {
    try {
        const { machineId, period } = req.params;
        const result = await getCycleCount(machineId, period);
        res.json(result);
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
};