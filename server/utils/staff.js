// server/utils/staff.js
// Shop members (business rule 8, AGENTS.md section 20): an employee record
// (shop_employees) can be linked to the employee's own PixelPatch account
// (shop_employees.user_id) once they accept the owner's invite. A linked,
// active employee of a verified shop whose owner isn't suspended may use the
// staff portal: only the repairs assigned to them, and only the repair chats
// the owner handed to them.
//
// The account's role_id doesn't change (it stays a client account); access
// comes only from the membership row. One shop per account
// (shop_employees_user_unique).
import db from "../config/db.js";
import { isSuspended } from "./accountStatus.js";
import { maskContactInfo } from "./contactFilter.js";

const query = (sql, params = [], conn = null) =>
  (conn ?? db.promise()).query(sql, params).then(([rows]) => rows);

// "Juan · Technician", "Maria · Owner". Clients see first names only.
export const OWNER_ROLE_LABEL = "Owner";
export const senderLabel = (firstName, role) =>
  `${String(firstName ?? "").trim() || "Staff"} · ${String(role ?? "").trim() || "Staff"}`.slice(0, 150);

/**
 * The signed-in user's shop membership (joined and active), or null:
 * { employeeId, shopId, shopName, firstName, lastName, role, ownerId, shopVerified, ownerSuspended, usable }
 * `usable` = may use the staff portal right now.
 */
export async function membershipFor(userId, conn = null) {
  if (!userId) return null;
  const [row] = await query(
    `SELECT se.id AS employee_id, se.shop_id, se.first_name, se.last_name, se.role,
            s.name AS shop_name, s.user_id AS owner_id, s.is_verified
       FROM shop_employees se
       JOIN shops s ON s.id = se.shop_id
      WHERE se.user_id = ? AND se.is_active = 1
      LIMIT 1`,
    [userId],
    conn
  );
  if (!row) return null;
  const ownerSuspended = await isSuspended(row.owner_id);
  const shopVerified = Number(row.is_verified) === 1;
  return {
    employeeId: row.employee_id,
    shopId: row.shop_id,
    shopName: row.shop_name,
    firstName: row.first_name,
    lastName: row.last_name,
    role: row.role,
    ownerId: row.owner_id,
    shopVerified,
    ownerSuspended,
    usable: shopVerified && !ownerSuspended,
  };
}

/** Shop ids the user owns or works at (for "not your own shop" checks). */
export async function ownOrStaffShopIds(userId, conn = null) {
  if (!userId) return [];
  const rows = await query(
    `SELECT id AS shop_id FROM shops WHERE user_id = ?
     UNION
     SELECT shop_id FROM shop_employees WHERE user_id = ? AND is_active = 1`,
    [userId, userId],
    conn
  );
  return rows.map((row) => Number(row.shop_id));
}

/**
 * Adds a grey line to a chat ("TechFix Pro handed this chat to Juan
 * (Technician).") and returns the saved row, ready to broadcast.
 * `conn` may be a transaction connection.
 */
export async function addSystemMessage(chatId, actorUserId, text, conn = null) {
  const result = await query(
    `INSERT INTO chat_messages (chat_id, sender_id, sender_kind, sender_label, message_text, is_read, timestamp)
     VALUES (?, ?, 'SYSTEM', NULL, ?, 0, NOW())`,
    [chatId, actorUserId, maskContactInfo(text).text],
    conn
  );
  await query("UPDATE chats SET last_message_at = NOW() WHERE id = ?", [chatId], conn);
  const [row] = await query(
    `SELECT id, chat_id, sender_id, sender_kind, sender_label, message_text, timestamp
       FROM chat_messages WHERE id = ?`,
    [result.insertId],
    conn
  );
  return row;
}

/** The owner's first name, for "Maria (Owner) took over this chat." */
export async function ownerFirstName(shopId, conn = null) {
  const [row] = await query(
    "SELECT u.first_name FROM shops s JOIN users u ON u.id = s.user_id WHERE s.id = ?",
    [shopId],
    conn
  );
  return row?.first_name || "The owner";
}

/**
 * Hands chats back to the owner: every chat this employee has, or only the
 * chat of one repair (`requestId`). Used when the owner takes a chat back,
 * reassigns the repair, or removes the employee's access. Returns the system
 * messages added, for broadcasting.
 */
export async function returnChatsToOwner({ employeeId, requestId = null, actorUserId, shopId }, conn = null) {
  const chats = await query(
    `SELECT id FROM chats
      WHERE handler_employee_id = ? AND shop_id = ? ${requestId ? "AND request_id = ?" : ""}`,
    requestId ? [employeeId, shopId, requestId] : [employeeId, shopId],
    conn
  );
  if (!chats.length) return [];
  const owner = await ownerFirstName(shopId, conn);
  const messages = [];
  for (const chat of chats) {
    await query("UPDATE chats SET handler_employee_id = NULL, transferred_at = NULL WHERE id = ?", [chat.id], conn);
    messages.push(await addSystemMessage(chat.id, actorUserId, `${owner} (${OWNER_ROLE_LABEL}) is handling this chat again.`, conn));
  }
  return messages;
}
