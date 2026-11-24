// controllers/signupVerificationController.js
//
// Signup is two steps, so no account exists until its contact details are
// proven:
//   1. POST /api/auth/signup/start { email, phone } emails a 6-digit code (and
//      texts one to the phone when SMS is configured).
//   2. POST /api/auth/register with the form and the code(s) creates the
//      account (authController.register calls verifySignupCodes).
import db from "../config/db.js";
import { mailFrom, transporter } from "../config/mail.js";
import { createCodeStore, CODE_MESSAGES } from "../utils/verificationCodes.js";
import { normalizePhone, PHONE_MESSAGE } from "../utils/phone.js";
import { sendSms, smsEnabled } from "../utils/sms.js";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const emailCodes = createCodeStore();
const phoneCodes = createCodeStore();

export const normalizeEmail = (value) => String(value ?? "").trim().toLowerCase();

export const startSignup = async (req, res) => {
  const email = normalizeEmail(req.body?.email);
  const phone = normalizePhone(req.body?.phone);
  if (!EMAIL_RE.test(email)) {
    return res.status(400).json({ error: "Please enter a valid email address." });
  }
  if (!phone) return res.status(400).json({ error: PHONE_MESSAGE });

  try {
    const [[existing]] = await db
      .promise()
      .query("SELECT id FROM users WHERE email = ? LIMIT 1", [email]);
    if (existing) {
      return res.status(409).json({ error: "An account with this email already exists" });
    }

    // The email code remembers the phone it was requested with, so the same
    // details have to be submitted when the account is created.
    const emailCode = emailCodes.issue(email, { phone });
    if (emailCode.tooSoon) {
      return res
        .status(429)
        .json({ error: "Please wait a minute before requesting another code." });
    }

    try {
      await transporter.sendMail({
        from: mailFrom(),
        to: email,
        subject: "Your PixelPatch verification code",
        text:
          `Your PixelPatch verification code is: ${emailCode.code}\n\n` +
          "It expires in 10 minutes. If you didn't try to sign up for PixelPatch, " +
          "you can ignore this email.",
      });
    } catch (mailErr) {
      emailCodes.cancel(email);
      console.error("SIGNUP MAIL ERROR:", mailErr.code || mailErr.message);
      return res
        .status(500)
        .json({ error: "We couldn't send the verification email. Please try again later." });
    }

    const verifyPhone = smsEnabled();
    if (verifyPhone) {
      const phoneCode = phoneCodes.issue(phone, { email });
      if (!phoneCode.tooSoon) {
        try {
          await sendSms(phone, `Your PixelPatch verification code is ${phoneCode.code}. It expires in 10 minutes.`);
        } catch (smsErr) {
          phoneCodes.cancel(phone);
          console.error("SIGNUP SMS ERROR:", smsErr.message);
          return res
            .status(500)
            .json({ error: "We couldn't text your phone. Check the number and try again." });
        }
      }
    }

    return res.json({
      message: verifyPhone
        ? "We sent a 6-digit code to your email and another to your phone."
        : "We sent a 6-digit code to your email.",
      phone_verification: verifyPhone,
    });
  } catch (err) {
    console.error("SIGNUP START ERROR:", err.code || err.message);
    return res.status(500).json({ error: "Something went wrong. Please try again." });
  }
};

/**
 * Checks the signup code(s) for these details without using them up.
 * Returns null when they are valid, otherwise { field, error }.
 */
export function verifySignupCodes({ email, phone, emailCode, phoneCode }) {
  const emailResult = emailCodes.check(email, emailCode, { phone });
  if (emailResult !== "ok") {
    return {
      field: "email_code",
      error:
        emailResult === "incorrect"
          ? "That email code is incorrect, or your details changed since it was sent."
          : CODE_MESSAGES[emailResult],
    };
  }
  if (smsEnabled()) {
    const phoneResult = phoneCodes.check(phone, phoneCode, { email });
    if (phoneResult !== "ok") {
      return { field: "phone_code", error: CODE_MESSAGES[phoneResult].replace("That code", "That phone code") };
    }
  }
  return null;
}

/** Uses up the signup code(s) once the account exists. */
export function consumeSignupCodes({ email, phone }) {
  emailCodes.consume(email);
  phoneCodes.consume(phone);
}
