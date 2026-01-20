const Sensor = require('../models/sensor.model');
const Reading = require('../models/reading.model');

exports.computeMetrics = async (machineId, startTime, endTime) => {
  const sensor = await Sensor.findOne({ machine: machineId, unit: 'kW' });
  if (!sensor) return null;

  // Get readings for this sensor
  const readings = await Reading.find({
    sensor: sensor._id,
    measuredAt: { $gte: startTime, $lte: endTime }
  }).sort({ measuredAt: 1 });

  if (!readings.length) return null;

  // Live power
  const latest = readings[readings.length - 1];
  const livePower = latest.measurement;

  // Availability: % of readings > 0
  const uptimeCount = readings.filter(r => r.measurement > 0).length;
  const availability = uptimeCount / readings.length;

  // Performance: average reading / maxValue
  const avgPower = readings.reduce((sum, r) => sum + r.measurement, 0) / readings.length;
  const performance = avgPower / sensor.maxValue;

  // OEE = performance × availability
  const oee = performance * availability;

  return {
    livePower,
    performance: performance * 100,
    availability: availability * 100,
    oee: oee * 100
  };
}
