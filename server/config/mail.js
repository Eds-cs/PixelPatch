import nodemailer from "nodemailer";
import dotenv from "dotenv";
dotenv.config();

// Sends through the app's own Gmail account (EMAIL_USER + a Gmail app
// password in EMAIL_PASS). Use a dedicated account, not a personal one.
export const transporter = nodemailer.createTransport({
  service: "gmail",
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS,
  },
});

/**
 * The sender every email uses: "PixelPatch" <EMAIL_USER>, so inboxes show
 * the app's name instead of the Gmail address. EMAIL_FROM_NAME overrides the
 * name (optional).
 */
export function mailFrom() {
  const name = String(process.env.EMAIL_FROM_NAME || "PixelPatch").replace(/["<>]/g, "").trim() || "PixelPatch";
  return `"${name}" <${process.env.EMAIL_USER}>`;
}
