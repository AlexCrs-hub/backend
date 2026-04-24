const jwt = require('jsonwebtoken');

exports.generateTokenAndSetCookie = (res, userId, role) => {
    const token = jwt.sign({ userId, role }, process.env.JWT_SECRET, { expiresIn: '7d' });

    res.cookie('token', token, {
        secure: true,
        sameSite: 'none',
        //httpOnly: true,
        maxAge: 7 * 24 * 60 * 60 * 1000
    });

    return token;
};
