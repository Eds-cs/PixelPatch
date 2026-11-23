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
} from "../controllers/admin/shopReviewController.js";

const router = express.Router();
router.use(authRequired, adminRequired);

router.get("/summary", getAdminSummary);

// Service review
router.get("/services", listServicesForReview);
router.get("/services/shops", listShopsForReview);
router.post("/services/bulk", bulkReviewServices);
router.post("/services/:id/approve", approveService);
router.post("/services/:id/reject", rejectService);

// Business registrations (shop verification)
router.get("/shops", listShopRegistrations);
router.post("/shops/:id/approve", approveShop);
router.post("/shops/:id/reject", rejectShop);

export default router;
