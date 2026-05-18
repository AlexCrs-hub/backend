const Reading = require('../models/reading.model');
const Sensor = require('../models/sensor.model');
const Machine = require('../models/machine.model');

const getDateRange = (period) => {
    const now = new Date();
    const start = new Date();

    if (period === 'day') {
        start.setHours(0, 0, 0, 0);
    } else if (period === 'week') {
        start.setDate(now.getDate() - 7);
        start.setHours(0, 0, 0, 0);
    } else if (period === 'month') {
        start.setMonth(now.getMonth() - 1);
        start.setHours(0, 0, 0, 0);
    } else {
        throw new Error('Invalid period. Use day, week or month');
    }

    return { start, end: now };
}

const movingAverage = (values, windowSize) => {
    return values.map((_, i) => {
        const start = Math.max(0, i - Math.floor(windowSize / 2));
        const end = Math.min(values.length, start + windowSize);
        const window = values.slice(start, end);
        return window.reduce((sum, v) => sum + v, 0) / window.length;
    })
}

const countPeaks = (smoothed, min, max) => {
    let count = 0;
    let inPeak = false;

    for(let i = 1; i < smoothed.length - 1; i++) {
        const val = smoothed[i];
        const isLocalMax = val > smoothed[i - 1] && val > smoothed[i + 1];
        const inRange = val > min && val < max;

        if(isLocalMax && inRange) {
            if(!inPeak) {
                count++;
                inPeak = true;
            }
        } else if(val <= min) {
            inPeak = false;
        }
    }
    return count;
}

const getCycleCount = async (machineId, period) => {
    try{
        const machine = await Machine.findById(machineId);
        if(!machine) throw new Error('Machine not found');
        
        const sensor = await Sensor.findOne({ machine: machineId, unit: 'kW' });
        if(!sensor) throw new Error('Power sensor not found for this machine');

        const { start, end } = getDateRange(period);
        const readings = await Reading.find({
            sensor: sensor._id,
            measuredAt: { $gte: start, $lte: end }
        }).sort({ measuredAt: 1 });

        if(readings.length < 3) {
            return {cycles: 0, period, machineId};
        }

        const values = readings.map(r => r.measurement);
        const smoothed = movingAverage(values, 10);

        const cycles = countPeaks(smoothed, machine.downtimeThreshold, machine.maxPowerConsumption);

        return { cycles, period, machineId };
    } catch (err) {
        console.error('getCycleCount error:', err.message);
        throw err;
    }
}

const getTotalDowntime = async (machineId, period) => {
    try {
        const machine = await Machine.findById(machineId);
        if (!machine) throw new Error('Machine not found');

        const sensor = await Sensor.findOne({ machine: machineId, unit: 'kW' });
        if (!sensor) throw new Error('No kW sensor found for this machine');

        const { start, end } = getDateRange(period);

        const readings = await Reading.find({
            sensor: sensor._id,
            measuredAt: { $gte: start, $lte: end }
        }).sort({ measuredAt: 1 });

        if (readings.length < 2) {
            return { downtimeHours: 0, period, machineId };
        }

        let downtimeMs = 0;
        let downtimeStart = null;

        for (let i = 0; i < readings.length; i++) {
            const reading = readings[i];
            const isDown = reading.measurement <= machine.downtimeThreshold;

            if (isDown && downtimeStart === null) {
                // Machine just went down
                downtimeStart = new Date(reading.measuredAt);
            } else if (!isDown && downtimeStart !== null) {
                // Machine just recovered
                downtimeMs += new Date(reading.measuredAt) - downtimeStart;
                downtimeStart = null;
            }
        }

        // If machine is still down at end of period
        if (downtimeStart !== null) {
            downtimeMs += end - downtimeStart;
        }

        const downtimeHours = parseFloat((downtimeMs / 1000 / 60 / 60).toFixed(2));

        return { downtimeHours, period, machineId };

    } catch (err) {
        console.error('getTotalDowntime error:', err.message);
        throw err;
    }
};

module.exports = { getTotalDowntime, getCycleCount };