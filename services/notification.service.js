const axios = require('axios');
const NotificationLog = require('../models/notificationLog.model');
const User = require('../models/user.model');
const { USER_ROLES } = require('../utils/enums');

const WHATSAPP_API_URL = `https://graph.facebook.com/v19.0/${process.env.WHATSAPP_PHONE_NUMBER_ID}/messages`;

const ESCALATION_INTERVALS = {
    operator: 0,
    maintenance: 15 * 60 * 1000,  // 15 minutes
    admin: 30 * 60 * 1000          // 30 minutes
};

const ESCALATION_ORDER = [USER_ROLES.OPERATOR, USER_ROLES.MAINTENANCE, USER_ROLES.ADMIN];

const sendWhatsAppMessage = async (phoneNumber, machineName) => {
    const message = `⚠️ Alert: Machine "${machineName}" has entered downtime. Please check immediately.`;

    await axios.post(
        WHATSAPP_API_URL,
        {
            messaging_product: 'whatsapp',
            to: phoneNumber,
            type: 'text',
            text: { body: message }
        },
        {
            headers: {
                Authorization: `Bearer ${process.env.WHATSAPP_TOKEN}`,
                'Content-Type': 'application/json'
            }
        }
    );
};

const sendToRole = async (role, machineName) => {
    const users = await User.find({
        role,
        phoneNumber: { $ne: null }
    });

    if (users.length === 0) {
        console.log(`No ${role}s with phone numbers found`);
        return;
    }

    const sendPromises = users.map(user =>
        sendWhatsAppMessage(user.phoneNumber, machineName)
            .then(() => console.log(`Notified ${user.email}`))
            .catch(err => console.error(`Failed to notify ${user.email}:`, err.message))
    );

    await Promise.allSettled(sendPromises);
};

const notifyOnDowntime = async (machineId, machineName) => {
    try {
        const existingLog = await NotificationLog.findOne({
            machine: machineId,
            resolvedAt: null
        });

        if (existingLog) {
            console.log(`Notification already sent for machine ${machineName}, skipping`);
            return;
        }

        await sendToRole(USER_ROLES.OPERATOR, machineName);

        await NotificationLog.create({
            machine: machineId,
            escalationLevel: USER_ROLES.OPERATOR,
            escalatedAt: new Date()
        });

        console.log(`Downtime notification sent for machine ${machineName}`);

    } catch (err) {
        console.error('notifyOnDowntime error:', err.message);
    }
};

const resolveDowntimeNotification = async (machineId) => {
    try {
        await NotificationLog.findOneAndUpdate(
            { machine: machineId, resolvedAt: null },
            { resolvedAt: new Date() }
        );
    } catch (err) {
        console.error('resolveDowntimeNotification error:', err.message);
    }
};

const checkEscalations = async () => {
    try {
        const now = Date.now();

        const openLogs = await NotificationLog.find({
            resolvedAt: null,
            escalationLevel: { $in: [USER_ROLES.OPERATOR, USER_ROLES.MAINTENANCE] }
        }).populate('machine');

        for (const log of openLogs) {
            // Check if downtime reason has been recorded
            const downtimeRecord = await DowntimeRecord.findOne({
                machine: log.machine._id,
                resolvedAt: { $ne: null },
                reasonRecorded: true,
                startedAt: { $gte: log.sentAt }
            });

            if (downtimeRecord) {
                // Reason recorded, stop escalation
                await NotificationLog.findByIdAndUpdate(log._id, { resolvedAt: new Date() });
                console.log(`Escalation stopped for machine ${log.machine.name} — reason recorded`);
                continue;
            }

            const currentIndex = ESCALATION_ORDER.indexOf(log.escalationLevel);
            const nextLevel = ESCALATION_ORDER[currentIndex + 1];
            const intervalForNext = ESCALATION_INTERVALS[nextLevel];
            const timeSinceEscalation = now - new Date(log.escalatedAt).getTime();

            if (timeSinceEscalation >= intervalForNext) {
                await sendToRole(nextLevel, log.machine.name);

                await NotificationLog.findByIdAndUpdate(log._id, {
                    escalationLevel: nextLevel,
                    escalatedAt: new Date()
                });

                console.log(`Escalated machine ${log.machine.name} to ${nextLevel}`);
            }
        }
    } catch (err) {
        console.error('checkEscalations error:', err.message);
    }
};

module.exports = {
    notifyOnDowntime,
    resolveDowntimeNotification,
    checkEscalations
};