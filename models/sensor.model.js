const mongoose = require('mongoose');

const { Schema } = mongoose;

const sensorSchema = new Schema({
    name: {
        type: String,
        required: true,
    },
    machine: {
        type: Schema.Types.ObjectId,
        ref: 'Machine',
        required: true
    },
    unit: { type: String, default: 'kW', required: true }, // for clarity
    maxValue: { type: Number, required: true }, // max possible power
});

module.exports = mongoose.model('Sensor', sensorSchema);