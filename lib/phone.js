// lib/phone.js
// Philippine mobile numbers. Keep in sync with server/utils/phone.js.

export const PHONE_MESSAGE = "Enter a valid Philippine mobile number (09XX XXX XXXX).";
export const PHONE_PLACEHOLDER = "09XX XXX XXXX";
// Longest accepted form: "+63 9XX XXX XXXX" with spaces.
export const PHONE_MAX_LENGTH = 16;

/**
 * Philippine mobile number as "09XXXXXXXXX", or null when it isn't one.
 * Accepts spaces, dashes, brackets and the +63 / 63 prefixes, but never more
 * or fewer digits than a real number.
 */
export function normalizePhone(value) {
  let digits = String(value ?? "").replace(/[\s\-().]/g, "");
  if (digits.startsWith("+63")) digits = `0${digits.slice(3)}`;
  else if (digits.startsWith("63") && digits.length === 12) digits = `0${digits.slice(2)}`;
  return /^09\d{9}$/.test(digits) ? digits : null;
}

/** Keeps only what a phone number can contain while typing. */
export const cleanPhoneInput = (value) =>
  String(value ?? "")
    .replace(/[^\d+\s\-()]/g, "")
    .slice(0, PHONE_MAX_LENGTH);

/**
 * Message to show under a phone field while typing: nothing until the number
 * is long enough to judge (or clearly wrong), then whether it's valid.
 */
export function phoneProblem(value) {
  const text = String(value ?? "").trim();
  if (!text) return null;
  const digits = text.replace(/\D/g, "");
  const local = digits.startsWith("63") ? `0${digits.slice(2)}` : digits;
  const tooLong = local.length > 11;
  const wrongStart = local.length >= 2 && !local.startsWith("09");
  if (tooLong || wrongStart) return PHONE_MESSAGE;
  if (local.length === 11 && !normalizePhone(text)) return PHONE_MESSAGE;
  return null;
}

/** "09171234567" -> "0917 123 4567" for display. */
export const formatPhone = (value) => {
  const n = normalizePhone(value);
  return n ? `${n.slice(0, 4)} ${n.slice(4, 7)} ${n.slice(7)}` : String(value ?? "");
};
