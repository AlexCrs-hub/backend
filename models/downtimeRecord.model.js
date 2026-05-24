const mongoose = require('mongoose');
const Schema = mongoose.Schema;

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
    resolvedAt: {
        type: Date,
        default: null
    },
    downtimeType: {
        type: String,
        enum: ['PLANNED', 'UNPLANNED'],
        default: 'UNPLANNED'
    },
    reason: {
        type: String,
        enum: [
            'MAINTENANCE',
            'TOOL_CHANGE',
            'SETUP',
            'MATERIAL_WAIT',
            'BREAKDOWN',
            'FAULT',
            'MICRO_STOP',
            'OTHER'
        ],
        default: 'OTHER'
    }
}, { timestamps: true });