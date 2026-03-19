const jwt = require('jsonwebtoken');

exports.verifyToken = (req, res, next) => {
    const token = req.cookies.token;
    if (!token) {
        return res.status(401).json({ message: 'You need to Login' });
    }
    try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        if (!decoded) {
            return res.status(401).json({ message: 'You need to Login' });
        }
        req.userId = decoded.userId;
        next();
    } catch (error) {
        return res.status(401).json({ message: 'You need to Login' });
    }
};

exports.verifyTokenSilent = (req) => {
    const token = req.cookies.token;
    
    if (!token) throw new Error('No token');
    
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    if (!decoded) throw new Error('Invalid token');
  
    req.userId = decoded.userId;
};