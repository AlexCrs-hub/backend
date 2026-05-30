const express = require('express');
const workIntervalController = require('../controllers/workInterval.controller');
const isAuth = require('../middlewares/verifyToken');

const router = express.Router();

router.post('/start/:machineId', isAuth.verifyToken, workIntervalController.start);
router.patch('/stop/:machineId', isAuth.verifyToken, workIntervalController.stop);

module.exports = router;