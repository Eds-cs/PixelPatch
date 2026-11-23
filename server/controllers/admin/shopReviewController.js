// controllers/admin/shopReviewController.js
// Admin review of business registrations (shops.is_verified).
//
// Registering a shop (POST /business-register) leaves the account a client
// (role 1) with an unverified shop. An admin then:
//   approves  -> shops.is_verified = 1, the owner becomes a business (role 3),
//                optionally the registration's pending services are approved,
//                and the owner is emailed;
//   rejects   -> the application is deleted (shop, its services, payout
//                account and address), the owner stays a client, and is
//                emailed the reason so they can apply again.
import db from "../../config/db.js";
import { withTransaction } from "../../utils/transaction.js";
import { transporter } from "../../config/mail.js";

const MAX_PAGE = 100;
const STATUSES = { PENDING: 0, VERIFIED: 1 };
const CLIENT_ROLE = 1;
const BUSINESS_ROLE = 3;

function parsePage(query) {
  const limit = Math.min(Math.max(parseInt(query.limit, 10) || 50, 1), MAX_PAGE);
  const offset = Math.max(parseInt(query.offset, 10) || 0, 0);
  return { limit, offset };
}

const likePattern = (text) => `%${String(text).replace(/[\\%_]/g, (c) => `\\${c}`)}%`;

// Notifications are best effort: a failed email never undoes a decision.
async function notifyOwner(to, subject, text) {
  if (!to || !process.env.EMAIL_USER) return false;
  try {
    await transporter.sendMail({ from: process.env.EMAIL_USER, to, subject, text });
    return true;
  } catch (err) {
    console.error("shop review email failed:", err.code || err.message);
    return false;
  }
}

/* GET /api/admin/shops?status=PENDING|VERIFIED|ALL&q=&limit=&offset=
   Registrations with owner, address, payout account and services.
   Oldest waiting first. */
export const listShopRegistrations = async (req, res) => {
  const status = String(req.query.status || "PENDING").toUpperCase();
  if (status !== "ALL" && !(status in STATUSES)) {
    return res.status(400).json({ message: "Unknown status" });
  }
  const { limit, offset } = parsePage(req.query);
  const q = String(req.query.q ?? "").trim();

  const where = [];
  const params = [];
  if (status !== "ALL") {
    where.push("s.is_verified = ?");
    params.push(STATUSES[status]);
  }
  if (q) {
    where.push("(s.name LIKE ? OR s.email LIKE ? OR u.email LIKE ? OR CONCAT(u.first_name, ' ', u.last_name) LIKE ?)");
    const like = likePattern(q);
    params.push(like, like, like, like);
  }
  const whereSql = where.length ? `WHERE ${where.join(" AND ")}` : "";

  try {
    const [[{ total }]] = await db.promise().query(
      `SELECT COUNT(*) AS total FROM shops s JOIN users u ON u.id = s.user_id ${whereSql}`,
      params
    );
    const [shops] = await db.promise().query(
      `SELECT s.id, s.name, s.email, s.phone_number, s.open_time, s.closing_time,
              s.days_from, s.days_to, s.is_verified, s.created_at,
              u.id AS owner_id, u.first_name AS owner_first_name, u.last_name AS owner_last_name,
              u.email AS owner_email, u.phone AS owner_phone, u.role_id AS owner_role_id,
              a.street, a.barangay, a.city, a.postal_code,
              p.method AS payout_method, p.account_name AS payout_account_name,
              p.account_number AS payout_account_number
       FROM shops s
       JOIN users u ON u.id = s.user_id
       LEFT JOIN addresses a ON a.id = s.address_id
       LEFT JOIN shop_payouts p ON p.id = (
         SELECT MAX(p2.id) FROM shop_payouts p2 WHERE p2.shop_id = s.id
       )
       ${whereSql}
       ORDER BY s.is_verified ASC, s.created_at ASC, s.id ASC
       LIMIT ? OFFSET ?`,
      [...params, limit, offset]
    );

    const ids = shops.map((shop) => shop.id);
    let services = [];
    if (ids.length) {
      [services] = await db.promise().query(
        `SELECT id, shop_id, name, category, base_price, estimated_timeframe, review_status
         FROM shop_services WHERE shop_id IN (${ids.map(() => "?").join(",")})
         ORDER BY id`,
        ids
      );
    }

    const [[counts]] = await db.promise().query(
      `SELECT SUM(is_verified = 0) AS PENDING, SUM(is_verified = 1) AS VERIFIED FROM shops`
    );

    res.json({
      shops: shops.map((shop) => ({
        ...shop,
        services: services.filter((svc) => svc.shop_id === shop.id),
      })),
      total: Number(total),
      counts: { PENDING: Number(counts.PENDING || 0), VERIFIED: Number(counts.VERIFIED || 0) },
    });
  } catch (err) {
    console.error("listShopRegistrations:", { code: err.code });
    res.status(500).json({ message: "Couldn't load shop registrations." });
  }
};

/* POST /api/admin/shops/:id/approve { approve_services?: boolean } */
export const approveShop = async (req, res) => {
  const shopId = Number(req.params.id);
  if (!Number.isSafeInteger(shopId) || shopId <= 0) {
    return res.status(400).json({ message: "Invalid shop" });
  }
  const approveServices = req.body?.approve_services !== false;

  try {
    const result = await withTransaction(async (conn) => {
      const [[shop]] = await conn.query(
        `SELECT s.id, s.name, s.is_verified, u.id AS owner_id, u.email, u.first_name, u.role_id
         FROM shops s JOIN users u ON u.id = s.user_id
         WHERE s.id = ? FOR UPDATE`,
        [shopId]
      );
      if (!shop) return { status: 404, message: "Shop not found" };
      if (Number(shop.is_verified) === 1) return { status: 409, message: "This shop is already approved." };

      await conn.query("UPDATE shops SET is_verified = 1, updated_at = NOW() WHERE id = ?", [shopId]);
      // Clients become business accounts. Admins (role 2) keep their role.
      if (Number(shop.role_id) === CLIENT_ROLE) {
        await conn.query("UPDATE users SET role_id = ? WHERE id = ? AND role_id = ?", [
          BUSINESS_ROLE,
          shop.owner_id,
          CLIENT_ROLE,
        ]);
      }
      let servicesApproved = 0;
      if (approveServices) {
        const [update] = await conn.query(
          `UPDATE shop_services
           SET review_status = 'APPROVED', review_note = NULL, reviewed_by = ?, reviewed_at = NOW()
           WHERE shop_id = ? AND review_status = 'PENDING'`,
          [req.user.id, shopId]
        );
        servicesApproved = update.affectedRows;
      }
      return { status: 200, shop, servicesApproved };
    });

    if (result.status !== 200) return res.status(result.status).json({ message: result.message });

    const { shop, servicesApproved } = result;
    const emailed = await notifyOwner(
      shop.email,
      "Your PixelPatch shop is approved",
      `Hi ${shop.first_name || "there"},\n\n` +
        `Good news: "${shop.name}" has been approved and is now listed on PixelPatch.\n\n` +
        "Sign in to open your business portal, where you can manage repair requests, services, " +
        "employees and messages. You can still browse PixelPatch and book repairs at other shops.\n\n" +
        "Welcome aboard!\nThe PixelPatch team"
    );
    res.json({ success: true, services_approved: servicesApproved, emailed });
  } catch (err) {
    console.error("approveShop:", { code: err.code });
    res.status(500).json({ message: "Couldn't approve this shop." });
  }
};

/* POST /api/admin/shops/:id/reject { note } — note is required and is emailed. */
export const rejectShop = async (req, res) => {
  const shopId = Number(req.params.id);
  if (!Number.isSafeInteger(shopId) || shopId <= 0) {
    return res.status(400).json({ message: "Invalid shop" });
  }
  const note = String(req.body?.note ?? "").trim();
  if (!note) return res.status(400).json({ message: "Write a reason so the applicant knows what to fix." });
  if (note.length > 1000) return res.status(400).json({ message: "Keep the reason under 1000 characters." });

  try {
    const result = await withTransaction(async (conn) => {
      const [[shop]] = await conn.query(
        `SELECT s.id, s.name, s.is_verified, s.address_id, u.id AS owner_id, u.email, u.first_name, u.role_id
         FROM shops s JOIN users u ON u.id = s.user_id
         WHERE s.id = ? FOR UPDATE`,
        [shopId]
      );
      if (!shop) return { status: 404, message: "Shop not found" };
      if (Number(shop.is_verified) === 1) {
        return { status: 409, message: "Approved shops can't be rejected here." };
      }

      // Unverified shops can't take requests or chats, but refuse rather than
      // delete history if anything does point at this one.
      const [[used]] = await conn.query(
        `SELECT
           (SELECT COUNT(*) FROM service_requests WHERE shop_id = ?) +
           (SELECT COUNT(*) FROM chats WHERE shop_id = ?) +
           (SELECT COUNT(*) FROM payments WHERE shop_id = ?) +
           (SELECT COUNT(*) FROM reviews WHERE shop_id = ?) +
           (SELECT COUNT(*) FROM disputes WHERE shop_id = ?) AS n`,
        [shopId, shopId, shopId, shopId, shopId]
      );
      if (Number(used.n) > 0) {
        return { status: 409, message: "This shop already has requests or chats, so it can't be removed." };
      }

      await conn.query("DELETE FROM shop_services WHERE shop_id = ?", [shopId]);
      await conn.query("DELETE FROM shop_payouts WHERE shop_id = ?", [shopId]);
      await conn.query("DELETE FROM shop_service_types WHERE shop_id = ?", [shopId]);
      await conn.query("DELETE FROM shop_employees WHERE shop_id = ?", [shopId]);
      await conn.query("DELETE FROM shop_documents WHERE shop_id = ?", [shopId]);
      await conn.query("DELETE FROM discounts WHERE shop_id = ?", [shopId]);
      await conn.query("DELETE FROM subscriptions WHERE shop_id = ?", [shopId]);
      await conn.query("DELETE FROM shops WHERE id = ?", [shopId]);
      // The shop's own address, unless something else still uses it.
      if (shop.address_id) {
        await conn.query(
          `DELETE FROM addresses WHERE id = ?
             AND NOT EXISTS (SELECT 1 FROM shops WHERE address_id = ?)
             AND NOT EXISTS (SELECT 1 FROM service_requests WHERE pickup_address_id = ?)`,
          [shop.address_id, shop.address_id, shop.address_id]
        );
      }
      // Older registrations promoted the owner straight away; with no shop
      // left they go back to being a client.
      if (Number(shop.role_id) === BUSINESS_ROLE) {
        await conn.query(
          `UPDATE users SET role_id = ? WHERE id = ? AND role_id = ?
             AND NOT EXISTS (SELECT 1 FROM shops WHERE user_id = ?)`,
          [CLIENT_ROLE, shop.owner_id, BUSINESS_ROLE, shop.owner_id]
        );
      }
      return { status: 200, shop };
    });

    if (result.status !== 200) return res.status(result.status).json({ message: result.message });

    const { shop } = result;
    const emailed = await notifyOwner(
      shop.email,
      "Your PixelPatch business registration",
      `Hi ${shop.first_name || "there"},\n\n` +
        `Thank you for registering "${shop.name}" on PixelPatch. We couldn't approve it yet, for this reason:\n\n` +
        `${note}\n\n` +
        "You can fix this and register again from \"Become a partner\" in the app. " +
        "Your PixelPatch customer account is not affected.\n\nThe PixelPatch team"
    );
    res.json({ success: true, emailed });
  } catch (err) {
    console.error("rejectShop:", { code: err.code });
    res.status(500).json({ message: "Couldn't reject this shop." });
  }
};
