const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const workIntervalSchema = new Schema({
    machine: {
        type: Schema.Types.ObjectId,
        ref: 'Machine',
        required: true
    },
    startedAt: {
        type: Date,
        required: true
    },
    stoppedAt: {
        type: Date,
        default: null
    }
}, { timestamps: true });