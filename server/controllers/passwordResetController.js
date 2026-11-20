// controllers/passwordResetController.js
//
// Forgot-password flow:
//   POST /api/auth/forgot-password { email }                 -> emails a 6-digit code
//   POST /api/auth/reset-password  { email, code, password } -> sets the new password
//
// Codes live in memory, so they are lost when the server restarts and are not
// shared between server processes. There is no table for them; storing them in
// the database would need a schema change.
//
// Both endpoints answer the same way whether or not an account exists, so they
// cannot be used to find out which emails are registered.
import crypto from "crypto";
import db from "../config/db.js";
import { transporter } from "../config/mail.js";
import { hashPassword } from "../utils/hash.js";

const CODE_TTL_MS = 10 * 60 * 1000;
const RESEND_COOLDOWN_MS = 60 * 1000;
const MAX_ATTEMPTS = 5;
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

// email -> { userId, codeHash, expiresAt, sentAt, attempts }
// userId is null when no account exists; that entry holds a code nobody was
// sent, so it can never be used, but it behaves the same as a real one.
const resetCodes = new Map();

const normalizeEmail = (value) => String(value ?? "").trim().toLowerCase();
const hashCode = (code) => crypto.createHash("sha256").update(code).digest();
const newCode = () => crypto.randomInt(0, 1_000_000).toString().padStart(6, "0");

const pruneExpired = () => {
  const now = Date.now();
  for (const [email, record] of resetCodes) {
    if (now > record.expiresAt) resetCodes.delete(email);
  }
};

export const requestPasswordReset = async (req, res) => {
  const email = normalizeEmail(req.body?.email);
  if (!EMAIL_RE.test(email)) {
    return res.status(400).json({ error: "Please enter a valid email address." });
  }

  pruneExpired();
  const existing = resetCodes.get(email);
  if (existing && Date.now() - existing.sentAt < RESEND_COOLDOWN_MS) {
    return res
      .status(429)
      .json({ error: "Please wait a minute before requesting another code." });
  }

  try {
    const [rows] = await db
      .promise()
      .query("SELECT id, email, first_name FROM users WHERE email = ? LIMIT 1", [email]);
    const user = rows[0];

    const code = newCode();
    resetCodes.set(email, {
      userId: user ? user.id : null,
      codeHash: hashCode(code),
      expiresAt: Date.now() + CODE_TTL_MS,
      sentAt: Date.now(),
      attempts: 0,
    });

    if (user) {
      try {
        await transporter.sendMail({
          from: process.env.EMAIL_USER,
          to: user.email,
          subject: "Your PixelPatch password reset code",
          text:
            `Hi ${user.first_name || "there"},\n\n` +
            `Your PixelPatch password reset code is: ${code}\n\n` +
            "It expires in 10 minutes. If you didn't ask to reset your password, " +
            "you can ignore this email and your password will stay the same.",
        });
      } catch (mailErr) {
        resetCodes.delete(email);
        console.error("PASSWORD RESET MAIL ERROR:", mailErr.code || mailErr.message);
        return res
          .status(500)
          .json({ error: "We couldn't send the reset email. Please try again later." });
      }
    }

    return res.json({
      message: "If an account exists for that email, we've sent it a 6-digit code.",
    });
  } catch (err) {
    console.error("PASSWORD RESET REQUEST ERROR:", err.code || err.message);
    return res.status(500).json({ error: "Something went wrong. Please try again." });
  }
};

export const resetPassword = async (req, res) => {
  const email = normalizeEmail(req.body?.email);
  const code = String(req.body?.code ?? "").trim();
  const { password } = req.body ?? {};

  if (typeof password !== "string" || password.length < 8) {
    return res.status(400).json({ error: "Password must be at least 8 characters." });
  }

  const record = resetCodes.get(email);
  if (!record || Date.now() > record.expiresAt) {
    resetCodes.delete(email);
    return res
      .status(400)
      .json({ error: "That code has expired or was never sent. Request a new one." });
  }

  if (record.attempts >= MAX_ATTEMPTS) {
    resetCodes.delete(email);
    return res
      .status(400)
      .json({ error: "Too many incorrect attempts. Request a new code." });
  }

  const matches =
    /^\d{6}$/.test(code) && crypto.timingSafeEqual(hashCode(code), record.codeHash);
  if (!matches || !record.userId) {
    record.attempts += 1;
    return res.status(400).json({ error: "That code is incorrect." });
  }

  // Remove it first so the same code cannot be used twice.
  resetCodes.delete(email);

  try {
    const passwordHash = await hashPassword(password);
    const [result] = await db
      .promise()
      .query("UPDATE users SET password_hash = ? WHERE id = ?", [passwordHash, record.userId]);

    if (result.affectedRows === 0) {
      return res
        .status(400)
        .json({ error: "That code has expired or was never sent. Request a new one." });
    }

    return res.json({ message: "Your password has been reset." });
  } catch (err) {
    console.error("PASSWORD RESET ERROR:", err.code || err.message);
    return res.status(500).json({ error: "Something went wrong. Please try again." });
  }
};
