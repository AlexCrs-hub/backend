const mongoose = require('mongoose');

const readingSchema = new mongoose.Schema({
    sensor: { 
        type: mongoose.Schema.Types.ObjectId, 
        ref: 'Sensor', 
        required: true 
    },
    measurement: {
        type: Number,
        required: true
    },
    measuredAt: {
        type: Date,
        required: true,
        default: Date.now
    }
});

readingSchema.index({ sensor: 1, measuredAt: 1 });

module.exports = mongoose.model('Reading', readingSchema);