// server/controllers/xenditWebhookController.js
import db from "../config/db.js";

export const handleXenditWebhook = (req, res) => {
  console.log("📩 Xendit webhook received");

  const token = req.headers["x-callback-token"];

  if (token !== process.env.XENDIT_WEBHOOK_TOKEN) {
    console.log("❌ Invalid webhook token");
    return res.status(401).json({ message: "Invalid webhook token" });
  }

  const { external_id, status, id: xenditInvoiceId, payment_method } = req.body;

  if (!external_id || status !== "PAID") {
    return res.json({ received: true });
  }

  /* ----------------------------------------
     1. Extract request_id safely
  ---------------------------------------- */
  const parts = external_id.split("_");
  const requestId = Number(parts[2]);

  if (!requestId) {
    console.log("❌ Invalid external_id:", external_id);
    return res.status(400).json({ message: "Invalid external_id" });
  }

  /* ----------------------------------------
     2. Resolve payment row
  ---------------------------------------- */
  db.query(
    `SELECT id, status FROM payments WHERE request_id = ? LIMIT 1`,
    [requestId],
    (err, rows) => {
      if (err) {
        console.error("❌ Payment lookup error:", err);
        return res.status(500).json({ message: "DB error" });
      }

      if (rows.length === 0) {
        console.log("❌ No payment found for request:", requestId);
        return res.json({ received: true });
      }

      const paymentId = rows[0].id;

      /* ----------------------------------------
         3. Update payments table
      ---------------------------------------- */
      db.query(
        `
        UPDATE payments
        SET status = 'PAID', paid_at = NOW()
        WHERE id = ?
        `,
        [paymentId],
        (err2) => {
          if (err2) {
            console.error("❌ Failed to update payments:", err2);
            return res.status(500).json({ message: "DB error" });
          }

          /* ----------------------------------------
             4. Insert payment_details (idempotent)
          ---------------------------------------- */
          const mappedMethod =
            payment_method === "GCASH" ? "GCASH" :
            payment_method === "PAYMAYA" ? "MAYA" :
            "CARD";

          db.query(
            `
            SELECT id
            FROM payment_details
            WHERE payment_id = ?
            LIMIT 1
            `,
            [paymentId],
            (err3, detailRows) => {
              if (err3) {
                console.error("❌ payment_details lookup error:", err3);
                return res.status(500).json({ message: "DB error" });
              }

              if (detailRows.length === 0) {
                db.query(
                  `
                  INSERT INTO payment_details
                    (payment_id, type, status, method, transaction_ref)
                  VALUES (?, 'FULL', 'PAID', ?, ?)
                  `,
                  [paymentId, mappedMethod, xenditInvoiceId],
                  (err4) => {
                    if (err4) {
                      console.error("❌ Insert payment_details error:", err4);
                      return res.status(500).json({ message: "DB error" });
                    }
                  }
                );
              }

              /* ----------------------------------------
                 5. Update service_requests
              ---------------------------------------- */
              db.query(
                `
                UPDATE service_requests
                SET payment_status = 'PAID',
                client_approved = 1
                WHERE id = ?
                `,
                [requestId],
                (err5) => {
                  if (err5) {
                    console.error("❌ Failed to update service_requests:", err5);
                    return res.status(500).json({ message: "DB error" });
                  }

                  console.log("🎉 Payment + payment_details recorded for request:", requestId);
                  return res.json({ received: true });
                }
              );
            }
          );
        }
      );
    }
  );
};


