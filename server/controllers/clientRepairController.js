import db from "../config/db.js";

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
        d.serial_number,
        d.model_number,

        s.name   AS shop_name
      FROM service_requests sr
      JOIN devices d ON d.id = sr.device_id
      JOIN shops s   ON s.id = sr.shop_id
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
        estimated_completion_time,
        status
      FROM request_quotations
      WHERE request_id = ?
      `,
      [requestId]
    );

    let services = [];
    let parts = [];

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
    }

    /* ======================================================
       PAYMENT (READ-ONLY, LATEST)
    ====================================================== */
    const [[payment]] = await db.promise().query(
      `
      SELECT
        amount,
        status,
        payment_link,
        paid_at
      FROM payments
      WHERE request_id = ?
      ORDER BY paid_at DESC
      LIMIT 1
      `,
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

    console.log("DISPUTE:", dispute);

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
            }
          : null,

        payment: payment || null,
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
        decision,
        client_approved
      FROM service_requests
      WHERE id = ? AND client_id = ?
      `,
      [requestId, clientId]
    );

    if (!repair) {
      return res.status(404).json({ message: "Repair not found" });
    }

    // Only block if already approved
    if (repair.decision !== "ACCEPTED" || repair.client_approved === 1) {
      return res.status(400).json({
        message: "Quotation cannot be approved at this stage",
      });
    }

    await db.promise().query(
      `
      UPDATE service_requests
      SET client_approved = 1, updated_at = NOW()
      WHERE id = ?
      `,
      [requestId]
    );

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
        client_approved
      FROM service_requests
      WHERE id = ? AND client_id = ?
      `,
      [requestId, clientId]
    );

    if (!repair) {
      return res.status(404).json({ message: "Repair not found" });
    }

    // Approved repairs cannot be cancelled
    if (repair.client_approved === 1) {
      return res.status(400).json({
        message: "Approved requests cannot be cancelled",
      });
    }

    await db.promise().query(
      `
      UPDATE service_requests
      SET client_approved = 0, updated_at = NOW()
      WHERE id = ?
      `,
      [requestId]
    );

    return res.json({ message: "Repair request cancelled" });
  } catch (err) {
    console.error("❌ cancelRequest:", err);
    return res.status(500).json({ message: "Server error" });
  }
};
