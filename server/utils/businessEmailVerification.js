// utils/businessEmailVerification.js
// Proving the business email at registration (AGENTS.md, "Becoming a business").
//
//   POST /api/business-register/email-code   { email }        emails a 6-digit code
//   POST /api/business-register/email-verify { email, code }  returns a token
//   POST /api/business-register              ... business_email_token
//
// One code a minute per applicant and email (the store's cooldown), five wrong
// guesses per code, and a per-account rate limit on the route. The token is
// signed (not stored), names the user and the email, and lasts 2 hours, so a
// server restart between verifying and submitting doesn't lose it.
import crypto from "crypto";
import { createCodeStore } from "./verificationCodes.js";
import { normalizeEmail } from "./emailChecks.js";

export const emailCodes = createCodeStore({ ttlMs: 10 * 60 * 1000, cooldownMs: 60 * 1000, maxAttempts: 5 });
export const codeKey = (userId, email) => `${userId}|${normalizeEmail(email)}`;

const TOKEN_TTL_SECONDS = 2 * 60 * 60;
const tokenKey = () =>
  crypto.createHmac("sha256", String(process.env.JWT_SECRET)).update("business-email-verified").digest();
const sign = (payload) => crypto.createHmac("sha256", tokenKey()).update(payload).digest("base64url");

export function signEmailToken(userId, email) {
  const payload = `${userId}.${Buffer.from(normalizeEmail(email)).toString("base64url")}.${
    Math.floor(Date.now() / 1000) + TOKEN_TTL_SECONDS
  }`;
  return `${payload}.${sign(payload)}`;
}

/** true when `token` proves this user verified exactly this email recently. */
export function emailTokenValid(token, userId, email) {
  const [uid, emailB64, expires, sig] = String(token ?? "").split(".");
  if (!uid || !emailB64 || !expires || !sig) return false;
  const expected = Buffer.from(sign(`${uid}.${emailB64}.${expires}`));
  const given = Buffer.from(sig);
  if (expected.length !== given.length || !crypto.timingSafeEqual(expected, given)) return false;
  if (Number(expires) < Date.now() / 1000) return false;
  return (
    String(uid) === String(userId) &&
    Buffer.from(emailB64, "base64url").toString() === normalizeEmail(email)
  );
}
