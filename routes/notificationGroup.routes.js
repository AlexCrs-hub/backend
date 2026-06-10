const express = require('express');
const router = express.Router();
const isAuth = require('../middlewares/verifyToken');

const notificationGroupController = require('../controllers/notificationGroup.controller');

router.get('/', isAuth.verifyToken, notificationGroupController.getAllGroups);
router.patch('/:role/add', isAuth.verifyToken, notificationGroupController.addPhoneNumber);
router.patch('/:role/remove', isAuth.verifyToken, notificationGroupController.removePhoneNumber);

module.exports = router;