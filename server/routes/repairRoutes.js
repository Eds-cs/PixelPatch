// server/routes/repairRoutes.js
import express from "express";
import { authRequired } from "../middleware/authMiddleware.js";
import {
  getRepairsForShop,
  getRepairById,
  rejectRepair,
  confirmRepair,
  getAssessmentByRequest,
  saveAssessment,
  createQuotation,
  getQuotationByRequest,
  updateQuotation,
  startRepair,
  getRepairInProgress,
  markRepairCompleted,
  getCompletedRepair 
} from "../controllers/repairController.js";
console.log("🔥 repairRoutes loaded");
const router = express.Router();

// GET single repair (details page)
router.get("/details/:id", authRequired, getRepairById);

// POST reject repair
router.post("/reject/:id", authRequired, rejectRepair);

// POST confirm repair
router.post("/confirm/:id", authRequired, confirmRepair);

// POST create assessment for a repair request
router.post("/:id/assessment", authRequired, saveAssessment);

// GET assessment by repair request ID
router.get("/:id/assessment", authRequired, getAssessmentByRequest);

// Create quotation
router.post("/:id/quotation", authRequired, createQuotation);

// Update quotation
router.put("/:id/quotation", authRequired, updateQuotation);

// Get quotation by request
router.get("/:id/quotation", authRequired, getQuotationByRequest);

// GET all repairs for a shop
router.get("/:shopId", authRequired, getRepairsForShop);

// POST start repair
router.post("/:id/start", authRequired, startRepair);

// GET repair in progress (business)
router.get("/:id/in-progress", authRequired, getRepairInProgress);

router.post("/:id/complete", authRequired, markRepairCompleted);

// View completed repair (invoice)
router.get("/:id/completed", authRequired, getCompletedRepair);


export default router;
