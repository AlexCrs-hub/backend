const DowntimeRecord = require('../models/downtimeRecord.model');
const Machine = require('../models/machine.model');
const { getDateRange } = require('../services/metrics.service');
const { DOWNTIME_REASONS, DOWNTIME_TYPES, USER_ROLES } = require('../utils/enums');
const { sendToRole } = require('../services/notification.service');

exports.updateReason = async (req, res) => {
    try{
        const { id } = req.params;
        const { reason, downtimeType } = req.body;

        const record = await DowntimeRecord.findByIdAndUpdate(
            id,
            {
                reason,
                downtimeType,
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