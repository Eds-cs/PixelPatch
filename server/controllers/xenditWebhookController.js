// server/controllers/xenditWebhookController.js
import { timingSafeEqual } from "node:crypto";
import axios from "axios";
import db from "../config/db.js";

const XENDIT_INVOICE_URL = "https://api.xendit.co/v2/invoices";
let settlementQueue = Promise.resolve();

function serializeSettlement(operation) {
  const result = settlementQueue.then(operation, operation);
  settlementQueue = result.then(() => undefined, () => undefined);
  return result;
}

function callbackTokenMatches(received, expected) {
  if (typeof received !== "string" || !expected) return false;
  const receivedBuffer = Buffer.from(received);
  const expectedBuffer = Buffer.from(expected);
  return receivedBuffer.length === expectedBuffer.length && timingSafeEqual(receivedBuffer, expectedBuffer);
}

function amountsMatch(left, right) {
  const leftAmount = Number(left);
  const rightAmount = Number(right);
  return Number.isFinite(leftAmount) && Number.isFinite(rightAmount) &&
    Math.round(leftAmount * 100) === Math.round(rightAmount * 100);
}

function mapPaymentMethod(method, channel, ewalletType) {
  const paymentType = String(channel || ewalletType || method || "").toUpperCase();
  if (paymentType === "GCASH") return "GCASH";
  if (paymentType === "PAYMAYA" || paymentType === "MAYA") return "MAYA";
  return "CARD";
}

export const handleXenditWebhook = async (req, res) => {
  const expectedToken = process.env.XENDIT_WEBHOOK_TOKEN;
  const callbackToken = req.headers["x-callback-token"];

  if (!callbackTokenMatches(callbackToken, expectedToken)) {
    return res.status(401).json({ message: "Invalid webhook token" });
  }

  const {
    external_id: externalId,
    status,
    id: xenditInvoiceId,
    amount,
    payment_method: paymentMethod,
    payment_channel: paymentChannel,
    ewallet_type: ewalletType,
  } = req.body ?? {};

  if (status !== "PAID") {
    return res.json({ received: true });
  }

  const referenceMatch = /^repair_request_(\d+)_(\d+)(?:_(\d+))?$/.exec(externalId || "");
  const requestId = Number(referenceMatch?.[1]);
  const expectedPaymentId = referenceMatch?.[3] ? Number(referenceMatch[2]) : null;

  if (!requestId || !xenditInvoiceId || !Number.isFinite(Number(amount)) || Number(amount) <= 0) {
    return res.status(400).json({ message: "Invalid paid invoice payload" });
  }

  if (referenceMatch?.[3] && !expectedPaymentId) {
    return res.status(400).json({ message: "Invalid payment reference" });
  }

  if (!process.env.XENDIT_SECRET_KEY) {
    return res.status(503).json({ message: "Payment verification is unavailable" });
  }

  try {
    const { data: invoice } = await axios.get(
      `${XENDIT_INVOICE_URL}/${encodeURIComponent(xenditInvoiceId)}`,
      {
        auth: { username: process.env.XENDIT_SECRET_KEY, password: "" },
        timeout: 10000,
      }
    );

    if (
      invoice?.id !== xenditInvoiceId ||
      invoice?.external_id !== externalId ||
      invoice?.status !== "PAID" ||
      !amountsMatch(invoice?.amount, amount)
    ) {
      return res.status(400).json({ message: "Invoice details do not match callback" });
    }

    const result = await serializeSettlement(async () => {
      const [payments] = await db.promise().query(
        `SELECT p.id, p.amount, p.status, p.shop_id, sr.shop_id AS request_shop_id
         FROM payments p
         JOIN service_requests sr ON sr.id = p.request_id
         WHERE p.request_id = ? AND sr.decision = 'ACCEPTED'
         ORDER BY p.id DESC`,
        [requestId]
      );

      const candidates = payments.filter((payment) =>
        payment.shop_id === payment.request_shop_id &&
        amountsMatch(payment.amount, amount) &&
        (!expectedPaymentId || Number(payment.id) === expectedPaymentId)
      );

      if (candidates.length !== 1) {
        return { status: 409, message: "No unique matching payment was found" };
      }

      const payment = candidates[0];
      const [details] = await db.promise().query(
        `SELECT transaction_ref FROM payment_details WHERE payment_id = ?`,
        [payment.id]
      );

      if (details.some((detail) => detail.transaction_ref !== xenditInvoiceId)) {
        return { status: 409, message: "Payment is associated with a different invoice" };
      }

      await db.promise().query(
        `UPDATE payments
         SET status = 'PAID', paid_at = COALESCE(paid_at, NOW())
         WHERE id = ? AND request_id = ? AND shop_id = ? AND amount = ?`,
        [payment.id, requestId, payment.request_shop_id, payment.amount]
      );

      if (details.length === 0) {
        await db.promise().query(
          `INSERT INTO payment_details
            (payment_id, type, status, method, transaction_ref)
           VALUES (?, 'FULL', 'PAID', ?, ?)`,
          [payment.id, mapPaymentMethod(paymentMethod, paymentChannel, ewalletType), xenditInvoiceId]
        );
      }

      await db.promise().query(
        `UPDATE service_requests
         SET payment_status = 'PAID', client_approved = 1
         WHERE id = ? AND shop_id = ? AND decision = 'ACCEPTED'`,
        [requestId, payment.request_shop_id]
      );

      return { status: 200, message: "Payment recorded" };
    });

    if (result.status !== 200) {
      return res.status(result.status).json({ message: result.message });
    }
    return res.json({ received: true });
  } catch (error) {
    console.error("Xendit webhook processing failed:", {
      status: error.response?.status,
      code: error.code,
    });
    return res.status(500).json({ message: "Unable to process payment notification" });
  }
};


