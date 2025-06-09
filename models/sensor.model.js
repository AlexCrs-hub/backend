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
});

module.exports = mongoose.model('Sensor', sensorSchema);