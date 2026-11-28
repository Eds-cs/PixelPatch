// controllers/admin/disputeAdminController.js
// Admin · Disputes (AGENTS.md business rule 7).
//
// The client opens a dispute; the shop offers a refund or a re-service; the
// client accepts (RESOLVED) or declines (REJECTED). An admin steps in when:
//   * the client declined the shop's offer (status REJECTED), or
//   * the shop didn't answer within 2 days (status OPEN, older than 2 days).
// The admin then decides: refund, re-service, or decline the complaint. The
// dispute becomes RESOLVED with proposed_resolution = the decision (NULL when
// declined), and the admin's explanation is added to its history as 'ADMIN'.
//
// Deciding records the outcome only. It doesn't move money: refunds through
// the payment provider aren't built, so a refund is arranged separately.
import db from "../../config/db.js";
import { withTransaction } from "../../utils/transaction.js";
import { DISPUTE_NEEDS_ADMIN_SQL } from "./serviceReviewController.js";

const MAX_PAGE = 100;
const OUTCOMES = { REFUND: "Refund", RESERVICE: "Re-service", DECLINE: "Complaint declined" };

const VIEWS = {
  NEEDS_ADMIN: DISPUTE_NEEDS_ADMIN_SQL,
  IN_PROGRESS: `(d.status IN ('OPEN', 'SHOP_PROPOSED') AND NOT ${DISPUTE_NEEDS_ADMIN_SQL})`,
  RESOLVED: "d.status = 'RESOLVED'",
  ALL: "1 = 1",
};

function parsePage(query) {
  const limit = Math.min(Math.max(parseInt(query.limit, 10) || 30, 1), MAX_PAGE);
  const offset = Math.max(parseInt(query.offset, 10) || 0, 0);
  return { limit, offset };
}
const likePattern = (text) => `%${String(text).replace(/[\\%_]/g, (c) => `\\${c}`)}%`;

const FROM = `
  FROM disputes d
  JOIN service_requests sr ON sr.id = d.request_id
  JOIN shops s ON s.id = d.shop_id
  JOIN users c ON c.id = d.client_id
  LEFT JOIN devices dv ON dv.id = sr.device_id`;

// Why an admin is needed: DECLINED (client turned down the offer) or NO_REPLY.
const REASON_SQL = `CASE WHEN d.status = 'REJECTED' THEN 'DECLINED'
  WHEN d.status = 'OPEN' AND d.created_at < NOW() - INTERVAL 2 DAY THEN 'NO_REPLY' END`;

/* GET /api/admin/disputes?view=NEEDS_ADMIN|IN_PROGRESS|RESOLVED|ALL&q=&limit=&offset= */
export const listDisputes = async (req, res) => {
  const view = String(req.query.view || "NEEDS_ADMIN").toUpperCase();
  if (!(view in VIEWS)) return res.status(400).json({ message: "Unknown view" });
  const { limit, offset } = parsePage(req.query);
  const q = String(req.query.q ?? "").trim().replace(/^#/, "");

  const where = [VIEWS[view]];
  const params = [];
  if (q) {
    const like = likePattern(q);
    where.push("(d.id = ? OR sr.id = ? OR s.name LIKE ? OR CONCAT_WS(' ', c.first_name, c.last_name) LIKE ?)");
    const n = /^\d+$/.test(q) ? Number(q) : -1;
    params.push(n, n, like, like);
  }
  const whereSql = `WHERE ${where.join(" AND ")}`;

  try {
    const [[{ total }]] = await db.promise().query(`SELECT COUNT(*) AS total ${FROM} ${whereSql}`, params);
    const [disputes] = await db.promise().query(
      `SELECT d.id, d.request_id, d.status, d.proposed_resolution, d.created_at, d.resolved_at,
              ${REASON_SQL} AS needs_admin_reason,
              d.created_at + INTERVAL 2 DAY AS reply_due,
              s.name AS shop_name, CONCAT_WS(' ', c.first_name, c.last_name) AS client_name,
              dv.name AS device_name,
              (SELECT content FROM dispute_edits e WHERE e.dispute_id = d.id AND e.edited_by = 'CLIENT'
               ORDER BY e.created_at, e.id LIMIT 1) AS complaint
       ${FROM} ${whereSql}
       ORDER BY ${view === "NEEDS_ADMIN" ? "d.created_at ASC" : "d.created_at DESC"}, d.id DESC
       LIMIT ? OFFSET ?`,
      [...params, limit, offset]
    );
    const [[counts]] = await db.promise().query(
      // Aliases quoted: ALL is a reserved word.
      `SELECT ${Object.entries(VIEWS).map(([k, c]) => `SUM(${c}) AS \`${k}\``).join(", ")} ${FROM}`
    );
    res.json({
      disputes,
      total: Number(total),
      counts: Object.fromEntries(Object.keys(VIEWS).map((k) => [k, Number(counts[k] || 0)])),
    });
  } catch (err) {
    console.error("listDisputes:", { code: err.code, message: err.message });
    res.status(500).json({ message: "Couldn't load disputes." });
  }
};

/* GET /api/admin/disputes/:id — the dispute, its history, and what was paid. */
export const getDispute = async (req, res) => {
  const id = Number(req.params.id);
  if (!Number.isSafeInteger(id) || id <= 0) return res.status(400).json({ message: "Invalid dispute" });
  try {
    const [[dispute]] = await db.promise().query(
      `SELECT d.*, ${REASON_SQL} AS needs_admin_reason, d.created_at + INTERVAL 2 DAY AS reply_due,
              sr.issue_description, sr.completed_at, sr.delivery_method,
              s.name AS shop_name, s.phone_number AS shop_phone, s.email AS shop_email,
              CONCAT_WS(' ', c.first_name, c.last_name) AS client_name, c.email AS client_email, c.phone AS client_phone,
              dv.name AS device_name, dv.brand AS device_brand, dv.model AS device_model,
              rq.estimated_cost, rq.deposit_percent, rq.allow_cash
       ${FROM}
       LEFT JOIN request_quotations rq ON rq.request_id = sr.id
       WHERE d.id = ?`,
      [id]
    );
    if (!dispute) return res.status(404).json({ message: "Dispute not found" });
    const [history] = await db.promise().query(
      "SELECT id, edited_by, content, created_at FROM dispute_edits WHERE dispute_id = ? ORDER BY created_at, id",
      [id]
    );
    const [payments] = await db.promise().query(
      "SELECT id, kind, amount, status, gateway, paid_at FROM payments WHERE request_id = ? ORDER BY id",
      [dispute.request_id]
    );
    res.json({ dispute, history, payments });
  } catch (err) {
    console.error("getDispute:", { code: err.code, message: err.message });
    res.status(500).json({ message: "Couldn't load this dispute." });
  }
};

/* POST /api/admin/disputes/:id/decide { outcome: REFUND|RESERVICE|DECLINE, note } */
export const decideDispute = async (req, res) => {
  const id = Number(req.params.id);
  if (!Number.isSafeInteger(id) || id <= 0) return res.status(400).json({ message: "Invalid dispute" });
  const outcome = String(req.body?.outcome ?? "").toUpperCase();
  if (!(outcome in OUTCOMES)) return res.status(400).json({ field: "outcome", message: "Choose a decision." });
  const note = String(req.body?.note ?? "").trim();
  if (note.length < 10) {
    return res.status(400).json({ field: "note", message: "Explain the decision to the client and shop (at least 10 characters)." });
  }
  if (note.length > 1000) return res.status(400).json({ field: "note", message: "Keep it under 1000 characters." });

  try {
    const result = await withTransaction(async (conn) => {
      const [[dispute]] = await conn.query(
        `SELECT d.id, ${DISPUTE_NEEDS_ADMIN_SQL} AS needs_admin FROM disputes d WHERE d.id = ? FOR UPDATE`,
        [id]
      );
      if (!dispute) return { status: 404, message: "Dispute not found" };
      if (!Number(dispute.needs_admin)) {
        return {
          status: 409,
          message: "This dispute doesn't need an admin: the shop and client are still settling it, or it's already resolved.",
        };
      }
      await conn.query(
        `UPDATE disputes SET status = 'RESOLVED', proposed_resolution = ?, resolved_at = NOW() WHERE id = ?`,
        [outcome === "DECLINE" ? null : outcome, id]
      );
      await conn.query(
        "INSERT INTO dispute_edits (dispute_id, edited_by, content) VALUES (?, 'ADMIN', ?)",
        [id, `PixelPatch decision: ${OUTCOMES[outcome]}. ${note}`]
      );
      return { status: 200 };
    });
    if (result.status !== 200) return res.status(result.status).json({ message: result.message });
    res.json({ success: true, outcome });
  } catch (err) {
    console.error("decideDispute:", { code: err.code, message: err.message });
    res.status(500).json({ message: "Couldn't save the decision." });
  }
};
