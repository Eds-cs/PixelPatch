import express from "express";
import { register, login, googleLogin, getSession } from "../controllers/authController.js";
import { authRequired } from "../middleware/authMiddleware.js";
import { requestPasswordReset, resetPassword } from "../controllers/passwordResetController.js";
import { startSignup } from "../controllers/signupVerificationController.js";
import {
  loginLimiter,
  loginIpLimiter,
  registerLimiter,
  passwordResetLimiter,
  signupCodeLimiter,
} from "../middleware/rateLimits.js";

const router = express.Router();

router.post("/signup/start", signupCodeLimiter, startSignup);
router.post("/register", registerLimiter, register);
router.post("/login", loginIpLimiter, loginLimiter, login);
router.post("/google-login", loginIpLimiter, googleLogin);
router.get("/session", authRequired, getSession);
router.post("/forgot-password", passwordResetLimiter, requestPasswordReset);
router.post("/reset-password", passwordResetLimiter, resetPassword);

export default router;
