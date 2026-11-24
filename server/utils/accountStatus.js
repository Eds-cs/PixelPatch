// utils/accountStatus.js
// Suspended accounts (users.suspended_at, set from the admin portal) can't
// sign in, and their existing sessions stop working: authRequired, the chat
// socket and GET /auth/session all check isSuspended.
//
// Sign-in tokens last 7 days, so the check has to look at the database. To
// avoid a query on every request, each answer is cached for 30 seconds;
// suspending or reactivating clears that user's entry at once. With several
// server processes, another process notices within 30 seconds.
import db from "../config/db.js";

const TTL_MS = 30 * 1000;
const cache = new Map(); // userId -> { suspended, at }

export const SUSPENDED_CODE = "ACCOUNT_SUSPENDED";
export const SUSPENDED_MESSAGE =
  "This account has been suspended. Contact PixelPatch support through the Help page if you think this is a mistake.";

/**
 * true when the account is suspended. If the database can't answer, the
 * request is allowed (and logged) rather than locking everyone out.
 */
export async function isSuspended(userId) {
  const id = Number(userId);
  if (!Number.isSafeInteger(id) || id <= 0) return false;
  const hit = cache.get(id);
  if (hit && Date.now() - hit.at < TTL_MS) return hit.suspended;
  try {
    const [[row]] = await db.promise().query("SELECT suspended_at FROM users WHERE id = ? LIMIT 1", [id]);
    const suspended = Boolean(row?.suspended_at);
    cache.set(id, { suspended, at: Date.now() });
    if (cache.size > 10000) cache.delete(cache.keys().next().value);
    return suspended;
  } catch (err) {
    console.error("suspension check failed:", { code: err.code });
    return false;
  }
}

/** Call after changing users.suspended_at. */
export function forgetAccountStatus(userId) {
  cache.delete(Number(userId));
}
