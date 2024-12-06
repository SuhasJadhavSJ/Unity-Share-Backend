// models/ResourceRejected.js
const mongoose = require('mongoose');

const resourceRejectedSchema = new mongoose.Schema({
    resourceId: { type: mongoose.Schema.Types.ObjectId, ref: 'Resource', required: true },
    requesterId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    rejectedAt: { type: Date, default: Date.now },
});

module.exports = mongoose.model('ResourceRejected', resourceRejectedSchema);
