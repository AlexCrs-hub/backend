const Machine = require("../models/machine.model");
const Sensor = require("../models/sensor.model");
const Reading = require("../models/reading.model");
const DowntimeRecord = require("../models/downtimeRecord.model");
const MachineRuntimeState = require("../models/machineRuntimeState.model");
const MachineMetricBucket = require("../models/machineMetricBucket.model");
const {
  notifyOnDowntime,
  resolveDowntimeNotification,
} = require("../services/notification.service");
const realtime = require("../services/realtime.service");

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

function getBucketStart(date) {
  const d = new Date(date);
  d.setSeconds(0, 0);
  return d;
}

/**
 * Resolves the machine for an incoming MQTT name, matching on `mqttName` first
 * and falling back to legacy `name` during rollout. If it's an unknown device,
 * the machine is auto-provisioned (name defaults to the hardware name; an admin
 * can rename it later via PUT /api/machines/:id). Handles the race where two
 * concurrent batches try to create the same new machine.
 */
async function resolveOrCreateMachine(machineName) {
  let machine = await Machine.findOne({
    $or: [{ mqttName: machineName }, { name: machineName }],
  });

  if (machine) {
    // Backfill mqttName on legacy machines matched by name.
    if (!machine.mqttName) {
      machine.mqttName = machineName;
      await machine.save();
    }
    return machine;
  }

  try {
    return await Machine.create({ mqttName: machineName, name: machineName });
  } catch (err) {
    // Duplicate key => another request created it first; re-fetch.
    if (err && err.code === 11000) {
      return Machine.findOne({ mqttName: machineName });
    }
    throw err;
  }
}

exports.ingestBatch = async (req, res) => {
    try {
      
        console.log('====================================');
        console.log('Recieved Sensor Batch: ', req.body);
        console.log('====================================');
    const { machineName, measuredAt, readings, messageId } = req.body;

    if (!machineName) {
      return res.status(400).json({ message: "machineName is required" });
    }

    if (!Array.isArray(readings) || readings.length === 0) {
      return res.status(400).json({ message: "readings array is required" });
    }

    const timestamp = measuredAt ? new Date(measuredAt) : new Date();

    if (Number.isNaN(timestamp.getTime())) {
      return res.status(400).json({ message: "Invalid measuredAt timestamp" });
    }
      
    const machine = await resolveOrCreateMachine(machineName);
    if (!machine) {
      return res.status(500).json({ message: `Could not resolve machine: ${machineName}` });
    }

    const normalizedReadings = readings
      .map((r) => ({
        sensorName: String(r.sensorName || "").trim(),
        normalizedName: normalizeSensorName(r.sensorName),
        value: Number(r.value),
        unit: r.unit || inferSensorUnit(r.sensorName),
        role: inferSensorRole(r.sensorName),
      }))
      .filter((r) => r.sensorName && Number.isFinite(r.value));

    if (normalizedReadings.length === 0) {
      return res
        .status(400)
        .json({ message: "No valid numeric readings found" });
    }

    const normalizedNames = [
      ...new Set(normalizedReadings.map((r) => r.normalizedName)),
    ];

    const existingSensors = await Sensor.find({
      machine: machine._id,
      normalizedName: { $in: normalizedNames },
    });

    const sensorByName = new Map(
      existingSensors.map((sensor) => [sensor.normalizedName, sensor]),
    );

    const missingSensors = [
      ...new Map(
        normalizedReadings
          .filter((r) => !sensorByName.has(r.normalizedName))
          .map((r) => [r.normalizedName, r]),
      ).values(),
    ];

    if (missingSensors.length > 0) {
      try {
        const createdSensors = await Sensor.insertMany(
          missingSensors.map((r) => ({
            name: r.sensorName,
            normalizedName: r.normalizedName,
            machine: machine._id,
            unit: r.unit,
            role: r.role,
          })),
          { ordered: false },
        );

        for (const sensor of createdSensors) {
          sensorByName.set(sensor.normalizedName, sensor);
        }
      } catch {
        const refreshedSensors = await Sensor.find({
          machine: machine._id,
          normalizedName: { $in: normalizedNames },
        });

        for (const sensor of refreshedSensors) {
          sensorByName.set(sensor.normalizedName, sensor);
        }
      }
    }

    const readingDocs = normalizedReadings
      .map((r) => {
        const sensor = sensorByName.get(r.normalizedName);
        if (!sensor) return null;

        return {
          sensor: sensor._id,
          measurement: r.value,
          measuredAt: timestamp,
        };
      })
      .filter(Boolean);

    try {
      await Reading.insertMany(readingDocs, { ordered: false });
    } catch (err) {
      if (err.code !== 11000) {
        throw err;
      }
    }

    const powerReading = normalizedReadings.find((r) => r.role === "power");

    let runtimeState = null;

    if (powerReading) {
      runtimeState = await processMachineState({
        machine,
        powerKw: powerReading.value,
        timestamp,
        messageId,
      });

      await updateMetricBucket({
        machine,
        powerKw: powerReading.value,
        state: runtimeState.state,
        timestamp,
      });
    }

    const eventPayload = {
      machineId: String(machine._id),
      machineName: machine.name,
      measuredAt: timestamp,
      readings: normalizedReadings.map((r) => ({
        machineId: String(machine._id),
        sensorName: r.sensorName,
        normalizedName: r.normalizedName,
        value: r.value,
        unit: r.unit,
        role: r.role,
      })),
      state: runtimeState,
    };

    realtime.publish("telemetry", eventPayload);

    res.status(201).json({
      inserted: readingDocs.length,
      machineId: machine._id,
      state: runtimeState,
    });
  } catch (err) {
    console.error("Telemetry ingest error:", err);
    res.status(500).json({ message: err.message });
  }
};

async function processMachineState({ machine, powerKw, timestamp, messageId }) {
  const downtimeThreshold = machine.downtimeThreshold ?? 0.1;
  const nextState = powerKw <= downtimeThreshold ? "idle" : "on";

  let stateDoc = await MachineRuntimeState.findOne({ machine: machine._id });

  if (!stateDoc) {
    stateDoc = await MachineRuntimeState.create({
      machine: machine._id,
      state: nextState,
      health: "healthy",
      lastPowerKw: powerKw,
      lastSeenAt: new Date(),
      stateChangedAt: timestamp,
      lastMessageId: messageId || null,
    });
  }

  const previousState = stateDoc.state;

  stateDoc.health = "healthy";
  stateDoc.lastPowerKw = powerKw;
  stateDoc.lastSeenAt = new Date();
  stateDoc.lastMessageId = messageId || null;

  if (previousState !== nextState) {
    stateDoc.state = nextState;
    stateDoc.stateChangedAt = timestamp;

    if (nextState === "idle") {
      const existingRecord = await DowntimeRecord.findOne({
        machine: machine._id,
        resolvedAt: null,
      });

      if (!existingRecord) {
        const downtimeRecord = await DowntimeRecord.create({
          machine: machine._id,
          startedAt: timestamp,
        });

        await notifyOnDowntime(machine._id, machine.name, downtimeRecord._id);
      }
    }

    if (nextState === "on") {
      await DowntimeRecord.findOneAndUpdate(
        { machine: machine._id, resolvedAt: null },
        { resolvedAt: timestamp },
      );

      await resolveDowntimeNotification(machine._id);
    }
  }

  await stateDoc.save();

  return {
    machineId: String(machine._id),
    state: stateDoc.state,
    health: stateDoc.health,
    lastPowerKw: stateDoc.lastPowerKw,
    lastSeenAt: stateDoc.lastSeenAt,
    stateChangedAt: stateDoc.stateChangedAt,
  };
}

async function updateMetricBucket({ machine, powerKw, state, timestamp }) {
  const bucketStart = getBucketStart(timestamp);

  const isActive = state === "on";
  const isIdle = state === "idle";

  await MachineMetricBucket.findOneAndUpdate(
    {
      machine: machine._id,
      bucketStart,
    },
    {
      $inc: {
        sampleCount: 1,
        sumPowerKw: powerKw,
        activeMs: isActive ? 1000 : 0,
        idleMs: isIdle ? 1000 : 0,
        downtimeMs: isIdle ? 1000 : 0,
      },
      $min: {
        minPowerKw: powerKw,
      },
      $max: {
        maxPowerKw: powerKw,
      },
    },
    {
      upsert: true,
      new: true,
    },
  );
}