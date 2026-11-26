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

import { LIMITS, limitText } from "../utils/inputLimits.js";

const router = express.Router();

const EMAIL = { email: ["Email", LIMITS.email] };
const PASSWORD = { password: ["Password", LIMITS.password] };

router.post("/signup/start", signupCodeLimiter, limitText({ ...EMAIL, phone: ["Mobile number", LIMITS.phone] }), startSignup);
router.post(
  "/register",
  registerLimiter,
  limitText({
    first_name: ["First name", LIMITS.personName],
    middle_name: ["Middle name", LIMITS.personName],
    last_name: ["Last name", LIMITS.personName],
    ...EMAIL,
    phone: ["Mobile number", LIMITS.phone],
    ...PASSWORD,
    street: ["Street", LIMITS.addressLine],
    barangay: ["Barangay", LIMITS.addressLine],
  }),
  register
);
router.post("/login", loginIpLimiter, loginLimiter, limitText({ ...EMAIL, ...PASSWORD }), login);
router.post("/google-login", loginIpLimiter, googleLogin);
router.get("/session", authRequired, getSession);
router.post("/forgot-password", passwordResetLimiter, limitText(EMAIL), requestPasswordReset);
router.post("/reset-password", passwordResetLimiter, limitText({ ...EMAIL, ...PASSWORD, code: ["Code", 10] }), resetPassword);

export default router;
