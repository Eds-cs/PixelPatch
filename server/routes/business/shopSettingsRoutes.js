// routes/business/shopSettingsRoutes.js — mounted at /api/business
// The signed-in business's own shop settings.
import express from "express";
import db from "../../config/db.js";
import { authRequired } from "../../middleware/authMiddleware.js";
import { businessShopRequired } from "../../middleware/businessShopMiddleware.js";
import { validateShopTerms } from "../../utils/paymentTerms.js";

const router = express.Router();

/* PUT /api/business/shop/payment-terms { accepts_cash, deposit_percent }
   The shop's default payment terms. Only new quotations use them; a
   quotation already sent keeps its own copy. */
router.put("/shop/payment-terms", authRequired, businessShopRequired, async (req, res) => {
  const { error, terms } = validateShopTerms(req.body ?? {});
  if (error) return res.status(400).json({ message: error });
  try {
    await db.promise().query(
      "UPDATE shops SET accepts_cash = ?, default_deposit_percent = ?, updated_at = NOW() WHERE id = ?",
      [terms.acceptsCash ? 1 : 0, terms.depositPercent, req.shopId]
    );
    res.json({ success: true, accepts_cash: terms.acceptsCash ? 1 : 0, default_deposit_percent: terms.depositPercent });
  } catch (err) {
    console.error("update payment terms:", { code: err.code });
    res.status(500).json({ message: "Couldn't save your payment options." });
  }
});

export default router;
