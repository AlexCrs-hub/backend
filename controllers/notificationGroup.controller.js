const NotificationGroup = require('../models/notificationGroup.model');

exports.getAllGroups = async (req, res) => {
    try {
        const groups = await NotificationGroup.find();
        res.json(groups);
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
};

exports.addPhoneNumber = async (req, res) => {
    try {
        const { role } = req.params;
        const { phoneNumber } = req.body;

        if (!phoneNumber.startsWith('+')) {
            return res.status(400).json({ message: 'Phone number must include country code e.g. +40712345678' });
        }

        if (!/^\+[0-9]+$/.test(phoneNumber)) {
            return res.status(400).json({ message: 'Phone number must contain only digits after the + sign' });
        }

        const group = await NotificationGroup.findOneAndUpdate(
            { role },
            { $addToSet: { phoneNumbers: phoneNumber } },
            { new: true, upsert: true }
        );

        res.json(group);
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
};

exports.removePhoneNumber = async (req, res) => {
    try {
        const { role } = req.params;
        const { phoneNumber } = req.body;

        const group = await NotificationGroup.findOneAndUpdate(
            { role },
            { $pull: { phoneNumbers: phoneNumber } },
            { new: true }
        );

        if (!group) return res.status(404).json({ message: 'Group not found' });

        res.json(group);
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
};