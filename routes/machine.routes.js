const express = require('express');
const machineController = require('../controllers/machine.controller');
const isAuth = require('../middlewares/verifyToken');
const serviceAuth = require('../middlewares/serviceAuth');

const router = express.Router();

router.post('/line/:lineId',isAuth.verifyToken, machineController.addMachineToLine);
router.post('/',isAuth.verifyToken, machineController.addMachine);
router.get('/line/:lineId',isAuth.verifyToken, machineController.getMachinesByLine);
router.get('/report', isAuth.verifyToken, machineController.getMachineReport);
router.get('/name/:name', serviceAuth.verifyServiceKey, machineController.getMachineByName);
router.get('/:id',isAuth.verifyToken, machineController.getMachineById);
router.put('/:id',isAuth.verifyToken, machineController.updateMachineById);
router.delete('/:id',isAuth.verifyToken, machineController.deleteMachine);
router.get('/',isAuth.verifyToken, machineController.getUserMachines);

module.exports = router;