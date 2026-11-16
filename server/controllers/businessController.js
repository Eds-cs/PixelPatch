// server/controllers/businessController.js
import db from "../config/db.js";
import { withTransaction } from "../utils/transaction.js";
import jwt from "jsonwebtoken";
import { resolveShopIdForUser } from "./repairController.js";


// Payout methods offered by app/become-partner.jsx (shop_payouts.method also
// allows CARD for older data).
const PAYOUT_METHODS = ["GCASH", "MAYA", "BANK"];

// Register a new business/shop

export const registerBusiness = async (req, res) => {
  const userId = req.user.id;

  const {
    business_name,
    business_email,
    business_phone,
    region,
    province,
    city,
    barangay,
    street,
    postal_code,
    days_from,
    days_to,
    open_time,
    close_time,
    services,
    payment
  } = req.body;

  try {
    // --------------------------------------------------
    // 1. HARD VALIDATION — BUSINESS INFO
    // --------------------------------------------------
    if (
      !business_name ||
      !business_email ||
      !business_phone ||
      !region ||
      !province ||
      !city ||
      !barangay ||
      !street ||
      !days_from ||
      !days_to ||
      !open_time ||
      !close_time
    ) {
      return res.status(400).json({
        success: false,
        message: "Business information is incomplete"
      });
    }

    // --------------------------------------------------
    // 2. HARD VALIDATION — SERVICES
    // --------------------------------------------------
    if (!Array.isArray(services) || services.length === 0) {
      return res.status(400).json({
        success: false,
        message: "At least one service is required"
      });
    }

    for (const svc of services) {
      if (
        !svc.category ||
        !svc.repair_service ||
        !svc.price ||
        isNaN(parseFloat(svc.price)) ||
        parseFloat(svc.price) <= 0 ||
        !svc.time_from ||
        !svc.time_to ||
        !svc.time_unit
      ) {
        return res.status(400).json({
          success: false,
          message: "Invalid service data"
        });
      }
    }

    // --------------------------------------------------
    // 3. HARD VALIDATION — PAYMENT
    // --------------------------------------------------
    if (
      !payment ||
      !PAYOUT_METHODS.includes(payment.payment_method) ||
      !String(payment.account_name ?? "").trim() ||
      String(payment.account_name).trim().length > 100 ||
      !String(payment.account_number ?? "").trim() ||
      String(payment.account_number).trim().length > 50 ||
      payment.terms !== true ||
      payment.privacy !== true
    ) {
      return res.status(400).json({
        success: false,
        message: "Payment information is incomplete"
      });
    }

    // --------------------------------------------------
    // 4. BLOCK DUPLICATE SHOP
    // --------------------------------------------------
    const existingShop = await new Promise((resolve, reject) => {
      db.query(
        "SELECT id FROM shops WHERE user_id = ? LIMIT 1",
        [userId],
        (err, rows) => (err ? reject(err) : resolve(rows))
      );
    });

    if (existingShop.length > 0) {
      return res.status(400).json({
        success: false,
        message: "User already has a registered shop"
      });
    }

    // --------------------------------------------------
    // 5. TRANSACTION — ALL OR NOTHING
    // --------------------------------------------------
    // One pooled connection for the whole registration: the address, shop,
    // role change and services are committed together or rolled back together.
    const shopId = await withTransaction(async (conn) => {
      // -----------------------------
      // ADDRESS INSERT
      // -----------------------------
      const [addressResult] = await conn.query(
        `
        INSERT INTO addresses (
          user_id,
          country,
          region,
          province,
          city,
          barangay,
          street,
          postal_code,
          latitude,
          longitude,
          created_at,
          updated_at
        )
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW(), NOW())
        `,
        [
          userId,
          "",                 // country placeholder
          region,
          province,
          city,
          barangay,
          street,
          postal_code || null,
          null,              // latitude: not collected yet (unknown)
          null               // longitude: not collected yet (unknown)
        ]
      );

      const addressId = addressResult.insertId;

      // -----------------------------
      // SHOP INSERT
      // -----------------------------
      const [shopResult] = await conn.query(
        `
        INSERT INTO shops (
          user_id,
          name,
          description,
          address_id,
          phone_number,
          email,
          open_time,
          closing_time,
          days_from,
          days_to,
          is_verified,
          rating_average,
          current_customer_count,
          created_at,
          updated_at
        )
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW(), NOW())
        `,
        [
          userId,
          business_name,
          "Business profile created",
          addressId,
          business_phone,
          business_email,
          open_time,
          close_time,
          days_from,
          days_to,
          0,        // is_verified
          0.00,     // rating_average (initial)
          0
        ]
      );

      const newShopId = shopResult.insertId;

      await conn.query("UPDATE users SET role_id = 3 WHERE id = ?", [userId]);

      // -----------------------------
      // SERVICES INSERT
      // -----------------------------
      for (const svc of services) {
        await conn.query(
          `
          INSERT INTO shop_services (
            shop_id,
            name,
            category,
            description,
            base_price,
            estimated_timeframe,
            accepts_pickup,
            accepts_onsite,
            accepts_dropoff,
            created_at,
            updated_at
          )
          VALUES (?, ?, ?, ?, ?, ?, 0, 0, 1, NOW(), NOW())
          `,
          [
            newShopId,
            svc.repair_service,
            svc.category.toUpperCase(),
            "Registered service",
            parseFloat(svc.price),
            `${svc.time_from}-${svc.time_to} ${svc.time_unit}`
          ]
        );
      }

      // -----------------------------
      // PAYOUT ACCOUNT
      // -----------------------------
      // Starts PENDING; verification of the account is a separate step.
      await conn.query(
        `INSERT INTO shop_payouts (shop_id, method, account_name, account_number, tin, status)
         VALUES (?, ?, ?, ?, NULL, 'PENDING')`,
        [
          newShopId,
          payment.payment_method,
          String(payment.account_name).trim(),
          String(payment.account_number).trim()
        ]
      );

      return newShopId;
    });

    return res.json({
      success: true,
      message: "Business registered successfully",
      shop_id: shopId,
      token: jwt.sign(
        { id: userId, role_id: 3 },
        process.env.JWT_SECRET,
        { expiresIn: "7d" }
      ),
      user: { id: userId, role_id: 3 }
    });

  } catch (err) {
    console.error("❌ registerBusiness error:", err);
    return res.status(500).json({ message: "Server error" });
  }
};

// =====================================================
// GET BUSINESS SHOP FOR LOGGED-IN USER
// =====================================================
// Convert db.query to promise-based
function query(sql, params = []) {
  return new Promise((resolve, reject) => {
    db.query(sql, params, (err, result) => {
      if (err) reject(err);
      else resolve(result);
    });
  });
}

export const getMyShop = async (req, res) => {
  try {
    const userId = req.user.id;

    console.log("📌 getMyShop() called for user:", userId);

    // Use the promise-based wrapper
    const rows = await query(
      `SELECT id 
       FROM shops 
       WHERE user_id = ? 
       LIMIT 1`,
      [userId]
    );


    if (rows.length === 0) {
      return res.json({
        success: false,
        message: "This user does not own a shop."
      });
    }

    return res.json({
      success: true,
      shopId: rows[0].id
    });

  } catch (err) {
    console.error("❌ Error in getMyShop:", err);
    return res.status(500).json({
      success: false,
      error: err.message
    });
  }
};

export const getRepairDetails = async (req, res) => {
  try {
    const requestId = req.params.id;
    // DEBUG LOG
    console.log("📥 GET /repairs/:id");

    const shopId = await resolveShopIdForUser(req);
    // DEBUG LOG
    console.log("🔎 requestId:", requestId, "shopId:", shopId);
    console.log("🔎 getRepairById called with id:", req.params.id);

    if (!shopId) {
      return res.status(404).json({
        success: false,
        message: "Shop not found",
      });
    }

    const sql = `
      SELECT 
        sr.id,
        u.first_name AS client,
        d.name AS deviceType,
        sr.issue_description,
        sr.decision AS decisionStatus,
        sr.delivery_method,
        sr.preferred_date,
        GROUP_CONCAT(DISTINCT ss.name SEPARATOR ', ') AS services
      FROM service_requests sr
      JOIN users u ON sr.client_id = u.id
      JOIN devices d ON sr.device_id = d.id
      LEFT JOIN service_request_items sri ON sri.request_id = sr.id
      LEFT JOIN shop_services ss ON ss.id = sri.service_id
      WHERE sr.id = ? AND sr.shop_id = ?
      GROUP BY 
        sr.id,
        u.first_name,
        d.name,
        sr.issue_description,
        sr.decision,
        sr.delivery_method,
        sr.preferred_date
      LIMIT 1
    `;

    const rows = await query(sql, [requestId, shopId]);

    if (rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: "Repair request not found",
      });
    }

    const row = rows[0];

    // Normalize response for frontend
    const repair = {
      id: row.id,
      client: row.client,
      deviceType: row.deviceType,
      issueDescription: row.issue_description,
      decisionStatus: row.decisionStatus,
      deliveryMethod: row.delivery_method,
      preferredDate: row.preferred_date,
      services: row.services ? row.services.split(", ") : [],
      attachments: [] // we’ll populate this in Step 4
    };

    return res.json({
      success: true,
      repair,
    });

  } catch (err) {
    console.error("❌ Error loading repair details:", err);
    return res.status(500).json({
      success: false,
      message: "Server error",
    });
  }

};

