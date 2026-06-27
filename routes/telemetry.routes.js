const express = require("express");
const telemetryController = require("../controllers/telemetry.controller");
const serviceAuth = require("../middlewares/serviceAuth");

const router = express.Router();

router.post(
  "/batch",
  serviceAuth.verifyServiceKey,
  telemetryController.ingestBatch,
);

module.exports = router;
