const crypto = require('crypto');

function hashKey(key) {
  return crypto.createHash('sha256').update(key).digest('hex');
}

exports.verifyServiceKey = (req, res, next) => {
  const apiKey = req.headers['x-api-key'];
  if (!apiKey) {
    return res.status(401).json({ message: 'API key missing' });
  }

  const hashedKey = hashKey(apiKey);

  if (hashedKey !== process.env.SERVICE_API_KEY_HASH) {
    return res.status(403).json({ message: 'Invalid API key' });
  }

  next();
};