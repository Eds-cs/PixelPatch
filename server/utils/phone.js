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
