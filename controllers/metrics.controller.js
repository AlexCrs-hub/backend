const {
  getTotalDowntime,
  getCycleCount,
  getUtilisation,
  getCuttingTime,
  getPlannedUnplannedDowntime,
  getMetricSummary,
  getPowerTimeSeries,
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

// Downsampled power time-series for scrollable historical charts.
// GET /api/metrics/timeseries/:machineId?from=&to=&granularity=minute|hour|day
exports.getTimeSeries = async (req, res) => {
  try {
    const { machineId } = req.params;
    const { from, to, granularity = "minute" } = req.query;

    const allowed = ["minute", "hour", "day"];
    if (!allowed.includes(granularity)) {
      return res
        .status(400)
        .json({ message: `granularity must be one of: ${allowed.join(", ")}` });
    }

    const toDate = to ? new Date(to) : new Date();
    const fromDate = from
      ? new Date(from)
      : new Date(toDate.getTime() - 24 * 60 * 60 * 1000);

    if (Number.isNaN(fromDate.getTime()) || Number.isNaN(toDate.getTime())) {
      return res.status(400).json({ message: "Invalid 'from' or 'to' timestamp" });
    }
    if (fromDate > toDate) {
      return res.status(400).json({ message: "'from' must be before 'to'" });
    }

    const result = await getPowerTimeSeries(machineId, {
      from: fromDate,
      to: toDate,
      granularity,
    });
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
