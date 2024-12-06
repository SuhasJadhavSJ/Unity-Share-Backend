const mongoose = require("mongoose");

const userDonatedResourceSchema = new mongoose.Schema({
  donorId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true,  // The user who is donating the resource
  },
  requestedResourceId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "RequestedResource",  // Reference to the RequestedResource model
    required: true,  // The resource that is being donated
  },
  resourceName: {
    type: String,
    required: true,  // Name of the resource being donated
  },
  category: {
    type: String,  // Category of the resource
  },
  description: {
    type: String,  // Description of the resource
    required: true,
  },
  image: [{
    type: String,  // Array to hold image URLs related to the resource
  }],
  donationDate: {
    type: Date,
    default: Date.now,  // The date of donation
  },
});

module.exports = mongoose.model(
  "UserDonatedResource",  // Model name for the collection in the database
  userDonatedResourceSchema
);
