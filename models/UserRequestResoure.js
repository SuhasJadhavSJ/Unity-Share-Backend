const mongoose = require("mongoose");

const userRequestedResourceSchema = new mongoose.Schema({
  donorId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true,
  },
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true,
  },
  resourceId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Donation",
    required: true,
  },
  resourceName: {
    type: String,
    required: true,
  },
  category: String,
  description: String,
  image: String,
  requestDate: {
    type: Date,
    default: Date.now,
  },
  description: { type: String, required: true },
  image: [{ type: String }],
});

module.exports = mongoose.model(
  "UserRequestedResource",
  userRequestedResourceSchema
);
