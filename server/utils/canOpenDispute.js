import db from "../config/db.js";

export async function canOpenDispute(requestId, clientId) {
  // 1. Must be completed within 7 days
  const [requests] = await db.promise().query(
    `
    SELECT id, shop_id
    FROM service_requests
    WHERE id = ?
      AND client_id = ?
      AND status = 'COMPLETED'
      AND completed_at >= NOW() - INTERVAL 7 DAY
    `,
    [requestId, clientId]
  );

  if (requests.length === 0) return null;

  // 2. Must be paid
  const [payments] = await db.promise().query(
    `
    SELECT id
    FROM payments
    WHERE request_id = ?
      AND status = 'PAID'
      AND paid_at IS NOT NULL
    `,
    [requestId]
  );

  if (payments.length === 0) return null;

  // 3. No review yet
  const [reviews] = await db.promise().query(
    `SELECT id FROM reviews WHERE request_id = ?`,
    [requestId]
  );

  if (reviews.length > 0) return null;

  // 4. No existing dispute
  const [disputes] = await db.promise().query(
    `SELECT id FROM disputes WHERE request_id = ?`,
    [requestId]
  );

  if (disputes.length > 0) return null;

  return requests[0]; // contains shop_id
}
