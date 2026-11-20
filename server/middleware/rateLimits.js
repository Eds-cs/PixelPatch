// middleware/rateLimits.js
//
// Limits on repeated sign-in, sign-up and password-reset attempts, to slow
// down password guessing and abuse of the reset emails.
//
// Counts live in memory: they reset when the server restarts and are not
// shared between server processes.
//
// Limits are per client IP (req.ip). If the API runs behind a reverse proxy
// (nginx and similar), set Express's "trust proxy" setting so req.ip is the
// visitor's address rather than the proxy's; otherwise every visitor shares
// one limit.
import rateLimit from "express-rate-limit";

const MINUTE = 60 * 1000;

const tooMany = (message) => ({
  standardHeaders: "draft-7",
  legacyHeaders: false,
  // { error } is the shape the app's API client turns into the error message.
  handler: (req, res, next, options) => res.status(options.statusCode).json({ error: message }),
});

const emailOf = (req) => String(req.body?.email ?? "").trim().toLowerCase();

// Failed logins for one email from one IP. Successful logins don't count, so
// a typo or two never locks anyone out.
export const loginLimiter = rateLimit({
  windowMs: 15 * MINUTE,
  limit: 10,
  skipSuccessfulRequests: true,
  keyGenerator: (req) => `${req.ip}|${emailOf(req)}`,
  ...tooMany("Too many failed sign-in attempts. Please wait 15 minutes and try again."),
});

// All sign-in attempts from one IP, whatever the email, to stop one machine
// trying many accounts.
export const loginIpLimiter = rateLimit({
  windowMs: 15 * MINUTE,
  limit: 50,
  skipSuccessfulRequests: true,
  ...tooMany("Too many sign-in attempts from this network. Please wait 15 minutes and try again."),
});

export const registerLimiter = rateLimit({
  windowMs: 60 * MINUTE,
  limit: 10,
  ...tooMany("Too many accounts created from this network. Please try again later."),
});

// Covers both forgot-password and reset-password. The reset controller also
// limits each email to one code a minute and five guesses per code.
export const passwordResetLimiter = rateLimit({
  windowMs: 15 * MINUTE,
  limit: 15,
  ...tooMany("Too many password reset attempts. Please wait 15 minutes and try again."),
});
