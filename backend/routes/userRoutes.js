import express from "express";
import {
  followUnFollowUser,
  getUserProfile,
  loginUser,
  logoutUser,
  signupUser,
  updateUser,
  getSuggestedUsers,
  freezeAccount,
  adminLogin,
  banUser,
  unbanUser,
  getUserDashboard,
  promoteToAdmin,
  getUserStats,
  getAdminRealtimeDashboard,
  getMultipleUsers,
  getAllUsers,
  refreshToken,
} from "../controllers/userController.js";
import protectRoute from "../middlewares/protectRoute.js";
import multer from "multer";

const router = express.Router();
const upload = multer({ dest: "uploads/" });

router.get("/profile/:query", getUserProfile);
router.get("/suggested", protectRoute, getSuggestedUsers);
router.get("/dashboard", protectRoute, getUserDashboard);
router.get("/stats/:username", getUserStats);
router.post("/signup", signupUser);
router.post("/login", loginUser);
router.post("/admin/login", adminLogin);
router.post("/logout", logoutUser);
router.post("/follow/:id", protectRoute, followUnFollowUser);
router.post("/multiple", protectRoute, getMultipleUsers);
router.put("/update", protectRoute, upload.single("profilePic"), updateUser);
router.put("/freeze", protectRoute, freezeAccount);
router.put("/ban/:id", protectRoute, banUser);
router.put("/unban/:id", protectRoute, unbanUser);
router.put("/promote/:id", protectRoute, promoteToAdmin);
router.get("/all-users-for-posts", protectRoute, getAllUsers);
router.get("/all", protectRoute, getAllUsers);
router.get("/admin/realtime-dashboard", protectRoute, getAdminRealtimeDashboard);
router.post("/auth/refresh-token", protectRoute, refreshToken);

export default router;