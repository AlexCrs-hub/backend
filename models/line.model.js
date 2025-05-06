const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const lineSchema = new Schema({
    name: {
        type: String,
        required: true
    },
    userId: {
        type: Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    machines: [{
        type: Schema.Types.ObjectId,
        ref: 'Machine'
    }]
});

module.exports = mongoose.model('Line', lineSchema);