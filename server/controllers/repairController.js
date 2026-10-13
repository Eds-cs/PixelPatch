// server/controllers/repairController.js
import db from "../config/db.js";
import { isValidDateOnly } from "../utils/dateValidation.js";

/* ----------------------------------------------------------
   Helper: Promise wrapper for db.query()
----------------------------------------------------------- */
function query(sql, params = []) {
  return new Promise((resolve, reject) => {
    db.query(sql, params, (err, results) => {
      if (err) reject(err);
      else resolve(results);
    });
  });
}

/* ----------------------------------------------------------
   Resolve shop_id for logged-in business
----------------------------------------------------------- */
async function resolveShopIdForUser(req) {
  if (req.shopId) return req.shopId;

  const userId = req.user?.id;
  if (!userId) {
    console.log("❌ No user found on request.");
    return null;
  }

  console.log("🔄 Fetching shop for user:", userId);

  // ❗ FIX: Use query() wrapper, NOT db.query destructuring
  const rows = await query(
    `SELECT id FROM shops WHERE user_id = ? LIMIT 1`,
    [userId]
  );

  if (rows.length === 0) {
    console.log("⚠️ No shop found for this user.");
    return null;
  }

  console.log("✅ Shop resolved:", rows[0].id);
  return rows[0].id;
}

export { resolveShopIdForUser };

/* ============================================================
   1. GET ALL REPAIRS FOR SHOP
============================================================ */
export const getRepairsForShop = async (req, res) => {
  try {
    console.log("\n=======================");
    console.log("📥 GET /repairs - Fetch Repairs for Shop");
    console.log("=======================\n");

    const shopId = await resolveShopIdForUser(req);
    console.log("🏪 Resolved shopId:", shopId);

    if (!shopId) {
      return res.status(404).json({
        success: false,
        message: "Shop not found for user",
      });
    }

    console.log("📡 Getting repairs for shop:", shopId);

    const sql = `
      SELECT 
        sr.id,
        u.first_name AS client,
        d.name AS deviceType,
        sr.issue_description,
        sr.decision AS decisionStatus,

        /* Fallback for old MySQL: return comma-separated service list */
        COALESCE(GROUP_CONCAT(ss.name SEPARATOR ', '), '') AS services

      FROM service_requests sr
      JOIN users u ON sr.client_id = u.id
      JOIN devices d ON sr.device_id = d.id

      LEFT JOIN service_request_items sri ON sri.request_id = sr.id
      LEFT JOIN shop_services ss ON ss.id = sri.service_id

      WHERE sr.shop_id = ?
      GROUP BY sr.id, u.first_name, d.name, sr.issue_description, sr.decision
      ORDER BY sr.id DESC
    `;

    const repairs = await query(sql, [shopId]);

    console.log("📤 Repairs returned:", repairs.length);


    return res.json({
      success: true,
      repairs,
    });

  } catch (error) {
    console.log("❌ Error fetching repairs:", error);
    return res.status(500).json({
      success: false,
      message: "Server error",
    });
  }
};

/* ============================================================
   2. GET REPAIR BY ID
============================================================ */
export const getRepairById = async (req, res) => {
  try {
    const { id } = req.params;

    console.log("\n=======================");
    console.log("📥 GET /repairs/" + id);
    console.log("=======================\n");

    const shopId = await resolveShopIdForUser(req);
    if (!shopId) {
      return res.status(404).json({
        success: false,
        message: "Shop not found",
      });
    }

    const rows = await query(
      `
        SELECT 
          sr.id,
          sr.issue_description,
          sr.decision AS decisionStatus,
          sr.status,
          sr.rejection_reason, 
          sr.delivery_method,
          sr.preferred_date,
          sr.is_received,
          sr.received_at,
          sr.received_method,
          sr.payment_status,

          p.payment_link,

          CONCAT(u.first_name, ' ', u.last_name) AS client,
          d.name AS deviceType,

          CONCAT_WS(', ',
            a.street,
            a.barangay,
            a.city,
            a.province
          ) AS pickupAddress,

          COALESCE(GROUP_CONCAT(DISTINCT ss.name SEPARATOR ', '), '') AS services

        FROM service_requests sr
        LEFT JOIN payments p 
          ON p.request_id = sr.id
        LEFT JOIN users u ON sr.client_id = u.id
        LEFT JOIN devices d ON sr.device_id = d.id
        LEFT JOIN addresses a ON sr.pickup_address_id = a.id
        LEFT JOIN service_request_items sri ON sri.request_id = sr.id
        LEFT JOIN shop_services ss ON ss.id = sri.service_id

        WHERE sr.id = ? AND sr.shop_id = ?
        GROUP BY sr.id
        LIMIT 1;
      `,
      [id, shopId]
    );


    if (rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: "Repair not found or unauthorized",
      });
    }

    const row = rows[0];

    const repair = {
      id: row.id,
      status: row.status, 
      client: row.client,
      deviceType: row.deviceType,
      issueDescription: row.issue_description,
      decisionStatus: row.decisionStatus,
      rejectionReason: row.rejection_reason,
      deliveryMethod: row.delivery_method,
      preferredDate: row.preferred_date,
      isReceived: Boolean(row.is_received),
      receivedAt: row.received_at,
      receivedMethod: row.received_method,
      pickupAddress: row.pickupAddress || null,
      services: row.services ? row.services.split(", ") : [],
      paymentStatus: row.payment_status,
      paymentLink: row.payment_link || null,
    };

    return res.json({
      success: true,
      repair,
    });

  } catch (error) {
    console.error("❌ Error fetching repair:", error);
    return res.status(500).json({
      success: false,
      message: "Server error",
    });
  }
};

export const getRepairServices = async (req, res) => {
  try {
    const rows = await query(
      `SELECT ss.id, ss.name, ss.category, ss.base_price,
              EXISTS (
                SELECT 1 FROM service_request_items selected_item
                WHERE selected_item.request_id = sr.id AND selected_item.service_id = ss.id
              ) AS selected
       FROM service_requests sr
       JOIN shop_services ss ON ss.shop_id = sr.shop_id
       WHERE sr.id = ? AND sr.shop_id = ?
       ORDER BY ss.name ASC`,
      [req.params.id, req.shopId]
    );

    return res.json({ services: rows });
  } catch (error) {
    console.error("Error fetching repair services:", error);
    return res.status(500).json({ message: "Unable to fetch repair services" });
  }
};

export const addRepairServices = async (req, res) => {
  const rawServiceIds = req.body?.serviceIds;
  if (!Array.isArray(rawServiceIds) || rawServiceIds.length === 0) {
    return res.status(400).json({ message: "Choose at least one service" });
  }

  const serviceIds = [...new Set(rawServiceIds.map(Number))];
  if (serviceIds.some((serviceId) => !Number.isSafeInteger(serviceId) || serviceId <= 0)) {
    return res.status(400).json({ message: "Invalid service selection" });
  }

  try {
    const [requestRows, availableRows, existingRows] = await Promise.all([
      query(
        `SELECT sr.decision, sr.status, sr.payment_status, rq.id AS quotation_id
         FROM service_requests sr
         LEFT JOIN request_quotations rq ON rq.request_id = sr.id
         WHERE sr.id = ? AND sr.shop_id = ?
         LIMIT 1`,
        [req.params.id, req.shopId]
      ),
      query(
        `SELECT id FROM shop_services WHERE shop_id = ? AND id IN (${serviceIds.map(() => "?").join(",")})`,
        [req.shopId, ...serviceIds]
      ),
      query(
        `SELECT service_id FROM service_request_items WHERE request_id = ?`,
        [req.params.id]
      ),
    ]);

    if (requestRows.length === 0) {
      return res.status(404).json({ message: "Repair not found" });
    }

    const repair = requestRows[0];
    if (
      repair.decision !== "ACCEPTED" ||
      repair.status === "IN_PROGRESS" ||
      repair.status === "COMPLETED" ||
      repair.payment_status !== "PENDING" ||
      repair.quotation_id
    ) {
      return res.status(409).json({ message: "Services can only be added before quotation and payment" });
    }

    if (availableRows.length !== serviceIds.length) {
      return res.status(400).json({ message: "One or more services are not offered by this shop" });
    }

    const existingIds = new Set(existingRows.map((row) => Number(row.service_id)));
    const newIds = serviceIds.filter((serviceId) => !existingIds.has(serviceId));
    for (const serviceId of newIds) {
      await query(
        `INSERT INTO service_request_items (request_id, service_id) VALUES (?, ?)`,
        [req.params.id, serviceId]
      );
    }

    return res.json({ success: true, added: newIds.length });
  } catch (error) {
    console.error("Error adding repair services:", error);
    return res.status(500).json({ message: "Unable to add services to this repair" });
  }
};


/* ============================================================
   3. REJECT REPAIR
============================================================ */
export const rejectRepair = async (req, res) => {
  try {
    const { id } = req.params;
    const { reason } = req.body;

    console.log("\n=======================");
    console.log("📥 POST /repairs/reject/" + id);
    console.log("Reason:", reason);
    console.log("=======================\n");

    const shopId = await resolveShopIdForUser(req);
    if (!shopId) {
      return res.status(404).json({ success: false, message: "Shop not found" });
    }

    // Check ownership
    const existing = await query(
      `SELECT id FROM service_requests WHERE id = ? AND shop_id = ? LIMIT 1`,
      [id, shopId]
    );

    if (existing.length === 0) {
      console.log("🚫 Reject attempt denied — not your request");
      return res.status(403).json({
        success: false,
        message: "Not authorized",
      });
    }

    // Update status
    await query(
      `UPDATE service_requests 
       SET decision = 'REJECTED',
           rejection_reason = ?,
           updated_at = NOW()
       WHERE id = ?`,
      [reason, id]
    );

    console.log("✅ Repair rejected");

    return res.json({ success: true, message: "Repair request rejected." });

  } catch (error) {
    console.log("❌ Error rejecting repair:", error);
    return res.status(500).json({ success: false, message: "Server error" });
  }
};

/* ============================================================
   4. CONFIRM (ACCEPT) REPAIR
============================================================ */
export const confirmRepair = async (req, res) => {
  try {
    const { id } = req.params;

    console.log("\n=======================");
    console.log("📥 POST /repairs/confirm/" + id);
    console.log("=======================\n");

    const shopId = await resolveShopIdForUser(req);
    if (!shopId) {
      return res.status(404).json({
        success: false,
        message: "Shop not found"
      });
    }

    // Check ownership
    const existing = await query(
      `SELECT id, decision FROM service_requests
       WHERE id = ? AND shop_id = ? LIMIT 1`,
      [id, shopId]
    );

    if (existing.length === 0) {
      console.log("🚫 Confirm attempt denied — not your request");
      return res.status(403).json({
        success: false,
        message: "Not authorized"
      });
    }

    // Prevent double decision
    if (existing[0].decision !== "PENDING") {
      return res.status(400).json({
        success: false,
        message: "Request already decided"
      });
    }

    // Update decision
    await query(
      `UPDATE service_requests
       SET decision = 'ACCEPTED',
           status = 'REVIEW',
           rejection_reason = NULL,
           updated_at = NOW()
       WHERE id = ?`,
      [id]
    );

    console.log("✅ Repair confirmed");

    return res.json({
      success: true,
      message: "Repair request confirmed."
    });

  } catch (error) {
    console.log("❌ Error confirming repair:", error);
    return res.status(500).json({
      success: false,
      message: "Server error"
    });
  }
};

/* ============================================================
   4. SAVE ASSESSMENT
============================================================ */
export const saveAssessment = async (req, res) => {
  try {
    const { id } = req.params;
    const {
      deviceCondition,
      observedIssues,
      recommendation,
      isRemote
    } = req.body;

    const shopId = await resolveShopIdForUser(req);
    if (!shopId) {
      return res.status(404).json({
        success: false,
        message: "Shop not found"
      });
    }

    // 1️⃣ Verify ownership + ACCEPTED
    const requestRows = await query(
      `SELECT id, decision
       FROM service_requests
       WHERE id = ? AND shop_id = ?
       LIMIT 1`,
      [id, shopId]
    );

    if (requestRows.length === 0) {
      return res.status(403).json({
        success: false,
        message: "Not authorized"
      });
    }

    if (requestRows[0].decision !== "ACCEPTED") {
      return res.status(400).json({
        success: false,
        message: "Assessment allowed only for accepted repairs"
      });
    }
    // ❌ Lock assessment if quotation already exists
    const quotationRows = await query(
      `SELECT id FROM request_quotations WHERE request_id = ? LIMIT 1`,
      [id]
    );

    if (quotationRows.length > 0) {
      return res.status(403).json({
        success: false,
        message: "Assessment is locked because a quotation already exists"
      });
    }

    // 2️⃣ Check if assessment exists
    const existing = await query(
      `SELECT id FROM request_assessments WHERE request_id = ? LIMIT 1`,
      [id]
    );

    if (existing.length > 0) {
      // 🔁 UPDATE
      await query(
        `UPDATE request_assessments
         SET device_condition = ?,
             observed_issues = ?,
             recommendation = ?,
             is_remote = ?,
             updated_at = NOW()
         WHERE request_id = ?`,
        [
          deviceCondition || null,
          observedIssues || null,
          recommendation || null,
          isRemote ? 1 : 0,
          id
        ]
      );

      return res.json({
        success: true,
        message: "Assessment updated successfully"
      });
    }

    // ➕ INSERT (first time)
    await query(
      `INSERT INTO request_assessments
       (request_id, device_condition, observed_issues, recommendation, is_remote, created_at)
       VALUES (?, ?, ?, ?, ?, NOW())`,
      [
        id,
        deviceCondition || null,
        observedIssues || null,
        recommendation || null,
        isRemote ? 1 : 0
      ]
    );

    return res.json({
      success: true,
      message: "Assessment created successfully"
    });

  } catch (error) {
    console.error("❌ Error saving assessment:", error);
    return res.status(500).json({
      success: false,
      message: "Server error"
    });
  }
};


/* ============================================================
   5. GET ASSESSMENT BY REQUEST
============================================================ */
export const getAssessmentByRequest = async (req, res) => {
  try {
    const { id } = req.params;

    console.log("\n=======================");
    console.log("📥 GET /repairs/" + id + "/assessment");
    console.log("=======================\n");

    const shopId = await resolveShopIdForUser(req);
    if (!shopId) {
      return res.status(404).json({
        success: false,
        message: "Shop not found"
      });
    }

    // Verify ownership
    const rows = await query(
      `
      SELECT 
        ra.id,
        ra.device_condition,
        ra.observed_issues,
        ra.recommendation,
        ra.is_remote,
        ra.created_at,
        ra.updated_at
      FROM request_assessments ra
      JOIN service_requests sr ON sr.id = ra.request_id
      WHERE sr.id = ? AND sr.shop_id = ?
      LIMIT 1
      `,
      [id, shopId]
    );

    if (rows.length === 0) {
      return res.json({
        success: true,
        assessment: null
      });
    }

    const row = rows[0];

    return res.json({
      success: true,
      assessment: {
        id: row.id,
        deviceCondition: row.device_condition,
        observedIssues: row.observed_issues,
        recommendation: row.recommendation,
        isRemote: !!row.is_remote,
        createdAt: row.created_at,
        updatedAt: row.updated_at
      }
    });

  } catch (error) {
    console.error("❌ Error fetching assessment:", error);
    return res.status(500).json({
      success: false,
      message: "Server error"
    });
  }
};


export const createQuotation = async (req, res) => {
  try {
    const { id } = req.params; // service_requests.id
    const {
      estimatedCompletionTime,
      isPartsNeeded,
      parts = [],
      warranty
    } = req.body;

    if (!isValidDateOnly(estimatedCompletionTime)) {
      return res.status(400).json({ message: "A valid estimated completion date is required" });
    }

    const shopId = await resolveShopIdForUser(req);
    if (!shopId) {
      return res.status(404).json({
        success: false,
        message: "Shop not found"
      });
    }

    /* -------------------------------------------------
       1️⃣ Verify request ownership + accepted + assessment
    -------------------------------------------------- */
    const requestRows = await query(
      `SELECT sr.id, ra.id AS assessment_id
       FROM service_requests sr
       JOIN request_assessments ra ON ra.request_id = sr.id
       WHERE sr.id = ?
         AND sr.shop_id = ?
         AND sr.decision = 'ACCEPTED'
       LIMIT 1`,
      [id, shopId]
    );

    if (requestRows.length === 0) {
      return res.status(403).json({
        success: false,
        message: "Quotation requires an accepted request with assessment"
      });
    }

    const assessmentId = requestRows[0].assessment_id;

    /* -------------------------------------------------
       2️⃣ Prevent duplicate quotation
    -------------------------------------------------- */
    const existingQuote = await query(
      `SELECT id FROM request_quotations WHERE request_id = ? LIMIT 1`,
      [id]
    );

    if (existingQuote.length > 0) {
      return res.status(409).json({
        success: false,
        message: "Quotation already exists"
      });
    }

    /* -------------------------------------------------
       3️⃣ Compute SERVICE TOTAL from shop_services
    -------------------------------------------------- */
    const serviceTotalRows = await query(
      `SELECT COALESCE(SUM(ss.base_price), 0) AS service_total
       FROM service_request_items sri
       JOIN shop_services ss ON ss.id = sri.service_id
       WHERE sri.request_id = ?`,
      [id]
    );

    const serviceTotal = Number(serviceTotalRows[0].service_total || 0);

    /* -------------------------------------------------
       4️⃣ Compute PARTS TOTAL
    -------------------------------------------------- */
    const partsTotal = isPartsNeeded
      ? parts.reduce((sum, p) => sum + Number(p.cost || 0), 0)
      : 0;

    /* -------------------------------------------------
       5️⃣ FINAL ESTIMATED COST
    -------------------------------------------------- */
    const estimatedCost = serviceTotal + partsTotal;

    /* -------------------------------------------------
       6️⃣ Insert quotation (labor_fee = 0)
    -------------------------------------------------- */
    const result = await query(
      `INSERT INTO request_quotations
       (request_id, assessment_id, labor_fee, estimated_cost,
        estimated_completion_time, is_parts_needed,
        status, created_at, updated_at)
       VALUES (?, ?, 0, ?, ?, ?, 'PENDING', NOW(), NOW())`,
      [
        id,
        assessmentId,
        estimatedCost,
        estimatedCompletionTime || null,
        isPartsNeeded ? 1 : 0
      ]
    );

    const quotationId = result.insertId;

    /* -------------------------------------------------
       7️⃣ Insert PARTS (if any)
    -------------------------------------------------- */
    if (isPartsNeeded && parts.length > 0) {
      for (const part of parts) {
        await query(
          `INSERT INTO request_quotation_parts
           (request_quotation_id, name, cost)
           VALUES (?, ?, ?)`,
          [quotationId, part.name, part.cost]
        );
      }
    }

    /* -------------------------------------------------
       8️⃣ Insert WARRANTY (optional)
    -------------------------------------------------- */
    if (warranty) {
      await query(
        `INSERT INTO request_quotation_warranties
         (request_quotation_id, is_warranty_covered,
          warranty_value, warranty_unit)
         VALUES (?, ?, ?, ?)`,
        [
          quotationId,
          warranty.isWarrantyCovered ? 1 : 0,
          warranty.warrantyValue,
          warranty.warrantyUnit
        ]
      );
    }

    return res.json({
      success: true,
      message: "Quotation created successfully",
      quotationId,
      breakdown: {
        serviceTotal,
        partsTotal,
        estimatedCost
      }
    });

  } catch (error) {
    console.error("❌ Error creating quotation:", error);
    return res.status(500).json({
      success: false,
      message: "Server error"
    });
  }
};


export const getQuotationByRequest = async (req, res) => {
  try {
    const { id } = req.params;

    const quotationRows = await query(
      `SELECT rq.*,
              DATE_FORMAT(rq.estimated_completion_time, '%Y-%m-%d') AS estimated_completion_date
       FROM request_quotations rq
       JOIN service_requests sr ON sr.id = rq.request_id
       WHERE rq.request_id = ? AND sr.shop_id = ?
       LIMIT 1`,
      [id, req.shopId]
    );

    if (quotationRows.length === 0) {
      return res.json({ quotation: null });
    }

    const quotation = quotationRows[0];

    const parts = await query(
      `SELECT name, cost
       FROM request_quotation_parts
       WHERE request_quotation_id = ?`,
      [quotation.id]
    );

    const warranty = await query(
      `SELECT is_warranty_covered, warranty_value, warranty_unit
       FROM request_quotation_warranties
       WHERE request_quotation_id = ?
       LIMIT 1`,
      [quotation.id]
    );

    const services = await query(
      `SELECT ss.name, ss.base_price
      FROM service_request_items sri
      JOIN shop_services ss ON ss.id = sri.service_id
      WHERE sri.request_id = ?`,
      [id]
    );

    return res.json({
      quotation,
      services,
      parts,
      warranty: warranty[0] || null
    });

  } catch (error) {
    console.error("❌ Error fetching quotation:", error);
    res.status(500).json({ message: "Server error" });
  }
};

export const updateQuotation = async (req, res) => {
  try {
    const { id } = req.params; // service_requests.id
    const {
      estimatedCompletionTime,
      isPartsNeeded,
      parts = [],
      warranty
    } = req.body;

    if (!isValidDateOnly(estimatedCompletionTime)) {
      return res.status(400).json({ message: "A valid estimated completion date is required" });
    }

    const shopId = await resolveShopIdForUser(req);
    if (!shopId) {
      return res.status(404).json({
        success: false,
        message: "Shop not found"
      });
    }

    // 1️⃣ Get quotation + verify ownership + editable status
    const rows = await query(
      `SELECT rq.id AS quotation_id
       FROM request_quotations rq
       JOIN service_requests sr ON sr.id = rq.request_id
       WHERE rq.request_id = ?
         AND sr.shop_id = ?
         AND rq.status = 'PENDING'
       LIMIT 1`,
      [id, shopId]
    );

    if (rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: "Editable quotation not found"
      });
    }

    const quotationId = rows[0].quotation_id;

    // 2️⃣ Update quotation (non-price fields)
    await query(
      `UPDATE request_quotations
       SET estimated_completion_time = ?,
           is_parts_needed = ?,
           updated_at = NOW()
       WHERE id = ?`,
      [
        estimatedCompletionTime || null,
        isPartsNeeded ? 1 : 0,
        quotationId
      ]
    );

    // 3️⃣ Replace parts
    await query(
      `DELETE FROM request_quotation_parts
       WHERE request_quotation_id = ?`,
      [quotationId]
    );

    if (isPartsNeeded && parts.length > 0) {
      for (const part of parts) {
        await query(
          `INSERT INTO request_quotation_parts
           (request_quotation_id, name, cost)
           VALUES (?, ?, ?)`,
          [quotationId, part.name, part.cost]
        );
      }
    }

    // -------------------------------------------------
    // 4️⃣ RECOMPUTE ESTIMATED COST (THIS WAS MISSING)
    // -------------------------------------------------

    // Service total
    const serviceTotalRows = await query(
      `SELECT COALESCE(SUM(ss.base_price), 0) AS service_total
       FROM service_request_items sri
       JOIN shop_services ss ON ss.id = sri.service_id
       WHERE sri.request_id = ?`,
      [id]
    );

    const serviceTotal = Number(serviceTotalRows[0].service_total || 0);

    // Parts total
    const partsTotal = isPartsNeeded
      ? parts.reduce((sum, p) => sum + Number(p.cost || 0), 0)
      : 0;

    const estimatedCost = serviceTotal + partsTotal;

    // Update total
    await query(
      `UPDATE request_quotations
       SET estimated_cost = ?, updated_at = NOW()
       WHERE id = ?`,
      [estimatedCost, quotationId]
    );

    // 5️⃣ Replace warranty
    await query(
      `DELETE FROM request_quotation_warranties
       WHERE request_quotation_id = ?`,
      [quotationId]
    );

    if (warranty) {
      await query(
        `INSERT INTO request_quotation_warranties
         (request_quotation_id, is_warranty_covered, warranty_value, warranty_unit)
         VALUES (?, ?, ?, ?)`,
        [
          quotationId,
          warranty.isWarrantyCovered ? 1 : 0,
          warranty.warrantyValue,
          warranty.warrantyUnit
        ]
      );
    }

    return res.json({
      success: true,
      message: "Quotation updated successfully",
      estimatedCost
    });

  } catch (error) {
    console.error("❌ Error updating quotation:", error);
    return res.status(500).json({
      success: false,
      message: "Server error"
    });
  }
};

export const setQuotationCompletionDate = async (req, res) => {
  const completionDate = req.body?.estimatedCompletionTime;
  if (!isValidDateOnly(completionDate)) {
    return res.status(400).json({ message: "A valid estimated completion date is required" });
  }

  try {
    const shopId = await resolveShopIdForUser(req);
    if (!shopId) {
      return res.status(404).json({ success: false, message: "Shop not found" });
    }

    const result = await query(
      `UPDATE request_quotations rq
       JOIN service_requests sr ON sr.id = rq.request_id
       SET rq.estimated_completion_time = ?, rq.updated_at = NOW()
       WHERE rq.request_id = ?
         AND sr.shop_id = ?
         AND sr.decision = 'ACCEPTED'
         AND sr.payment_status = 'PENDING'
         AND rq.status = 'PENDING'`,
      [completionDate, req.params.id, shopId]
    );

    if (result.affectedRows === 0) {
      return res.status(404).json({
        success: false,
        message: "Pending quotation not found or no longer editable",
      });
    }

    return res.json({ success: true, message: "Estimated completion date saved" });
  } catch (error) {
    console.error("Error saving quotation completion date:", error);
    return res.status(500).json({ message: "Unable to save completion date" });
  }
};


export const  startRepair = (req, res) => {
  const user = req.user;
  const requestId = req.params.id;

  // Business only
  if (!user || user.role_id !== 3) {
    return res.status(403).json({ message: "Business access only" });
  }

  if (!requestId) {
    return res.status(400).json({ message: "Request ID is required" });
  }

  console.log("▶️ Start repair:", requestId);

  /* ----------------------------------
     1. Load service request
  ---------------------------------- */
  const requestSql = `
    SELECT
      id,
      status,
      decision,
      payment_status
    FROM service_requests
    WHERE id = ? AND shop_id = ?
    LIMIT 1
  `;

  db.query(requestSql, [requestId, req.shopId], (err, rows) => {
    if (err) {
      console.error("❌ Request lookup error:", err);
      return res.status(500).json({ message: "DB error" });
    }

    if (rows.length === 0) {
      return res.status(404).json({ message: "Request not found" });
    }

    const request = rows[0];

    if (request.status === "COMPLETED") {
      return res.status(400).json({ message: "Repair already completed" });
    }

    if (request.decision !== "ACCEPTED") {
      return res.status(400).json({ message: "Request not accepted" });
    }

    if (request.payment_status !== "PAID") {
      return res.status(400).json({ message: "Payment required" });
    }

    /* ----------------------------------
       2. Check employee assignment
    ---------------------------------- */
    const assignmentSql = `
      SELECT id
      FROM request_assignments
      WHERE request_id = ?
      LIMIT 1
    `;

    db.query(assignmentSql, [requestId], (err2, assignRows) => {
      if (err2) {
        console.error("❌ Assignment lookup error:", err2);
        return res.status(500).json({ message: "DB error" });
      }

      if (assignRows.length === 0) {
        return res.status(400).json({
          message: "Employee must be assigned before starting repair"
        });
      }

      /* ----------------------------------
         3. Start repair
      ---------------------------------- */
      const startSql = `
        UPDATE service_requests
        SET status = 'IN_PROGRESS', updated_at = NOW()
        WHERE id = ? AND shop_id = ?
      `;

      db.query(startSql, [requestId, req.shopId], (err3) => {
        if (err3) {
          console.error("❌ Failed to start repair:", err3);
          return res.status(500).json({ message: "DB error" });
        }

        console.log("✅ Repair started:", requestId);

        return res.json({
          message: "Repair started successfully",
          status: "IN_PROGRESS"
        });
      });
    });
  });
};

// GET repair in progress or completed (business view)
export const getRepairInProgress = (req, res) => {
  const user = req.user;
  const requestId = req.params.id;

  /* ----------------------------------
     Auth guard (business only)
  ---------------------------------- */
  if (!user || user.role_id !== 3) {
    return res.status(403).json({ message: "Business access only" });
  }

  /* ----------------------------------
     Main query
     - LEFT JOINs so history never breaks
     - IN_PROGRESS + COMPLETED supported
     - started_at derived, not stored
  ---------------------------------- */
  const sql = `
    SELECT
      sr.id,
      sr.status,
      sr.payment_status,
      sr.issue_description,
      sr.delivery_method,
      sr.preferred_date,
      sr.created_at,
      sr.updated_at,
      sr.completed_at,

      /* started_at logic:
         when repair moved out of PENDING/REVIEW */
      CASE
        WHEN sr.status IN ('IN_PROGRESS', 'COMPLETED')
        THEN sr.updated_at
        ELSE NULL
      END AS started_at,

      d.name AS device_name,

      /* ASSESSMENT */
      ra.device_condition,
      ra.observed_issues,
      ra.recommendation,
      ra.is_remote,

      /* QUOTATION */
      rq.estimated_cost,
      rq.estimated_completion_time,

      /* PAYMENT */
      p.amount AS paid_amount,
      p.paid_at,
      p.payment_link,

      /* SERVICES */
      GROUP_CONCAT(
        DISTINCT CONCAT('S::', ss.name, '||', ss.base_price)
        SEPARATOR '##'
      ) AS services,

      /* PARTS */
      GROUP_CONCAT(
        DISTINCT CONCAT('P::', rqp.name, '||', rqp.cost)
        SEPARATOR '##'
      ) AS parts

    FROM service_requests sr
    JOIN devices d
      ON d.id = sr.device_id

    LEFT JOIN request_assessments ra
      ON ra.request_id = sr.id

    LEFT JOIN request_quotations rq
      ON rq.request_id = sr.id

    LEFT JOIN payments p
      ON p.request_id = sr.id
      AND p.status = 'PAID'

    LEFT JOIN service_request_items sri
      ON sri.request_id = sr.id

    LEFT JOIN shop_services ss
      ON ss.id = sri.service_id

    LEFT JOIN request_quotation_parts rqp
      ON rqp.request_quotation_id = rq.id

    WHERE sr.id = ? AND sr.shop_id = ?
      AND sr.status IN ('IN_PROGRESS', 'COMPLETED')

    GROUP BY sr.id
    LIMIT 1
  `;

  db.query(sql, [requestId, req.shopId], (err, rows) => {
    if (err) {
      console.error("❌ getRepairInProgress error:", err);
      return res.status(500).json({ message: "DB error" });
    }

    if (rows.length === 0) {
      return res.status(404).json({
        message: "Repair not found or not accessible"
      });
    }

    const row = rows[0];

    /* ----------------------------------
       Parse SERVICES safely
    ---------------------------------- */
    const services = row.services
      ? row.services.split("##").map(item => {
          const [, payload] = item.split("S::");
          if (!payload) return null;
          const [name, price] = payload.split("||");
          return {
            name,
            price: Number(price) || 0
          };
        }).filter(Boolean)
      : [];

    /* ----------------------------------
       Parse PARTS safely
    ---------------------------------- */
    const parts = row.parts
      ? row.parts.split("##").map(item => {
          const [, payload] = item.split("P::");
          if (!payload) return null;
          const [name, cost] = payload.split("||");
          return {
            name,
            cost: Number(cost) || 0
          };
        }).filter(Boolean)
      : [];

    /* ----------------------------------
       Final response (NULL-SAFE)
    ---------------------------------- */
    return res.json({
      repair: {
        id: row.id,
        status: row.status,
        payment_status: row.payment_status,

        created_at: row.created_at,
        started_at: row.started_at,
        completed_at: row.completed_at,
        updated_at: row.updated_at,

        device_name: row.device_name,
        issue_description: row.issue_description,
        delivery_method: row.delivery_method,
        preferred_date: row.preferred_date,

        assessment: row.device_condition || row.observed_issues || row.recommendation
          ? {
              device_condition: row.device_condition,
              observed_issues: row.observed_issues,
              recommendation: row.recommendation,
              is_remote: !!row.is_remote
            }
          : null,

        quotation: row.estimated_cost !== null
          ? {
              estimated_cost: Number(row.estimated_cost) || 0,
              estimated_completion_time: row.estimated_completion_time
            }
          : null,

        payment: row.paid_amount !== null
          ? {
              amount: Number(row.paid_amount) || 0,
              paid_at: row.paid_at,
              payment_link: row.payment_link
            }
          : null,

        services,
        parts
      }
    });
  });
};



// POST mark repair as COMPLETED
export const markRepairCompleted = (req, res) => {
  const user = req.user;
  const requestId = req.params.id;

  if (!user || user.role_id !== 3) {
    return res.status(403).json({ message: "Business access only" });
  }

  console.log("✅ Mark repair COMPLETED:", requestId);

  const sql = `
    SELECT status, payment_status
    FROM service_requests
    WHERE id = ? AND shop_id = ?
    LIMIT 1
  `;

  db.query(sql, [requestId, req.shopId], (err, rows) => {
    if (err) {
      console.error(err);
      return res.status(500).json({ message: "DB error" });
    }

    if (rows.length === 0) {
      return res.status(404).json({ message: "Request not found" });
    }

    const reqRow = rows[0];

    if (reqRow.status !== "IN_PROGRESS") {
      return res.status(400).json({
        message: "Repair must be in progress to complete"
      });
    }

    if (reqRow.payment_status !== "PAID") {
      return res.status(400).json({
        message: "Payment not completed"
      });
    }

    const updateSql = `
      UPDATE service_requests
      SET status = 'COMPLETED', updated_at = NOW(), completed_at = NOW()
      WHERE id = ? AND shop_id = ?
    `;

    db.query(updateSql, [requestId, req.shopId], (err2) => {
      if (err2) {
        console.error(err2);
        return res.status(500).json({ message: "Update failed" });
      }

      console.log("🎉 Repair COMPLETED:", requestId);

      res.json({
        message: "Repair marked as completed",
        status: "COMPLETED" 
      });
    });
  });
};

// GET completed repair (invoice-style, read-only)
export const getCompletedRepair = (req, res) => {
  const user = req.user;
  const requestId = req.params.id;

  // Business only
  if (!user || user.role_id !== 3) {
    return res.status(403).json({ message: "Business access only" });
  }

  if (!requestId) {
    return res.status(400).json({ message: "Request ID required" });
  }

  /* ------------------------------------------------------
     1. Load completed service request
  ------------------------------------------------------ */
  const requestSql = `
    SELECT
      sr.id,
      sr.issue_description,
      sr.delivery_method,
      sr.status,
      sr.updated_at AS completed_at,

      d.name AS device_name,

      rq.estimated_completion_time,

      p.amount AS payment_amount,
      p.payment_link,
      p.paid_at

    FROM service_requests sr
    JOIN devices d ON d.id = sr.device_id
    JOIN request_quotations rq ON rq.request_id = sr.id
    JOIN payments p ON p.request_id = sr.id

    WHERE sr.id = ? AND sr.shop_id = ?
      AND sr.status = 'COMPLETED'
    LIMIT 1
  `;

  db.query(requestSql, [requestId, req.shopId], (err, rows) => {
    if (err) {
      console.error("❌ Completed repair lookup error:", err);
      return res.status(500).json({ message: "DB error" });
    }

    if (rows.length === 0) {
      return res.status(404).json({
        message: "Completed repair not found"
      });
    }

    const repair = rows[0];

    /* ------------------------------------------------------
       1.5 Load assessment (THIS WAS MISSING)
    ------------------------------------------------------ */
    const assessmentSql = `
      SELECT
        device_condition,
        observed_issues,
        recommendation
      FROM request_assessments
      WHERE request_id = ?
      LIMIT 1
    `;

    db.query(assessmentSql, [requestId], (errA, assessmentRows) => {
      if (errA) {
        console.error("❌ Assessment lookup error:", errA);
        return res.status(500).json({ message: "DB error" });
      }

      const assessment =
        assessmentRows.length > 0 ? assessmentRows[0] : null;

      /* ------------------------------------------------------
         2. Load services
      ------------------------------------------------------ */
      const servicesSql = `
        SELECT
          ss.name,
          ss.base_price
        FROM service_request_items sri
        JOIN shop_services ss ON ss.id = sri.service_id
        WHERE sri.request_id = ?
      `;

      db.query(servicesSql, [requestId], (err2, services) => {
        if (err2) {
          console.error("❌ Services lookup error:", err2);
          return res.status(500).json({ message: "DB error" });
        }

        /* ------------------------------------------------------
           3. Load parts
        ------------------------------------------------------ */
        const partsSql = `
          SELECT
            name,
            cost
          FROM request_quotation_parts
          WHERE request_quotation_id = (
            SELECT id FROM request_quotations WHERE request_id = ?
          )
        `;

        db.query(partsSql, [requestId], (err3, parts) => {
          if (err3) {
            console.error("❌ Parts lookup error:", err3);
            return res.status(500).json({ message: "DB error" });
          }

          /* ------------------------------------------------------
             4. Respond (ASSESSMENT INCLUDED)
          ------------------------------------------------------ */
          return res.json({
            repair: {
              id: repair.id,
              device_name: repair.device_name,
              delivery_method: repair.delivery_method,
              issue_description: repair.issue_description,
              completed_at: repair.completed_at,

              assessment, // ✅ NOW INCLUDED

              quotation: {
                estimated_completion_time: repair.estimated_completion_time
              },

              services,
              parts,

              payment: {
                amount: repair.payment_amount,
                payment_link: repair.payment_link,
                paid_at: repair.paid_at
              }
            }
          });
        });
      });
    });
  });
};

