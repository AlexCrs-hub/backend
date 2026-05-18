const express = require('express');
const router = express.Router();
const userController = require('../controllers/user.controller');
const isAuth = require('../middlewares/verifyToken');

router.post('/add-number', isAuth.verifyToken, userController.updatePhoneNumber);

module.exports = router;