const mongoose = require('mongoose');
const Schema = mongoose.Schema;
const { PERIODS, DOWNTIME_REASONS, DOWNTIME_TYPES } = require('../utils/enums');

const downtimeRecordSchema = new Schema({
    machine: {
        type: Schema.Types.ObjectId,
        ref: 'Machine',
        required: true
    },
    startedAt: {
        type: Date,
        required: true
    },
    reasonRecorded: {
        type: Boolean,
        default: false
    },
    resolvedAt: {
        type: Date,
        default: null
    },
    downtimeType: {
        type: String,
        enum: [DOWNTIME_TYPES.PLANNED, DOWNTIME_TYPES.UNPLANNED],
        default: DOWNTIME_TYPES.UNPLANNED
    },
    reason: {
        type: String,
        enum: [
            DOWNTIME_REASONS.MAINTENANCE,
            DOWNTIME_REASONS.TOOL_CHANGE,
            DOWNTIME_REASONS.SETUP,
            DOWNTIME_REASONS.MATERIAL_WAIT,
            DOWNTIME_REASONS.BREAKDOWN,
            DOWNTIME_REASONS.FAULT,
            DOWNTIME_REASONS.MICRO_STOP,
            DOWNTIME_REASONS.OTHER
        ],
        default: DOWNTIME_REASONS.OTHER
    }
}, { timestamps: true });