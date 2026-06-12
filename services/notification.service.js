const axios = require('axios');
const NotificationLog = require('../models/notificationLog.model');
const User = require('../models/user.model');
const NotificationGroup = require('../models/notificationGroup.model');
const DowntimeRecord = require('../models/downtimeRecord.model');
const { USER_ROLES } = require('../utils/enums');

const WHATSAPP_API_URL = `https://graph.facebook.com/v19.0/${process.env.WHATSAPP_PHONE_NUMBER_ID}/messages`;

const ESCALATION_INTERVALS = {
    operator: 0,
    admin: 15 * 60 * 1000  // 15 minutes
};

const ESCALATION_ORDER = [USER_ROLES.OPERATOR, USER_ROLES.ADMIN];

const sendWhatsAppMessage = async (phoneNumber, machineName) => {
    const response = await axios.post(
        WHATSAPP_API_URL,
        {
            messaging_product: 'whatsapp',
            to: phoneNumber.replace('+', ''),
            type: 'template',
            template: {
                name: process.env.WHATSAPP_TEMPLATE_NAME || 'hello_world',
                language: { code: 'en_US' }
            }
        },
        {
            headers: {
                Authorization: `Bearer ${process.env.WHATSAPP_TOKEN}`,
                'Content-Type': 'application/json'
            }
        }
    );
    // console.log('WhatsApp send result:', JSON.stringify(response.data));
};

const sendToRole = async (role, machineName) => {
    const group = await NotificationGroup.findOne({ role });

    if (!group || group.phoneNumbers.length === 0) {
        console.log(`No phone numbers found for role ${role}`);
        return;
    }
    // console.log(`Sending notification to numbers: ${group.phoneNumbers.join(', ')} ${role}(s) for machine ${machineName}`);
    const sendPromises = group.phoneNumbers.map(phoneNumber =>
        sendWhatsAppMessage(phoneNumber, machineName, role)
            .then(() => console.log(`Notified ${role} at ${phoneNumber.replace('+', '')}`))
            .catch(err => console.error(`Failed to notify ${role} at ${phoneNumber.replace('+', '')}:`, err.response?.data || err.message))
    );

    await Promise.allSettled(sendPromises);
};

const notifyOnDowntime = async (machineId, machineName, downtimeRecordId) => {
    try {
        const existingLog = await NotificationLog.findOne({
            downtimeRecord: downtimeRecordId,
            resolvedAt: null
        });

        if (existingLog) {
            console.log(`Notification already sent for this downtime period, skipping`);
            return;
        }

        await sendToRole(USER_ROLES.OPERATOR, machineName);

        await NotificationLog.create({
            machine: machineId,
            downtimeRecord: downtimeRecordId,
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
            escalationLevel: { $in: [USER_ROLES.OPERATOR] }
        }).populate('machine').populate('downtimeRecord');

        for (const log of openLogs) {
            if (log.downtimeRecord?.reasonRecorded) {
                await NotificationLog.findByIdAndUpdate(log._id, { resolvedAt: new Date() });
                console.log(`Notification resolved for machine ${log.machine.name} — reason recorded`);
                continue;
            }

            const currentIndex = ESCALATION_ORDER.indexOf(log.escalationLevel);
            const nextLevel = ESCALATION_ORDER[currentIndex + 1];
            const intervalForNext = ESCALATION_INTERVALS[nextLevel];
            const timeSinceEscalation = now - new Date(log.escalatedAt).getTime();

            if (nextLevel && timeSinceEscalation >= intervalForNext) {
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
    checkEscalations,
    sendToRole
};