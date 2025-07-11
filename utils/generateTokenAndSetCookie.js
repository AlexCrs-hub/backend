const { truncates } = require('bcryptjs');
const jwt = require('jsonwebtoken');

exports.generateTokenAndSetCookie = (res, userId) => {
    const token = jwt.sign({ userId }, process.env.JWT_SECRET, { expiresIn: '7d' });

    res.cookie('token', token, {
        secure: true,
        sameSite: 'none',
        //httpOnly: true,
        maxAge: 7 * 24 * 60 * 60 * 1000
    });

    return token;
};
