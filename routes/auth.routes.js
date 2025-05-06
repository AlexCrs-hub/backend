const express = require('express');
const authController = require('../controllers/auth.controller');
const isAuth = require('../middlewares/verifyToken');

const router = express.Router();

router.get('/check-auth', isAuth.verifyToken, authController.checkAuth);

router.post('/signup', authController.signup);
router.post('/login', authController.login);
router.post('/logout', authController.logout);

router.post('/verify-email', authController.verifyEmail);
router.post('/forgot-password', authController.forgotPassword);
router.post('/reset-password/:token', authController.resetPassword);

module.exports = router;