const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const machineSchema = new Schema({
    name: {
        type: String,
        required: true
    },
    lineId: {
        type: Schema.Types.ObjectId,
        ref: 'Line',
        required: true
    }
});

module.exports = mongoose.model('Machine', machineSchema);