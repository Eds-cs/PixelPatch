// routes/serviceRequests.js
import express from "express";
import db from "../config/db.js";
import { upload } from "../middleware/upload.js";
import { authRequired } from "../middleware/authMiddleware.js";
import { resolveShopDeliveryTypes } from "../utils/shopDeliveryTypes.js";
import { SERVICE_AREA_MESSAGE, isInServiceArea } from "../utils/serviceArea.js";

import { LIMITS, limitText } from "../utils/inputLimits.js";
import { ownOrStaffShopIds } from "../utils/staff.js";

const router = express.Router();

/* -----------------------------------------------------------
   CREATE SERVICE REQUEST
------------------------------------------------------------ */
router.post(
  "/",
  authRequired,
  upload.array("attachments", 10),
  limitText({
    issue_description: ["The problem description", LIMITS.issueDescription],
    notes: ["Notes", LIMITS.requestNotes],
  }),
  async (req, res) => {
    try {
      const {
        shop_id,
        delivery_method,
        device_id,
        issue_description,
        pickup_address_id,
        preferred_date,
        notes
      } = req.body;

      // FIX: Read services correctly from FormData
      let services = req.body.services;

      if (services && !Array.isArray(services)) {
        services = [services];
      }
      const client_id = req.user.id;

      // Validate required fields
      if (!shop_id || !delivery_method || !device_id || !issue_description || !preferred_date) {
          return res.status(400).json({ message: "Required fields missing." });
      }

        if (!Array.isArray(services) || services.length === 0) {
          return res.status(400).json({ message: "At least one service is required." });
        }

        if (delivery_method !== "DROPOFF" && !pickup_address_id) {
          return res.status(400).json({ message: "Pickup and on-site service require an address." });
      }

      // The address must be one of the client's own, inside Zamboanga City.
      if (delivery_method !== "DROPOFF") {
        const [[address]] = await db.promise().query(
          "SELECT barangay, city, province FROM addresses WHERE id = ? AND user_id = ? LIMIT 1",
          [pickup_address_id, client_id]
        );
        if (!address) {
          return res.status(400).json({ message: "Choose one of your saved addresses." });
        }
        if (!isInServiceArea(address)) {
          return res.status(400).json({ message: SERVICE_AREA_MESSAGE });
        }
      }


      /* -----------------------------------------------------------
         VALIDATE SHOP SERVICE TYPES (delivery methods)
      ------------------------------------------------------------ */
      // Only admin-verified shops take requests. Public lists already hide
      // unverified shops; this closes the direct-link route.
      const [[shop]] = await db.promise().query(
        `SELECT s.is_verified, s.user_id, owner.suspended_at AS owner_suspended_at
         FROM shops s JOIN users owner ON owner.id = s.user_id
         WHERE s.id = ? LIMIT 1`,
        [shop_id]
      );
      if (!shop || Number(shop.is_verified) !== 1) {
        return res.status(400).json({ message: "This shop isn't accepting repair requests yet." });
      }
      // A suspended owner can't sign in to answer requests (utils/accountStatus.js).
      if (shop.owner_suspended_at) {
        return res.status(400).json({ message: "This shop isn't accepting repair requests right now." });
      }
      // Shop owners and staff may book repairs at other shops, never their own.
      if ((await ownOrStaffShopIds(req.user.id)).includes(Number(shop_id))) {
        return res.status(400).json({ message: "You can't request a repair from your own shop." });
      }

      // The device must be the client's own, with its type and specifications
      // (phone, laptop or desktop) so the shop knows what it is repairing.
      const [[device]] = await db.promise().query(
        "SELECT device_type FROM devices WHERE id = ? AND user_id = ? LIMIT 1",
        [device_id, client_id]
      );
      if (!device) {
        return res.status(400).json({ message: "Choose one of your own devices." });
      }
      if (!device.device_type) {
        return res.status(400).json({
          message: "Add this device's type and specifications in My devices before requesting a repair.",
        });
      }

      // Every selected service must belong to this shop and be admin-approved.
      const serviceIds = [...new Set(services.map(Number))];
      if (serviceIds.some((serviceId) => !Number.isSafeInteger(serviceId) || serviceId <= 0)) {
        return res.status(400).json({ message: "Invalid service selection." });
      }
      const [validServices] = await db.promise().query(
        `SELECT id FROM shop_services
         WHERE shop_id = ? AND review_status = 'APPROVED'
           AND id IN (${serviceIds.map(() => "?").join(",")})`,
        [shop_id, ...serviceIds]
      );
      if (validServices.length !== serviceIds.length) {
        return res.status(400).json({ message: "One or more selected services aren't available from this shop." });
      }
      services = serviceIds;

      // Same source the request screen uses (explicit row, else per-service flags).
      const t = await resolveShopDeliveryTypes(shop_id);

      if (!t.is_pickup && !t.is_dropoff && !t.is_onsite) {
        return res.status(400).json({ message: "This shop is not accepting repair requests yet." });
      }

      const allowed = {
        PICKUP: t.is_pickup,
        DROPOFF: t.is_dropoff,
        ONSITE: t.is_onsite
      };

      if (!allowed[delivery_method]) {
        return res.status(400).json({
          message: `Shop does not support delivery method: ${delivery_method}`
        });
      }

      /* -----------------------------------------------------------
         INSERT MAIN SERVICE REQUEST
      ------------------------------------------------------------ */
      const [result] = await db.promise().query(
        `INSERT INTO service_requests
           (client_id, shop_id, delivery_method, device_id, issue_description, pickup_address_id,
            preferred_date, notes, estimated_price, status, decision, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, 0.00, 'PENDING', 'PENDING', NOW(), NOW())`,
        [
          client_id,
          shop_id,
          delivery_method,
          device_id,
          issue_description,
          pickup_address_id,
          preferred_date,
          notes
        ]
      );

      const request_id = result.insertId;

      /* -----------------------------------------------------------
         INSERT SELECTED SERVICES INTO service_request_items
      ------------------------------------------------------------ */
      if (services) {
        const selected = Array.isArray(services) ? services : [services];

        for (const serviceID of selected) {
          await db.promise().query(
            `INSERT INTO service_request_items (request_id, service_id)
             VALUES (?, ?)`,
            [request_id, serviceID]
          );
        }
      }

      /* -----------------------------------------------------------
         INSERT ATTACHMENTS
      ------------------------------------------------------------ */
      if (req.files?.length > 0) {
        for (const file of req.files) {
          await db.promise().query(
            `INSERT INTO service_request_attachments
              (attachment_id, service_request_id)
             VALUES (?, ?)`,
            [file.filename, request_id]
          );
        }
      }

      /* -----------------------------------------------------------
         INSERT INITIAL STATUS HISTORY
      ------------------------------------------------------------ */
      await db.promise().query(
        `INSERT INTO request_status_history
           (request_id, status, updated_by, remarks, updated_at)
         VALUES (?, ?, ?, ?, NOW())`,
        [
          request_id,
          "PENDING",
          client_id,
          "Client submitted request"
        ]
      );

      // The repair gets its own chat the first time someone opens it
      // (controllers/chatController.js findOrCreateChat); the client's General
      // chat with the shop stays as it is.

      /* -----------------------------------------------------------
         SUCCESS RESPONSE
      ------------------------------------------------------------ */
      res.json({
        message: "Service request created successfully",
        request_id
      });

    } catch (err) {
      console.error("Service Request Error:", err);
      res.status(500).json({
        message: "Server error creating service request"
      });
    }
  }
);

export default router;
