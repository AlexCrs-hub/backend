const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const notificationLogSchema = new Schema({
    machine: {
        type: Schema.Types.ObjectId,
        ref: 'Machine',
        required: true
    },
    sentAt: {
        type: Date,
        default: Date.now
    },
    type: {
        type: String,
        enum: ['DOWNTIME'],
        default: 'DOWNTIME'
    },
    resolvedAt: {
        type: Date,
        default: null
    }
}, { timestamps: true });

module.exports = mongoose.model('NotificationLog', notificationLogSchema);