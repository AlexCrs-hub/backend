const mongoose = require('mongoose');
const DowntimeRecord = require('../models/downtimeRecord.model');
const Machine = require('../models/machine.model');
const MachineRuntimeState = require('../models/machineRuntimeState.model');
const { getDateRange } = require('../services/metrics.service');
const {
    DOWNTIME_REASONS,
    DOWNTIME_TYPES,
    DOWNTIME_MIN_REPORTABLE_MS,
    DOWNTIME_REPORT_WINDOW_HOURS,
    USER_ROLES
} = require('../utils/enums');
const { sendToRole } = require('../services/notification.service');

const MAX_WINDOW_HOURS = 24 * 31;

// Window size in hours from ?hours=, clamped to a sane range
const parseHours = (value, fallback) => {
    const hours = Number(value);
    if (!Number.isFinite(hours) || hours <= 0) return fallback;
    return Math.min(hours, MAX_WINDOW_HOURS);
};

// Aggregation stages adding effectiveEnd + durationMs. A still-open record only runs
// until the machine was last heard from, so machines that stopped sending telemetry
// don't accumulate downtime forever.
const withDuration = (now) => [
    {
        $lookup: {
            from: MachineRuntimeState.collection.name,
            localField: 'machine',
            foreignField: 'machine',
            as: 'runtime'
        }
    },
    {
        $addFields: {
            effectiveEnd: {
                $ifNull: [
                    '$resolvedAt',
                    { $min: [now, { $ifNull: [{ $first: '$runtime.lastSeenAt' }, now] }] }
                ]
            }
        }
    },
    { $addFields: { durationMs: { $subtract: ['$effectiveEnd', '$startedAt'] } } },
    { $project: { runtime: 0 } }
];

const toRecordDto = (r) => ({
    _id: r._id,
    machine: r.machine,
    startedAt: r.startedAt,
    resolvedAt: r.resolvedAt,
    effectiveEnd: r.effectiveEnd,
    durationMs: r.durationMs,
    downtimeType: r.downtimeType,
    reason: r.reason,
    reasonRecorded: r.reasonRecorded
});

exports.updateReason = async (req, res) => {
    try{
        const { id } = req.params;
        const { reason, downtimeType } = req.body;

        if (!Object.values(DOWNTIME_REASONS).includes(reason)) {
            return res.status(400).json({ message: 'Invalid downtime reason' });
        }
        if (downtimeType && !Object.values(DOWNTIME_TYPES).includes(downtimeType)) {
            return res.status(400).json({ message: 'Invalid downtime type' });
        }

        const record = await DowntimeRecord.findByIdAndUpdate(
            id,
            {
                reason,
                downtimeType: downtimeType || DOWNTIME_TYPES.UNPLANNED,
                reasonRecorded: true
            },
            { new: true }
        );

        if(!record)
        {
            return res.status(404).json({ message: 'Downtime record not found' });
        }

        if (reason === DOWNTIME_REASONS.MAINTENANCE) {
            const machine = await Machine.findById(record.machine);
            if (machine) {
                await sendToRole(USER_ROLES.MAINTENANCE, machine.name);
            }
        }

        res.json(record);
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
}

exports.getUnresolved = async (req, res) => {
    try{
        const { machineId } = req.params;

        const records = await DowntimeRecord.find({
            machine: machineId,
            reasonRecorded: false
        }).sort({ startedAt: -1 });

        res.json(records);
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
}

exports.getStats = async (req, res) => {
    try {
        const { machineId, period } = req.params;
        const { start, end } = getDateRange(period);

        const records = await DowntimeRecord.find({
            machine: machineId,
            startedAt: { $gte: start, $lte: end }
        });

        const reasonCounts = records.reduce((acc, record) => {
            const reason = record.reason || DOWNTIME_REASONS.OTHER;
            acc[reason] = (acc[reason] || 0) + 1;
            return acc;
        }, {});

        const typeCounts = {
            planned: records.filter(r => r.downtimeType === DOWNTIME_TYPES.PLANNED).length,
            unplanned: records.filter(r => r.downtimeType === DOWNTIME_TYPES.UNPLANNED).length
        };

        res.json({ reasonCounts, typeCounts, total: records.length, period, machineId });
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
};

// Unreported downtime long enough to ask about, oldest first.
// GET /api/downtime-records/reportable/:machineId?hours=24
exports.getReportable = async (req, res) => {
    try {
        const { machineId } = req.params;
        if (!mongoose.Types.ObjectId.isValid(machineId)) {
            return res.status(400).json({ message: 'Invalid machineId' });
        }

        const hours = parseHours(req.query.hours, DOWNTIME_REPORT_WINDOW_HOURS);
        const now = new Date();
        const since = new Date(now.getTime() - hours * 60 * 60 * 1000);

        const records = await DowntimeRecord.aggregate([
            {
                $match: {
                    machine: new mongoose.Types.ObjectId(machineId),
                    reasonRecorded: false,
                    startedAt: { $gte: since }
                }
            },
            ...withDuration(now),
            { $match: { durationMs: { $gte: DOWNTIME_MIN_REPORTABLE_MS } } },
            { $sort: { startedAt: 1 } }
        ]);

        res.json(records.map(toRecordDto));
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
};

// Number of reportable downtimes per machine, for enabling "Report downtime" buttons.
// GET /api/downtime-records/reportable-summary?hours=24
exports.getReportableSummary = async (req, res) => {
    try {
        const hours = parseHours(req.query.hours, DOWNTIME_REPORT_WINDOW_HOURS);
        const now = new Date();
        const since = new Date(now.getTime() - hours * 60 * 60 * 1000);

        const rows = await DowntimeRecord.aggregate([
            { $match: { reasonRecorded: false, startedAt: { $gte: since } } },
            ...withDuration(now),
            { $match: { durationMs: { $gte: DOWNTIME_MIN_REPORTABLE_MS } } },
            { $group: { _id: '$machine', count: { $sum: 1 } } }
        ]);

        const counts = Object.fromEntries(rows.map((r) => [String(r._id), r.count]));
        res.json({ counts, windowHours: hours, minDurationMs: DOWNTIME_MIN_REPORTABLE_MS });
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
};

// Downtime (reported or not) overlapping the last N hours, for timelines.
// GET /api/downtime-records/timeline/:machineId?hours=24
exports.getTimeline = async (req, res) => {
    try {
        const { machineId } = req.params;
        if (!mongoose.Types.ObjectId.isValid(machineId)) {
            return res.status(400).json({ message: 'Invalid machineId' });
        }

        const hours = parseHours(req.query.hours, 24);
        const now = new Date();
        const since = new Date(now.getTime() - hours * 60 * 60 * 1000);

        const records = await DowntimeRecord.aggregate([
            {
                $match: {
                    machine: new mongoose.Types.ObjectId(machineId),
                    startedAt: { $lte: now },
                    $or: [{ resolvedAt: null }, { resolvedAt: { $gte: since } }]
                }
            },
            ...withDuration(now),
            {
                $match: {
                    effectiveEnd: { $gte: since },
                    durationMs: { $gte: DOWNTIME_MIN_REPORTABLE_MS }
                }
            },
            { $sort: { startedAt: 1 } }
        ]);

        res.json(records.map(toRecordDto));
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
};

// Downtime time split by reason within a period (all machines, or one via ?machineId=).
// Short unreported stops count as micro-stops; longer unreported ones are returned separately.
// GET /api/downtime-records/breakdown/:period?machineId=
exports.getBreakdown = async (req, res) => {
    try {
        const { period } = req.params;
        const { machineId } = req.query;
        const { start, end } = getDateRange(period);

        const match = {
            startedAt: { $lte: end },
            $or: [{ resolvedAt: null }, { resolvedAt: { $gte: start } }]
        };
        if (machineId) {
            if (!mongoose.Types.ObjectId.isValid(machineId)) {
                return res.status(400).json({ message: 'Invalid machineId' });
            }
            match.machine = new mongoose.Types.ObjectId(machineId);
        }

        const rows = await DowntimeRecord.aggregate([
            { $match: match },
            ...withDuration(end),
            {
                $addFields: {
                    // only the part of the downtime that falls inside the period
                    clippedMs: {
                        $subtract: [
                            { $min: ['$effectiveEnd', end] },
                            { $max: ['$startedAt', start] }
                        ]
                    }
                }
            },
            { $match: { clippedMs: { $gt: 0 } } },
            {
                $addFields: {
                    bucket: {
                        $cond: [
                            '$reasonRecorded',
                            '$reason',
                            {
                                $cond: [
                                    { $lt: ['$durationMs', DOWNTIME_MIN_REPORTABLE_MS] },
                                    DOWNTIME_REASONS.MICRO_STOP,
                                    'unreported'
                                ]
                            }
                        ]
                    }
                }
            },
            {
                $group: {
                    _id: { bucket: '$bucket', type: { $cond: ['$reasonRecorded', '$downtimeType', null] } },
                    ms: { $sum: '$clippedMs' },
                    count: { $sum: 1 }
                }
            }
        ]);

        const byReason = {};
        const typeMs = { planned: 0, unplanned: 0 };
        let unreported = { ms: 0, count: 0 };
        let totalMs = 0;

        rows.forEach(({ _id, ms, count }) => {
            totalMs += ms;
            if (_id.bucket === 'unreported') {
                unreported = { ms: unreported.ms + ms, count: unreported.count + count };
                return;
            }
            const entry = byReason[_id.bucket] || { reason: _id.bucket, ms: 0, count: 0 };
            entry.ms += ms;
            entry.count += count;
            byReason[_id.bucket] = entry;
            if (_id.type === DOWNTIME_TYPES.PLANNED) typeMs.planned += ms;
            else if (_id.type === DOWNTIME_TYPES.UNPLANNED) typeMs.unplanned += ms;
        });

        res.json({
            period,
            machineId: machineId || null,
            from: start,
            to: end,
            totalMs,
            reasons: Object.values(byReason).sort((a, b) => b.ms - a.ms),
            unreported,
            typeMs,
            minDurationMs: DOWNTIME_MIN_REPORTABLE_MS
        });
    } catch (err) {
        const status = /Invalid period/.test(err.message) ? 400 : 500;
        res.status(status).json({ message: err.message });
    }
};
