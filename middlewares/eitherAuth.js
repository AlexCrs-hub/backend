const isAuth = require('../middlewares/verifyToken');
const serviceAuth = require('../middlewares/serviceAuth');

exports.eitherAuth = async (req, res, next) => {
  try {
    await isAuth.verifyTokenSilent(req); 
    return next();
  } catch {
    try {
      await serviceAuth.verifyServiceKeySilent(req);
      return next();
    } catch {
      return res.status(401).json({ message: 'Unauthorized' });
    }
  }
};