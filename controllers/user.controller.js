exports.updatePhoneNumber = async (req, res) => {
    try {
        const userId = req.user.id;
        const { phoneNumber } = req.body;

        if (!phoneNumber.startsWith('+')) {
            return res.status(400).json({ message: 'Phone number must include country code e.g. +40712345678' });
        }

        const user = await User.findByIdAndUpdate(
            userId,
            { phoneNumber },
            { new: true }
        );

        res.json({ message: 'Phone number updated', phoneNumber: user.phoneNumber });
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
};