// server/routes/repairRoutes.js
import express from "express";
import { authRequired } from "../middleware/authMiddleware.js";
import { businessShopRequired } from "../middleware/businessShopMiddleware.js";
import {
  getRepairsForShop,
  getRepairById,
  getRepairServices,
  addRepairServices,
  rejectRepair,
  confirmRepair,
  getAssessmentByRequest,
  saveAssessment,
  createQuotation,
  getQuotationByRequest,
  updateQuotation,
  setQuotationCompletionDate,
  startRepair,
  getRepairInProgress,
  markRepairCompleted,
  getCompletedRepair,
  markDeviceReceived,
  confirmCashBalance
} from "../controllers/repairController.js";
console.log("🔥 repairRoutes loaded");
import { LIMITS, limitText } from "../utils/inputLimits.js";

const router = express.Router();
router.use(authRequired, businessShopRequired);

// GET single repair (details page)
router.get("/details/:id", getRepairById);
router.get("/:id/services", getRepairServices);
router.post("/:id/services", addRepairServices);

// POST reject repair
router.post("/reject/:id", limitText({ reason: ["Reason", LIMITS.rejectionReason] }), rejectRepair);

// POST confirm repair
router.post("/confirm/:id", confirmRepair);

// POST create assessment for a repair request
router.post(
  "/:id/assessment",
  limitText({
    deviceCondition: ["Device condition", LIMITS.assessmentField],
    observedIssues: ["Observed issues", LIMITS.assessmentField],
    recommendation: ["Recommendation", LIMITS.assessmentField],
  }),
  saveAssessment
);

// GET assessment by repair request ID
router.get("/:id/assessment", getAssessmentByRequest);

const QUOTATION_TEXT = limitText({ "parts[].name": ["Part name", LIMITS.partName] });

// Create quotation
router.post("/:id/quotation", QUOTATION_TEXT, createQuotation);

// Update quotation
router.put("/:id/quotation", QUOTATION_TEXT, updateQuotation);
router.put("/:id/quotation/completion", setQuotationCompletionDate);

// Get quotation by request
router.get("/:id/quotation", getQuotationByRequest);

// GET all repairs for a shop
router.get("/:shopId", getRepairsForShop);

// POST start repair
router.post("/:id/start", startRepair);

// GET repair in progress (business)
router.get("/:id/in-progress", getRepairInProgress);

router.post("/:id/complete", markRepairCompleted);

// Confirm the client paid the balance in cash (business rule 5)
router.post("/:id/balance/cash", confirmCashBalance);

// Record that the shop has the device (pickup / drop-off only)
router.post("/:id/received", markDeviceReceived);

// View completed repair (invoice)
router.get("/:id/completed", getCompletedRepair);


export default router;
