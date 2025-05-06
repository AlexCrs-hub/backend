const express = require('express');
const machineController = require('../controllers/machine.controller');
const isAuth = require('../middlewares/verifyToken');

const router = express.Router();

router.post('/line/:lineId',isAuth.verifyToken, machineController.addMachineToLine);
router.get('/line/:lineId',isAuth.verifyToken, machineController.getMachinesByLine);
router.get('/:id',isAuth.verifyToken, machineController.getMachineById);
router.put('/:id',isAuth.verifyToken, machineController.updateMachineById);
router.delete('/:id',isAuth.verifyToken, machineController.deleteMachine);
router.get('/',isAuth.verifyToken, machineController.getUserMachines);

module.exports = router;