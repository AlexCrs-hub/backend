const {
  getTotalDowntime,
  getCycleCount,
  getUtilisation,
  getCuttingTime,
  getPlannedUnplannedDowntime,
  getMetricSummary,
} = require("../services/metrics.service");

// the new V2 summary metrics method
exports.getSummary = async (req, res) => {
  try {
    const { machineId, period } = req.params;
    const result = await getMetricSummary(machineId, period);
    res.json(result);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

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

exports.getUtilisation = async (req, res) => {
    try {
        const { machineId, period } = req.params;
        const result = await getUtilisation(machineId, period);
        res.json(result);
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
};

exports.getCuttingTime = async (req, res) => {
    try {
        const { machineId, period } = req.params;
        const result = await getCuttingTime(machineId, period);
        res.json(result);
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
};

exports.getPlannedUnplannedDowntime = async (req, res) => {
    try {
        const { machineId, period } = req.params;
        const result = await getPlannedUnplannedDowntime(machineId, period);
        res.json(result);
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
};
