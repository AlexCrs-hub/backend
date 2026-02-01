const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const machineSchema = new Schema({
    name: {
        type: String,
        required: true
    },
    userId: {
        type: Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    lineId: {
        type: Schema.Types.ObjectId,
        ref: 'Line',
        required: false
    },
    maxPowerConsumption: { type: Number, required: true }, // max possible power
});

module.exports = mongoose.model('Machine', machineSchema);