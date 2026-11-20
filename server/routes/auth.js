import express from "express";
import { register, login, googleLogin } from "../controllers/authController.js";
import { requestPasswordReset, resetPassword } from "../controllers/passwordResetController.js";
import {
  loginLimiter,
  loginIpLimiter,
  registerLimiter,
  passwordResetLimiter,
} from "../middleware/rateLimits.js";

const router = express.Router();

router.post("/register", registerLimiter, register);
router.post("/login", loginIpLimiter, loginLimiter, login);
router.post("/google-login", loginIpLimiter, googleLogin);
router.post("/forgot-password", passwordResetLimiter, requestPasswordReset);
router.post("/reset-password", passwordResetLimiter, resetPassword);

export default router;
