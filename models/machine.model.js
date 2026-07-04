const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const machineSchema = new Schema({
    name: {
        type: String,
        required: true
    },
    // Hardware / MQTT identifier (e.g. "Machine_Pipe_5"). Incoming measurements
    // are matched on this, so `name` is free to be a friendly display value.
    mqttName: {
        type: String,
        unique: true,
        sparse: true,
        index: true
    },
    lineId: {
        type: Schema.Types.ObjectId,
        ref: 'Line',
        required: false
    },
    // Not required so machines can be auto-provisioned from telemetry; set later.
    maxPowerConsumption: { type: Number, required: false, default: 0 }, // max possible power
    downtimeThreshold: {type: Number, required: false, default: 0.1},
    cuttingThreshold: { type: Number, default: null }
});

module.exports = mongoose.model('Machine', machineSchema);