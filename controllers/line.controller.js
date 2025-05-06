const Line = require('../models/line.model');
const Machine = require('../models/machine.model');

exports.addLine = async (req, res) => {
    try {
        const { name } = req.body;
        const userId = req.userId;

        if (!name || !userId) {
            return res.status(400).json({ success: false, message: 'Name and userId are required' });
        }

        const lineAlreadyExists = await Line.findOne({ name, userId }).lean();
        if (lineAlreadyExists) {
            return res.status(409).json({ success: false, message: 'Line with this name already exists for this user' });
        }

        const line = new Line({ name, userId });
        await line.save();

        return res.status(201).json({ success: true, message: 'Line created successfully', data: line });
    
    } catch (error) {
        console.error(error);
        return res.status(500).json({ success: false, message: 'Internal server error' });
    }
};

exports.getLines = async (req, res) => {
    const userId = req.userId;
    try {
        const lines = await Line.find({ userId }).populate('machines').lean();
        return res.status(200).json({ success: true, data: lines });
    } catch (error) {
        console.error(error);
        return res.status(500).json({ success: false, message: 'Internal server error' });
    }
};


exports.getLine = async (req, res) => {
    try {
        const { id } = req.params;

        if (!id) {
            return res.status(400).json({ success: false, message: 'Line ID is required' });
        }

        const line = await Line.findById(id).populate('machines').lean();

        if (!line) {
            return res.status(404).json({ success: false, message: 'Line not found' });
        }

        return res.status(200).json({ success: true, data: line });
    } catch (error) {
        console.error(error);
        return res.status(500).json({ success: false, message: 'Internal server error' });
    }
};


exports.deleteLine = async (req, res) => {
    try {
        const { id } = req.params; 

        if (!id) {
            return res.status(400).json({ success: false, message: 'Line ID is required' });
        }


        const line = await Line.findById(id);
        if (!line) {
            return res.status(404).json({ success: false, message: 'Line not found' });
        }

        await Machine.deleteMany({ lineId: id });

        await Line.findByIdAndDelete(id);

        return res.status(200).json({ success: true, message: 'Line deleted successfully' });
    } catch (error) {
        console.error(error);
        return res.status(500).json({ success: false, message: 'Internal server error' });
    }
};

