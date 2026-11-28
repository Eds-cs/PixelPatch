// lib/paymentTerms.js
// How a job is paid: an online deposit (0-100% of the total) before work
// starts, and the balance when the repair is done, online or (if allowed) in
// cash. Keep the rules in sync with server/utils/paymentTerms.js; AGENTS.md
// "Payment terms" describes them.

export const DEPOSIT_PRESETS = [0, 30, 50, 100];

const peso = (value) =>
  "₱" + Number(value || 0).toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 2 });

/** A whole-number percentage 0-100 from text, or null. */
export function parseDepositPercent(value) {
  const text = String(value ?? "").trim();
  if (!/^\d{1,3}$/.test(text)) return null;
  const n = Number(text);
  return n <= 100 ? n : null;
}

/** Shop-level problem with these defaults, or null. Mirrors validateShopTerms. */
export function shopTermsProblem({ acceptsCash, depositPercent }) {
  const pct = parseDepositPercent(depositPercent);
  if (pct === null) return "Choose an online deposit from 0% to 100%.";
  if (acceptsCash && pct === 100) {
    return "To accept cash, set the online deposit below 100% so there's a balance to pay in cash.";
  }
  return null;
}

/** Short label for a shop's defaults, e.g. "Online · 30% deposit · Cash accepted". */
export function shopTermsLabel(shop) {
  if (!shop) return "";
  const pct = Number(shop.default_deposit_percent ?? 100);
  const cash = Number(shop.accepts_cash) === 1;
  const deposit = pct === 100 ? "Pay in full online upfront" : pct === 0 ? "No upfront deposit" : `${pct}% online deposit`;
  return cash ? `${deposit} · Cash accepted` : `${deposit} · Online payment only`;
}

/**
 * The amounts for a quotation: { total, depositPercent, deposit, balance, allowCash }.
 * Older quotations without terms count as 100% online, as they were paid.
 */
export function quotationAmounts(quotation) {
  const total = Number(quotation?.estimated_cost ?? quotation?.total_amount ?? 0) || 0;
  const depositPercent = Number(quotation?.deposit_percent ?? 100);
  // Whole pesos, like the server (utils/paymentPlan.js quotationAmountsCents).
  const deposit = depositPercent >= 100 ? total : Math.round((total * depositPercent) / 100);
  const balance = Math.round((total - deposit) * 100) / 100;
  const allowCash = Number(quotation?.allow_cash) === 1 && balance > 0;
  return { total, depositPercent, deposit, balance, allowCash };
}

/** One or two plain sentences describing how the client pays. */
export function quotationTermsText(quotation) {
  const { depositPercent, deposit, balance, allowCash } = quotationAmounts(quotation);
  if (depositPercent === 100) return `Pay ${peso(deposit)} online before work starts.`;
  const later = allowCash
    ? `${peso(balance)} when the repair is done, online or in cash.`
    : `${peso(balance)} online when the repair is done.`;
  if (depositPercent === 0) return `Nothing to pay upfront. Pay ${later}`;
  return `Pay a ${depositPercent}% deposit of ${peso(deposit)} online before work starts, then ${later}`;
}

/** What approving costs upfront, for the Approve button: "₱1,200 due now" or "nothing due now". */
export function quotationDueNow(quotation) {
  const { deposit } = quotationAmounts(quotation);
  return deposit > 0 ? `${peso(deposit)} due now` : "nothing due now";
}
