// utils/paymentTerms.js
// How a job is paid (AGENTS.md, "Payment terms"):
//   deposit_percent  0-100: share of the total paid ONLINE before work starts
//   cash             whether the balance (the rest) may be paid in cash
//
// A shop's defaults are on shops (accepts_cash, default_deposit_percent); each
// quotation keeps its own copy (deposit_percent, allow_cash). Keep this in
// sync with lib/paymentTerms.js.

/** A whole-number percentage 0-100 from a form value, or null. */
export function parseDepositPercent(value) {
  if (value === undefined || value === null || value === "") return null;
  const text = String(value).trim();
  if (!/^\d{1,3}$/.test(text)) return null;
  const n = Number(text);
  return n <= 100 ? n : null;
}

const truthy = (value) => value === true || value === "true" || value === 1 || value === "1";

/**
 * Checks a shop's default terms. Returns { error } or { terms: { acceptsCash, depositPercent } }.
 * A 100% deposit leaves no balance, so it can't be combined with cash.
 */
export function validateShopTerms({ accepts_cash, deposit_percent }) {
  const depositPercent = parseDepositPercent(deposit_percent);
  if (depositPercent === null) return { error: "Choose an online deposit from 0% to 100%." };
  const acceptsCash = truthy(accepts_cash);
  if (acceptsCash && depositPercent === 100) {
    return { error: "To accept cash, set the online deposit below 100% so there's a balance to pay in cash." };
  }
  return { terms: { acceptsCash, depositPercent } };
}

/**
 * Terms for one quotation, starting from the shop's defaults. The shop may
 * change the deposit, and turn cash off, but can't allow cash if the shop
 * doesn't accept it. Returns { error } or { terms: { depositPercent, allowCash } }.
 */
export function quotationTerms(shop, { depositPercent: depositIn, allowCash: allowIn } = {}) {
  const shopAcceptsCash = Number(shop.accepts_cash) === 1;
  const depositPercent =
    depositIn === undefined || depositIn === null || depositIn === ""
      ? Number(shop.default_deposit_percent)
      : parseDepositPercent(depositIn);
  if (depositPercent === null || !Number.isInteger(depositPercent)) {
    return { error: "Choose an online deposit from 0% to 100%." };
  }
  const allowCash = allowIn === undefined || allowIn === null ? shopAcceptsCash : truthy(allowIn);
  if (allowCash && !shopAcceptsCash) {
    return { error: "Your shop doesn't accept cash. Turn it on in Shop profile first." };
  }
  // No balance at 100%, so cash has nothing to cover.
  return { terms: { depositPercent, allowCash: allowCash && depositPercent < 100 } };
}
