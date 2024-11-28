// backend/server.js
const express = require("express");
const connectDB = require("./config/db");
const User = require("./models/users");
const Donation = require("./models/Donation");
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const multer = require("multer");
const path = require("path");
const cors = require("cors");
const bodyParser = require("body-parser");
const authenticate = require("./middleware/authenticate"); // Include the authentication middleware
const RequestedResource = require("./models/RequestedResource"); // Import the requested resource model
const UserRequestedResource = require("./models/UserRequestResoure");
const Chat = require("./models/Chat");
const ContactMessage = require("./models/ContactMessage");

require("dotenv").config();

const app = express();
const http = require("http");
const { Server } = require("socket.io");

// Create HTTP server
const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: "*", // Allow requests from any origin
    methods: ["GET", "POST"],
  },
});

// Middleware for parsing JSON
app.use(express.json({ extended: false }));
require("dotenv").config();

// Connect to MongoDB
connectDB();

// Middleware
app.use(cors());
app.use(bodyParser.json());
app.use("/uploads", express.static(path.join(__dirname, "uploads")));

// Set up file upload with Multer
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, "uploads/"); // Ensure uploads/ folder exists
  },
  filename: function (req, file, cb) {
    cb(null, Date.now() + "-" + file.originalname);
  },
});

// Create an upload instance using the storage configuration
const upload = multer({ storage: storage });

// Routes

// Chat functionality
io.on("connection", (socket) => {
  console.log("A user connected:", socket.id);

  // Join room after verifying if users are eligible to chat (donation or request made)
  socket.on("joinRoom", async ({ roomId, userId }) => {
    try {
      const user = await User.findById(userId);

      if (!user) {
        return socket.emit("error", { message: "User not found" });
      }

      // Check if the user has donated or requested a resource
      const hasDonated = await Donation.exists({ userId: userId });
      const hasRequested = await UserRequestedResource.exists({
        userId: userId,
      });

      // Check if user has donated or requested a resource
      if (!hasDonated && !hasRequested) {
        return socket.emit("error", {
          message: "You are not eligible to chat",
        });
      }

      // User is eligible to chat, so join the room
      socket.join(roomId);
      console.log(`${userId} joined room: ${roomId}`);
    } catch (error) {
      console.error("Error joining room:", error);
      socket.emit("error", { message: "Internal server error" });
    }
  });

  // Handle sending messages in the chat
  socket.on("sendMessage", async ({ roomId, message, senderId }) => {
    try {
      // Ensure the sender is eligible to send a message (i.e., has donated or requested)
      const hasDonated = await Donation.exists({ userId: senderId });
      const hasRequested = await UserRequestedResource.exists({
        userId: senderId,
      });

      if (!hasDonated && !hasRequested) {
        return socket.emit("error", {
          message: "You are not allowed to send a message",
        });
      }

      const messageData = {
        roomId,
        senderId,
        message,
        timestamp: new Date(),
      };

      // Emit the message to all users in the room
      io.to(roomId).emit("receiveMessage", messageData);
    } catch (error) {
      console.error("Error sending message:", error);
      socket.emit("error", { message: "Internal server error" });
    }
  });

  // Handle disconnect
  socket.on("disconnect", () => {
    console.log("User disconnected:", socket.id);
  });
});

// Fetch user's profile data for sidebar
app.get("/user/profile", authenticate, async (req, res) => {
  try {
    const user = await User.findById(req.user._id).select(
      "name email profilePic"
    );
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }
    res.status(200).json({ profile: user });
  } catch (error) {
    console.error("Error fetching user profile:", error);
    res.status(500).json({ message: "Internal server error" });
  }
});

// POST route for donation
app.post("/donate", upload.array("images", 5), async (req, res) => {
  try {
    console.log("Received Files:", req.files); // Debugging log
    const { resourceName, quantity, category, description, location, userId } =
      req.body;

    if (!req.files || req.files.length === 0) {
      return res.status(400).json({ message: "No files uploaded" });
    }

    const imagePaths = req.files.map((file) => `/uploads/${file.filename}`); // Map file paths
    console.log("Image Paths:", imagePaths); // Debugging log

    const newDonation = new Donation({
      resourceName,
      quantity,
      category,
      description,
      location,
      image: imagePaths,
      userId,
    });

    await newDonation.save();
    res
      .status(201)
      .json({ message: "Donation successful", donation: newDonation });
  } catch (error) {
    console.error("Error in Donation Route:", error);
    res.status(500).json({ message: "Internal server error" });
  }
});

// GET route to fetch all donated resources
app.get("/donatedResources", async (req, res) => {
  try {
    const donatedResources = await Donation.find().populate(
      "userId",
      "name email"
    ); // Retrieve all donated resources from the DB

    if (!donatedResources) {
      return res.status(404).json({ message: "No donated resources found." });
    }
    res.status(200).json(donatedResources);
  } catch (err) {
    console.error("Error fetching donated resources:", err);
    res.status(500).json({ message: "Internal server error" });
  }
});

// Login Route
app.post("/login", async (req, res) => {
  const { email, password } = req.body;

  try {
    // Attempt to find user by email
    const user = await User.findOne({ email });
    if (!user) {
      return res.status(400).json({ message: "User not found" });
    }

    // Attempt password comparison
    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(400).json({ message: "Invalid credentials" });
    }

    // Attempt JWT generation (check for JWT_SECRET in .env)
    if (!process.env.JWT_SECRET) {
      console.error("JWT_SECRET is missing in .env file");
      return res.status(500).json({ message: "Server configuration error" });
    }

    const token = jwt.sign({ userId: user._id }, process.env.JWT_SECRET, {
      expiresIn: "1h",
    });
    const id = user._id;

    res.status(200).json({ message: "Login successful", token, id });
  } catch (err) {
    console.error("Error during login:", err);
    res.status(500).json({ message: "Internal server error" });
  }
});

// Signup route
app.post("/signup", async (req, res) => {
  const { name, email, password } = req.body;

  try {
    // Check if user already exists
    let existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(400).json({ message: "User already exists" });
    }

    // Hash the password
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    // Create a new user
    const newUser = new User({
      name,
      email,
      password: hashedPassword,
    });

    // Save the user to the database
    await newUser.save();

    res.status(201).json({ message: "Signup successful" });
  } catch (error) {
    console.error("Error during signup:", error);
    res.status(500).json({ message: "Internal server error" });
  }
});

// User Profile Route
app.get("/profile/:userId", async (req, res) => {
  try {
    const user = await User.findById(req.params.userId); // Fetch user data by ID
    if (!user) return res.status(404).json({ message: "User not found" });

    const donate_data = await Donation.find({ userId: req.params.userId });
    const requested_data = await RequestedResource.find({
      userId: req.params.userId,
    });

    res.json({
      name: user,
      donatedResources: donate_data || [],
      requestedResources: requested_data || [],
    });
  } catch (error) {
    console.error("Error fetching profile data:", error);
    res.status(500).json({ message: "Internal server error" });
  }
});

// PUT route to update user's profile (name, profilePic)

app.put(
  "/profile",
  authenticate,
  upload.single("profilePic"),
  async (req, res) => {
    const { name } = req.body;
    let profilePic = req.file ? `/uploads/${req.file.filename}` : undefined; // Handle profile picture if uploaded

    try {
      const user = req.user; // User is attached to the request object by the authenticate middleware

      if (name) user.name = name; // Update name if provided
      if (profilePic) user.profilePic = profilePic; // Update profilePic if a new image is uploaded

      await user.save();

      res.status(200).json({ message: "Profile updated successfully", user });
    } catch (err) {
      console.error("Error updating profile:", err);
      res.status(500).json({ message: "Internal server error" });
    }
  }
);

// Route to handle storing requested resources
app.post("/request-resource", upload.array("images", 5), async (req, res) => {
  try {
    console.log("Received Files:", req.files); // Log received files for debugging

    // Extract data from the request body
    const {
      resourceName,
      quantity,
      category,
      description,
      location,
      userId,
      customCategory,
    } = req.body;

    // Ensure at least one file is uploaded
    if (!req.files || req.files.length === 0) {
      return res.status(400).json({ message: "No files uploaded" });
    }

    // Map the file paths for the uploaded images
    const imagePaths = req.files.map((file) => `/uploads/${file.filename}`);
    console.log("Image Paths:", imagePaths); // Log the paths for debugging

    // Create a new RequestedResource document
    const newRequestedResource = new RequestedResource({
      resourceName,
      quantity,
      category,
      customCategory: category === "others" ? customCategory : undefined, // Store custom category if specified
      description,
      location,
      image: imagePaths, // Store the image paths
      userId, // Associate with the user who requested the resource
    });

    // Save the new requested resource to the database
    await newRequestedResource.save();

    // Return success response
    res.status(201).json({
      message: "Request successful",
      requestedResource: newRequestedResource,
    });
  } catch (error) {
    console.error("Error in Requesting Resource Route:", error);
    res.status(500).json({ message: "Internal server error" });
  }
});

// Route to fetch all requested resources
// GET route to fetch all requested resources for the logged-in user
app.get("/requestedResources", async (req, res) => {
  try {
    const getRequestedResource = await RequestedResource.find().populate(
      "userId",
      "name email"
    );

    // console.log("Requested Resources:", getRequestedResource); // Debugging log

    if (!getRequestedResource || getRequestedResource.length === 0) {
      return res.status(404).json({ message: "No requested resources found." });
    }
    res.status(200).json(getRequestedResource);
  } catch (err) {
    console.error("Error fetching requested resources:", err);
    res.status(500).json({ message: "Internal server error" });
  }
});

// Request a resource from donation
// POST /request-resource/:resourceId
app.get("/request-resource/:resourceId", authenticate, async (req, res) => {
  // console.log("hiii" + req.user);
  const { resourceId } = req.params; // Get resourceId from the URL parameter
  const { userId } = req.user; // Get the requesterId from the authenticated user

  // console.log("id" + userId);
  try {
    // Validate that the resource exists
    const resource = await Donation.findById(resourceId);
    if (!resource) {
      return res.status(404).json({ message: "Resource not found." });
    }
    console.log(resource);

    // Prevent users from requesting their own donated resources
    if (resource.userId.toString() === userId.toString()) {
      return res
        .status(403)
        .json({ message: "You cannot request your own donated resource." });
    }

    // Ensure the user hasn't already requested the same resource
    const existingRequest = await UserRequestedResource.findOne({
      resourceId: resourceId,
      userId: userId,
    });

    console.log("existing" + existingRequest);

    if (existingRequest) {
      return res
        .status(400)
        .json({ message: "You have already requested this resource." });
    }

    console.log("userid" + userId);
    // Create the resource request
    const newRequest = new UserRequestedResource({
      donorId: resource.userId,
      userId: userId,
      resourceId: resourceId,
      resourceName: resource.resourceName,
      category: resource.category,
      description: resource.description,
      image: resource.image,
    });

    console.log("newRequest" + newRequest);

    await newRequest.save(); // Save the new request to the database

    res.status(201).json({
      message: "Resource request submitted successfully.",
      request: newRequest,
    });
  } catch (error) {
    console.error("Error during resource request:", error);
    res.status(500).json({ message: "Internal server error." });
  }
});

// Get all resources requested by the logged-in user
app.get("/user-requested-resources", authenticate, async (req, res) => {
  try {
    const requests = await UserRequestedResource.find({
      requesterId: req.user._id,
    })
      .populate("resourceId")
      .populate("donorId", "name email");

    if (!requests.length) {
      return res.status(404).json({ message: "No requested resources found." });
    }

    res.status(200).json(requests);
  } catch (error) {
    console.error("Error fetching requested resources:", error);
    res.status(500).json({ message: "Internal server error." });
  }
});

// GET route to fetch all users
app.get("/users", async (req, res) => {
  try {
    const users = await User.find(); // Retrieve all users
    res.status(200).json(users);
  } catch (err) {
    console.error("Error fetching users:", err);
    res.status(500).json({ message: "Internal server error" });
  }
});

// DELETE route to remove a donated resource
app.delete("/donatedResources/:id", async (req, res) => {
  try {
    const resourceId = req.params.id;
    const deletedResource = await Donation.findByIdAndDelete(resourceId);

    if (!deletedResource) {
      return res.status(404).json({ message: "Resource not found" });
    }

    res.status(200).json({ message: "Resource removed successfully" });
  } catch (err) {
    console.error("Error removing resource:", err);
    res.status(500).json({ message: "Internal server error" });
  }
});

// DELETE route to remove a user
app.delete("/users/:id", async (req, res) => {
  try {
    const userId = req.params.id;
    const deletedUser = await User.findByIdAndDelete(userId);

    if (!deletedUser) {
      return res.status(404).json({ message: "User not found" });
    }

    res.status(200).json({ message: "User removed successfully" });
  } catch (err) {
    console.error("Error removing user:", err);
    res.status(500).json({ message: "Internal server error" });
  }
});

// Route to handle contact form submissions
app.post("/contact", authenticate, async (req, res) => {
  const { name, email, subject, message } = req.body;
  const userId = req.user._id;

  try {
    if (!name || !email || !subject || !message) {
      return res.status(400).json({ message: "All fields are required." });
    }

    const newContactMessage = new ContactMessage({
      userId,
      name,
      email,
      subject,
      message,
    });

    await newContactMessage.save();

    res
      .status(201)
      .json({ message: "Your message has been submitted successfully." });
  } catch (error) {
    console.error("Error submitting contact message:", error);
    res.status(500).json({ message: "Internal server error." });
  }
});

// Update user's profile (name, profilePic)
app.put(
  "/profile",
  authenticate,
  upload.single("profilePic"),
  async (req, res) => {
    const { name } = req.body;
    let profilePic = req.file ? `/uploads/${req.file.filename}` : undefined;

    try {
      const user = await User.findById(req.user._id);
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }

      if (name) user.name = name;
      if (profilePic) user.profilePic = profilePic;

      await user.save();

      res.status(200).json({ message: "Profile updated successfully", user });
    } catch (err) {
      console.error("Error updating profile:", err);
      res.status(500).json({ message: "Internal server error" });
    }
  }
);

const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
