const Machine = require('../models/machine.model');
const Line = require('../models/line.model');
let converter = require('json-2-csv');

// Add a machine to a line
exports.addMachineToLine = async (req, res) => {
    try {
        const { name } = req.body;
        const { lineId } = req.params;

        if (!name) {
            return res.status(400).json({ error: "Machine name is required." });
        }

        if (!lineId) {
            return res.status(400).json({ error: "Production line ID is required." });
        }

        const lineExists = await Line.findById(lineId);
        if (!lineExists) {
            return res.status(404).json({ error: "Production line not found." });
        }

        const existingMachine = await Machine.findOne({ name, lineId });
        if (existingMachine) {
            return res.status(409).json({ error: "A machine with this name already exists in the line." });
        }

        const machine = new Machine({ name, lineId });
        await machine.save();

        await Line.findByIdAndUpdate(lineId, { $push: { machines: machine._id } });

        res.status(201).json({ message: "Machine added successfully.", machine });

    } catch (error) {
        console.error("Error while adding machine:", error);
        res.status(500).json({ error: "Internal server error." });
    }
};

exports.addMachine = async (req, res) => {
    try {
        const { name, max_power } = req.body;

        if (!name) {
            return res.status(400).json({ error: "Machine name is required." });
        }

        if (!max_power) {
            return res.status(400).json({ error: "Max power consumption is required." });
        }

        const existingMachine = await Machine.findOne({ name });
        if (existingMachine) {
            return res.status(409).json({ error: "A machine with this name already exists." });
        }

        const machine = new Machine({ name, maxPowerConsumption: max_power });
        await machine.save();

        res.status(201).json({ message: "Machine added successfully.", machine });

    } catch (error) {
        console.error("Error while adding machine:", error);
        res.status(500).json({ error: "Internal server error." });
    }
};

exports.getMachinesByLine = async (req, res) => {
    try {
        const { lineId } = req.params;

        const lineExists = await Line.findById(lineId);
        if (!lineExists) {
            return res.status(404).json({ error: "Production line not found." });
        }

        const machines = await Machine.find({ lineId });

        res.status(200).json({
            message: `Found ${machines.length} machine(s) in the production line.`,
            machines
        });

    } catch (error) {
        console.error("Error while fetching machines:", error);
        res.status(500).json({ error: "Internal server error." });
    }
};

exports.getMachineById = async (req, res) => {
    try {
        const { id } = req.params;

        const machine = await Machine.findById(id);

        if (!machine) {
            return res.status(404).json({ error: "Machine not found." });
        }

        res.status(200).json({
            message: "Machine found.",
            machine
        });

    } catch (error) {
        console.error("Error while fetching machine:", error);
        res.status(500).json({ error: "Internal server error." });
    }
};

exports.getMachineByName = async (req, res) => {
    
    try {
        const { name } = req.params;
        const machine = await Machine.findOne({ name });
    
        if (!machine) {
            return res.status(404).json({ error: "Machine not found." });
        }
        
        res.status(200).json({
            message: "Machine found.",
            machine
        });

    } catch (error) {
        console.error("Error while fetching machine:", error);
        res.status(500).json({ error: "Internal server error." });
    }
};

exports.updateMachineById = async (req, res) => {
    try {
        const { id } = req.params;
        const updateData = req.body;

        const machine = await Machine.findById(id);
        if (!machine) {
            return res.status(404).json({ error: "Machine not found." });
        }

        const updatedMachine = await Machine.findByIdAndUpdate(id, updateData, { new: true, runValidators: true });

        res.status(200).json({
            message: "Machine updated successfully.",
            updatedMachine
        });

    } catch (error) {
        console.error("Error while updating machine:", error);
        res.status(500).json({ error: "Internal server error." });
    }
};

exports.deleteMachine = async (req, res) => {
    try {
        const { id } = req.params;

        const machine = await Machine.findById(id);
        if (!machine) {
            return res.status(404).json({ error: "Machine not found." });
        }

        await Machine.findByIdAndDelete(id);

        res.status(200).json({ message: "Machine deleted successfully." });

    } catch (error) {
        console.error("Error while deleting machine:", error);
        res.status(500).json({ error: "Internal server error." });
    }
};

exports.getUserMachines = async (req, res) => {
    try {
        const userId = req.userId;

        const machines = await Machine.find({});

        if (!machines || machines.length === 0) {
            return res.status(404).json({ message: "No machines found." });
        }

        res.status(200).json({
            message: `Found ${machines.length} machine(s).`,
            machines
        });
    } catch (error) {
        console.error("Error while fetching user's machines:", error);
        res.status(500).json({ error: "Internal server error." });
    }
};

exports.getMachineReport = async (req, res) => {
    try {
        const { id, start, end } = req.query;
        const machine = await Machine.findById(id);
        if (!machine) {
            return res.status(404).json({ error: "Machine not found." });
        }

        const startDate = new Date(start);
        startDate.setHours(0, 0, 0, 0);
        const endDate = new Date(end);
        endDate.setHours(23, 59, 59, 999);

        const Sensor = require('../models/sensor.model');
        const Reading = require('../models/reading.model');

        const sensors = await Sensor.find({ machine: id });
        const sensorIds = sensors.map(s => s._id);

        const readings = await Reading.find({
            sensor: { $in: sensorIds },
            measuredAt: { $gte: startDate, $lte: endDate }
        });

        // Build a map of date string -> total consumption
        const consumptionByDay = {};
        const current = new Date(startDate);
        while (current <= endDate) {
            consumptionByDay[current.toISOString().split('T')[0]] = 0;
            current.setDate(current.getDate() + 1);
        }

        for (const reading of readings) {
            const day = new Date(reading.measuredAt).toISOString().split('T')[0];
            if (consumptionByDay[day] !== undefined) {
                consumptionByDay[day] += reading.measurement;
            }
        }

        const rows = Object.entries(consumptionByDay).map(([date, consumption]) => ({
            'Date': date,
            'Consumption (kW)': Math.round(consumption * 100) / 100
        }));

        const totalConsumption = rows.reduce((sum, row) => sum + row['Consumption (kW)'], 0);

        rows.push({ 'Date': '', 'Consumption (kW)': '' });
        rows.push({ 'Date': 'Total', 'Consumption (kW)': Math.round(totalConsumption * 100) / 100 });

        const csvData = await converter.json2csv(rows, { emptyFieldValue: '' });

        res.setHeader("Content-Type", "text/csv");
        res.setHeader(
            "Content-Disposition",
            `attachment; filename=machine_${id}_report.csv`
        );
        res.status(200).send(csvData);

    } catch (error) {
        console.error("Error while generating machine report:", error);
        res.status(500).json({ error: "Internal server error." });
    }
};


exports.getMachineRuntimeConfig = async (req, res) => {
    try {

        const { id } = req.params;

        const machine = await Machine.findById(id)
            .select('_id maxPowerConsumption downtimeThreshold');

        if (!machine) {
            return res.status(404).json({
                error: 'Machine not found.'
            });
        }

        res.status(200).json({
            machineId: machine._id,
            maxPowerConsumption: machine.maxPowerConsumption,
            downtimeThreshold: machine.downtimeThreshold
        });

    } catch (error) {

        console.error(
            'Error fetching machine runtime config:',
            error
        );

        res.status(500).json({
            error: 'Internal server error.'
        });
    }
};