// server/controllers/paymentController.js
// POST /api/business/repairs/:requestId/payments/generate-link
// Creates the Xendit link for what is due now: the deposit (or the full
// amount at 100%) after the client approves, or the balance once the repair
// has started. The rules live in utils/paymentPlan.js.
import db from "../config/db.js";
import { createPaymentLinkFor } from "../utils/paymentPlan.js";

export const generatePaymentLink = async (req, res) => {
  const user = req.user;
  if (!user) return res.status(401).json({ message: "No auth user" });
  if (Number(user.role_id) !== 3) return res.status(403).json({ message: "Only businesses can access this" });

  const requestId = Number(req.body.request_id);
  if (!Number.isSafeInteger(requestId) || requestId <= 0) {
    return res.status(400).json({ message: "request_id is required" });
  }

  try {
    const [[shop]] = await db.promise().query("SELECT id FROM shops WHERE user_id = ? LIMIT 1", [user.id]);
    if (!shop) return res.status(403).json({ message: "No shop found for this business" });

    const { status, body } = await createPaymentLinkFor({ requestId, shopId: shop.id });
    return res.status(status).json(body);
  } catch (err) {
    console.error("generatePaymentLink:", err.code || err.message);
    return res.status(500).json({ message: "Couldn't create the payment link" });
  }
};
