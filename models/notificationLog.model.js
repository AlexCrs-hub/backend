const mongoose = require('mongoose');
const Schema = mongoose.Schema;
const { USER_ROLES } = require('../utils/enums');

const notificationLogSchema = new Schema({
    machine: {
        type: Schema.Types.ObjectId,
        ref: 'Machine',
        required: true
    },
    downtimeRecord: {
        type: Schema.Types.ObjectId,
        ref: 'DowntimeRecord',
        required: true
    },
    sentAt: {
        type: Date,
        default: Date.now
    },
    escalationLevel: {
        type: String,
        enum: [USER_ROLES.OPERATOR, USER_ROLES.MAINTENANCE, USER_ROLES.ADMIN],
        default: USER_ROLES.OPERATOR
    },
    escalatedAt: {
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