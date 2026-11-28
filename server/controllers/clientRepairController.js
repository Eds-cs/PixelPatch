import db from "../config/db.js";
import { withTransaction } from "../utils/transaction.js";
import { isValidDateOnly } from "../utils/dateValidation.js";
import { cancelUnpaidRepair, createPaymentLinkFor, loadPaymentState, settleRequestPayments } from "../utils/paymentPlan.js";
import { warrantyInfo } from "../utils/warranty.js";
import { canEscalate, claimEligibility, claimsForRequest } from "../utils/warrantyClaims.js";

/* ======================================================
   GET CLIENT REPAIRS (LIST)
   GET /api/client/repairs
====================================================== */
export const getClientRepairs = async (req, res) => {
  const clientId = req.user.id;

  try {
    const [repairs] = await db.promise().query(
      `
      SELECT
        sr.id,
        sr.decision,
        sr.status,
        sr.payment_status,
        sr.deposit_paid_at,
        sr.client_approved,
        DATE_FORMAT(sr.created_at, '%Y-%m-%d %H:%i:%s') AS created_at,

        d.name   AS device_name,
        d.brand  AS device_brand,
        d.model  AS device_model,

        s.name   AS shop_name
      FROM service_requests sr
      JOIN devices d ON d.id = sr.device_id
      JOIN shops s   ON s.id = sr.shop_id
      WHERE sr.client_id = ?
      ORDER BY sr.created_at DESC
      `,
      [clientId]
    );


    return res.json({ repairs });
  } catch (err) {
    console.error("❌ getClientRepairs:", err);
    return res.status(500).json({ message: "Server error" });
  }
};

/* ======================================================
   GET SINGLE CLIENT REPAIR (DETAILS)
   GET /api/client/repairs/:id
====================================================== */
export const getClientRepairById = async (req, res) => {
  const clientId = req.user.id;
  const requestId = req.params.id;

  try {
    /* ======================================================
       MAIN SERVICE REQUEST
    ====================================================== */
    const [[repair]] = await db.promise().query(
      `
      SELECT
        sr.*,

        d.name   AS device_name,
        d.brand  AS device_brand,
        d.model  AS device_model,
        d.device_type,
        d.serial_number,
        d.model_number,

        s.name   AS shop_name,
        CONCAT_WS(', ', client_address.street, client_address.barangay,
          client_address.city, client_address.province, client_address.postal_code) AS service_address,
        CONCAT_WS(', ', shop_address.street, shop_address.barangay,
          shop_address.city, shop_address.province, shop_address.postal_code) AS shop_address
      FROM service_requests sr
      JOIN devices d ON d.id = sr.device_id
      JOIN shops s   ON s.id = sr.shop_id
      LEFT JOIN addresses client_address ON client_address.id = sr.pickup_address_id
      LEFT JOIN addresses shop_address ON shop_address.id = s.address_id
      WHERE sr.id = ? AND sr.client_id = ?
      `,
      [requestId, clientId]
    );

    if (!repair) {
      return res.status(404).json({ message: "Repair not found" });
    }

    /* ======================================================
       ASSESSMENT (OPTIONAL)
    ====================================================== */
    const [[assessment]] = await db.promise().query(
      `
      SELECT
        device_condition,
        observed_issues,
        recommendation,
        is_remote,
        created_at
      FROM request_assessments
      WHERE request_id = ?
      `,
      [requestId]
    );

    /* ======================================================
       QUOTATION (OPTIONAL)
    ====================================================== */
    const [[quotation]] = await db.promise().query(
      `
      SELECT
        id,
        estimated_cost,
        deposit_percent,
        allow_cash,
        estimated_completion_time,
        DATE_FORMAT(estimated_completion_time, '%Y-%m-%d') AS estimated_completion_date,
        status
      FROM request_quotations
      WHERE request_id = ?
      `,
      [requestId]
    );

    let services = [];
    let parts = [];
    let warranty = null;

    if (quotation) {
      /* Quoted services */
      [services] = await db.promise().query(
        `
        SELECT
          ss.id,
          ss.name,
          ss.category,
          ss.base_price,
          ss.estimated_timeframe
        FROM service_request_items sri
        JOIN shop_services ss ON ss.id = sri.service_id
        WHERE sri.request_id = ?
        `,
        [requestId]
      );

      /* Quoted parts */
      [parts] = await db.promise().query(
        `
        SELECT
          name,
          cost
        FROM request_quotation_parts
        WHERE request_quotation_id = ?
        `,
        [quotation.id]
      );

      const [[warrantyRow]] = await db.promise().query(
        `SELECT is_warranty_covered, warranty_value, warranty_unit, coverage, exclusions
         FROM request_quotation_warranties
         WHERE request_quotation_id = ?
         LIMIT 1`,
        [quotation.id]
      );
      warranty = warrantyRow ?? null;
    }

    /* ======================================================
       PAYMENT (READ-ONLY)
       payment: the latest row (lib/payments.js polls its status).
       payment_plan: deposit and balance (utils/paymentPlan.js).
    ====================================================== */
    const [[payment]] = await db.promise().query(
      `
      SELECT
        kind,
        amount,
        status,
        gateway,
        payment_link,
        paid_at
      FROM payments
      WHERE request_id = ?
      ORDER BY id DESC
      LIMIT 1
      `,
      [requestId]
    );
    const { plan: paymentPlan } = await loadPaymentState(requestId);

    /* WARRANTY CLAIMS (business rule 9): this repair's claims, whether a new
       one can be opened, and, for a warranty repair, the original repair. */
    const warrantyDetails = warrantyInfo(warranty, repair);
    const warrantyClaims = (await claimsForRequest(requestId)).map((claim) => ({ ...claim, can_escalate: canEscalate(claim) }));
    const [[warrantyOf]] = await db.promise().query(
      "SELECT id AS claim_id, request_id FROM warranty_claims WHERE linked_request_id = ? LIMIT 1",
      [requestId]
    );

    /* ======================================================
       ASSIGNED EMPLOYEE (OPTIONAL)
    ====================================================== */
    const [[assignedEmployee]] = await db.promise().query(
      `
      SELECT
        e.id,
        e.first_name,
        e.last_name,
        e.role
      FROM request_assignments ra
      JOIN shop_employees e ON e.id = ra.employee_id
      WHERE ra.request_id = ?
      LIMIT 1
      `,
      [requestId]
    );

    /* ======================================================
       CLIENT REVIEW (OPTIONAL)
    ====================================================== */
    const [[review]] = await db.promise().query(
      `
      SELECT
        id,
        rating,
        feedback,
        created_at
      FROM reviews
      WHERE request_id = ? AND client_id = ?
      LIMIT 1
      `,
      [requestId, clientId]
    );

    // FETCH DISPUTE
    const [disputes] = await db.promise().query(
      `
      SELECT
        id,
        status,
        proposed_resolution,
        shop_response,
        created_at,
        resolved_at
      FROM disputes
      WHERE request_id = ?
      `,
      [repair.id]
    );

    const dispute = disputes.length > 0 ? disputes[0] : null;


    // FETCH DISPUTE EDITS (MESSAGE HISTORY)
    let disputeEdits = [];

    if (dispute) {
      const [edits] = await db.promise().query(
        `
        SELECT
          edited_by,
          content,
          created_at
        FROM dispute_edits
        WHERE dispute_id = ?
        ORDER BY created_at ASC
        `,
        [dispute.id]
      );

      disputeEdits = edits;
    }




    /* ======================================================
       FINAL RESPONSE (FRONTEND-FRIENDLY)
    ====================================================== */
    return res.json({
      repair: {
        ...repair,

        assessment: assessment || null,

        quotation: quotation
          ? {
              ...quotation,
              services,
              parts,
              warranty,
            }
          : null,

        payment: payment || null,
        payment_plan: paymentPlan,
        // The warranty with its dates once the repair is completed (utils/warranty.js).
        warranty_info: warrantyDetails,
        warranty_claims: warrantyClaims,
        warranty_claim: claimEligibility(repair, warrantyDetails, warrantyClaims),
        warranty_of: warrantyOf ?? null,
        review: review || null,
        assigned_employee: assignedEmployee || null,
      },
      dispute,
      dispute_edits: disputeEdits,
    });
  } catch (err) {
    console.error("❌ getClientRepairById:", err);
    return res.status(500).json({ message: "Server error" });
  }
};


/* ======================================================
   CLIENT APPROVES QUOTATION
   PATCH /api/client/repairs/:id/approve
====================================================== */
export const approveQuotation = async (req, res) => {
  const clientId = req.user.id;
  const requestId = req.params.id;

  try {
    const [[repair]] = await db.promise().query(
      `
      SELECT
        sr.decision,
        sr.client_approved,
        rq.id AS quotation_id,
        rq.status AS quotation_status,
        DATE_FORMAT(rq.estimated_completion_time, '%Y-%m-%d') AS estimated_completion_date
      FROM service_requests sr
      LEFT JOIN request_quotations rq ON rq.request_id = sr.id
      WHERE sr.id = ? AND sr.client_id = ?
      `,
      [requestId, clientId]
    );

    if (!repair) {
      return res.status(404).json({ message: "Repair not found" });
    }

    // client_approved: NULL = undecided, 1 = approved, 0 = cancelled.
    if (repair.decision !== "ACCEPTED" || repair.client_approved !== null) {
      return res.status(400).json({
        message: "Quotation cannot be approved at this stage",
      });
    }

    if (
      !repair.quotation_id ||
      repair.quotation_status !== "PENDING" ||
      !isValidDateOnly(repair.estimated_completion_date)
    ) {
      return res.status(409).json({
        message: "The quotation needs a valid estimated completion date before it can be approved",
      });
    }

    // Conditional update so a concurrent cancel cannot be overwritten. Then
    // settle: with a 0% deposit, work can start right away (paymentPlan.js).
    const approved = await withTransaction(async (conn) => {
      const [result] = await conn.query(
        `
        UPDATE service_requests
        SET client_approved = 1, client_approved_at = NOW(), updated_at = NOW()
        WHERE id = ? AND client_id = ? AND client_approved IS NULL
        `,
        [requestId, clientId]
      );
      if (result.affectedRows === 0) return false;
      await settleRequestPayments(conn, requestId);
      return true;
    });

    if (!approved) {
      return res.status(409).json({ message: "Quotation cannot be approved at this stage" });
    }

    return res.json({ message: "Quotation approved" });
  } catch (err) {
    console.error("❌ approveQuotation:", err);
    return res.status(500).json({ message: "Server error" });
  }
};

/* ======================================================
   CLIENT CANCELS REQUEST
   PATCH /api/client/repairs/:id/cancel
====================================================== */
export const cancelRequest = async (req, res) => {
  const clientId = req.user.id;
  const requestId = req.params.id;

  try {
    const [[repair]] = await db.promise().query(
      `
      SELECT
        client_approved,
        decision,
        status,
        payment_status
      FROM service_requests
      WHERE id = ? AND client_id = ?
      `,
      [requestId, clientId]
    );

    if (!repair) {
      return res.status(404).json({ message: "Repair not found" });
    }

    // client_approved: NULL = undecided, 1 = approved, 0 = cancelled.
    if (repair.client_approved === 0) {
      return res.status(400).json({ message: "This request is already cancelled" });
    }

    // Approved, but the deposit isn't paid yet: still cancellable, after
    // closing any open payment link (utils/paymentPlan.js).
    if (repair.client_approved === 1) {
      const { status, body } = await cancelUnpaidRepair({ requestId: Number(requestId), by: "CLIENT", clientId, userId: clientId });
      return res.status(status).json(body);
    }

    if (
      repair.decision === "REJECTED" ||
      repair.payment_status === "PAID" ||
      !["PENDING", "REVIEW"].includes(repair.status)
    ) {
      return res.status(400).json({ message: "This request can no longer be cancelled" });
    }

    // Both updates commit together: the request is never cancelled while its
    // quotation stays open.
    const cancelled = await withTransaction(async (conn) => {
      // Conditional update so a concurrent approval cannot be overwritten.
      const [result] = await conn.query(
        `
        UPDATE service_requests
        SET client_approved = 0, updated_at = NOW()
        WHERE id = ? AND client_id = ?
          AND client_approved IS NULL
          AND decision <> 'REJECTED'
          AND payment_status <> 'PAID'
          AND status IN ('PENDING', 'REVIEW')
        `,
        [requestId, clientId]
      );

      if (result.affectedRows === 0) return false;

      // Close an outstanding quotation so it cannot be approved or paid.
      await conn.query(
        `
        UPDATE request_quotations
        SET status = 'CANCELLED', updated_at = NOW()
        WHERE request_id = ? AND status = 'PENDING'
        `,
        [requestId]
      );

      return true;
    });

    if (!cancelled) {
      return res.status(409).json({ message: "This request can no longer be cancelled" });
    }

    return res.json({ message: "Repair request cancelled" });
  } catch (err) {
    console.error("❌ cancelRequest:", err);
    return res.status(500).json({ message: "Server error" });
  }
};

/* ======================================================
   CLIENT PAYS WHAT'S DUE NOW
   POST /api/client/repairs/:id/pay
   The deposit after approving, or the balance once work has started. The
   client makes the link, so nobody waits on the shop (utils/paymentPlan.js).
====================================================== */
export const payRepair = async (req, res) => {
  const requestId = Number(req.params.id);
  if (!Number.isSafeInteger(requestId) || requestId <= 0) return res.status(404).json({ message: "Repair not found" });
  try {
    const { status, body } = await createPaymentLinkFor({ requestId, clientId: req.user.id });
    return res.status(status).json(body);
  } catch (err) {
    console.error("payRepair:", err.code || err.message);
    return res.status(500).json({ message: "Couldn't open the payment page." });
  }
};
