// server/controllers/businessController.js
import db from "../config/db.js";
import { withTransaction } from "../utils/transaction.js";
import { resolveShopIdForUser } from "./repairController.js";
import { SERVICE_AREA, SERVICE_AREA_MESSAGE, canonicalBarangay } from "../utils/serviceArea.js";
import { normalizePhone, PHONE_MESSAGE, PHONE_TAKEN_MESSAGE, businessPhoneTaken } from "../utils/phone.js";
import { DOCUMENT_TYPES, removeUploadedFiles, uploadedDocuments } from "../utils/shopDocuments.js";
import { validateShopTerms } from "../utils/paymentTerms.js";
import { validateCategory } from "../utils/serviceCategories.js";
import { ENABLED_PAYOUT_METHODS } from "../utils/payoutMethods.js";
import { businessEmailProblem, normalizeEmail } from "../utils/emailChecks.js";
import { codeKey, emailCodes, emailTokenValid, signEmailToken } from "../utils/businessEmailVerification.js";
import { CODE_MESSAGES } from "../utils/verificationCodes.js";
import { LIMITS } from "../utils/inputLimits.js";
import { mailFrom, transporter } from "../config/mail.js";

const TIME_RE = /^([01]\d|2[0-3]):[0-5]\d(:[0-5]\d)?$/;
const DAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
const TIME_UNITS = ["HOURS", "DAYS", "WEEKS"];
const MAX_SERVICES = 20;
const MAX_PRICE = 99999999.99; // shop_services.base_price is decimal(10,2)

// Multipart sends nested values as JSON text.
function parseJson(value, fallback) {
  if (value && typeof value === "object") return value;
  try {
    return JSON.parse(value);
  } catch {
    return fallback;
  }
}

const text = (value) => String(value ?? "").trim();
const truthy = (value) => value === true || value === "true" || value === 1 || value === "1";
const wholeNumber = (value) => (/^\d{1,3}$/.test(text(value)) ? Number(text(value)) : null);

// Philippine TIN: 9 digits, optionally with a 3- or 5-digit branch code.
// Stored as "123-456-789" or "123-456-789-000(00)".
function normalizeTin(value) {
  const digits = text(value).replace(/[\s-]/g, "");
  if (!/^\d{9}(\d{3}|\d{5})?$/.test(digits)) return null;
  return [digits.slice(0, 3), digits.slice(3, 6), digits.slice(6, 9), digits.slice(9)].filter(Boolean).join("-");
}

/* ------------------------------------------------------------------
   Business email code (utils/businessEmailVerification.js)
------------------------------------------------------------------ */

/* POST /api/business-register/email-code { email } */
export const sendBusinessEmailCode = async (req, res) => {
  const email = normalizeEmail(req.body?.email);
  try {
    const problem = await businessEmailProblem(email);
    if (problem) return res.status(400).json({ field: "business_email", message: problem });

    const issued = emailCodes.issue(codeKey(req.user.id, email));
    if (issued.tooSoon) {
      const retryAfter = Math.ceil(issued.retryAfterMs / 1000);
      return res.status(429).json({
        field: "business_email",
        message: `A code was just sent. You can request another in ${retryAfter} seconds.`,
        retry_after: retryAfter,
      });
    }

    try {
      await transporter.sendMail({
        from: mailFrom(),
        to: email,
        subject: "Your PixelPatch business email code",
        text:
          `Your code to verify this email for your PixelPatch shop is: ${issued.code}\n\n` +
          "It expires in 10 minutes. If you didn't register a shop on PixelPatch, you can ignore this email.",
      });
    } catch (mailErr) {
      emailCodes.cancel(codeKey(req.user.id, email));
      console.error("business email code send failed:", mailErr.code || mailErr.message);
      return res.status(502).json({
        field: "business_email",
        message: "We couldn't send an email to this address. Check it and try again.",
      });
    }
    return res.json({ success: true, message: `We sent a 6-digit code to ${email}.`, retry_after: 60 });
  } catch (err) {
    console.error("sendBusinessEmailCode:", { code: err.code, message: err.message });
    return res.status(500).json({ message: "Couldn't send the code. Try again." });
  }
};

/* POST /api/business-register/email-verify { email, code } -> { token } */
export const verifyBusinessEmailCode = (req, res) => {
  const email = normalizeEmail(req.body?.email);
  const key = codeKey(req.user.id, email);
  const result = emailCodes.check(key, req.body?.code);
  if (result !== "ok") {
    return res.status(400).json({ field: "email_code", message: CODE_MESSAGES[result] });
  }
  emailCodes.consume(key);
  return res.json({ success: true, token: signEmailToken(req.user.id, email) });
};

/* POST /api/business-register/check-phone { phone } — early feedback on step 1. */
export const checkBusinessPhone = async (req, res) => {
  const phone = normalizePhone(req.body?.phone);
  if (!phone) return res.status(400).json({ field: "business_phone", message: PHONE_MESSAGE });
  try {
    if (await businessPhoneTaken(db, phone, req.user.id)) {
      return res.status(409).json({ field: "business_phone", message: PHONE_TAKEN_MESSAGE });
    }
    return res.json({ success: true, available: true });
  } catch (err) {
    console.error("checkBusinessPhone:", { code: err.code });
    return res.status(500).json({ message: "Couldn't check the number. Try again." });
  }
};

/* ------------------------------------------------------------------
   Registration
------------------------------------------------------------------ */

/**
 * Every problem with the form, checked before anything is saved.
 * Returns { field, error } (field names the input the app highlights) or { data }.
 */
async function validateRegistration(body, documents, userId) {
  const bad = (field, error) => ({ field, error });

  const name = text(body.business_name);
  if (name.length < 2 || name.length > LIMITS.shopName) return bad("business_name", `Business name must be 2 to ${LIMITS.shopName} characters.`);

  const email = normalizeEmail(body.business_email);
  const emailProblem = await businessEmailProblem(email);
  if (emailProblem) return bad("business_email", emailProblem);
  if (!emailTokenValid(body.business_email_token, userId, email)) {
    return bad("business_email", "Verify this email with the code we send to it.");
  }

  const phone = normalizePhone(body.business_phone);
  if (!phone) return bad("business_phone", PHONE_MESSAGE);
  if (await businessPhoneTaken(db, phone, userId)) return bad("business_phone", PHONE_TAKEN_MESSAGE);

  const description = text(body.description);
  if (description.length < 20 || description.length > LIMITS.shopDescription) {
    return bad("description", `Describe your shop in 20 to ${LIMITS.shopDescription} characters.`);
  }

  // Shops must be in Zamboanga City, the only area PixelPatch serves.
  const street = text(body.street);
  if (!street || street.length > LIMITS.addressLine) return bad("street", `Enter the shop's street address (up to ${LIMITS.addressLine} characters).`);
  const barangay = canonicalBarangay(body.barangay);
  if (!barangay) return bad("barangay", SERVICE_AREA_MESSAGE);
  const postalCode = text(body.postal_code);
  if (postalCode && !/^\d{4}$/.test(postalCode)) return bad("postal_code", "Postal code must be 4 digits.");

  if (!DAYS.includes(body.days_from) || !DAYS.includes(body.days_to)) return bad("days", "Choose the days you're open.");
  const openTime = text(body.open_time);
  const closeTime = text(body.close_time);
  if (!TIME_RE.test(openTime)) return bad("open_time", "Choose your opening time.");
  if (!TIME_RE.test(closeTime)) return bad("close_time", "Choose your closing time.");
  if (closeTime.slice(0, 5) <= openTime.slice(0, 5)) return bad("close_time", "Closing time must be after opening time.");

  const deliveryIn = parseJson(body.delivery, {});
  const delivery = {
    pickup: truthy(deliveryIn.pickup),
    dropoff: truthy(deliveryIn.dropoff),
    onsite: truthy(deliveryIn.onsite),
  };
  if (!delivery.pickup && !delivery.dropoff && !delivery.onsite) {
    return bad("delivery", "Choose at least one way customers can get their device repaired.");
  }

  const servicesIn = parseJson(body.services, null);
  if (!Array.isArray(servicesIn) || servicesIn.length === 0) return bad("services", "Add at least one service.");
  if (servicesIn.length > MAX_SERVICES) return bad("services", `Add up to ${MAX_SERVICES} services. You can add more later.`);
  const services = [];
  for (const [i, svc] of servicesIn.entries()) {
    const f = (name) => `service.${i}.${name}`;
    const label = `Service ${i + 1}`;
    const cat = validateCategory(svc?.category, svc?.custom_category);
    if (cat.error) return bad(text(svc?.category).toUpperCase() === "OTHER" ? f("custom_category") : f("category"), `${label}: ${cat.error}`);
    const serviceName = text(svc.repair_service);
    if (!serviceName || serviceName.length > LIMITS.serviceName) return bad(f("repair_service"), `${label}: name the repair service (up to ${LIMITS.serviceName} characters).`);
    const serviceDescription = text(svc.description);
    if (!serviceDescription || serviceDescription.length > LIMITS.serviceDescription) {
      return bad(f("description"), `${label}: describe what the service includes (up to ${LIMITS.serviceDescription} characters).`);
    }
    const price = Number(text(svc.price));
    if (!Number.isFinite(price) || price <= 0 || price > MAX_PRICE) return bad(f("price"), `${label}: enter a price above 0.`);
    const from = wholeNumber(svc.time_from);
    const to = wholeNumber(svc.time_to);
    if (!from || !to || from > to) return bad(f("turnaround"), `${label}: enter a turnaround like 1 to 3, with the smaller number first.`);
    const unit = text(svc.time_unit).toUpperCase();
    if (!TIME_UNITS.includes(unit)) return bad(f("turnaround"), `${label}: choose hours, days or weeks.`);
    services.push({
      name: serviceName,
      category: cat.category,
      customCategory: cat.customCategory,
      description: serviceDescription,
      price: Math.round(price * 100) / 100,
      timeframe: `${from}-${to} ${unit}`,
    });
  }

  const payment = parseJson(body.payment, {});
  if (!ENABLED_PAYOUT_METHODS.includes(payment.payment_method)) return bad("payment_method", "Choose a payout method.");
  let bankName = null;
  if (payment.payment_method === "BANK") {
    bankName = text(payment.bank_name);
    if (bankName.length < 2 || bankName.length > 100) return bad("bank_name", "Choose or type your bank.");
  }
  const accountName = text(payment.account_name);
  if (!accountName || accountName.length > LIMITS.personName) return bad("account_name", `Enter the account holder's name (up to ${LIMITS.personName} characters).`);
  let accountNumber = text(payment.account_number);
  if (payment.payment_method === "BANK") {
    accountNumber = accountNumber.replace(/[\s-]/g, "");
    if (!/^\d{6,20}$/.test(accountNumber)) return bad("account_number", "Bank account number must be 6 to 20 digits.");
  } else {
    accountNumber = normalizePhone(accountNumber);
    if (!accountNumber) return bad("account_number", PHONE_MESSAGE);
  }
  const tin = normalizeTin(payment.tin);
  if (!tin) return bad("tin", "Enter the business TIN: 9 digits, or 12 to 14 with the branch code.");
  // How clients pay this shop by default (utils/paymentTerms.js).
  const shopTerms = validateShopTerms(payment);
  if (shopTerms.error) return bad("deposit_percent", shopTerms.error);

  for (const [type, info] of Object.entries(DOCUMENT_TYPES)) {
    if (info.required && !documents.some((doc) => doc.type === type)) {
      return bad(`documents.${type}`, `Upload your ${info.label.charAt(0).toLowerCase()}${info.label.slice(1)}.`);
    }
  }
  if (!truthy(payment.terms) || !truthy(payment.privacy)) {
    return bad("terms", "Agree to the Business Terms and Business Privacy Policy to submit.");
  }

  return {
    data: {
      name, email, phone, description, barangay, street,
      postalCode: postalCode || SERVICE_AREA.postal_code,
      daysFrom: body.days_from, daysTo: body.days_to, openTime, closeTime,
      delivery, services,
      payout: { method: payment.payment_method, bankName, accountName, accountNumber, tin },
      terms: shopTerms.terms,
    },
  };
}

// Register a new business/shop.
// POST /api/business-register (multipart): shop fields, `services`, `delivery`
// and `payment` as JSON text, and the documents in DOCUMENT_TYPES as files.
// The account stays a client (role 1) with an unverified shop until an admin
// approves it (controllers/admin/shopReviewController.js).
export const registerBusiness = async (req, res) => {
  const userId = req.user.id;
  const documents = uploadedDocuments(req);
  // `field` names the input the app highlights (see validateRegistration).
  const fail = (status, message, field) => {
    removeUploadedFiles(req);
    return res.status(status).json({ success: false, message, ...(field ? { field } : {}) });
  };

  try {
    const { error, field, data } = await validateRegistration(req.body ?? {}, documents, userId);
    if (error) return fail(400, error, field);

    // One pooled connection for the whole registration: everything is
    // committed together or rolled back together.
    const result = await withTransaction(async (conn) => {
      // Locking the user row makes a double submit wait here, so the
      // duplicate check below sees the first registration.
      await conn.query("SELECT id FROM users WHERE id = ? FOR UPDATE", [userId]);
      const [existing] = await conn.query("SELECT is_verified FROM shops WHERE user_id = ? LIMIT 1", [userId]);
      if (existing.length) {
        return {
          duplicate: Number(existing[0].is_verified) === 1
            ? "User already has a registered shop"
            : "Your business registration is already waiting for admin approval.",
        };
      }
      // Checked again under the lock, in case another shop took the number meanwhile.
      if (await businessPhoneTaken(conn, data.phone, userId)) return { phoneTaken: true };

      const [address] = await conn.query(
        `INSERT INTO addresses (user_id, country, region, province, city, barangay, street, postal_code,
                                latitude, longitude, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, NULL, NULL, NOW(), NOW())`,
        [userId, SERVICE_AREA.country, SERVICE_AREA.region, SERVICE_AREA.province, SERVICE_AREA.city,
          data.barangay, data.street, data.postalCode]
      );

      const [shop] = await conn.query(
        `INSERT INTO shops (user_id, name, description, address_id, phone_number, email, accepts_cash,
                            default_deposit_percent, open_time, closing_time, days_from, days_to, is_verified,
                            rating_average, current_customer_count, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 0, 0.00, 0, NOW(), NOW())`,
        [userId, data.name, data.description, address.insertId, data.phone, data.email,
          data.terms.acceptsCash ? 1 : 0, data.terms.depositPercent, data.openTime, data.closeTime,
          data.daysFrom, data.daysTo]
      );
      const shopId = shop.insertId;

      // The shop's delivery methods, and the same methods on each service.
      const { pickup, dropoff, onsite } = data.delivery;
      await conn.query(
        `INSERT INTO shop_service_types (shop_id, Is_onsite, is_dropoff, is_pickup, created_at, updated_at)
         VALUES (?, ?, ?, ?, NOW(), NOW())`,
        [shopId, onsite ? 1 : 0, dropoff ? 1 : 0, pickup ? 1 : 0]
      );
      for (const svc of data.services) {
        await conn.query(
          `INSERT INTO shop_services (shop_id, name, category, custom_category, description, base_price,
                                      estimated_timeframe, accepts_pickup, accepts_onsite, accepts_dropoff,
                                      created_at, updated_at)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW(), NOW())`,
          [shopId, svc.name, svc.category, svc.customCategory, svc.description, svc.price, svc.timeframe,
            pickup ? 1 : 0, onsite ? 1 : 0, dropoff ? 1 : 0]
        );
      }

      // Starts PENDING; verification of the account is a separate step.
      await conn.query(
        `INSERT INTO shop_payouts (shop_id, method, bank_name, account_name, account_number, tin, status)
         VALUES (?, ?, ?, ?, ?, ?, 'PENDING')`,
        [shopId, data.payout.method, data.payout.bankName, data.payout.accountName, data.payout.accountNumber,
          data.payout.tin]
      );

      // Proof of business, checked by the admin (utils/shopDocuments.js).
      const [submission] = await conn.query(
        "INSERT INTO shop_documents (shop_id, status, created_at, updated_at) VALUES (?, 'PENDING', NOW(), NOW())",
        [shopId]
      );
      for (const { type, file } of documents) {
        const [attachment] = await conn.query(
          `INSERT INTO attachments (file_name, file_path, mime_type, created_at, updated_at)
           VALUES (?, ?, ?, NOW(), NOW())`,
          [String(file.originalname || type).slice(0, 255), file.path.replace(/\\/g, "/"), file.mimetype]
        );
        await conn.query(
          "INSERT INTO shop_documents_attachments (attachment_id, shop_documents_id, type) VALUES (?, ?, ?)",
          [attachment.insertId, submission.insertId, type]
        );
      }

      return { shopId };
    });

    if (result.duplicate) return fail(400, result.duplicate);
    if (result.phoneTaken) return fail(409, PHONE_TAKEN_MESSAGE, "business_phone");

    return res.json({
      success: true,
      pending: true,
      message: "Registration received. An admin will review your shop before it goes live.",
      shop_id: result.shopId,
    });
  } catch (err) {
    console.error("registerBusiness error:", { code: err.code, message: err.message });
    return fail(500, "Something went wrong saving your registration. Please try again.");
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

    // Use the promise-based wrapper
    const rows = await query(
      `SELECT id, name, is_verified, created_at
       FROM shops
       WHERE user_id = ?
       ORDER BY id
       LIMIT 1`,
      [userId]
    );


    if (rows.length === 0) {
      return res.json({
        success: false,
        message: "This user does not own a shop."
      });
    }

    // is_verified = 0 means the registration is waiting for an admin.
    return res.json({
      success: true,
      shopId: rows[0].id,
      shopName: rows[0].name,
      isVerified: Number(rows[0].is_verified) === 1,
      submittedAt: rows[0].created_at
    });

  } catch (err) {
    console.error("getMyShop error:", { code: err.code });
    return res.status(500).json({
      success: false,
      error: "Couldn't load your shop."
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

