const express = require('express');
const Donation = require('../models/Donation');
const upload = require('../upload'); // Import multer upload middleware
const User = require('../models/User'); // Assuming User model exists
const router = express.Router();

// POST route for donating resources
router.post('/donate', upload.array('images', 5), async (req, res) => {
  try {
    const { resourceName, quantity, category, customCategory, description, location, userId } = req.body;

    // If category is 'others', use customCategory
    const finalCategory = category === 'others' ? customCategory : category;

    // Get image URLs or paths
    const images = req.files.map(file => `/uploads/${file.filename}`);

    // Create a new donation record
    const newDonation = new Donation({
      resourceName,
      quantity,
      category: finalCategory,
      customCategory,
      description,
      location,
      images,
      userId,
    });

    // Save the donation to the database
    await newDonation.save();

    res.status(201).json({ message: 'Donation successful', donation: newDonation });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Internal server error' });
  }
});

module.exports = router;
