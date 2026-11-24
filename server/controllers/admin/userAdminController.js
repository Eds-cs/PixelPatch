// controllers/admin/userAdminController.js
// Admin · Users: find accounts, see what they do on PixelPatch, and suspend
// or reactivate them (utils/accountStatus.js enforces suspensions).
//
// Roles are not changed here: business accounts come from shop approval
// (admin/shopReviewController.js), and making someone an admin should stay a
// deliberate database change.
import db from "../../config/db.js";
import { forgetAccountStatus } from "../../utils/accountStatus.js";

const MAX_PAGE = 100;
const ROLES = { CLIENT: 1, ADMIN: 2, BUSINESS: 3 };

function parsePage(query) {
  const limit = Math.min(Math.max(parseInt(query.limit, 10) || 30, 1), MAX_PAGE);
  const offset = Math.max(parseInt(query.offset, 10) || 0, 0);
  return { limit, offset };
}

const likePattern = (text) => `%${String(text).replace(/[\\%_]/g, (c) => `\\${c}`)}%`;

/* GET /api/admin/users?filter=ALL|CLIENT|BUSINESS|ADMIN|SUSPENDED&q=&limit=&offset=
   Newest accounts first. counts: per filter, for the tabs. */
export const listUsers = async (req, res) => {
  const filter = String(req.query.filter || "ALL").toUpperCase();
  if (filter !== "ALL" && filter !== "SUSPENDED" && !(filter in ROLES)) {
    return res.status(400).json({ message: "Unknown filter" });
  }
  const { limit, offset } = parsePage(req.query);
  const q = String(req.query.q ?? "").trim();

  const where = [];
  const params = [];
  if (filter === "SUSPENDED") where.push("u.suspended_at IS NOT NULL");
  else if (filter !== "ALL") {
    where.push("u.role_id = ?");
    params.push(ROLES[filter]);
  }
  if (q) {
    const like = likePattern(q);
    where.push("(CONCAT_WS(' ', u.first_name, u.last_name) LIKE ? OR u.email LIKE ? OR u.phone LIKE ? OR s.name LIKE ?)");
    params.push(like, like, like, like);
  }
  const whereSql = where.length ? `WHERE ${where.join(" AND ")}` : "";
  // The account's first shop, if it owns one.
  const shopJoin = "LEFT JOIN shops s ON s.id = (SELECT MIN(s2.id) FROM shops s2 WHERE s2.user_id = u.id)";

  try {
    const [[{ total }]] = await db.promise().query(
      `SELECT COUNT(*) AS total FROM users u ${shopJoin} ${whereSql}`,
      params
    );
    const [users] = await db.promise().query(
      `SELECT u.id, u.first_name, u.last_name, u.email, u.phone, u.role_id, u.created_at, u.suspended_at,
              s.id AS shop_id, s.name AS shop_name, s.is_verified AS shop_verified,
              (SELECT COUNT(*) FROM service_requests sr WHERE sr.client_id = u.id) AS repair_count
       FROM users u ${shopJoin}
       ${whereSql}
       ORDER BY u.created_at DESC, u.id DESC
       LIMIT ? OFFSET ?`,
      [...params, limit, offset]
    );
    const [[counts]] = await db.promise().query(
      `SELECT COUNT(*) AS ALL_USERS, SUM(role_id = 1) AS CLIENT, SUM(role_id = 3) AS BUSINESS,
              SUM(role_id = 2) AS ADMIN, SUM(suspended_at IS NOT NULL) AS SUSPENDED
       FROM users`
    );
    res.json({
      users,
      total: Number(total),
      counts: {
        ALL: Number(counts.ALL_USERS || 0),
        CLIENT: Number(counts.CLIENT || 0),
        BUSINESS: Number(counts.BUSINESS || 0),
        ADMIN: Number(counts.ADMIN || 0),
        SUSPENDED: Number(counts.SUSPENDED || 0),
      },
    });
  } catch (err) {
    console.error("listUsers:", { code: err.code });
    res.status(500).json({ message: "Couldn't load accounts." });
  }
};

/* GET /api/admin/users/:id — one account with its shop(s) and activity. */
export const getUser = async (req, res) => {
  const id = Number(req.params.id);
  if (!Number.isSafeInteger(id) || id <= 0) return res.status(400).json({ message: "Invalid account" });
  try {
    const [[user]] = await db.promise().query(
      `SELECT u.id, u.first_name, u.middle_name, u.last_name, u.suffix, u.email, u.phone, u.role_id, u.created_at,
              u.suspended_at, u.suspended_reason,
              CONCAT_WS(' ', admin.first_name, admin.last_name) AS suspended_by_name,
              (SELECT COUNT(*) FROM devices d WHERE d.user_id = u.id) AS device_count,
              (SELECT COUNT(*) FROM addresses a WHERE a.user_id = u.id) AS address_count,
              (SELECT COUNT(*) FROM service_requests sr WHERE sr.client_id = u.id) AS repair_count,
              (SELECT COUNT(*) FROM disputes dp WHERE dp.client_id = u.id) AS dispute_count,
              (SELECT COUNT(*) FROM reviews rv WHERE rv.client_id = u.id) AS review_count
       FROM users u
       LEFT JOIN users admin ON admin.id = u.suspended_by
       WHERE u.id = ?`,
      [id]
    );
    if (!user) return res.status(404).json({ message: "Account not found" });

    const [shops] = await db.promise().query(
      `SELECT s.id, s.name, s.is_verified, s.created_at,
              (SELECT COUNT(*) FROM service_requests sr WHERE sr.shop_id = s.id) AS repair_count,
              (SELECT COUNT(*) FROM disputes dp WHERE dp.shop_id = s.id) AS dispute_count
       FROM shops s WHERE s.user_id = ? ORDER BY s.id`,
      [id]
    );
    const [repairs] = await db.promise().query(
      `SELECT sr.id, sr.created_at, sr.status, sr.decision, sr.payment_status, sr.client_approved, s.name AS shop_name
       FROM service_requests sr JOIN shops s ON s.id = sr.shop_id
       WHERE sr.client_id = ?
       ORDER BY sr.created_at DESC LIMIT 10`,
      [id]
    );
    res.json({ user, shops, repairs });
  } catch (err) {
    console.error("getUser:", { code: err.code });
    res.status(500).json({ message: "Couldn't load this account." });
  }
};

/* POST /api/admin/users/:id/suspend { reason } */
export const suspendUser = async (req, res) => {
  const id = Number(req.params.id);
  if (!Number.isSafeInteger(id) || id <= 0) return res.status(400).json({ message: "Invalid account" });
  const reason = String(req.body?.reason ?? "").trim();
  if (reason.length < 5) return res.status(400).json({ field: "reason", message: "Write why this account is being suspended." });
  if (reason.length > 500) return res.status(400).json({ field: "reason", message: "Keep the reason under 500 characters." });
  if (id === Number(req.user.id)) return res.status(400).json({ message: "You can't suspend your own account." });

  try {
    const [[user]] = await db.promise().query("SELECT role_id, suspended_at FROM users WHERE id = ?", [id]);
    if (!user) return res.status(404).json({ message: "Account not found" });
    if (Number(user.role_id) === ROLES.ADMIN) {
      return res.status(409).json({ message: "Admin accounts can't be suspended here." });
    }
    if (user.suspended_at) return res.status(409).json({ message: "This account is already suspended." });

    await db.promise().query(
      "UPDATE users SET suspended_at = NOW(), suspended_reason = ?, suspended_by = ? WHERE id = ? AND suspended_at IS NULL",
      [reason, req.user.id, id]
    );
    forgetAccountStatus(id);
    res.json({ success: true });
  } catch (err) {
    console.error("suspendUser:", { code: err.code });
    res.status(500).json({ message: "Couldn't suspend this account." });
  }
};

/* POST /api/admin/users/:id/reactivate */
export const reactivateUser = async (req, res) => {
  const id = Number(req.params.id);
  if (!Number.isSafeInteger(id) || id <= 0) return res.status(400).json({ message: "Invalid account" });
  try {
    const [result] = await db.promise().query(
      "UPDATE users SET suspended_at = NULL, suspended_reason = NULL, suspended_by = NULL WHERE id = ? AND suspended_at IS NOT NULL",
      [id]
    );
    if (!result.affectedRows) return res.status(409).json({ message: "This account isn't suspended." });
    forgetAccountStatus(id);
    res.json({ success: true });
  } catch (err) {
    console.error("reactivateUser:", { code: err.code });
    res.status(500).json({ message: "Couldn't reactivate this account." });
  }
};
