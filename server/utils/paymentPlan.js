// server/utils/paymentPlan.js
// Deposit and balance payments (AGENTS.md "Payment terms", sections 15-17).
//
// A job is paid in up to two parts, from its quotation's terms
// (request_quotations.deposit_percent, allow_cash):
//   FULL     a 100% deposit: the whole total online before work starts
//   DEPOSIT  deposit_percent of the total, online, before work starts
//   BALANCE  the rest, before the repair is marked completed: online, or in
//            cash when the quotation allows it (confirmed by the owner or the
//            assigned member)
// Each part is one payments row (payments.kind). The request records:
//   deposit_paid_at  nothing more is due before work can start (deposit or
//                    full payment verified, or a 0% deposit approved)
//   payment_status   'PAID' = paid in full
//
// The amounts mirror quotationAmounts in lib/paymentTerms.js; keep them in sync.
import axios from "axios";
import db from "../config/db.js";
import { withTransaction } from "./transaction.js";
import { postRepairUpdate } from "./repairCards.js";

const XENDIT_INVOICE_URL = "https://api.xendit.co/v2/invoices";
const XENDIT_EXPIRE_URL = "https://api.xendit.co/invoices";

const cents = (value) => Math.round(Number(value || 0) * 100);
const pesos = (value) => value / 100;

/** { totalC, depositPercent, depositC, balanceC, allowCash } in centavos. */
export function quotationAmountsCents(quotation) {
  const totalC = cents(quotation?.estimated_cost);
  const depositPercent = quotation?.deposit_percent === null || quotation?.deposit_percent === undefined
    ? 100
    : Number(quotation.deposit_percent);
  const depositC = Math.round((totalC * depositPercent) / 100);
  const balanceC = totalC - depositC;
  const allowCash = Number(quotation?.allow_cash) === 1 && balanceC > 0;
  return { totalC, depositPercent, depositC, balanceC, allowCash };
}

/** The upfront part's kind: one FULL charge at 100%, otherwise a DEPOSIT. */
export const upfrontKind = (depositPercent) => (Number(depositPercent) === 100 ? "FULL" : "DEPOSIT");

/** Work may begin: the upfront part is settled. Older paid rows predate deposit_paid_at. */
export const depositSettled = (request) =>
  Boolean(request?.deposit_paid_at) || request?.payment_status === "PAID";

const isPaid = (payment) => payment.status === "PAID";

/**
 * The payment state shown to the client, the shop and the member, and used by
 * the payment link. Pure: takes the rows loadPaymentState returns.
 */
export function paymentPlan({ request, quotation, payments = [] }) {
  if (!request || !quotation) return null;
  const { totalC, depositPercent, depositC, balanceC, allowCash } = quotationAmountsCents(quotation);
  const upfront = payments.find((p) => isPaid(p) && (p.kind === "FULL" || p.kind === "DEPOSIT"));
  const balanceRow = payments.find((p) => isPaid(p) && p.kind === "BALANCE");
  const depositPaid = depositSettled(request);
  const paidInFull = request.payment_status === "PAID";
  const balancePaid = paidInFull || (depositPaid && (balanceC === 0 || Boolean(balanceRow)));

  const open =
    request.decision === "ACCEPTED" &&
    request.client_approved !== null && Number(request.client_approved) === 1 &&
    quotation.status !== "CANCELLED";

  let due = null;
  if (open && !paidInFull) {
    const kind = !depositPaid ? upfrontKind(depositPercent) : balanceC > 0 && !balanceRow ? "BALANCE" : null;
    if (kind) {
      const pending = payments
        .filter((p) => p.kind === kind && p.gateway !== "CASH" && p.status === "PENDING" && p.payment_link)
        .sort((a, b) => b.id - a.id)[0];
      due = {
        kind,
        amount: pesos(kind === "BALANCE" ? balanceC : depositC),
        // The balance can be asked for once work has started.
        ready: kind !== "BALANCE" || request.status === "IN_PROGRESS",
        cash_allowed: kind === "BALANCE" && allowCash,
        payment_id: pending?.id ?? null,
        payment_link: pending?.payment_link ?? null,
        status: pending?.status ?? null,
      };
    }
  }

  return {
    total: pesos(totalC),
    deposit_percent: depositPercent,
    deposit: pesos(depositC),
    balance: pesos(balanceC),
    allow_cash: allowCash,
    deposit_paid: depositPaid,
    deposit_paid_at: request.deposit_paid_at ?? upfront?.paid_at ?? null,
    balance_paid: balancePaid,
    balance_paid_at: balanceRow?.paid_at ?? null,
    // ONLINE or CASH, once the balance is paid.
    balance_method: balanceRow ? (balanceRow.gateway === "CASH" ? "CASH" : "ONLINE") : null,
    paid_in_full: paidInFull,
    due,
  };
}

/** Loads what paymentPlan needs. `conn` (a transaction connection) locks the request row. */
export async function loadPaymentState(requestId, conn = null) {
  const run = (sql, params) => (conn ?? db.promise()).query(sql, params).then(([rows]) => rows);
  const [request] = await run(
    `SELECT id, client_id, shop_id, decision, status, payment_status, deposit_paid_at, client_approved
       FROM service_requests WHERE id = ? LIMIT 1${conn ? " FOR UPDATE" : ""}`,
    [requestId]
  );
  if (!request) return { request: null, quotation: null, payments: [], plan: null };
  const [quotation] = await run(
    `SELECT id, estimated_cost, deposit_percent, allow_cash, status,
            DATE_FORMAT(estimated_completion_time, '%Y-%m-%d') AS estimated_completion_date
       FROM request_quotations WHERE request_id = ? LIMIT 1`,
    [requestId]
  );
  const payments = await run(
    `SELECT id, kind, amount, status, gateway, payment_link, gateway_ref, paid_at, confirmed_by
       FROM payments WHERE request_id = ? ORDER BY id`,
    [requestId]
  );
  return { request, quotation: quotation ?? null, payments, plan: paymentPlan({ request, quotation, payments }) };
}

/**
 * Brings the request up to date after a payment is recorded or the client
 * approves: sets deposit_paid_at once the upfront part is settled, and
 * payment_status = 'PAID' (and the quotation PAID) once everything is paid.
 * Call inside withTransaction.
 */
export async function settleRequestPayments(conn, requestId) {
  const { request, quotation, payments } = await loadPaymentState(requestId, conn);
  if (!request || !quotation || quotation.status === "CANCELLED") return;
  if (request.decision !== "ACCEPTED" || request.client_approved === null || Number(request.client_approved) !== 1) return;

  const { depositC, balanceC } = quotationAmountsCents(quotation);
  const upfrontPaid = depositC === 0 || payments.some((p) => isPaid(p) && (p.kind === "FULL" || p.kind === "DEPOSIT"));
  const balancePaid = balanceC === 0 || payments.some((p) => isPaid(p) && p.kind === "BALANCE");

  if (upfrontPaid && !request.deposit_paid_at) {
    await conn.query("UPDATE service_requests SET deposit_paid_at = NOW() WHERE id = ?", [requestId]);
  }
  if (upfrontPaid && balancePaid && request.payment_status !== "PAID") {
    await conn.query("UPDATE service_requests SET payment_status = 'PAID' WHERE id = ?", [requestId]);
    await conn.query(
      "UPDATE request_quotations SET status = 'PAID', updated_at = NOW() WHERE request_id = ? AND status = 'PENDING'",
      [requestId]
    );
  }
}

const xenditAuth = () => ({ username: process.env.XENDIT_SECRET_KEY, password: "" });

const gatewayCode = (err) =>
  String(err?.response?.data?.error_code || err?.code || "XENDIT_ERROR").replace(/[^A-Za-z0-9_-]/g, "").slice(0, 64) || "XENDIT_ERROR";

const DESCRIPTION = {
  FULL: (id) => `Repair payment for request #${id}`,
  DEPOSIT: (id) => `Deposit for repair request #${id}`,
  BALANCE: (id) => `Balance for repair request #${id}`,
};

/**
 * Creates (or returns) the Xendit link for whatever is due now on this
 * request: the deposit/full amount after approval, or the balance once work
 * has started. `shopId` must own the request. Returns { status, body }.
 */
export async function createPaymentLinkFor({ requestId, shopId }) {
  const { request, quotation, payments, plan } = await loadPaymentState(requestId);
  if (!request || Number(request.shop_id) !== Number(shopId)) return { status: 404, body: { message: "Repair not found" } };
  if (request.decision !== "ACCEPTED") return { status: 400, body: { message: "Request has not been accepted" } };
  if (!quotation) return { status: 400, body: { message: "Request must have a quotation" } };
  if (request.client_approved === null || Number(request.client_approved) !== 1) {
    return { status: 400, body: { message: "The client must approve the quotation before payment" } };
  }
  if (quotation.status !== "PENDING") return { status: 400, body: { message: "Quotation is not payable" } };
  if (!quotation.estimated_completion_date) {
    return { status: 400, body: { message: "The quotation needs an estimated completion date before payment" } };
  }
  const [assessment] = await db.promise().query("SELECT id FROM request_assessments WHERE request_id = ? LIMIT 1", [requestId]).then(([r]) => r);
  if (!assessment) return { status: 400, body: { message: "Assessment is required before payment" } };

  const due = plan?.due;
  if (!due) return { status: 400, body: { message: "Nothing is left to pay online for this repair." } };
  if (!due.ready) return { status: 409, body: { message: "Ask for the balance once the repair has started." } };
  if (due.payment_link) {
    return { status: 200, body: { message: "Payment link already generated", payment_link: due.payment_link, kind: due.kind, amount: due.amount } };
  }
  if (!(due.amount > 0)) return { status: 400, body: { message: "Computed payment amount is invalid" } };

  // Reuse an unpaid row of this kind (a failed or link-less attempt), else add one.
  const reusable = payments.filter((p) => p.kind === due.kind && p.gateway !== "CASH" && p.status !== "PAID").sort((a, b) => b.id - a.id)[0];
  let paymentId;
  if (reusable) {
    paymentId = reusable.id;
    await db.promise().query(
      `UPDATE payments SET amount = ?, status = 'PENDING', paid_at = NULL, payment_link = NULL, gateway_ref = NULL
        WHERE id = ? AND status <> 'PAID'`,
      [due.amount, paymentId]
    );
  } else {
    const [result] = await db.promise().query(
      `INSERT INTO payments (request_id, client_id, shop_id, kind, amount, gateway, status)
       VALUES (?, ?, ?, ?, ?, 'XENDIT', 'PENDING')`,
      [requestId, request.client_id, request.shop_id, due.kind, due.amount]
    );
    paymentId = result.insertId;
  }

  try {
    const { data: invoice } = await axios.post(
      XENDIT_INVOICE_URL,
      {
        external_id: `repair_request_${requestId}_${paymentId}_${Date.now()}`,
        amount: due.amount,
        description: DESCRIPTION[due.kind](requestId),
        success_redirect_url: process.env.XENDIT_SUCCESS_URL,
        failure_redirect_url: process.env.XENDIT_FAILURE_URL,
      },
      { auth: xenditAuth(), timeout: 15000 }
    );
    await db.promise().query(
      "UPDATE payments SET payment_link = ?, gateway_ref = ? WHERE id = ?",
      [invoice.invoice_url, String(invoice.id ?? "").slice(0, 100) || null, paymentId]
    );
    return { status: 200, body: { message: "Payment link generated", payment_link: invoice.invoice_url, kind: due.kind, amount: due.amount } };
  } catch (err) {
    const code = gatewayCode(err);
    console.error("Xendit invoice request failed:", { status: err.response?.status, code });
    await db.promise().query("UPDATE payments SET status = 'FAILED' WHERE id = ? AND status = 'PENDING'", [paymentId]).catch(() => {});
    return { status: 502, body: { message: `Xendit invoice creation failed (${code})` } };
  }
}

/**
 * Stops an unpaid online invoice from being paid (the shop took cash instead).
 * Returns "EXPIRED", "PAID" (the client paid it first) or throws.
 */
async function expireInvoice(invoiceId) {
  try {
    await axios.post(`${XENDIT_EXPIRE_URL}/${encodeURIComponent(invoiceId)}/expire!`, {}, { auth: xenditAuth(), timeout: 10000 });
    return "EXPIRED";
  } catch (err) {
    // Already expired or already paid: ask Xendit which.
    const { data } = await axios.get(`${XENDIT_INVOICE_URL}/${encodeURIComponent(invoiceId)}`, { auth: xenditAuth(), timeout: 10000 });
    const status = String(data?.status ?? "").toUpperCase();
    if (status === "PAID" || status === "SETTLED") return "PAID";
    if (status === "EXPIRED") return "EXPIRED";
    throw err;
  }
}

/**
 * Business rule 5: the owner, or the member assigned to the repair, confirms
 * that the client paid the balance in cash. Only when the quotation allows
 * cash, the deposit is settled, the repair is in progress and the balance is
 * still unpaid. `employeeId` (staff only): the repair must be assigned to
 * them. `userId` is recorded in payments.confirmed_by. Returns { status, body }.
 */
export async function confirmCashBalanceFor({ requestId, shopId, employeeId = null, userId }) {
  const { request, payments, plan } = await loadPaymentState(requestId);
  if (!request || Number(request.shop_id) !== Number(shopId)) return { status: 404, body: { message: "Repair not found" } };

  if (employeeId !== null) {
    const [assignment] = await db.promise()
      .query("SELECT employee_id FROM request_assignments WHERE request_id = ? LIMIT 1", [requestId])
      .then(([rows]) => rows);
    if (!assignment || Number(assignment.employee_id) !== Number(employeeId)) {
      return { status: 403, body: { message: "This repair isn't assigned to you." } };
    }
  }

  if (!plan || plan.due?.kind !== "BALANCE") {
    return { status: 409, body: { message: plan?.balance_paid ? "The balance is already paid." : "There's no balance to collect yet." } };
  }
  if (!plan.allow_cash) return { status: 409, body: { message: "This quotation doesn't allow cash. The client pays the balance online." } };
  if (request.status !== "IN_PROGRESS") return { status: 409, body: { message: "Confirm cash once the repair has started." } };

  // An online balance link may be open: close it first, so the client can't
  // also pay it. External calls happen before the transaction (AGENTS.md 12).
  const openLinks = payments.filter((p) => p.kind === "BALANCE" && p.gateway !== "CASH" && p.status === "PENDING" && p.gateway_ref);
  for (const payment of openLinks) {
    let outcome;
    try {
      outcome = await expireInvoice(payment.gateway_ref);
    } catch (err) {
      console.error("Xendit invoice expiry failed:", { status: err.response?.status, code: gatewayCode(err) });
      return { status: 502, body: { message: "Couldn't close the client's online payment link. Please try again." } };
    }
    if (outcome === "PAID") {
      return { status: 409, body: { message: "The client has already paid the balance online. Refresh to see it." } };
    }
  }

  const done = await withTransaction(async (conn) => {
    const fresh = await loadPaymentState(requestId, conn);
    if (fresh.plan?.due?.kind !== "BALANCE" || fresh.request.status !== "IN_PROGRESS") return false;
    await conn.query(
      "UPDATE payments SET status = 'FAILED' WHERE request_id = ? AND kind = 'BALANCE' AND gateway = 'XENDIT' AND status = 'PENDING'",
      [requestId]
    );
    await conn.query(
      `INSERT INTO payments (request_id, client_id, shop_id, kind, amount, gateway, status, paid_at, confirmed_by)
       VALUES (?, ?, ?, 'BALANCE', ?, 'CASH', 'PAID', NOW(), ?)`,
      [requestId, fresh.request.client_id, fresh.request.shop_id, fresh.plan.due.amount, userId]
    );
    await settleRequestPayments(conn, requestId);
    return true;
  });

  if (!done) return { status: 409, body: { message: "The balance can no longer be confirmed. Refresh the repair." } };
  // "Payment received" card in the repair's chat (utils/repairCards.js).
  await postRepairUpdate(Number(requestId), userId, "PAYMENT_RECEIVED", { kind: "BALANCE", amount: plan.due.amount, method: "CASH" });
  return { status: 200, body: { message: "Cash payment recorded. The repair is paid in full." } };
}
