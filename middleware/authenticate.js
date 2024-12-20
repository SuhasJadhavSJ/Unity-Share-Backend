const jwt = require("jsonwebtoken");

const authenticate = (req, res, next) => {
  const token = req.header("Authorization")?.split(" ")[1]; // Extract token from the Authorization header
  if (!token) {
    return res
      .status(401)
      .json({ message: "Access Denied. No Token Provided." });
  }

  try {
    const decoded = jwt.verify(
      token,
      process.env.JWT_SECRET || "yourSecretKey"
    );
    // console.log("decode" + JSON.stringify(decoded, null, 2));
    req.user = decoded; // Attach decoded data to the request object
    // console.log("req" + req.user);
    next();
  } catch (error) {
    console.log(error);
    if (error.name === "TokenExpiredError") {
      return res
        .status(401)
        .json({ message: "Token has expired. Please log in again." });
    }
    return res.status(400).json({ message: "Invalid token." });
  }
};

module.exports = authenticate;
