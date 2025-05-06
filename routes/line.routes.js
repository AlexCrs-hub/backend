const express = require('express');
const lineController = require('../controllers/line.controller');
const isAuth = require('../middlewares/verifyToken');

const router = express.Router();

router.post('/', isAuth.verifyToken, lineController.addLine);
router.get('/', isAuth.verifyToken, lineController.getLines);
router.get('/:id', isAuth.verifyToken, lineController.getLine);
router.delete('/:id',isAuth.verifyToken, lineController.deleteLine);

module.exports = router;