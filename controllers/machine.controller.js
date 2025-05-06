const Machine = require('../models/machine.model');
const Line = require('../models/line.model');

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
        const userLines = await Line
            .find({ userId })
            .select('_id');

        if (userLines.length === 0) {
            return res.status(404).json({ message: "The user has no production lines." });
        }

        const lineIds = userLines.map(line => line._id);

        const machines = await Machine.find({ lineId: { $in: lineIds } });

        if (machines.length === 0) {
            return res.status(404).json({ message: "The user has no machines." });
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
