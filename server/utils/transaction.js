// utils/transaction.js
import db from "../config/db.js";

/**
 * Runs `work(conn)` inside one database transaction on a single pooled
 * connection. Commits if `work` resolves, rolls back if it throws, and always
 * returns the connection to the pool.
 *
 * `conn` is a promise-style connection: `const [rows] = await conn.query(sql, params)`.
 *
 * Do not call external services (OpenAI, Xendit, email) inside `work`: that
 * holds a pooled connection and open row locks for the whole round trip. Do
 * the external call first, then open the transaction for the writes.
 */
export async function withTransaction(work) {
  const conn = await db.promise().getConnection();
  try {
    await conn.beginTransaction();
    const result = await work(conn);
    await conn.commit();
    return result;
  } catch (error) {
    try {
      await conn.rollback();
    } catch (rollbackError) {
      console.error("Transaction rollback failed:", rollbackError.code || rollbackError.message);
    }
    throw error;
  } finally {
    conn.release();
  }
}
