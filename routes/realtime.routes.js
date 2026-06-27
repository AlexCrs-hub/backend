const express = require("express");
const isAuth = require("../middlewares/verifyToken");
const realtime = require("../services/realtime.service");

const router = express.Router();

router.get("/events", realtime.register);

module.exports = router;
