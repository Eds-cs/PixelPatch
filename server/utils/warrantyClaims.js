// server/utils/warrantyClaims.js
// Warranty claims (AGENTS.md section 20, business rule 9), shared by the
// client, business and admin controllers.
//
//   OPEN       waiting for the shop (it has 2 days)
//   ACCEPTED   the shop (or an admin) accepted: linked_request_id is the
//              warranty repair, a new request already ACCEPTED that goes
//              through the normal workflow (assessment, quotation at ₱0 for
//              covered work, payment if anything isn't covered, ...)
//   DECLINED   the shop declined with a reason; the client may escalate
//   ESCALATED  the client asked PixelPatch to review (after a decline, or
//              after 2 days without an answer)
//   CLOSED     an admin declined the claim
import db from "../config/db.js";
import { warrantyInfo } from "./warranty.js";
import { addSystemMessage } from "./staff.js";
import { findOrCreateChat } from "../controllers/chatController.js";
import { broadcastMessage } from "../sockets/chatSocket.js";

const query = (sql, params = [], conn = null) => (conn ?? db.promise()).query(sql, params).then(([rows]) => rows);

export const SHOP_REPLY_DAYS = 2;
/** Claims still being handled (the client can't open another meanwhile). */
export const ACTIVE_CLAIM_STATUSES = ["OPEN", "DECLINED", "ESCALATED"];

/** The original repair and its warranty: { request, warranty } (warranty null = none). */
export async function loadRepairWarranty(requestId, conn = null) {
  const [request] = await query(
    `SELECT sr.id, sr.client_id, sr.shop_id, sr.device_id, sr.status, sr.completed_at, sr.delivery_method,
            sr.pickup_address_id, s.name AS shop_name
       FROM service_requests sr JOIN shops s ON s.id = sr.shop_id
      WHERE sr.id = ? LIMIT 1`,
    [requestId],
    conn
  );
  if (!request) return { request: null, warranty: null };
  const [row] = await query(
    `SELECT w.is_warranty_covered, w.warranty_value, w.warranty_unit, w.coverage, w.exclusions
       FROM request_quotation_warranties w
       JOIN request_quotations q ON q.id = w.request_quotation_id
      WHERE q.request_id = ? AND q.status <> 'CANCELLED'
      LIMIT 1`,
    [requestId],
    conn
  );
  return { request, warranty: warrantyInfo(row, request) };
}

/** A repair's claims, newest first, with their photos and linked repair's state. */
export async function claimsForRequest(requestId, conn = null) {
  const claims = await query(
    `SELECT wc.id, wc.request_id, wc.status, wc.problem, wc.delivery_method, wc.pickup_address_id,
            DATE_FORMAT(wc.preferred_date, '%Y-%m-%d') AS preferred_date,
            wc.shop_response, wc.admin_note, wc.linked_request_id, wc.created_at, wc.responded_at,
            wc.escalated_at, wc.resolved_at,
            wc.created_at + INTERVAL ${SHOP_REPLY_DAYS} DAY AS reply_due,
            (wc.status = 'OPEN' AND wc.created_at < NOW() - INTERVAL ${SHOP_REPLY_DAYS} DAY) AS overdue,
            lr.status AS linked_status, lr.client_approved AS linked_client_approved, lr.decision AS linked_decision
       FROM warranty_claims wc
       LEFT JOIN service_requests lr ON lr.id = wc.linked_request_id
      WHERE wc.request_id = ?
      ORDER BY wc.id DESC`,
    [requestId],
    conn
  );
  if (claims.length === 0) return [];
  const photos = await query(
    `SELECT claim_id, file_name FROM warranty_claim_photos WHERE claim_id IN (${claims.map(() => "?").join(",")}) ORDER BY id`,
    claims.map((c) => c.id),
    conn
  );
  return claims.map((claim) => ({
    ...claim,
    overdue: Boolean(Number(claim.overdue)),
    photos: photos.filter((p) => p.claim_id === claim.id).map((p) => `/uploads/requests/${p.file_name}`),
  }));
}

/** A linked warranty repair still being worked on (not completed, cancelled or rejected). */
const linkedRepairOpen = (claim) =>
  claim.status === "ACCEPTED" &&
  claim.linked_status !== "COMPLETED" &&
  !(claim.linked_client_approved !== null && Number(claim.linked_client_approved) === 0) &&
  claim.linked_decision !== "REJECTED";

/**
 * Whether the client can open a claim now: { allowed, reason }.
 * Needs a completed repair with an active warranty, and nothing else open.
 */
export function claimEligibility(request, warranty, claims) {
  if (!request || request.status !== "COMPLETED") return { allowed: false, reason: "The repair isn't completed yet." };
  if (!warranty) return { allowed: false, reason: "This repair has no warranty." };
  if (!warranty.active) return { allowed: false, reason: "The warranty has ended." };
  if (claims.some((c) => ACTIVE_CLAIM_STATUSES.includes(c.status))) {
    return { allowed: false, reason: "You already have a warranty claim open for this repair." };
  }
  if (claims.some(linkedRepairOpen)) {
    return { allowed: false, reason: "The warranty repair for this device is still in progress." };
  }
  return { allowed: true, reason: null };
}

/** The client may ask PixelPatch to review: after a decline, or 2 days without an answer. */
export const canEscalate = (claim) => claim.status === "DECLINED" || (claim.status === "OPEN" && Boolean(claim.overdue));

/**
 * Creates the warranty repair for an accepted claim, inside `conn`'s
 * transaction: a new request for the same device and shop, already ACCEPTED
 * (accepting the claim is the shop's yes), with no services, so covered work
 * costs ₱0. The claim's photos are copied to it. Returns the new request id.
 */
export async function createWarrantyRepair(conn, claim, actorUserId) {
  const [original] = await query(
    "SELECT id, client_id, shop_id, device_id FROM service_requests WHERE id = ? LIMIT 1",
    [claim.request_id],
    conn
  );
  const [result] = await conn.query(
    `INSERT INTO service_requests
       (client_id, shop_id, delivery_method, device_id, issue_description, pickup_address_id,
        preferred_date, notes, estimated_price, status, decision, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, 0.00, 'PENDING', 'ACCEPTED', NOW(), NOW())`,
    [
      original.client_id,
      original.shop_id,
      claim.delivery_method,
      original.device_id,
      `Warranty claim for repair #${original.id}: ${claim.problem}`,
      claim.delivery_method === "DROPOFF" ? null : claim.pickup_address_id,
      claim.preferred_date,
      `Warranty repair (claim #${claim.id}) for repair #${original.id}. Work the warranty covers is free; quote only what it doesn't cover.`,
    ]
  );
  const linkedId = result.insertId;
  await conn.query(
    `INSERT INTO service_request_attachments (attachment_id, service_request_id)
     SELECT file_name, ? FROM warranty_claim_photos WHERE claim_id = ?`,
    [linkedId, claim.id]
  );
  await conn.query(
    `INSERT INTO request_status_history (request_id, status, updated_by, remarks, updated_at)
     VALUES (?, 'PENDING', ?, ?, NOW())`,
    [linkedId, actorUserId, `Warranty claim #${claim.id} accepted`]
  );
  return linkedId;
}

/**
 * A grey line in the original repair's chat, so both sides see what happened.
 * Best effort: a chat problem never fails the claim action.
 */
export async function noteInRepairChat(claim, actorUserId, text) {
  try {
    const chat = await findOrCreateChat({ clientId: claim.client_id, shopId: claim.shop_id, requestId: claim.request_id });
    const message = await addSystemMessage(chat.id, actorUserId, text);
    broadcastMessage(message);
  } catch (err) {
    console.error("warranty chat note:", err.code || err.message);
  }
}
