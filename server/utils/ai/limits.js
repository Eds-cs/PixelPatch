// server/utils/ai/limits.js
// Per-user limits on assistant messages (brief B7), counted from ai_usage so
// they survive restarts and deleting chats doesn't reset them.
//   * 20 messages per 10 minutes
//   * 100 messages per day (resets at midnight, database time = Philippine time)
// Failed OpenAI calls don't count.
import db from "../../config/db.js";

export const WINDOW_LIMIT = 20;
export const WINDOW_MINUTES = 10;
export const DAILY_LIMIT = 100;

/**
 * { ok: true, remainingToday } or
 * { ok: false, code: "AI_DAILY_LIMIT" | "AI_RATE_LIMIT", retryAfterSeconds }
 */
export async function checkLimits(userId) {
  const [[row]] = await db.promise().query(
    `SELECT
        COALESCE(SUM(created_at >= CURDATE()), 0) AS today,
        COALESCE(SUM(created_at >= NOW() - INTERVAL ${WINDOW_MINUTES} MINUTE), 0) AS recent,
        TIMESTAMPDIFF(SECOND, NOW(),
          MIN(IF(created_at >= NOW() - INTERVAL ${WINDOW_MINUTES} MINUTE, created_at, NULL)) + INTERVAL ${WINDOW_MINUTES} MINUTE) AS window_frees_in,
        TIMESTAMPDIFF(SECOND, NOW(), CURDATE() + INTERVAL 1 DAY) AS day_ends_in
       FROM ai_usage
      WHERE user_id = ? AND status <> 'FAILED'
        AND created_at >= LEAST(CURDATE(), NOW() - INTERVAL ${WINDOW_MINUTES} MINUTE)`,
    [userId]
  );
  const today = Number(row.today);
  const recent = Number(row.recent);
  if (today >= DAILY_LIMIT) {
    return { ok: false, code: "AI_DAILY_LIMIT", retryAfterSeconds: Math.max(60, Number(row.day_ends_in) || 0) };
  }
  if (recent >= WINDOW_LIMIT) {
    return { ok: false, code: "AI_RATE_LIMIT", retryAfterSeconds: Math.max(30, Number(row.window_frees_in) || 60) };
  }
  return { ok: true, remainingToday: DAILY_LIMIT - today };
}

/** Records a message about to be sent to OpenAI. Returns the ai_usage id. */
export async function startUsage(userId, conversationId, model) {
  const [result] = await db.promise().query(
    "INSERT INTO ai_usage (user_id, conversation_id, model, status, created_at) VALUES (?, ?, ?, 'PENDING', NOW())",
    [userId, conversationId || null, model]
  );
  return result.insertId;
}

/** Saves the outcome and token counts, and logs them (no message text). */
export async function finishUsage(usageId, { ok, usage, conversationId, userId, model }) {
  const prompt = usage?.prompt_tokens ?? null;
  const completion = usage?.completion_tokens ?? null;
  console.log(`AI usage: user=${userId} model=${model} status=${ok ? "OK" : "FAILED"} prompt_tokens=${prompt ?? "-"} completion_tokens=${completion ?? "-"}`);
  try {
    await db.promise().query(
      "UPDATE ai_usage SET status = ?, prompt_tokens = ?, completion_tokens = ?, conversation_id = COALESCE(?, conversation_id) WHERE id = ?",
      [ok ? "OK" : "FAILED", prompt, completion, conversationId || null, usageId]
    );
  } catch (err) {
    console.error("AI usage update failed:", err.code || err.message);
  }
}
