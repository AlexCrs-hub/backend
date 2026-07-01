const mongoose = require('mongoose');
const Reading = require('../models/reading.model');
const Sensor = require('../models/sensor.model');
const Machine = require('../models/machine.model');
const DowntimeRecord = require('../models/downtimeRecord.model');
const { notifyOnDowntime, resolveDowntimeNotification } = require('../services/notification.service');

const DEFAULT_WINDOW_LIMIT = 2000;
const MAX_WINDOW_LIMIT = 5000;
// Server-side downsample cap for the 24h endpoint (was returning every raw point).
const MAX_LAST24H_POINTS = 500;

// FIXME: Deprecated
// Get all readings
exports.getAllReadings = async (req, res) => {
    try {
        const readings = await Reading.find();
        res.json(readings);
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
};

// Java should no longer call this.
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

        // Fetch machine config for threshold
        const machine = await Machine.findById(machineId);
        if (machine) {
            if (measurement <= machine.downtimeThreshold) {
                const existingRecord = await DowntimeRecord.findOne({
                    machine: machineId,
                    resolvedAt: null
                });

                if (!existingRecord) {
                    const newRecord = await DowntimeRecord.create({
                        machine: machineId,
                        startedAt: new Date(measuredAt)
                    });
                    console.log(`New downtime started for machine ${machine.name}, sending notification`);
                    await notifyOnDowntime(machineId, machine.name, newRecord._id);
                }
            } else {
                await DowntimeRecord.findOneAndUpdate(
                    { machine: machineId, resolvedAt: null },
                    { resolvedAt: new Date(measuredAt) }
                );
            }
        }

        res.status(201).json(newReading);
    } catch (err) {
        res.status(400).json({ message: err.message });
    }
};

// Returns the last 24h of readings for a sensor, downsampled server-side to at
// most MAX_LAST24H_POINTS evenly-distributed points. Response shape is unchanged
// (an array of { measuredAt, measurement }) so existing clients keep working —
// they just receive far fewer points, which is the bottleneck on load.
exports.getReadingsLast24Hours = async (req, res) => {
    try {
        const sensorId = req.params.sensorId;
        if (!mongoose.Types.ObjectId.isValid(sensorId)) {
            return res.status(400).json({ message: 'Invalid sensorId' });
        }
        const since = new Date(Date.now() - 24 * 60 * 60 * 1000);

        const readings = await Reading.aggregate([
            {
                $match: {
                    sensor: new mongoose.Types.ObjectId(sensorId),
                    measuredAt: { $gte: since },
                },
            },
            {
                // Distribute readings across up to N time-ordered buckets and
                // average each bucket — cheap, indexed, and bounded payload.
                $bucketAuto: {
                    groupBy: '$measuredAt',
                    buckets: MAX_LAST24H_POINTS,
                    output: {
                        measuredAt: { $min: '$measuredAt' },
                        measurement: { $avg: '$measurement' },
                    },
                },
            },
            { $sort: { measuredAt: 1 } },
            { $project: { _id: 0, measuredAt: 1, measurement: 1 } },
        ]);

        res.json(readings);
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
};

// FIXME: Deprecated
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

/**
 * 
 * the below method currently incorrectly sums kW values.

FIXME!: Replace the daily sum logic with kWh integration later, or this needs to be deprecated and use metric buckets instead
 */
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

/**
 * Windowed raw readings for a single sensor.
 * GET /api/readings/window?sensorId=&from=&to=&limit=&order=
 *
 * Returns full-fidelity points for a bounded time window (zoomed-in chart view).
 * If the window contains more points than `limit`, `truncated` is true — the
 * client should switch to the aggregated /metrics/timeseries endpoint instead.
 */
exports.getReadingsWindow = async (req, res) => {
    try {
        const { sensorId, from, to } = req.query;

        if (!sensorId) {
            return res.status(400).json({ message: "Query parameter 'sensorId' is required" });
        }

        const sensor = await Sensor.findById(sensorId);
        if (!sensor) {
            return res.status(404).json({ message: 'Sensor not found' });
        }

        const query = { sensor: sensorId };
        const range = {};

        if (from !== undefined) {
            const fromDate = new Date(from);
            if (Number.isNaN(fromDate.getTime())) {
                return res.status(400).json({ message: "Invalid 'from' timestamp" });
            }
            range.$gte = fromDate;
        }
        if (to !== undefined) {
            const toDate = new Date(to);
            if (Number.isNaN(toDate.getTime())) {
                return res.status(400).json({ message: "Invalid 'to' timestamp" });
            }
            range.$lte = toDate;
        }
        if (Object.keys(range).length > 0) {
            query.measuredAt = range;
        }

        const order = req.query.order === 'desc' ? -1 : 1;

        let limit = parseInt(req.query.limit, 10);
        if (Number.isNaN(limit) || limit <= 0) {
            limit = DEFAULT_WINDOW_LIMIT;
        }
        limit = Math.min(limit, MAX_WINDOW_LIMIT);

        // Fetch one extra to detect truncation without a separate count query.
        const docs = await Reading.find(query)
            .sort({ measuredAt: order })
            .limit(limit + 1)
            .lean();

        const truncated = docs.length > limit;
        const sliced = truncated ? docs.slice(0, limit) : docs;

        const points = sliced.map(r => ({
            t: new Date(r.measuredAt).getTime(),
            v: r.measurement
        }));

        res.json({
            sensorId,
            machineId: sensor.machine,
            unit: sensor.unit,
            from: from || null,
            to: to || null,
            order: order === 1 ? 'asc' : 'desc',
            count: points.length,
            truncated,
            points
        });
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
};