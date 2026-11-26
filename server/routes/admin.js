// routes/admin.js — mounted at /api/admin. Every route is admin-only.
import express from "express";
import { authRequired } from "../middleware/authMiddleware.js";
import { adminRequired } from "../middleware/adminMiddleware.js";
import {
  getAdminSummary,
  listServicesForReview,
  listShopsForReview,
  approveService,
  rejectService,
  bulkReviewServices,
} from "../controllers/admin/serviceReviewController.js";
import {
  listShopRegistrations,
  approveShop,
  rejectShop,
  documentLink,
} from "../controllers/admin/shopReviewController.js";
import { listUsers, getUser, suspendUser, reactivateUser } from "../controllers/admin/userAdminController.js";
import { listRepairs, getRepair } from "../controllers/admin/repairAdminController.js";
import { listDisputes, getDispute, decideDispute } from "../controllers/admin/disputeAdminController.js";

import { LIMITS, limitText } from "../utils/inputLimits.js";

const router = express.Router();
router.use(authRequired, adminRequired);

router.get("/summary", getAdminSummary);

// Service review
router.get("/services", listServicesForReview);
router.get("/services/shops", listShopsForReview);
const NOTE_TEXT = limitText({ note: ["The reason", LIMITS.adminNote] });

router.post("/services/bulk", NOTE_TEXT, bulkReviewServices);
router.post("/services/:id/approve", approveService);
router.post("/services/:id/reject", NOTE_TEXT, rejectService);

// Business registrations (shop verification)
router.get("/shops", listShopRegistrations);
router.post("/shops/:id/approve", approveShop);
router.post("/shops/:id/reject", NOTE_TEXT, rejectShop);
router.post("/shops/:id/documents/:attachmentId/link", documentLink);

// Accounts
router.get("/users", listUsers);
router.get("/users/:id", getUser);
router.post("/users/:id/suspend", limitText({ reason: ["The reason", LIMITS.suspendReason] }), suspendUser);
router.post("/users/:id/reactivate", reactivateUser);

// Repairs (read-only)
router.get("/repairs", listRepairs);
router.get("/repairs/:id", getRepair);

// Disputes
router.get("/disputes", listDisputes);
router.get("/disputes/:id", getDispute);
router.post("/disputes/:id/decide", limitText({ note: ["The explanation", LIMITS.disputeText] }), decideDispute);

export default router;
