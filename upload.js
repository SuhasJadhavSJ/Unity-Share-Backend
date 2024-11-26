const multer = require('multer');
const path = require('path');

// Set up file storage for Multer (store images in a folder on the server)
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, 'uploads/');
  },
  filename: (req, file, cb) => {
    cb(null, Date.now() + path.extname(file.originalname)); // Store images with unique filenames
  }
});

const upload = multer({ storage: storage });

module.exports = upload;
