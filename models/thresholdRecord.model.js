const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const thresholdRecordSchema = new Schema({
    machine: {
        type: Schema.Types.ObjectId,
        ref: 'Machine',
        required: true
    },
    cuttingThreshold: {
        type: Number,
        required: true
    },
    downtimeThreshold: {
        type: Number,
        required: true
    },
    detectedAt: {
        type: Date,
        default: Date.now
    }
}, { timestamps: true });

module.exports = mongoose.model('ThresholdRecord', thresholdRecordSchema);