// utils/phone.js
// Keep in sync with normalizePhone in app/(auth)/signup.jsx.

/**
 * Philippine mobile number as "09XXXXXXXXX", or null when it isn't one.
 * Accepts spaces, dashes, brackets and the +63 / 63 prefixes.
 */
export function normalizePhone(value) {
  let digits = String(value ?? "").replace(/[\s\-().]/g, "");
  if (digits.startsWith("+63")) digits = `0${digits.slice(3)}`;
  else if (digits.startsWith("63") && digits.length === 12) digits = `0${digits.slice(2)}`;
  return /^09\d{9}$/.test(digits) ? digits : null;
}

export const PHONE_MESSAGE = "Enter a valid Philippine mobile number (09XX XXX XXXX).";

/**
 * The ways one normalized number ("09XXXXXXXXX") may be stored, for matching
 * older rows saved before numbers were normalized.
 */
export function phoneVariants(normalized) {
  const rest = String(normalized).slice(1); // 9XXXXXXXXX
  return [normalized, `+63${rest}`, `63${rest}`, rest, `+63 ${rest}`];
}

/**
 * Is this business phone already used by another shop, or by another
 * person's account? The applicant's own personal number is allowed.
 * `db` may be the pool or a transaction connection.
 */
export async function businessPhoneTaken(db, normalized, userId) {
  const variants = phoneVariants(normalized);
  // The callback pool needs .promise(); a transaction connection is already promise-style.
  const isCallbackPool = typeof db.getConnection === "function" && typeof db.promise === "function";
  const run = (sql, params) => (isCallbackPool ? db.promise().query(sql, params) : db.query(sql, params));
  const [[row]] = await run(
    `SELECT
       (SELECT COUNT(*) FROM shops WHERE REPLACE(REPLACE(phone_number, ' ', ''), '-', '') IN (?)) AS shops,
       (SELECT COUNT(*) FROM users WHERE id <> ? AND REPLACE(REPLACE(phone, ' ', ''), '-', '') IN (?)) AS users`,
    [variants.map((v) => v.replace(/[\s-]/g, "")), userId, variants.map((v) => v.replace(/[\s-]/g, ""))]
  );
  return Number(row.shops) > 0 || Number(row.users) > 0;
}

export const PHONE_TAKEN_MESSAGE =
  "This number is already used by another shop or PixelPatch account. Use your shop's own number.";
