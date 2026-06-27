const mongoose = require("mongoose");
const Schema = mongoose.Schema;

const machineMetricBucketSchema = new Schema(
  {
    machine: {
      type: Schema.Types.ObjectId,
      ref: "Machine",
      required: true,
    },
    bucketStart: {
      type: Date,
      required: true,
    },
    sampleCount: {
      type: Number,
      default: 0,
    },
    sumPowerKw: {
      type: Number,
      default: 0,
    },
    minPowerKw: {
      type: Number,
      default: null,
    },
    maxPowerKw: {
      type: Number,
      default: null,
    },
    energyKwh: {
      type: Number,
      default: 0,
    },
    activeMs: {
      type: Number,
      default: 0,
    },
    idleMs: {
      type: Number,
      default: 0,
    },
    downtimeMs: {
      type: Number,
      default: 0,
    },
    cycles: {
      type: Number,
      default: 0,
    },
  },
  { timestamps: true },
);

machineMetricBucketSchema.index(
  { machine: 1, bucketStart: 1 },
  { unique: true },
);

module.exports = mongoose.model(
  "MachineMetricBucket",
  machineMetricBucketSchema,
);
