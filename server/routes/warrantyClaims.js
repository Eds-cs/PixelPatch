// routes/warrantyClaims.js — mounted at /api (controllers/warrantyClaimController.js)
// Warranty claims, client and shop side (AGENTS.md business rule 9).
import express from "express";
import { authRequired } from "../middleware/authMiddleware.js";
import { businessShopRequired } from "../middleware/businessShopMiddleware.js";
import { upload } from "../middleware/upload.js";
import { LIMITS, limitText } from "../utils/inputLimits.js";
import {
  acceptWarrantyClaim,
  createWarrantyClaim,
  declineWarrantyClaim,
  escalateWarrantyClaim,
} from "../controllers/warrantyClaimController.js";

const router = express.Router();

router.post(
  "/client/repairs/:id/warranty-claims",
  authRequired,
  upload.array("photos", 5),
  limitText({ problem: ["What's wrong", LIMITS.warrantyClaim] }),
  createWarrantyClaim
);
router.post("/client/warranty-claims/:id/escalate", authRequired, escalateWarrantyClaim);

router.post("/business/warranty-claims/:id/accept", authRequired, businessShopRequired, acceptWarrantyClaim);
router.post(
  "/business/warranty-claims/:id/decline",
  authRequired,
  businessShopRequired,
  limitText({ reason: ["The reason", LIMITS.warrantyClaim] }),
  declineWarrantyClaim
);

export default router;
