const Sensor = require("../models/sensor.model");

function normalizeSensorName(name) {
  return String(name || "")
    .trim()
    .toLowerCase();
}

function inferSensorRole(name) {
  const n = normalizeSensorName(name);

  if (n === "power" || n === "kw" || n.includes("power")) return "power";
  if (n.includes("temp")) return "temperature";
  if (n.includes("vibration")) return "vibration";

  return "generic";
}

function inferSensorUnit(name) {
  const role = inferSensorRole(name);

  if (role === "power") return "kW";
  if (role === "temperature") return "C";
  if (role === "vibration") return "mm/s";

  return "unit";
}

exports.createSensor = async (req, res) => {
  try {
    const name = req.body.name;

    const sensor = new Sensor({
      ...req.body,
      normalizedName: normalizeSensorName(name),
      role: req.body.role || inferSensorRole(name),
      unit: req.body.unit || inferSensorUnit(name),
    });

    const newSensor = await sensor.save();
    res.status(201).json({ newSensor });
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
};

// Get all sensors
exports.getAllSensors = async (req, res) => {
  try {
    const sensors = await Sensor.find();
    res.status(200).json(sensors);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

exports.getSensorsByMachine = async (req, res) => {
  try {
    const sensors = await Sensor.find({ machine: req.params.machineId });
    res.status(200).json(sensors);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// Get a single sensor by ID
exports.getSensorById = async (req, res) => {
  try {
    const sensor = await Sensor.findById(req.params.id);
    if (!sensor) return res.status(404).json({ message: "Sensor not found" });
    res.json(sensor);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

//get sensor by sensor name
exports.getSensorByName = async (req, res) => {
  try {
    const { name } = req.query; // read the query parameter ?name=XYZ
    if (!name) {
      return res
        .status(400)
        .json({ message: "Query parameter 'name' is required" });
    }

    const sensor = await Sensor.findOne({ name });
    if (!sensor) {
      return res.status(404).json({ message: "Sensor not found" });
    }

    res.status(200).json(sensor);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// Update a sensor
exports.updateSensor = async (req, res) => {
  try {
    const updatedSensor = await Sensor.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true, runValidators: true },
    );
    if (!updatedSensor)
      return res.status(404).json({ message: "Sensor not found" });
    res.json(updatedSensor);
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
};

// Delete a sensor
exports.deleteSensor = async (req, res) => {
  try {
    const deletedSensor = await Sensor.findByIdAndDelete(req.params.id);
    if (!deletedSensor)
      return res.status(404).json({ message: "Sensor not found" });
    res.json({ message: "Sensor deleted" });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};
