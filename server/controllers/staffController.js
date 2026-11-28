// controllers/staffController.js
// The staff portal for shop employees (business rule 8, AGENTS.md section 20).
//
//   GET  /api/staff/me                      membership (or null) and open invites
//   POST /api/staff/invites/:id/accept
//   POST /api/staff/invites/:id/decline
//   GET  /api/staff/repairs                 repairs assigned to me        (staffRequired)
//   GET  /api/staff/repairs/:id             one of them                   (staffRequired)
//   POST /api/staff/repairs/:id/start       step 8                        (staffRequired)
//   POST /api/staff/repairs/:id/complete    step 9                        (staffRequired)
//
// An employee sees only the repairs assigned to them, and only the repair
// chats the owner handed to them. No quotations, assignments, services,
// payouts, disputes or reviews.
import db from "../config/db.js";
import { membershipFor } from "../utils/staff.js";
import { startRepairFor, completeRepairFor } from "../utils/repairLifecycle.js";
import { loadPaymentState, depositSettled, confirmCashBalanceFor } from "../utils/paymentPlan.js";
import { clientPhoneFor } from "./repairController.js";

const query = (sql, params = []) => db.promise().query(sql, params).then(([rows]) => rows);
const positiveId = (value) => {
  const id = Number(value);
  return Number.isInteger(id) && id > 0 ? id : null;
};

/* GET /api/staff/me */
export const getStaffMe = async (req, res) => {
  try {
    const membership = await membershipFor(req.user.id);
    let invites = [];
    if (!membership) {
      const [user] = await query("SELECT email FROM users WHERE id = ?", [req.user.id]);
      if (user?.email) {
        invites = await query(
          `SELECT se.id, se.role, se.first_name, se.invited_at, s.id AS shop_id, s.name AS shop_name
             FROM shop_employees se
             JOIN shops s ON s.id = se.shop_id
             JOIN users owner ON owner.id = s.user_id
            WHERE se.invite_email = ? AND se.user_id IS NULL AND se.is_active = 1
              AND s.is_verified = 1 AND owner.suspended_at IS NULL AND s.user_id <> ?
            ORDER BY se.invited_at DESC`,
          [String(user.email).trim().toLowerCase(), req.user.id]
        );
      }
    }
    return res.json({
      membership: membership
        ? {
            employee_id: membership.employeeId,
            shop_id: membership.shopId,
            shop_name: membership.shopName,
            first_name: membership.firstName,
            role: membership.role,
            usable: membership.usable,
          }
        : null,
      invites,
    });
  } catch (err) {
    console.error("getStaffMe:", err.code || err.message);
    return res.status(500).json({ message: "Couldn't load your shop membership." });
  }
};

/* POST /api/staff/invites/:id/accept
   The invite is for this account's email. Only a normal client account that
   owns no shop and works at no other shop can join (one shop per account). */
export const acceptInvite = async (req, res) => {
  const inviteId = positiveId(req.params.id);
  if (!inviteId) return res.status(404).json({ message: "Invite not found." });
  try {
    const [user] = await query("SELECT email, role_id FROM users WHERE id = ?", [req.user.id]);
    const email = String(user?.email ?? "").trim().toLowerCase();
    const [invite] = await query(
      `SELECT se.id, se.shop_id, s.user_id AS owner_id, s.is_verified
         FROM shop_employees se JOIN shops s ON s.id = se.shop_id
        WHERE se.id = ? AND se.invite_email = ? AND se.user_id IS NULL AND se.is_active = 1`,
      [inviteId, email]
    );
    if (!invite || Number(invite.is_verified) !== 1) return res.status(404).json({ message: "This invite is no longer open." });
    if (Number(user.role_id) !== 1) {
      return res.status(409).json({ message: "Business and admin accounts can't join a shop as staff. Use a personal client account." });
    }
    const [ownsShop] = await query("SELECT id FROM shops WHERE user_id = ? LIMIT 1", [req.user.id]);
    if (ownsShop) {
      return res.status(409).json({ message: "This account has its own shop registration, so it can't join another shop as staff." });
    }
    if (await membershipFor(req.user.id)) {
      return res.status(409).json({ message: "You already work at a shop on PixelPatch. An account can work at one shop only." });
    }

    let result;
    try {
      [result] = await db.promise().query(
        `UPDATE shop_employees
            SET user_id = ?, joined_at = NOW(), invite_email = NULL, invited_at = NULL, updated_at = NOW()
          WHERE id = ? AND invite_email = ? AND user_id IS NULL AND is_active = 1`,
        [req.user.id, inviteId, email]
      );
    } catch (err) {
      if (err.code === "ER_DUP_ENTRY") {
        return res.status(409).json({ message: "You already work at a shop on PixelPatch. An account can work at one shop only." });
      }
      throw err;
    }
    if (!result.affectedRows) return res.status(404).json({ message: "This invite is no longer open." });
    return res.json({ success: true });
  } catch (err) {
    console.error("acceptInvite:", err.code || err.message);
    return res.status(500).json({ message: "Couldn't accept the invite." });
  }
};

/* POST /api/staff/invites/:id/decline */
export const declineInvite = async (req, res) => {
  const inviteId = positiveId(req.params.id);
  if (!inviteId) return res.status(404).json({ message: "Invite not found." });
  try {
    const [user] = await query("SELECT email FROM users WHERE id = ?", [req.user.id]);
    const [result] = await db.promise().query(
      `UPDATE shop_employees SET invite_email = NULL, invited_at = NULL, updated_at = NOW()
        WHERE id = ? AND invite_email = ? AND user_id IS NULL`,
      [inviteId, String(user?.email ?? "").trim().toLowerCase()]
    );
    if (!result.affectedRows) return res.status(404).json({ message: "This invite is no longer open." });
    return res.json({ success: true });
  } catch (err) {
    console.error("declineInvite:", err.code || err.message);
    return res.status(500).json({ message: "Couldn't decline the invite." });
  }
};

/* GET /api/staff/repairs */
export const listStaffRepairs = async (req, res) => {
  try {
    const repairs = await query(
      `SELECT sr.id, sr.status, sr.decision, sr.payment_status, sr.delivery_method, sr.preferred_date,
              sr.created_at, sr.completed_at,
              CONCAT_WS(' ', u.first_name, u.last_name) AS client,
              d.name AS device_name,
              COALESCE(GROUP_CONCAT(DISTINCT ss.name ORDER BY ss.name SEPARATOR ', '), '') AS services,
              (SELECT c.id FROM chats c WHERE c.request_id = sr.id AND c.handler_employee_id = ? LIMIT 1) AS chat_id
         FROM request_assignments ra
         JOIN service_requests sr ON sr.id = ra.request_id
         JOIN users u ON u.id = sr.client_id
         LEFT JOIN devices d ON d.id = sr.device_id
         LEFT JOIN service_request_items sri ON sri.request_id = sr.id
         LEFT JOIN shop_services ss ON ss.id = sri.service_id
        WHERE ra.employee_id = ? AND sr.shop_id = ?
        GROUP BY sr.id
        ORDER BY sr.status = 'COMPLETED', sr.preferred_date ASC, sr.id DESC`,
      [req.staff.employeeId, req.staff.employeeId, req.staff.shopId]
    );
    return res.json({ repairs });
  } catch (err) {
    console.error("listStaffRepairs:", err.code || err.message);
    return res.status(500).json({ message: "Couldn't load your repairs." });
  }
};

/* GET /api/staff/repairs/:id */
export const getStaffRepair = async (req, res) => {
  const requestId = positiveId(req.params.id);
  if (!requestId) return res.status(404).json({ message: "Repair not found." });
  try {
    const [row] = await query(
      `SELECT sr.id, sr.issue_description, sr.decision AS decisionStatus, sr.status, sr.delivery_method,
              sr.preferred_date, sr.is_received, sr.received_at, sr.payment_status, sr.deposit_paid_at, sr.client_approved,
              sr.completed_at, sr.notes,
              CONCAT_WS(' ', u.first_name, u.last_name) AS client, u.phone AS client_phone,
              d.name AS device_name, d.device_type, d.brand, d.model, d.serial_number, d.model_number, d.specs,
              CONCAT_WS(', ', a.street, a.barangay, a.city, a.province) AS service_address,
              q.estimated_completion_time,
              COALESCE(GROUP_CONCAT(DISTINCT ss.name ORDER BY ss.name SEPARATOR ', '), '') AS services
         FROM request_assignments ra
         JOIN service_requests sr ON sr.id = ra.request_id
         JOIN users u ON u.id = sr.client_id
         LEFT JOIN devices d ON d.id = sr.device_id
         LEFT JOIN addresses a ON a.id = sr.pickup_address_id
         LEFT JOIN request_quotations q ON q.request_id = sr.id AND q.status <> 'CANCELLED'
         LEFT JOIN service_request_items sri ON sri.request_id = sr.id
         LEFT JOIN shop_services ss ON ss.id = sri.service_id
        WHERE sr.id = ? AND ra.employee_id = ? AND sr.shop_id = ?
        GROUP BY sr.id
        LIMIT 1`,
      [requestId, req.staff.employeeId, req.staff.shopId]
    );
    if (!row) return res.status(404).json({ message: "Repair not found, or it isn't assigned to you." });

    const [chat] = await query(
      "SELECT id FROM chats WHERE request_id = ? AND handler_employee_id = ? LIMIT 1",
      [requestId, req.staff.employeeId]
    );
    const onSiteOrPickup = row.delivery_method === "PICKUP" || row.delivery_method === "ONSITE";
    const paid = row.payment_status === "PAID";
    const { plan } = await loadPaymentState(requestId);
    const canConfirmCash = row.status === "IN_PROGRESS" && plan?.due?.kind === "BALANCE" && plan.due.cash_allowed;
    return res.json({
      repair: {
        id: row.id,
        client: row.client,
        status: row.status,
        decisionStatus: row.decisionStatus,
        paymentStatus: row.payment_status,
        deliveryMethod: row.delivery_method,
        preferredDate: row.preferred_date,
        isReceived: Boolean(row.is_received),
        receivedAt: row.received_at,
        completedAt: row.completed_at,
        estimatedCompletion: row.estimated_completion_time,
        issueDescription: row.issue_description,
        notes: row.notes,
        services: row.services ? row.services.split(", ") : [],
        // Only where the job happens or is collected.
        serviceAddress: onSiteOrPickup ? row.service_address || null : null,
        device: {
          name: row.device_name,
          device_type: row.device_type,
          brand: row.brand,
          model: row.model,
          serial_number: row.serial_number,
          model_number: row.model_number,
          specs: row.specs,
        },
        // Same rule as the owner (clientPhoneFor in repairController.js).
        clientPhone: clientPhoneFor(row),
        chatId: chat?.id ?? null,
        // What the client pays and what's still open (no payment links here).
        paymentPlan: plan,
        canStart: row.decisionStatus === "ACCEPTED" && depositSettled(row) && !["IN_PROGRESS", "COMPLETED"].includes(row.status),
        canComplete: row.status === "IN_PROGRESS" && paid,
        canConfirmCash,
      },
    });
  } catch (err) {
    console.error("getStaffRepair:", err.code || err.message);
    return res.status(500).json({ message: "Couldn't load this repair." });
  }
};

const lifecycle = (fn, failure) => async (req, res) => {
  const requestId = positiveId(req.params.id);
  if (!requestId) return res.status(404).json({ message: "Repair not found." });
  try {
    const { status, body } = await fn({ requestId, shopId: req.staff.shopId, employeeId: req.staff.employeeId });
    return res.status(status).json(body);
  } catch (err) {
    console.error("staff repair lifecycle:", err.code || err.message);
    return res.status(500).json({ message: failure });
  }
};

/* POST /api/staff/repairs/:id/start, /complete (only the assigned employee) */
export const startStaffRepair = lifecycle(startRepairFor, "Couldn't start the repair.");
export const completeStaffRepair = lifecycle(completeRepairFor, "Couldn't complete the repair.");

/* POST /api/staff/repairs/:id/balance/cash: the assigned member confirms the
   client paid the balance in cash (business rules 5 and 8). */
export const confirmStaffCashBalance = async (req, res) => {
  const requestId = positiveId(req.params.id);
  if (!requestId) return res.status(404).json({ message: "Repair not found." });
  try {
    const { status, body } = await confirmCashBalanceFor({
      requestId,
      shopId: req.staff.shopId,
      employeeId: req.staff.employeeId,
      userId: req.user.id,
    });
    return res.status(status).json(body);
  } catch (err) {
    console.error("confirmStaffCashBalance:", err.code || err.message);
    return res.status(500).json({ message: "Couldn't record the cash payment." });
  }
};
