// server/controllers/clientReviewController.js
import db from "../config/db.js";

/* ======================================================
   CREATE REVIEW
   POST /api/client/reviews
====================================================== */
export const createReview = async (req, res) => {
  const clientId = req.user.id;
  const { request_id, rating, feedback } = req.body;

  if (!rating) {
    return res.status(400).json({ message: "Rating is required" });
  }

  // Check request ownership + completion
  const [[request]] = await db.promise().query(
    `
    SELECT id, shop_id, status
    FROM service_requests
    WHERE id = ? AND client_id = ?
    `,
    [request_id, clientId]
  );

  if (!request || request.status !== "COMPLETED") {
    return res.status(403).json({ message: "Review not allowed" });
  }

  // Prevent duplicate review
  const [[existing]] = await db.promise().query(
    `
    SELECT id FROM reviews
    WHERE request_id = ? AND client_id = ?
    `,
    [request_id, clientId]
  );

  if (existing) {
    return res.status(400).json({ message: "Already reviewed" });
  }

  await db.promise().query(
    `
    INSERT INTO reviews
      (request_id, client_id, shop_id, rating, feedback, created_at)
    VALUES (?, ?, ?, ?, ?, NOW())
    `,
    [request_id, clientId, request.shop_id, rating, feedback]
  );

  return res.json({ message: "Review submitted" });
};

