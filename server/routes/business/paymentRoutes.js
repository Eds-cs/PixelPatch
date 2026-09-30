import express from "express";
import { generatePaymentLink } from "../../controllers/paymentController.js";
import { authRequired } from "../../middleware/authMiddleware.js";

const router = express.Router();

/* ==============================
   PAYMENTS (BUSINESS)
============================== */

// Generate payment link for a repair request
router.post(
  "/repairs/:requestId/payments/generate-link",
  authRequired,
  (req, res, next) => {
    // normalize param → body (to keep controller unchanged)
    req.body.request_id = req.params.requestId;
    next();
  },
  generatePaymentLink
);

export default router;
