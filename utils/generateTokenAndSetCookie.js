const jwt = require('jsonwebtoken');

exports.generateTokenAndSetCookie = (req, res, userId, role) => {
    const token = jwt.sign({ userId, role }, process.env.JWT_SECRET, { expiresIn: '7d' });

    // Secure/SameSite=None cookies require HTTPS; fall back to Lax over plain HTTP (local dev)
    const isSecure = req.secure || req.headers['x-forwarded-proto'] === 'https';

    res.cookie('token', token, {
        secure: isSecure,
        sameSite: isSecure ? 'none' : 'lax',
        //httpOnly: true,
        maxAge: 7 * 24 * 60 * 60 * 1000
    });

    return token;
};
