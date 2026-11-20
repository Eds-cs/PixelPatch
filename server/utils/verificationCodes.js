// utils/verificationCodes.js
//
// Short-lived 6-digit codes, kept in memory: they are lost when the server
// restarts and are not shared between server processes. Only a hash of each
// code is stored.
import crypto from "crypto";

const hash = (code) => crypto.createHash("sha256").update(String(code)).digest();

export function createCodeStore({ ttlMs = 10 * 60 * 1000, cooldownMs = 60 * 1000, maxAttempts = 5 } = {}) {
  const records = new Map();

  const prune = () => {
    const now = Date.now();
    for (const [key, record] of records) {
      if (now > record.expiresAt) records.delete(key);
    }
  };

  return {
    /** New code for `key`, or { tooSoon: true } if one was sent within the cooldown. */
    issue(key, data = {}) {
      prune();
      const now = Date.now();
      const existing = records.get(key);
      if (existing && now - existing.sentAt < cooldownMs) return { tooSoon: true };
      const code = crypto.randomInt(0, 1_000_000).toString().padStart(6, "0");
      records.set(key, { codeHash: hash(code), expiresAt: now + ttlMs, sentAt: now, attempts: 0, data });
      return { code };
    },

    /**
     * Checks a code without using it up: "ok", "incorrect", "expired" or
     * "locked" (too many wrong guesses). Call consume() once everything that
     * depends on it has succeeded.
     */
    check(key, code, expectedData = {}) {
      const record = records.get(key);
      if (!record || Date.now() > record.expiresAt) {
        records.delete(key);
        return "expired";
      }
      if (record.attempts >= maxAttempts) {
        records.delete(key);
        return "locked";
      }
      const matchesData = Object.entries(expectedData).every(([k, v]) => record.data[k] === v);
      const matchesCode =
        /^\d{6}$/.test(String(code ?? "").trim()) &&
        crypto.timingSafeEqual(hash(String(code).trim()), record.codeHash);
      if (!matchesCode || !matchesData) {
        record.attempts += 1;
        return "incorrect";
      }
      return "ok";
    },

    consume(key) {
      records.delete(key);
    },

    cancel(key) {
      records.delete(key);
    },
  };
}

export const CODE_MESSAGES = {
  incorrect: "That code is incorrect.",
  expired: "That code has expired. Request a new one.",
  locked: "Too many incorrect attempts. Request a new code.",
};
