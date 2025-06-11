import jwt from "jsonwebtoken";
import User from "../models/userModel.js";

const protectRoute = async (req, res, next) => {
  try {
    const token = req.cookies.jwt || req.headers.authorization?.split(" ")[1];

    if (!token) {
      return res.status(401).json({ 
        success: false,
        message: "Unauthorized: No token provided" 
      });
    }

    let decoded;
    try {
      decoded = jwt.verify(token, process.env.JWT_SECRET);
    } catch (err) {
      return res.status(401).json({ 
        success: false,
        message: "Unauthorized: Invalid or expired token" 
      });
    }

    const user = await User.findById(decoded.userId).select("-password");
    if (!user) {
      return res.status(401).json({ 
        success: false,
        message: "Unauthorized: User not found" 
      });
    }

    req.user = user;
    next();
  } catch (err) {
    console.error("Error in protectRoute:", err.message);
    res.status(500).json({ 
      success: false,
      message: "Server error in protectRoute" 
    });
  }
};

export default protectRoute;