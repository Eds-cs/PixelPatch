// lib/repairStage.js
// One readable label for where a repair request is, from the four fields that
// together hold its state (AGENTS.md sections 15-16: decision, status,
// payment_status, client_approved). Display only: never write these back.

const isNull = (v) => v === null || v === undefined;

/** { key, label, tone } where tone is an AdminPill tone. */
export function repairStage(row) {
  const approved = isNull(row?.client_approved) ? null : Number(row.client_approved);
  if (approved === 0) return { key: "CANCELLED", label: "Cancelled by client", tone: "gray" };
  if (row?.decision === "REJECTED") return { key: "REJECTED", label: "Rejected by shop", tone: "red" };
  if (row?.decision === "PENDING") return { key: "AWAITING_SHOP", label: "Waiting for the shop", tone: "amber" };
  if (row?.status === "COMPLETED") return { key: "COMPLETED", label: "Completed", tone: "green" };
  if (row?.status === "IN_PROGRESS") return { key: "IN_PROGRESS", label: "Repair in progress", tone: "blue" };
  if (row?.payment_status === "PAID") return { key: "PAID", label: "Paid, not started", tone: "teal" };
  // Deposit paid (or a 0% deposit approved): work may start, balance later.
  if (row?.deposit_paid_at) return { key: "READY", label: "Deposit settled, not started", tone: "teal" };
  if (approved === 1) return { key: "AWAITING_PAYMENT", label: "Approved, awaiting payment", tone: "teal" };
  return { key: "QUOTING", label: "Accepted: assessment and quote", tone: "teal" };
}
