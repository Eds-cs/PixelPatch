// server/controllers/paymentController.js
import axios from "axios";
import db from "../config/db.js";

const XENDIT_INVOICE_URL = "https://api.xendit.co/v2/invoices";

export const generatePaymentLink = (req, res) => {
  console.log("✅ Entered generatePaymentLink");

  const user = req.user;
  if (!user) {
    return res.status(401).json({ message: "No auth user" });
  }

  if (user.role_id !== 3) {
    return res.status(403).json({ message: "Only businesses can access this" });
  }
  const request_id = req.body.request_id;
  
  console.log("📦 request_id:", request_id);


  if (!request_id) {
    return res.status(400).json({ message: "request_id is required" });
  }

  /* ------------------------------------------------------
     0. Resolve shop_id from business user
  ------------------------------------------------------ */
  const shopSql = `
    SELECT id
    FROM shops
    WHERE user_id = ?
    LIMIT 1
  `;

  db.query(shopSql, [user.id], (shopErr, shopRows) => {
    if (shopErr) {
      console.error("❌ Shop lookup error:", shopErr);
      return res.status(500).json({ message: "Shop lookup failed" });
    }

    if (shopRows.length === 0) {
      console.log("❌ No shop found for business user:", user.id);
      return res.status(403).json({ message: "No shop found for this business" });
    }

    const shopId = shopRows[0].id;
    console.log("🏪 Resolved shop_id:", shopId);

    /* ------------------------------------------------------
       1. Validate request + quotation
    ------------------------------------------------------ */
    const requestSql = `
      SELECT
        sr.id AS request_id,
        sr.client_id,
        sr.shop_id,
        sr.decision,
        rq.id AS quotation_id,
        rq.status AS quotation_status
      FROM service_requests sr
      JOIN request_quotations rq
        ON rq.request_id = sr.id
      WHERE sr.id = ?
        AND sr.shop_id = ?
    `;

    console.log("🔍 Querying service_requests + quotations...");

    db.query(requestSql, [request_id, shopId], (err, rows) => {
      if (err) {
        console.error("❌ Request SQL error:", err);
        return res.status(500).json({ message: "Request query failed" });
      }


      if (rows.length !== 1) {
        console.log("❌ Invalid quotation count:", rows.length);
        return res.status(400).json({
          message: "Request must have exactly one quotation"
        });
      }

      const data = rows[0];

      if (data.decision !== "ACCEPTED") {
        console.log("❌ Decision not ACCEPTED:", data.decision);
        return res.status(400).json({
          message: "Request has not been accepted"
        });
      }

      if (data.quotation_status !== "PENDING") {
        console.log("❌ Quotation not PENDING:", data.quotation_status);
        return res.status(400).json({
          message: "Quotation is not payable"
        });
      }

      /* ------------------------------------------------------
         2. Ensure assessment exists
      ------------------------------------------------------ */
      console.log("🔍 Checking assessment...");

      db.query(
        `SELECT id FROM request_assessments WHERE request_id = ?`,
        [request_id],
        (err2, assessRows) => {
          if (err2) {
            console.error("❌ Assessment SQL error:", err2);
            return res.status(500).json({ message: "Assessment query failed" });
          }

          console.log("📄 Assessments:", assessRows);

          if (assessRows.length === 0) {
            return res.status(400).json({
              message: "Assessment is required before payment"
            });
          }

          /* ------------------------------------------------------
             3. Ensure no existing payment
          ------------------------------------------------------ */
          console.log("🔍 Checking existing payments...");

          db.query(
            `SELECT id, payment_link, status FROM payments WHERE request_id = ? LIMIT 1`,
            [request_id],
            (err3, payRows) => {
              if (err3) {
                console.error("❌ Payment check error:", err3);
                return res.status(500).json({ message: "Payment check failed" });
              }

              const existingPayment = payRows[0];

              /* ------------------------------------------------------
                 4. Compute estimated cost
              ------------------------------------------------------ */
              console.log("🧮 Computing cost...");

              const costSql = `
                SELECT
                  (
                    SELECT IFNULL(SUM(ss.base_price), 0)
                    FROM service_request_items sri
                    JOIN shop_services ss ON ss.id = sri.service_id
                    WHERE sri.request_id = ?
                  )
                  +
                  (
                    SELECT IFNULL(SUM(rqp.cost), 0)
                    FROM request_quotation_parts rqp
                    WHERE rqp.request_quotation_id = ?
                  ) AS total_amount
              `;

              db.query(
                costSql,
                [request_id, data.quotation_id],
                async (err4, costRows) => {
                  if (err4) {
                    console.error("❌ Cost SQL error:", err4);
                    return res.status(500).json({ message: "Cost query failed" });
                  }


                  const rawAmount = costRows[0]?.total_amount;
                  const amount = Number(rawAmount);

                  if (!amount || amount <= 0) {
                    console.log("❌ Invalid amount:", rawAmount);
                    return res.status(400).json({
                      message: "Computed payment amount is invalid"
                    });
                  }

                  /* ------------------------------------------------------
                     5. Insert payment
                  ------------------------------------------------------ */
                  console.log("💾 Inserting payment:", amount);

                  const preparePayment = (callback) => {
                    if (!existingPayment) {
                      return db.query(
                        `
                        INSERT INTO payments
                          (request_id, client_id, shop_id, amount, status)
                        VALUES (?, ?, ?, ?, 'PENDING')
                        `,
                        [request_id, data.client_id, shopId, amount],
                        (err5, result) => callback(err5, result?.insertId)
                      );
                    }

                    if (existingPayment.payment_link) {
                      return callback(null, existingPayment.id, existingPayment.payment_link);
                    }

                    if (existingPayment.status === "PAID") {
                      return callback(new Error("Payment already completed"));
                    }

                    return db.query(
                      `
                      UPDATE payments
                      SET amount = ?, client_id = ?, shop_id = ?, status = 'PENDING', paid_at = NULL
                      WHERE id = ?
                      `,
                      [amount, data.client_id, shopId, existingPayment.id],
                      (err5) => callback(err5, existingPayment.id)
                    );
                  };

                  preparePayment(async (err5, paymentId, existingPaymentLink) => {
                      if (err5) {
                        if (err5.message === "Payment already completed") {
                          return res.status(400).json({ message: err5.message });
                        }
                        console.error("❌ Payment preparation error:", err5);
                        return res.status(500).json({ message: "Payment insert failed" });
                      }

                      if (existingPaymentLink) {
                        return res.json({
                          message: "Payment link already generated",
                          payment_link: existingPaymentLink
                        });
                      }

                      /* ------------------------------------------------------
                         6. Create Xendit invoice
                      ------------------------------------------------------ */
                      console.log("🌐 Creating Xendit invoice...");
                      try {
                            const xenditRes = await axios.post(
                            XENDIT_INVOICE_URL,
                            {
                                external_id: `repair_request_${request_id}_${Date.now()}`,
                                amount,
                                description: `Repair payment for request #${request_id}`,
                                success_redirect_url: process.env.XENDIT_SUCCESS_URL,
                                failure_redirect_url: process.env.XENDIT_FAILURE_URL
                            },
                            {
                                auth: {
                                username: process.env.XENDIT_SECRET_KEY,
                                password: ""
                                }
                            }
                            );


                        console.log("✅ Xendit response:", xenditRes.data);

                        const paymentLink = xenditRes.data.invoice_url;

                        db.query(
                          `UPDATE payments SET payment_link = ? WHERE id = ?`,
                          [paymentLink, paymentId],
                          (err6) => {
                            if (err6) {
                              console.error("❌ Update payment error:", err6);
                              return res.status(500).json({ message: "Payment update failed" });
                            }

                            console.log("🎉 Payment link saved");
                            return res.json({
                              message: "Payment link generated",
                              payment_link: paymentLink
                            });
                          }
                        );
                      } catch (apiErr) {
                            console.error("❌ Xendit API error FULL DUMP");

                            console.error("Name:", apiErr.name);
                            console.error("Message:", apiErr.message);
                            console.error("Code:", apiErr.code);

                            if (apiErr.response) {
                                console.error("Status:", apiErr.response.status);
                                console.error("Headers:", apiErr.response.headers);
                                console.error("Data:", apiErr.response.data);
                            }

                            if (apiErr.request) {
                                console.error("Request sent but no response received");
                            }

                            console.error("Xendit request failed:", {
                                url: apiErr.config?.url,
                                method: apiErr.config?.method,
                              status: apiErr.response?.status
                            });

                            db.query(
                              `UPDATE payments SET status = 'FAILED' WHERE id = ?`,
                              [paymentId],
                              () => res.status(500).json({
                                message: "Xendit invoice creation failed"
                              })
                            );
                        }
                      // end of catch
                  });
                }
              );
            }
          );
        }
      );
    });
  });
};

