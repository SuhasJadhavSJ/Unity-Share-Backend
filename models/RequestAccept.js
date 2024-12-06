// models/ResourceAccepted.js
const mongoose = require('mongoose');

const resourceAcceptedSchema = new mongoose.Schema({
    resourceId: { type: mongoose.Schema.Types.ObjectId, ref: 'Resource', required: true },
    requesterId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    acceptedAt: { type: Date, default: Date.now },
});

module.exports = mongoose.model('ResourceAccepted', resourceAcceptedSchema);
