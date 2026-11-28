// server/controllers/warrantyClaimController.js
// Warranty claims, client and shop side (AGENTS.md business rule 9). Rules
// shared with the admin side live in utils/warrantyClaims.js.
//
// Client:
//   POST /api/client/repairs/:id/warranty-claims   (multipart: problem, delivery_method,
//        pickup_address_id, preferred_date, photos[] up to 5)
//   POST /api/client/warranty-claims/:id/escalate   ask PixelPatch to review
// Shop (the owner):
//   POST /api/business/warranty-claims/:id/accept   creates the warranty repair
//   POST /api/business/warranty-claims/:id/decline { reason }
//
// The problem and the shop's reason are messages between client and shop, so
// contact details are hidden (utils/contactFilter.js), as in chat.
import db from "../config/db.js";
import { withTransaction } from "../utils/transaction.js";
import { isValidDateOnly } from "../utils/dateValidation.js";
import { removeUploadedFiles } from "../utils/fileSignatures.js";
import { maskContactInfo } from "../utils/contactFilter.js";
import { resolveShopDeliveryTypes } from "../utils/shopDeliveryTypes.js";
import { SERVICE_AREA_MESSAGE, isInServiceArea } from "../utils/serviceArea.js";
import {
  canEscalate,
  claimEligibility,
  claimsForRequest,
  createWarrantyRepair,
  loadRepairWarranty,
  noteInRepairChat,
} from "../utils/warrantyClaims.js";

const METHODS = { PICKUP: "is_pickup", DROPOFF: "is_dropoff", ONSITE: "is_onsite" };
const METHOD_WORDS = { PICKUP: "pickup", DROPOFF: "drop-off", ONSITE: "an on-site visit" };
const positiveId = (value) => {
  const n = Number(value);
  return Number.isSafeInteger(n) && n > 0 ? n : null;
};
const todayString = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
};

/* POST /api/client/repairs/:id/warranty-claims */
export const createWarrantyClaim = async (req, res) => {
  const fail = (status, message, field) => {
    removeUploadedFiles(req);
    return res.status(status).json({ message, ...(field ? { field } : {}) });
  };
  const requestId = positiveId(req.params.id);
  if (!requestId) return fail(404, "Repair not found");

  const problemText = String(req.body?.problem ?? "").trim();
  const method = String(req.body?.delivery_method ?? "").toUpperCase();
  const addressId = positiveId(req.body?.pickup_address_id);
  const preferredDate = String(req.body?.preferred_date ?? "").trim();

  if (problemText.length < 10) return fail(400, "Describe what's wrong (at least 10 characters).", "problem");
  if (!(method in METHODS)) return fail(400, "Choose how the shop gets your device.", "delivery_method");
  if (!isValidDateOnly(preferredDate) || preferredDate < todayString()) {
    return fail(400, "Choose today or a later date.", "preferred_date");
  }

  try {
    const { request, warranty } = await loadRepairWarranty(requestId);
    if (!request || Number(request.client_id) !== Number(req.user.id)) return fail(404, "Repair not found");

    const claims = await claimsForRequest(requestId);
    const eligibility = claimEligibility(request, warranty, claims);
    if (!eligibility.allowed) return fail(409, eligibility.reason);

    const types = await resolveShopDeliveryTypes(request.shop_id);
    if (!Number(types?.[METHODS[method]])) {
      return fail(400, `This shop doesn't offer ${METHOD_WORDS[method]}. Choose another way.`, "delivery_method");
    }
    if (method !== "DROPOFF") {
      if (!addressId) return fail(400, "Pickup and on-site service need an address.", "pickup_address_id");
      const [[address]] = await db.promise().query(
        "SELECT barangay, city, province FROM addresses WHERE id = ? AND user_id = ? LIMIT 1",
        [addressId, req.user.id]
      );
      if (!address) return fail(400, "Choose one of your saved addresses.", "pickup_address_id");
      if (!isInServiceArea(address)) return fail(400, SERVICE_AREA_MESSAGE, "pickup_address_id");
    }

    const { text: problem } = maskContactInfo(problemText);
    const claimId = await withTransaction(async (conn) => {
      const [result] = await conn.query(
        `INSERT INTO warranty_claims
           (request_id, client_id, shop_id, problem, delivery_method, pickup_address_id, preferred_date, status)
         VALUES (?, ?, ?, ?, ?, ?, ?, 'OPEN')`,
        [requestId, request.client_id, request.shop_id, problem, method, method === "DROPOFF" ? null : addressId, preferredDate]
      );
      for (const file of req.files ?? []) {
        await conn.query("INSERT INTO warranty_claim_photos (claim_id, file_name) VALUES (?, ?)", [result.insertId, file.filename]);
      }
      return result.insertId;
    });

    await noteInRepairChat(
      { client_id: request.client_id, shop_id: request.shop_id, request_id: requestId },
      req.user.id,
      `The client asked for warranty service: "${problem}" The shop has 2 days to accept or decline.`
    );
    return res.status(201).json({ success: true, claim_id: claimId });
  } catch (err) {
    console.error("createWarrantyClaim:", err.code || err.message);
    return fail(500, "Couldn't send your warranty claim.");
  }
};

/* POST /api/client/warranty-claims/:id/escalate */
export const escalateWarrantyClaim = async (req, res) => {
  const claimId = positiveId(req.params.id);
  if (!claimId) return res.status(404).json({ message: "Claim not found" });
  try {
    const [[claim]] = await db.promise().query(
      `SELECT id, request_id, client_id, shop_id, status,
              (status = 'OPEN' AND created_at < NOW() - INTERVAL 2 DAY) AS overdue
         FROM warranty_claims WHERE id = ? AND client_id = ? LIMIT 1`,
      [claimId, req.user.id]
    );
    if (!claim) return res.status(404).json({ message: "Claim not found" });
    if (!canEscalate({ ...claim, overdue: Boolean(Number(claim.overdue)) })) {
      return res.status(409).json({
        message: claim.status === "OPEN"
          ? "The shop still has time to answer. You can ask PixelPatch once 2 days have passed."
          : "This claim can't be sent to PixelPatch now.",
      });
    }
    const [result] = await db.promise().query(
      "UPDATE warranty_claims SET status = 'ESCALATED', escalated_at = NOW() WHERE id = ? AND status IN ('OPEN', 'DECLINED')",
      [claimId]
    );
    if (!result.affectedRows) return res.status(409).json({ message: "This claim has changed. Refresh to see it." });
    await noteInRepairChat(claim, req.user.id, "The client asked PixelPatch to review the warranty claim. An admin will decide.");
    return res.json({ success: true });
  } catch (err) {
    console.error("escalateWarrantyClaim:", err.code || err.message);
    return res.status(500).json({ message: "Couldn't send the claim to PixelPatch." });
  }
};

/** The owner's claim (req.shopId from businessShopRequired), or null. */
async function shopClaim(conn, claimId, shopId) {
  const [[claim]] = await conn.query(
    "SELECT * FROM warranty_claims WHERE id = ? AND shop_id = ? LIMIT 1 FOR UPDATE",
    [claimId, shopId]
  );
  return claim ?? null;
}

/* POST /api/business/warranty-claims/:id/accept */
export const acceptWarrantyClaim = async (req, res) => {
  const claimId = positiveId(req.params.id);
  if (!claimId) return res.status(404).json({ message: "Claim not found" });
  try {
    const result = await withTransaction(async (conn) => {
      const claim = await shopClaim(conn, claimId, req.shopId);
      if (!claim) return { status: 404, message: "Claim not found" };
      // The shop may also change its mind after declining, until it's escalated.
      if (!["OPEN", "DECLINED"].includes(claim.status)) {
        return { status: 409, message: claim.status === "ESCALATED" ? "PixelPatch is reviewing this claim." : "This claim is already settled." };
      }
      const linkedId = await createWarrantyRepair(conn, claim, req.user.id);
      await conn.query(
        `UPDATE warranty_claims
            SET status = 'ACCEPTED', linked_request_id = ?, responded_at = COALESCE(responded_at, NOW()), resolved_at = NOW()
          WHERE id = ?`,
        [linkedId, claimId]
      );
      return { status: 200, claim, linkedId };
    });
    if (result.status !== 200) return res.status(result.status).json({ message: result.message });
    await noteInRepairChat(result.claim, req.user.id, `The shop accepted the warranty claim. Warranty repair #${result.linkedId} has been created.`);
    return res.json({ success: true, linked_request_id: result.linkedId });
  } catch (err) {
    console.error("acceptWarrantyClaim:", err.code || err.message);
    return res.status(500).json({ message: "Couldn't accept the claim." });
  }
};

/* POST /api/business/warranty-claims/:id/decline { reason } */
export const declineWarrantyClaim = async (req, res) => {
  const claimId = positiveId(req.params.id);
  if (!claimId) return res.status(404).json({ message: "Claim not found" });
  const typed = String(req.body?.reason ?? "").trim();
  if (typed.length < 10) {
    return res.status(400).json({ field: "reason", message: "Tell the client why (at least 10 characters), e.g. the damage the warranty doesn't cover." });
  }
  const { text: reason } = maskContactInfo(typed);
  try {
    const result = await withTransaction(async (conn) => {
      const claim = await shopClaim(conn, claimId, req.shopId);
      if (!claim) return { status: 404, message: "Claim not found" };
      if (claim.status !== "OPEN") return { status: 409, message: "Only a claim waiting for your answer can be declined." };
      await conn.query(
        "UPDATE warranty_claims SET status = 'DECLINED', shop_response = ?, responded_at = NOW() WHERE id = ?",
        [reason, claimId]
      );
      return { status: 200, claim };
    });
    if (result.status !== 200) return res.status(result.status).json({ message: result.message });
    await noteInRepairChat(
      result.claim,
      req.user.id,
      `The shop declined the warranty claim: "${reason}" The client can ask PixelPatch to review it.`
    );
    return res.json({ success: true });
  } catch (err) {
    console.error("declineWarrantyClaim:", err.code || err.message);
    return res.status(500).json({ message: "Couldn't decline the claim." });
  }
};
