// routes/business/shopSettingsRoutes.js — mounted at /api/business
// The signed-in business's own shop settings.
import express from "express";
import db from "../../config/db.js";
import { authRequired } from "../../middleware/authMiddleware.js";
import { businessShopRequired } from "../../middleware/businessShopMiddleware.js";
import { validateShopTerms } from "../../utils/paymentTerms.js";
import { validateWarranty } from "../../utils/warranty.js";

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

/* PUT /api/business/shop/warranty { warranty: null | { warrantyValue, warrantyUnit, coverage, exclusions } }
   The shop's usual warranty (business rule 9), copied into new quotations.
   null = no default warranty. Quotations already sent keep their own. */
router.put("/shop/warranty", authRequired, businessShopRequired, async (req, res) => {
  const { error, field, warranty } = validateWarranty(req.body?.warranty ?? null);
  if (error) return res.status(400).json({ message: error, field });
  try {
    await db.promise().query(
      `UPDATE shops
          SET default_warranty_value = ?, default_warranty_unit = ?, default_warranty_coverage = ?,
              default_warranty_exclusions = ?, updated_at = NOW()
        WHERE id = ?`,
      [warranty?.value ?? null, warranty?.unit ?? null, warranty?.coverage ?? null, warranty?.exclusions ?? null, req.shopId]
    );
    res.json({ success: true, warranty });
  } catch (err) {
    console.error("update default warranty:", { code: err.code });
    res.status(500).json({ message: "Couldn't save your warranty." });
  }
});

export default router;
