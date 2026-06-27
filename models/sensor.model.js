const mongoose = require("mongoose");

const { Schema } = mongoose;

const sensorSchema = new Schema({
  name: {
    type: String,
    required: true,
    trim: true,
  },
  normalizedName: {
    type: String,
    required: true,
    trim: true,
  },
  machine: {
    type: Schema.Types.ObjectId,
    ref: "Machine",
    required: true,
  },
  unit: {
    type: String,
    default: "unit",
    required: true,
  },
  role: {
    type: String,
    enum: ["power", "temperature", "vibration", "generic"],
    default: "generic",
    index: true,
  },
});

sensorSchema.index({ machine: 1, normalizedName: 1 }, { unique: true });

module.exports = mongoose.model("Sensor", sensorSchema);
