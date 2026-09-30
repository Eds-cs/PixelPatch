// routes/serviceRequests.js
import express from "express";
import db from "../config/db.js";
import { upload } from "../middleware/upload.js";
import { authRequired } from "../middleware/authMiddleware.js";

const router = express.Router();

/* -----------------------------------------------------------
   CREATE SERVICE REQUEST
------------------------------------------------------------ */
router.post(
  "/",
  authRequired,
  upload.array("attachments", 10),
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


      /* -----------------------------------------------------------
         VALIDATE SHOP SERVICE TYPES (delivery methods)
      ------------------------------------------------------------ */
      const [types] = await db.promise().query(
        `SELECT is_pickup, is_dropoff, is_onsite
         FROM shop_service_types
         WHERE shop_id = ?`,
        [shop_id]
      );

      if (!types.length) {
        return res.status(400).json({ message: "Shop has no configured service types." });
      }

      const t = types[0];

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
