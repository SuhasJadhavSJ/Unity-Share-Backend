const mongoose = require("mongoose");

const userRequestedResourceSchema = new mongoose.Schema({
  donorId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true,
  },
  requesterId: {
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
});

module.exports = mongoose.model("UserRequestedResource", userRequestedResourceSchema);