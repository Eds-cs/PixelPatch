// controllers/admin/warrantyAdminController.js
// Admin · Warranty claims (AGENTS.md business rule 9).
//
// The client escalates a claim the shop declined or didn't answer within 2
// days (status ESCALATED). The admin then either orders the warranty repair
// (the claim is ACCEPTED and a linked repair is created, as if the shop had
// accepted) or closes the claim (CLOSED). The explanation is saved as
// admin_note and noted in the repair's chat.
import db from "../../config/db.js";
import { withTransaction } from "../../utils/transaction.js";
import { createWarrantyRepair, noteInRepairChat } from "../../utils/warrantyClaims.js";

const MAX_PAGE = 100;
const VIEWS = {
  NEEDS_ADMIN: "wc.status = 'ESCALATED'",
  WITH_SHOP: "wc.status IN ('OPEN', 'DECLINED')",
  SETTLED: "wc.status IN ('ACCEPTED', 'CLOSED')",
  ALL: "1 = 1",
};
const OUTCOMES = { REPAIR: "Warranty repair ordered", DECLINE: "Claim declined" };

const FROM = `
  FROM warranty_claims wc
  JOIN service_requests sr ON sr.id = wc.request_id
  JOIN shops s ON s.id = wc.shop_id
  JOIN users c ON c.id = wc.client_id
  LEFT JOIN devices dv ON dv.id = sr.device_id`;

const likePattern = (text) => `%${String(text).replace(/[\\%_]/g, (ch) => `\\${ch}`)}%`;

/* GET /api/admin/warranty-claims?view=NEEDS_ADMIN|WITH_SHOP|SETTLED|ALL&q=&limit=&offset= */
export const listWarrantyClaims = async (req, res) => {
  const view = String(req.query.view || "NEEDS_ADMIN").toUpperCase();
  if (!(view in VIEWS)) return res.status(400).json({ message: "Unknown view" });
  const limit = Math.min(Math.max(parseInt(req.query.limit, 10) || 30, 1), MAX_PAGE);
  const offset = Math.max(parseInt(req.query.offset, 10) || 0, 0);
  const q = String(req.query.q ?? "").trim().replace(/^#/, "");

  const where = [VIEWS[view]];
  const params = [];
  if (q) {
    const n = /^\d+$/.test(q) ? Number(q) : -1;
    const like = likePattern(q);
    where.push("(wc.id = ? OR wc.request_id = ? OR s.name LIKE ? OR CONCAT_WS(' ', c.first_name, c.last_name) LIKE ?)");
    params.push(n, n, like, like);
  }
  const whereSql = `WHERE ${where.join(" AND ")}`;

  try {
    const [[{ total }]] = await db.promise().query(`SELECT COUNT(*) AS total ${FROM} ${whereSql}`, params);
    const [claims] = await db.promise().query(
      `SELECT wc.id, wc.request_id, wc.status, wc.problem, wc.shop_response, wc.linked_request_id,
              wc.created_at, wc.escalated_at, wc.resolved_at,
              s.name AS shop_name, CONCAT_WS(' ', c.first_name, c.last_name) AS client_name, dv.name AS device_name
       ${FROM} ${whereSql}
       ORDER BY ${view === "NEEDS_ADMIN" ? "wc.escalated_at ASC" : "wc.created_at DESC"}, wc.id DESC
       LIMIT ? OFFSET ?`,
      [...params, limit, offset]
    );
    const [[counts]] = await db.promise().query(
      `SELECT ${Object.entries(VIEWS).map(([k, cond]) => `SUM(${cond}) AS \`${k}\``).join(", ")} FROM warranty_claims wc`
    );
    res.json({
      claims,
      total: Number(total),
      counts: Object.fromEntries(Object.keys(VIEWS).map((k) => [k, Number(counts?.[k] || 0)])),
    });
  } catch (err) {
    console.error("listWarrantyClaims:", { code: err.code, message: err.message });
    res.status(500).json({ message: "Couldn't load warranty claims." });
  }
};

/* GET /api/admin/warranty-claims/:id — the claim, its photos, and the original repair's warranty. */
export const getWarrantyClaim = async (req, res) => {
  const id = Number(req.params.id);
  if (!Number.isSafeInteger(id) || id <= 0) return res.status(400).json({ message: "Invalid claim" });
  try {
    const [[claim]] = await db.promise().query(
      `SELECT wc.*, DATE_FORMAT(wc.preferred_date, '%Y-%m-%d') AS preferred_date,
              sr.issue_description, sr.completed_at,
              s.name AS shop_name, CONCAT_WS(' ', c.first_name, c.last_name) AS client_name,
              dv.name AS device_name, dv.brand AS device_brand, dv.model AS device_model,
              w.warranty_value, w.warranty_unit, w.coverage, w.exclusions
       ${FROM}
       LEFT JOIN request_quotations q ON q.request_id = sr.id
       LEFT JOIN request_quotation_warranties w ON w.request_quotation_id = q.id
       WHERE wc.id = ?
       LIMIT 1`,
      [id]
    );
    if (!claim) return res.status(404).json({ message: "Claim not found" });
    const [photos] = await db.promise().query("SELECT file_name FROM warranty_claim_photos WHERE claim_id = ? ORDER BY id", [id]);
    res.json({ claim, photos: photos.map((p) => `/uploads/requests/${p.file_name}`) });
  } catch (err) {
    console.error("getWarrantyClaim:", { code: err.code, message: err.message });
    res.status(500).json({ message: "Couldn't load this claim." });
  }
};

/* POST /api/admin/warranty-claims/:id/decide { outcome: REPAIR|DECLINE, note } */
export const decideWarrantyClaim = async (req, res) => {
  const id = Number(req.params.id);
  if (!Number.isSafeInteger(id) || id <= 0) return res.status(400).json({ message: "Invalid claim" });
  const outcome = String(req.body?.outcome ?? "").toUpperCase();
  if (!(outcome in OUTCOMES)) return res.status(400).json({ field: "outcome", message: "Choose a decision." });
  const note = String(req.body?.note ?? "").trim();
  if (note.length < 10) {
    return res.status(400).json({ field: "note", message: "Explain the decision to the client and shop (at least 10 characters)." });
  }

  try {
    const result = await withTransaction(async (conn) => {
      const [[claim]] = await conn.query("SELECT * FROM warranty_claims WHERE id = ? FOR UPDATE", [id]);
      if (!claim) return { status: 404, message: "Claim not found" };
      if (claim.status !== "ESCALATED") return { status: 409, message: "This claim isn't waiting for PixelPatch." };

      if (outcome === "REPAIR") {
        const [[shop]] = await conn.query(
          "SELECT owner.suspended_at FROM shops s JOIN users owner ON owner.id = s.user_id WHERE s.id = ?",
          [claim.shop_id]
        );
        if (shop?.suspended_at) {
          return { status: 409, message: "The shop's owner is suspended, so the shop can't take the repair. Decline the claim and handle it with the shop." };
        }
        const linkedId = await createWarrantyRepair(conn, claim, req.user.id);
        await conn.query(
          `UPDATE warranty_claims
              SET status = 'ACCEPTED', linked_request_id = ?, admin_note = ?, decided_by = ?, resolved_at = NOW()
            WHERE id = ?`,
          [linkedId, note, req.user.id, id]
        );
        return { status: 200, claim, linkedId };
      }
      await conn.query(
        "UPDATE warranty_claims SET status = 'CLOSED', admin_note = ?, decided_by = ?, resolved_at = NOW() WHERE id = ?",
        [note, req.user.id, id]
      );
      return { status: 200, claim };
    });
    if (result.status !== 200) return res.status(result.status).json({ message: result.message });

    await noteInRepairChat(
      result.claim,
      req.user.id,
      outcome === "REPAIR"
        ? `PixelPatch reviewed the warranty claim and ordered a warranty repair (#${result.linkedId}): ${note}`
        : `PixelPatch reviewed the warranty claim and declined it: ${note}`
    );
    res.json({ success: true, outcome, linked_request_id: result.linkedId ?? null });
  } catch (err) {
    console.error("decideWarrantyClaim:", { code: err.code, message: err.message });
    res.status(500).json({ message: "Couldn't save the decision." });
  }
};
