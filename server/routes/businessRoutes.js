// server/routes/businessRoutes.js
import express from "express";
import rateLimit from "express-rate-limit";
import { authRequired } from "../middleware/authMiddleware.js";
import {
  registerBusiness,
  getMyShop,
  getRepairDetails,
  sendBusinessEmailCode,
  verifyBusinessEmailCode,
  checkBusinessPhone,
} from "../controllers/businessController.js";
import { uploadShopDocuments } from "../utils/shopDocuments.js";

const router = express.Router();
const MINUTE = 60 * 1000;

// Per account (these routes need sign-in). On top of the one-code-a-minute
// cooldown, so codes can't be requested over and over.
const perAccount = (limit, windowMs, message) =>
  rateLimit({
    windowMs,
    limit,
    standardHeaders: "draft-7",
    legacyHeaders: false,
    keyGenerator: (req) => `user:${req.user?.id}`,
    handler: (req, res, next, options) => res.status(options.statusCode).json({ message }),
  });

const emailCodeLimiter = perAccount(5, 30 * MINUTE, "Too many codes requested. Please wait 30 minutes and try again.");
const emailVerifyLimiter = perAccount(20, 30 * MINUTE, "Too many attempts. Please wait 30 minutes and try again.");
const phoneCheckLimiter = perAccount(30, 15 * MINUTE, "Too many checks. Please wait a few minutes and try again.");

// Business email verification before registering (utils/businessEmailVerification.js).
router.post("/business-register/email-code", authRequired, emailCodeLimiter, sendBusinessEmailCode);
router.post("/business-register/email-verify", authRequired, emailVerifyLimiter, verifyBusinessEmailCode);
router.post("/business-register/check-phone", authRequired, phoneCheckLimiter, checkBusinessPhone);

// Multipart: the form plus the business permit and other documents.
router.post("/business-register", authRequired, uploadShopDocuments, registerBusiness);
router.get("/my-shop", authRequired, getMyShop);

export default router;
