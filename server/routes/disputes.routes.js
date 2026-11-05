import express from "express";
import db from "../config/db.js";
import { authRequired } from "../middleware/authMiddleware.js";
import { canOpenDispute } from "../utils/canOpenDispute.js";
import { businessShopRequired } from "../middleware/businessShopMiddleware.js";

const router = express.Router();

/* =======================================================
   CLIENT — OPEN DISPUTE
======================================================= */
router.post("/", authRequired, async (req, res) => {
  const clientId = req.user.id;
  const { request_id, explanation } = req.body;

  if (!request_id || !explanation || !explanation.trim()) {
    return res
      .status(400)
      .json({ message: "Request ID and explanation are required" });
  }

  try {
    // eligibility check
    const request = await canOpenDispute(request_id, clientId);
    if (!request) {
      return res
        .status(403)
        .json({ message: "Dispute not allowed for this request" });
    }

    // insert dispute
    const [result] = await db.promise().query(
      `
      INSERT INTO disputes (request_id, client_id, shop_id)
      VALUES (?, ?, ?)
      `,
      [request_id, clientId, request.shop_id]
    );

    const disputeId = result.insertId;

    // insert first edit (client explanation)
    await db.promise().query(
      `
      INSERT INTO dispute_edits (dispute_id, edited_by, content)
      VALUES (?, 'CLIENT', ?)
      `,
      [disputeId, explanation]
    );

    return res.status(201).json({
      message: "Dispute opened successfully",
      dispute_id: disputeId,
    });
  } catch (err) {
    console.error("❌ OPEN DISPUTE:", err);
    return res.status(500).json({ message: "Failed to open dispute" });
  }
});

/* =======================================================
   SHOP — LIST ALL DISPUTES (CENTRAL DASHBOARD)
======================================================= */
router.get("/shop", authRequired, businessShopRequired, async (req, res) => {
  try {
    const shopId = req.shopId;

    const [disputes] = await db.promise().query(
      `
      SELECT
        d.id,
        d.status,
        d.proposed_resolution,
        d.shop_response,
        d.created_at,
        d.resolved_at,
        device.name AS device_name,
        sr.issue_description,
        (SELECT content FROM dispute_edits
         WHERE dispute_id = d.id AND edited_by = 'CLIENT'
         ORDER BY created_at ASC, id ASC LIMIT 1) AS complaint,
        sr.id AS request_id,
        sr.device_id,
        sr.completed_at,
        u.first_name,
        u.last_name
      FROM disputes d
      JOIN service_requests sr ON sr.id = d.request_id
      JOIN users u ON u.id = d.client_id
      LEFT JOIN devices device ON device.id = sr.device_id
      WHERE d.shop_id = ?
      ORDER BY d.created_at DESC
      `,
      [shopId]
    );

    return res.json({ disputes });
  } catch (err) {
    console.error("❌ SHOP DISPUTE LIST:", err);
    return res.status(500).json({ message: "Failed to fetch disputes" });
  }
});

/* =======================================================
   SHOP — PROPOSE RESOLUTION
======================================================= */
router.post("/:id/propose", authRequired, async (req, res) => {
  const disputeId = req.params.id;
  const { resolution, response } = req.body;

  if (!["REFUND", "RESERVICE"].includes(resolution)) {
    return res.status(400).json({ message: "Invalid resolution option" });
  }

  try {
    const [rows] = await db.promise().query(
      `
      SELECT d.id, s.user_id AS owner_id
      FROM disputes d
      JOIN shops s ON s.id = d.shop_id
      WHERE d.id = ? AND d.status = 'OPEN'
      `,
      [disputeId]
    );

    if (rows.length === 0 || rows[0].owner_id !== req.user.id) {
      return res
        .status(403)
        .json({ message: "Unauthorized or invalid dispute state" });
    }

    await db.promise().query(
      `
      UPDATE disputes
      SET status = 'SHOP_PROPOSED',
          proposed_resolution = ?,
          shop_response = ?
      WHERE id = ?
      `,
      [resolution, response || null, disputeId]
    );

    await db.promise().query(
      `
      INSERT INTO dispute_edits (dispute_id, edited_by, content)
      VALUES (?, 'BUSINESS', ?)
      `,
      [disputeId, response || `Proposed ${resolution}`]
    );

    return res.json({ message: "Resolution proposed successfully" });
  } catch (err) {
    console.error("❌ PROPOSE RESOLUTION:", err);
    return res.status(500).json({ message: "Failed to propose resolution" });
  }
});

/* =======================================================
   CLIENT — ACCEPT PROPOSAL
======================================================= */
router.post("/:id/accept", authRequired, async (req, res) => {
  const disputeId = req.params.id;

  try {
    const [rows] = await db.promise().query(
      `
      SELECT id
      FROM disputes
      WHERE id = ?
        AND client_id = ?
        AND status = 'SHOP_PROPOSED'
      `,
      [disputeId, req.user.id]
    );

    if (rows.length === 0) {
      return res.status(403).json({ message: "Action not allowed" });
    }

    await db.promise().query(
      `
      UPDATE disputes
      SET status = 'RESOLVED',
          resolved_at = NOW()
      WHERE id = ?
      `,
      [disputeId]
    );

    return res.json({ message: "Dispute resolved" });
  } catch (err) {
    console.error("❌ ACCEPT DISPUTE:", err);
    return res.status(500).json({ message: "Failed to resolve dispute" });
  }
});

/* =======================================================
   CLIENT — REJECT PROPOSAL
======================================================= */
router.post("/:id/reject", authRequired, async (req, res) => {
  const disputeId = req.params.id;

  try {
    const [rows] = await db.promise().query(
      `
      SELECT id
      FROM disputes
      WHERE id = ?
        AND client_id = ?
        AND status = 'SHOP_PROPOSED'
      `,
      [disputeId, req.user.id]
    );

    if (rows.length === 0) {
      return res.status(403).json({ message: "Action not allowed" });
    }

    await db.promise().query(
      `
      UPDATE disputes
      SET status = 'REJECTED',
          resolved_at = NOW()
      WHERE id = ?
      `,
      [disputeId]
    );

    return res.json({ message: "Dispute rejected" });
  } catch (err) {
    console.error("❌ REJECT DISPUTE:", err);
    return res.status(500).json({ message: "Failed to reject dispute" });
  }
});

/* =======================================================
   SHOP — GET SINGLE DISPUTE (WITH CLIENT MESSAGE)
======================================================= */
router.get("/:id", authRequired, async (req, res) => {
  const disputeId = req.params.id;

  try {
    // 1️⃣ Get dispute basic info
    const [[dispute]] = await db.promise().query(
      `
      SELECT
        d.id,
        d.status,
        d.proposed_resolution,
        d.shop_response,
        d.created_at,
        d.resolved_at,
        device.name AS device_name,
        sr.issue_description,
        sr.id AS request_id,
        u.first_name,
        u.last_name
      FROM disputes d
      JOIN service_requests sr ON sr.id = d.request_id
      JOIN users u ON u.id = d.client_id
      JOIN shops s ON s.id = d.shop_id
      LEFT JOIN devices device ON device.id = sr.device_id
      WHERE d.id = ? AND (d.client_id = ? OR s.user_id = ?)
      `,
      [disputeId, req.user.id, req.user.id]
    );

    if (!dispute) {
      return res.status(404).json({ message: "Dispute not found" });
    }

    // Load the response history, keeping the original client-message field.
    const [history] = await db.promise().query(
      `
      SELECT id, edited_by, content, created_at
      FROM dispute_edits
      WHERE dispute_id = ?
      ORDER BY created_at ASC, id ASC
      `,
      [disputeId]
    );

    // 3️⃣ Send everything to frontend
    return res.json({
      dispute: {
        ...dispute,
        client_message: history.find((entry) => entry.edited_by === "CLIENT") || null,
        history,
      },
    });
  } catch (err) {
    console.error("❌ GET DISPUTE:", err);
    return res.status(500).json({ message: "Failed to load dispute" });
  }
});


export default router;
