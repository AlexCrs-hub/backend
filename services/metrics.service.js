const Reading = require('../models/reading.model');
const Sensor = require('../models/sensor.model');
const Machine = require('../models/machine.model');
const ThresholdRecord = require('../models/thresholdRecord.model');
const DowntimeRecord = require('../models/downtimeRecord.model');
const { PERIODS, DOWNTIME_TYPES } = require('../utils/enums');

const getDateRange = (period) => {
    const now = new Date();
    const start = new Date();

    if (period === PERIODS.DAY) {
        start.setHours(0, 0, 0, 0);
    } else if (period === PERIODS.WEEK) {
        start.setDate(now.getDate() - 7);
        start.setHours(0, 0, 0, 0);
    } else if (period === PERIODS.MONTH) {
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

const getUtilisation = async (machineId, period) => {
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
            return { utilizationPercentage: 0, period, machineId };
        }

        let activeMs = 0;

        for (let i = 0; i < readings.length - 1; i++) {
            const current = readings[i];
            const next = readings[i + 1];
            const isActive = current.measurement > machine.downtimeThreshold;

            if (isActive) {
                activeMs += new Date(next.measuredAt) - new Date(current.measuredAt);
            }
        }

        const totalMs = end - start;
        const utilizationPercentage = parseFloat(((activeMs / totalMs) * 100).toFixed(2));

        return { utilizationPercentage, period, machineId };

    } catch (err) {
        console.error('getUtilization error:', err.message);
        throw err;
    }
}

const analyzeSignal = (values, min, max, numBins = 50) => {
    const binSize = (max - min) / numBins;
    const histogram = new Array(numBins).fill(0);

    values.forEach(v => {
        const bin = Math.min(Math.floor((v - min) / binSize), numBins - 1);
        histogram[bin]++;
    });

    // Find two peaks
    let firstPeakBin = 0;
    let secondPeakBin = 0;

    for (let i = 0; i < numBins; i++) {
        if (histogram[i] > histogram[firstPeakBin]) {
            secondPeakBin = firstPeakBin;
            firstPeakBin = i;
        } else if (histogram[i] > histogram[secondPeakBin] && i !== firstPeakBin) {
            secondPeakBin = i;
        }
    }

    const lowerPeak = Math.min(firstPeakBin, secondPeakBin);
    const upperPeak = Math.max(firstPeakBin, secondPeakBin);

    let valleyBin = lowerPeak;
    for (let i = lowerPeak; i <= upperPeak; i++) {
        if (histogram[i] < histogram[valleyBin]) {
            valleyBin = i;
        }
    }

    const cuttingThreshold = min + (valleyBin * binSize) + (binSize / 2);
    const downtimeThreshold = min + (lowerPeak * binSize) + (binSize / 2);

    return {
        cuttingThreshold,
        downtimeThreshold
    };
};

const getCuttingTime = async (machineId, period) => {
    try{
        const machine = await Machine.findById(machineId);
        if(!machine) throw new Error('Machine not found');

        const sensor = await Sensor.findOne({ machine: machineId, unit: 'kW' });
        if(!sensor) throw new Error('Power sensor not found for this machine');

        const {start, end} = getDateRange(period);

        const readings = await Reading.find({
            sensor: sensor._id,
            measuredAt: { $gte: start, $lte: end }
        }).sort({ measuredAt: 1 });

        if(readings.length < 2) {
            return { cuttingHours: 0, idleHours: 0, period, machineId };
        }

        const activeReadings = readings.filter(r => r.measurement > machine.downtimeThreshold);

        if(activeReadings.length < 2) {
            return { cuttingHours: 0, idleHours: 0, period, machineId };
        }

        const values = activeReadings.map(r => r.measurement);

        const { cuttingThreshold, downtimeThreshold: detectedDowntimeThreshold } = analyzeSignal(
            values, 
            machine.downtimeThreshold, 
            machine.maxPowerConsumption
        );

        const cuttingChanged = Math.abs(cuttingThreshold - (machine.cuttingThreshold || cuttingThreshold)) 
            / cuttingThreshold > 0.05;

        const downtimeChanged = Math.abs(detectedDowntimeThreshold - machine.downtimeThreshold) 
            / machine.downtimeThreshold > 0.10;

        if (cuttingChanged || downtimeChanged) {
            await ThresholdRecord.create({
                machine: machineId,
                cuttingThreshold: parseFloat(cuttingThreshold.toFixed(2)),
                downtimeThreshold: parseFloat(detectedDowntimeThreshold.toFixed(2))
            });

            await Machine.findByIdAndUpdate(machineId, {
                ...(downtimeChanged && { downtimeThreshold: parseFloat(detectedDowntimeThreshold.toFixed(2)) }),
                ...(cuttingChanged && { cuttingThreshold: parseFloat(cuttingThreshold.toFixed(2)) })
            });
        }

        console.log(`Dynamic cutting threshold for machine ${machineId}: ${cuttingThreshold}`);

        let cuttingMs = 0;

        for (let i = 0; i < readings.length - 1; i++) {
            const current = readings[i];
            const next = readings[i + 1];

            if (current.measurement >= cuttingThreshold) {
                cuttingMs += new Date(next.measuredAt) - new Date(current.measuredAt);
            }
        }

        const totalMs = end - start;
        const cuttingHours = parseFloat((cuttingMs / 1000 / 60 / 60).toFixed(2));
        const cuttingPercentage = parseFloat(((cuttingMs / totalMs) * 100).toFixed(2));

        return {
            cuttingHours,
            cuttingPercentage,
            cuttingThreshold: parseFloat(cuttingThreshold.toFixed(2)),
            period,
            machineId
        };
    } catch (err) {
        console.error('getCuttingAndIdleTime error:', err.message);
        throw err;
    }
}

const getPlannedUnplannedDowntime = async (machineId, period) => {
    try {
        const machine = await Machine.findById(machineId);
        if (!machine) throw new Error('Machine not found');

        const { start, end } = getDateRange(period);
        const totalMs = end - start;

        const records = await DowntimeRecord.find({
            machine: machineId,
            startedAt: { $gte: start, $lte: end },
            resolvedAt: { $ne: null }
        });

        let plannedMs = 0;
        let unplannedMs = 0;

        records.forEach(record => {
            const durationMs = new Date(record.resolvedAt) - new Date(record.startedAt);
            if (record.downtimeType === DOWNTIME_TYPES.PLANNED) {
                plannedMs += durationMs;
            } else {
                unplannedMs += durationMs;
            }
        });

        const plannedHours = parseFloat((plannedMs / 1000 / 60 / 60).toFixed(2));
        const unplannedHours = parseFloat((unplannedMs / 1000 / 60 / 60).toFixed(2));
        const plannedPercentage = parseFloat(((plannedMs / totalMs) * 100).toFixed(2));
        const unplannedPercentage = parseFloat(((unplannedMs / totalMs) * 100).toFixed(2));

        return {
            plannedHours,
            unplannedHours,
            plannedPercentage,
            unplannedPercentage,
            period,
            machineId
        };

    } catch (err) {
        console.error('getPlannedUnplannedDowntime error:', err.message);
        throw err;
    }
};

module.exports = { getTotalDowntime, getCycleCount, getUtilisation, getCuttingTime, getDateRange, getPlannedUnplannedDowntime };