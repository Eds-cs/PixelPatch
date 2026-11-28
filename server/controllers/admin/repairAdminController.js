// controllers/admin/repairAdminController.js
// Admin · Repairs: every repair request across shops, READ-ONLY. Admins watch
// and support; the workflow itself stays with shops and clients (AGENTS.md
// section 15), so nothing here changes a request.
import db from "../../config/db.js";
import { REPAIR_AWAITING_SHOP_SQL } from "./serviceReviewController.js";

const MAX_PAGE = 100;
const NOT_CANCELLED = "(sr.client_approved IS NULL OR sr.client_approved <> 0)";
const OVERDUE_SQL =
  "(sr.status = 'IN_PROGRESS' AND rq.estimated_completion_time IS NOT NULL AND DATE(rq.estimated_completion_time) < CURDATE())";

// Tab -> SQL condition (on sr = service_requests, rq = its quotation).
const VIEWS = {
  ALL: "1 = 1",
  WAITING: REPAIR_AWAITING_SHOP_SQL,
  OVERDUE: OVERDUE_SQL,
  ACTIVE: `(sr.decision <> 'REJECTED' AND sr.status <> 'COMPLETED' AND ${NOT_CANCELLED})`,
  COMPLETED: "sr.status = 'COMPLETED'",
  CLOSED: "(sr.decision = 'REJECTED' OR sr.client_approved = 0)",
};

function parsePage(query) {
  const limit = Math.min(Math.max(parseInt(query.limit, 10) || 30, 1), MAX_PAGE);
  const offset = Math.max(parseInt(query.offset, 10) || 0, 0);
  return { limit, offset };
}
const likePattern = (text) => `%${String(text).replace(/[\\%_]/g, (c) => `\\${c}`)}%`;

const FROM = `
  FROM service_requests sr
  JOIN shops s ON s.id = sr.shop_id
  JOIN users c ON c.id = sr.client_id
  LEFT JOIN devices dv ON dv.id = sr.device_id
  LEFT JOIN request_quotations rq ON rq.request_id = sr.id`;

/* GET /api/admin/repairs?view=&q=&limit=&offset=
   q matches the request number, client, shop or device. Oldest first in the
   WAITING and OVERDUE views (they're queues), newest first otherwise. */
export const listRepairs = async (req, res) => {
  const view = String(req.query.view || "ALL").toUpperCase();
  if (!(view in VIEWS)) return res.status(400).json({ message: "Unknown view" });
  const { limit, offset } = parsePage(req.query);
  const q = String(req.query.q ?? "").trim().replace(/^#/, "");

  const where = [VIEWS[view]];
  const params = [];
  if (q) {
    const like = likePattern(q);
    where.push(
      "(sr.id = ? OR s.name LIKE ? OR CONCAT_WS(' ', c.first_name, c.last_name) LIKE ? OR c.email LIKE ? OR dv.name LIKE ? OR dv.brand LIKE ? OR dv.model LIKE ?)"
    );
    params.push(/^\d+$/.test(q) ? Number(q) : -1, like, like, like, like, like, like);
  }
  const whereSql = `WHERE ${where.join(" AND ")}`;
  const order = view === "WAITING" || view === "OVERDUE" ? "sr.created_at ASC" : "sr.created_at DESC";

  try {
    const [[{ total }]] = await db.promise().query(`SELECT COUNT(*) AS total ${FROM} ${whereSql}`, params);
    const [repairs] = await db.promise().query(
      `SELECT sr.id, sr.created_at, sr.updated_at, sr.completed_at, sr.delivery_method,
              sr.status, sr.decision, sr.payment_status, sr.deposit_paid_at, sr.client_approved,
              s.id AS shop_id, s.name AS shop_name,
              c.id AS client_id, CONCAT_WS(' ', c.first_name, c.last_name) AS client_name,
              dv.device_type, dv.name AS device_name, dv.brand AS device_brand, dv.model AS device_model,
              rq.estimated_cost, rq.estimated_completion_time,
              (SELECT d.status FROM disputes d WHERE d.request_id = sr.id LIMIT 1) AS dispute_status
       ${FROM} ${whereSql}
       ORDER BY ${order}, sr.id DESC
       LIMIT ? OFFSET ?`,
      [...params, limit, offset]
    );
    const [[counts]] = await db.promise().query(
      `SELECT ${Object.entries(VIEWS)
        .map(([key, condition]) => `SUM(${condition}) AS \`${key}\``) /* quoted: ALL is a reserved word */
        .join(", ")} ${FROM}`
    );
    res.json({
      repairs,
      total: Number(total),
      counts: Object.fromEntries(Object.keys(VIEWS).map((key) => [key, Number(counts[key] || 0)])),
    });
  } catch (err) {
    console.error("listRepairs:", { code: err.code, message: err.message });
    res.status(500).json({ message: "Couldn't load repairs." });
  }
};

/* GET /api/admin/repairs/:id — the whole record, read-only. */
export const getRepair = async (req, res) => {
  const id = Number(req.params.id);
  if (!Number.isSafeInteger(id) || id <= 0) return res.status(400).json({ message: "Invalid repair" });
  const q = (sql, params = [id]) => db.promise().query(sql, params).then(([rows]) => rows);
  try {
    const [repair] = await q(
      `SELECT sr.*, s.name AS shop_name, s.phone_number AS shop_phone, s.email AS shop_email,
              CONCAT_WS(' ', c.first_name, c.last_name) AS client_name, c.email AS client_email, c.phone AS client_phone,
              dv.device_type, dv.name AS device_name, dv.brand AS device_brand, dv.model AS device_model,
              dv.serial_number AS device_serial,
              CONCAT_WS(', ', a.street, a.barangay, a.city) AS service_address
       FROM service_requests sr
       JOIN shops s ON s.id = sr.shop_id
       JOIN users c ON c.id = sr.client_id
       LEFT JOIN devices dv ON dv.id = sr.device_id
       LEFT JOIN addresses a ON a.id = sr.pickup_address_id
       WHERE sr.id = ?`
    );
    if (!repair) return res.status(404).json({ message: "Repair not found" });

    const [services, [assessment], [quotation], payments, [assignment], [dispute]] = await Promise.all([
      q(
        `SELECT ss.name, ss.category, ss.custom_category, ss.base_price
         FROM service_request_items sri JOIN shop_services ss ON ss.id = sri.service_id WHERE sri.request_id = ?`
      ),
      q("SELECT device_condition, observed_issues, recommendation, is_remote, created_at FROM request_assessments WHERE request_id = ?"),
      q(
        `SELECT id, estimated_cost, deposit_percent, allow_cash, estimated_completion_time, status, created_at
         FROM request_quotations WHERE request_id = ?`
      ),
      q("SELECT id, kind, amount, status, paid_at, gateway, confirmed_by FROM payments WHERE request_id = ? ORDER BY id"),
      q(
        `SELECT ra.assigned_at, CONCAT_WS(' ', e.first_name, e.last_name) AS employee_name, e.role AS employee_role
         FROM request_assignments ra JOIN shop_employees e ON e.id = ra.employee_id WHERE ra.request_id = ?`
      ),
      q("SELECT id, status, proposed_resolution, created_at, resolved_at FROM disputes WHERE request_id = ?"),
    ]);
    const parts = quotation
      ? await q("SELECT name, cost FROM request_quotation_parts WHERE request_quotation_id = ?", [quotation.id])
      : [];
    res.json({ repair, services, assessment: assessment ?? null, quotation: quotation ? { ...quotation, parts } : null, payments, assignment: assignment ?? null, dispute: dispute ?? null });
  } catch (err) {
    console.error("getRepair:", { code: err.code, message: err.message });
    res.status(500).json({ message: "Couldn't load this repair." });
  }
};
