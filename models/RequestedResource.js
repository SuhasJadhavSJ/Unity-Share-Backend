const mongoose = require('mongoose');

const RequestedResourceSchema = new mongoose.Schema({
  resourceName: { type: String, required: true },
  quantity: { type: Number, required: true },
  category: { type: String, required: true },
  customCategory: { type: String },
  description: { type: String, required: true },
  location: { type: String, required: true },
  image: [{ type: String }], // Store image paths (URLs if using external storage)
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true }, // Reference to the user who donated
  createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('RequestedResource', RequestedResourceSchema);