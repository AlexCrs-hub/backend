const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const machineSchema = new Schema({
    name: {
        type: String,
        required: true
    },
    lineId: {
        type: Schema.Types.ObjectId,
        ref: 'Line',
        required: false
    },
    maxPowerConsumption: { type: Number, required: true }, // max possible power
    downtimeThreshold: {type: Number, required: false, default: 0.1},
    cuttingThreshold: { type: Number, default: null }
});

module.exports = mongoose.model('Machine', machineSchema);