const mongoose = require("mongoose");
const Schema = mongoose.Schema;

const machineRuntimeStateSchema = new Schema(
  {
    machine: {
      type: Schema.Types.ObjectId,
      ref: "Machine",
      required: true,
      unique: true,
      index: true,
    },
    state: {
      type: String,
      enum: ["on", "idle", "off"],
      default: "off",
    },
    health: {
      type: String,
      enum: ["healthy", "stale", "disconnected"],
      default: "disconnected",
    },
    lastPowerKw: {
      type: Number,
      default: 0,
    },
    lastSeenAt: {
      type: Date,
      default: null,
    },
    stateChangedAt: {
      type: Date,
      default: null,
    },
    lastMessageId: {
      type: String,
      default: null,
    },
  },
  { timestamps: true },
);

module.exports = mongoose.model(
  "MachineRuntimeState",
  machineRuntimeStateSchema,
);
