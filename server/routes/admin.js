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

const router = express.Router();
router.use(authRequired, adminRequired);

router.get("/summary", getAdminSummary);

// Service review
router.get("/services", listServicesForReview);
router.get("/services/shops", listShopsForReview);
router.post("/services/bulk", bulkReviewServices);
router.post("/services/:id/approve", approveService);
router.post("/services/:id/reject", rejectService);

export default router;
