const axios = require('axios');
const NotificationLog = require('../models/notificationLog.model');
const User = require('../models/user.model');

const WHATSAPP_API_URL = `https://graph.facebook.com/v19.0/${process.env.WHATSAPP_PHONE_NUMBER_ID}/messages`;

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

const notifyAdminsForDowntime = async (machineId, machineName) => {
    try {
        const existingLog = await NotificationLog.findOne({
            machine: machineId,
            resolvedAt: null
        });

        if (existingLog) {
            console.log(`Notification already sent for machine ${machineName}, skipping`);
            return;
        }

        // Get all admins with a phone number
        const admins = await User.find({
            role: 'admin',
            phoneNumber: { $ne: null }
        });

        if (admins.length === 0) {
            console.log('No admins with phone numbers found');
            return;
        }

        // Send to all admins
        const sendPromises = admins.map(admin =>
            sendWhatsAppMessage(admin.phoneNumber, machineName)
                .then(() => console.log(`Notified admin ${admin.email}`))
                .catch(err => console.error(`Failed to notify admin ${admin.email}:`, err.message))
        );

        await Promise.allSettled(sendPromises);

        await NotificationLog.create({
            machine: machineId,
            type: 'DOWNTIME'
        });

        console.log(`Downtime notification sent for machine ${machineName}`);

    } catch (err) {
        console.error('notifyAdminsForDowntime error:', err.message);
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

module.exports = {
    notifyAdminsForDowntime,
    resolveDowntimeNotification
};