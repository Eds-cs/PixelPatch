// server/utils/repairCards.js
// Repair cards in chat: a SYSTEM message with a `card` (JSON) that the chat
// screen draws as a card (components/RepairChatCard.jsx). Each is a snapshot
// of that moment, posted in the repair's own chat (created if needed).
//
//   REPAIR_CONFIRMED  the shop accepted the request (confirmRepair), or a
//                     warranty repair was created (it starts accepted):
//                     repair number, device, services, delivery and address,
//                     preferred date
//   REPAIR_UPDATE     a step of the repair, with `stage`:
//     QUOTE_SENT        createQuotation: total, deposit/balance, ready-by date, warranty
//     PAYMENT_RECEIVED  the Xendit webhook or a confirmed cash balance:
//                       which part, how much, online or cash, what's left
//     PAYMENT_DUE       the owner or the assigned member asks the client to pay
//                       (requestPaymentFor): which part, how much, cash allowed
//     REPAIR_STARTED    startRepairFor: technician (first name and role), ready-by date
//     REPAIR_COMPLETED  completeRepairFor: completion date, warranty end date
//
// Posting is best effort: a card problem never fails the action behind it.
// Never put phone numbers or emails in a card: clients and shops don't get
// each other's contact details (AGENTS.md section 25).
import db from "../config/db.js";
import { findOrCreateChat } from "../controllers/chatController.js";
import { broadcastMessage } from "../sockets/chatSocket.js";
import { hideContactInfo } from "./contactFilter.js";
import { loadPaymentState } from "./paymentPlan.js";
import { warrantyInfo } from "./warranty.js";

const query = (sql, params = []) => db.promise().query(sql, params).then(([rows]) => rows);

const ISSUE_PREVIEW = 160;
const UNIT_WORDS = { DAY: "day", WEEK: "week", MONTH: "month", YEAR: "year" };
const PART_WORDS = { FULL: "Payment", DEPOSIT: "Deposit", BALANCE: "Balance" };
const peso = (n) => `₱${Number(n || 0).toLocaleString("en-PH", { maximumFractionDigits: 2 })}`;

/** A stored card as an object, or null. */
export function parseCard(value) {
  if (!value) return null;
  try {
    const card = typeof value === "string" ? JSON.parse(value) : value;
    return card && typeof card === "object" && !Array.isArray(card) ? card : null;
  } catch {
    return null;
  }
}

/** What every card needs: the request, its shop and its device. */
async function cardContext(requestId) {
  const [row] = await query(
    `SELECT sr.id, sr.client_id, sr.shop_id, sr.status, sr.delivery_method, sr.issue_description,
            sr.completed_at,
            DATE_FORMAT(sr.preferred_date, '%Y-%m-%d') AS preferred_date,
            s.name AS shop_name,
            d.name AS device_name, d.brand AS device_brand, d.model AS device_model,
            d.device_type, d.photo_url AS device_photo,
            -- The client's area only (barangay, city): a chat keeps cards long
            -- after the job, and can be handed to staff. The street is on the
            -- repair page while the shop needs it.
            CONCAT_WS(', ', NULLIF(TRIM(a.barangay), ''), NULLIF(TRIM(a.city), '')) AS service_address,
            CONCAT_WS(', ', NULLIF(TRIM(sa.street), ''), NULLIF(TRIM(sa.barangay), ''), NULLIF(TRIM(sa.city), '')) AS shop_address,
            (SELECT wc.request_id FROM warranty_claims wc WHERE wc.linked_request_id = sr.id LIMIT 1) AS warranty_of
       FROM service_requests sr
       JOIN shops s ON s.id = sr.shop_id
       LEFT JOIN devices d ON d.id = sr.device_id
       LEFT JOIN addresses a ON a.id = sr.pickup_address_id
       LEFT JOIN addresses sa ON sa.id = s.address_id
      WHERE sr.id = ?
      LIMIT 1`,
    [requestId]
  );
  if (!row) return null;
  const photo = String(row.device_photo ?? "");
  return {
    row,
    base: {
      request_id: row.id,
      shop_name: row.shop_name,
      warranty_of: row.warranty_of ?? null,
      device: {
        name: row.device_name || null,
        brand: row.device_brand || null,
        model: row.device_model || null,
        type: row.device_type || null,
        // Only an uploaded file or an https image, never inline data.
        photo_url: photo.startsWith("/uploads/") || photo.startsWith("https://") ? photo : null,
      },
    },
  };
}

/**
 * Saves the card in the repair's chat and sends it to anyone with it open.
 * Tried twice (a second later) before giving up, so a brief database hiccup
 * doesn't lose it; the action behind it has already succeeded either way.
 */
async function postCard(row, actorUserId, card, text) {
  try {
    await postCardOnce(row, actorUserId, card, text);
  } catch (err) {
    console.error("repair card, retrying:", err.code || err.message);
    await new Promise((resolve) => setTimeout(resolve, 1000));
    await postCardOnce(row, actorUserId, card, text);
  }
}

async function postCardOnce(row, actorUserId, card, text) {
  const chat = await findOrCreateChat({ clientId: row.client_id, shopId: row.shop_id, requestId: row.id });
  const [result] = await db.promise().query(
    `INSERT INTO chat_messages (chat_id, sender_id, sender_kind, sender_label, message_text, card, is_read, timestamp)
     VALUES (?, ?, 'SYSTEM', NULL, ?, ?, 0, NOW())`,
    [chat.id, actorUserId, text, JSON.stringify(card)]
  );
  // Saved: anything after this is not worth a retry (it would post twice).
  try {
    await db.promise().query("UPDATE chats SET last_message_at = NOW() WHERE id = ?", [chat.id]);
    const [message] = await query(
      `SELECT id, chat_id, sender_id, sender_kind, sender_label, message_text, card, timestamp
         FROM chat_messages WHERE id = ?`,
      [result.insertId]
    );
    broadcastMessage({ ...message, card: parseCard(message.card) });
  } catch (err) {
    console.error("repair card saved, not broadcast:", err.code || err.message);
  }
}

/** The REPAIR_CONFIRMED card for a request: { row, card }, or null. */
export async function buildRepairConfirmation(requestId) {
  const ctx = await cardContext(requestId);
  if (!ctx) return null;
  const { row, base } = ctx;
  const services = await query(
    `SELECT ss.name FROM service_request_items sri JOIN shop_services ss ON ss.id = sri.service_id
      WHERE sri.request_id = ? ORDER BY ss.name`,
    [requestId]
  );
  const issue = hideContactInfo(String(row.issue_description ?? "")).trim();
  return {
    row,
    card: {
      type: "REPAIR_CONFIRMED",
      ...base,
      services: services.map((s) => s.name),
      issue: issue.length > ISSUE_PREVIEW ? `${issue.slice(0, ISSUE_PREVIEW - 1)}…` : issue,
      delivery_method: row.delivery_method,
      // Where the job happens: the client's area (barangay, city) for pickup
      // and on-site, the shop's address for drop-off.
      address: row.delivery_method === "DROPOFF" ? row.shop_address || null : row.service_address || null,
      preferred_date: row.preferred_date,
    },
  };
}

/** Posts the "Repair confirmed" card (see the top of this file). */
export async function postRepairConfirmation(requestId, actorUserId) {
  try {
    const built = await buildRepairConfirmation(requestId);
    if (!built) return;
    const { row, card } = built;
    await postCard(row, actorUserId, card, `${card.warranty_of ? "Warranty repair" : "Repair"} #${row.id} confirmed by ${row.shop_name}.`);
  } catch (err) {
    console.error("repair confirmation card:", err.code || err.message);
  }
}

/** The quotation's warranty as "3 months", or null. */
async function warrantyLength(requestId) {
  const [w] = await query(
    `SELECT w.warranty_value, w.warranty_unit FROM request_quotation_warranties w
       JOIN request_quotations q ON q.id = w.request_quotation_id
      WHERE q.request_id = ? AND w.is_warranty_covered = 1 LIMIT 1`,
    [requestId]
  );
  const n = Number(w?.warranty_value);
  const word = UNIT_WORDS[w?.warranty_unit];
  return n > 0 && word ? `${n} ${word}${n === 1 ? "" : "s"}` : null;
}

/** The data and the inbox line for one stage, or null to skip. */
async function stageDetails(stage, row, extra) {
  const id = row.id;
  switch (stage) {
    case "QUOTE_SENT": {
      const { quotation, plan } = await loadPaymentState(id);
      if (!plan) return null;
      return {
        data: {
          total: plan.total,
          deposit_percent: plan.deposit_percent,
          deposit: plan.deposit,
          balance: plan.balance,
          allow_cash: plan.allow_cash,
          ready_by: quotation?.estimated_completion_date ?? null,
          warranty: await warrantyLength(id),
        },
        text: `Quotation for repair #${id}: ${peso(plan.total)}.`,
      };
    }
    case "PAYMENT_RECEIVED": {
      const { plan } = await loadPaymentState(id);
      const kind = extra.kind;
      const method = extra.method === "CASH" ? "CASH" : "ONLINE";
      return {
        data: {
          kind,
          amount: Number(extra.amount) || 0,
          method,
          paid_in_full: Boolean(plan?.paid_in_full),
          // What's still to pay (the balance after a deposit), 0 when paid in full.
          remaining: plan && !plan.paid_in_full && plan.due ? plan.due.amount : 0,
          cash_allowed: Boolean(plan?.allow_cash),
        },
        text: `${PART_WORDS[kind] ?? "Payment"} of ${peso(extra.amount)} received ${method === "CASH" ? "in cash" : "online"} for repair #${id}.`,
      };
    }
    case "PAYMENT_DUE": {
      const kind = extra.kind;
      return {
        data: { kind, amount: Number(extra.amount) || 0, cash_allowed: Boolean(extra.cash_allowed) },
        text: `${PART_WORDS[kind] ?? "Payment"} of ${peso(extra.amount)} due for repair #${id}.`,
      };
    }
    case "REPAIR_STARTED": {
      const [tech] = await query(
        `SELECT e.first_name, e.role FROM request_assignments ra JOIN shop_employees e ON e.id = ra.employee_id
          WHERE ra.request_id = ? LIMIT 1`,
        [id]
      );
      const [q] = await query(
        "SELECT DATE_FORMAT(estimated_completion_time, '%Y-%m-%d') AS ready_by FROM request_quotations WHERE request_id = ? LIMIT 1",
        [id]
      );
      return {
        data: {
          // First name and role only, as clients see shop staff in chat.
          technician: tech ? [tech.first_name, tech.role].filter(Boolean).join(" · ") : null,
          ready_by: q?.ready_by ?? null,
        },
        text: `Work started on repair #${id}.`,
      };
    }
    case "REPAIR_COMPLETED": {
      const [w] = await query(
        `SELECT w.is_warranty_covered, w.warranty_value, w.warranty_unit, w.coverage, w.exclusions
           FROM request_quotation_warranties w JOIN request_quotations q ON q.id = w.request_quotation_id
          WHERE q.request_id = ? LIMIT 1`,
        [id]
      );
      const warranty = warrantyInfo(w, row);
      return {
        data: {
          completed_at: row.completed_at,
          warranty_until: warranty?.ends_at ?? null,
        },
        text: `Repair #${id} is completed.`,
      };
    }
    default:
      return null;
  }
}

/**
 * Posts a REPAIR_UPDATE card (see the top of this file). `extra` carries what
 * only the caller knows (PAYMENT_RECEIVED: { kind, amount, method }).
 */
export async function postRepairUpdate(requestId, actorUserId, stage, extra = {}) {
  try {
    const ctx = await cardContext(requestId);
    if (!ctx) return;
    const details = await stageDetails(stage, ctx.row, extra);
    if (!details) return;
    await postCard(
      ctx.row,
      actorUserId,
      { type: "REPAIR_UPDATE", stage, ...ctx.base, at: new Date().toISOString(), data: details.data },
      details.text
    );
  } catch (err) {
    console.error(`repair update card (${stage}):`, err.code || err.message);
  }
}
