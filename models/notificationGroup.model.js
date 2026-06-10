const mongoose = require('mongoose');
const Schema = mongoose.Schema;
const { USER_ROLES } = require('../utils/enums');

const notificationGroupSchema = new Schema({
    role: {
        type: String,
        enum: [USER_ROLES.OPERATOR, USER_ROLES.MAINTENANCE, USER_ROLES.ADMIN],
        required: true,
        unique: true
    },
    phoneNumbers: [String]
}, { timestamps: true });

module.exports = mongoose.model('NotificationGroup', notificationGroupSchema);