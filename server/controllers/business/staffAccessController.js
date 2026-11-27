// controllers/business/staffAccessController.js
// The owner's side of shop members and repair chats (businessShopRequired,
// so req.shopId is the owner's shop). See utils/staff.js.
//
//   POST   /api/business/employees/:id/invite         { email }  invite to sign in
//   DELETE /api/business/employees/:id/invite                    cancel the invite
//   POST   /api/business/employees/:id/remove-access             unlink their account now
//   POST   /api/business/repairs/:id/chat                        open (or create) the repair's chat
//   POST   /api/business/chats/:id/transfer                      hand it to the assigned employee
//   POST   /api/business/chats/:id/take-back                     the owner has it again
import db from "../../config/db.js";
import { transporter, mailFrom } from "../../config/mail.js";
import { withTransaction } from "../../utils/transaction.js";
import { addSystemMessage, returnChatsToOwner, ownerFirstName, OWNER_ROLE_LABEL } from "../../utils/staff.js";
import { findOrCreateChat } from "../chatController.js";
import { broadcastMessage, broadcastChatUpdate } from "../../sockets/chatSocket.js";

const query = (sql, params = [], conn = null) =>
  (conn ?? db.promise()).query(sql, params).then(([rows]) => rows);
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const positiveId = (value) => {
  const id = Number(value);
  return Number.isInteger(id) && id > 0 ? id : null;
};

async function employeeOfShop(employeeId, shopId) {
  const [row] = await query(
    "SELECT id, first_name, role, user_id, invite_email, is_active FROM shop_employees WHERE id = ? AND shop_id = ?",
    [employeeId, shopId]
  );
  return row ?? null;
}

// Best effort: a failed email never undoes the invite.
async function sendInviteEmail({ to, shopName, role }) {
  if (!process.env.EMAIL_USER) return false;
  try {
    await transporter.sendMail({
      from: mailFrom(),
      to,
      subject: `${shopName} invited you to PixelPatch`,
      text:
        `${shopName} invited you to join their shop on PixelPatch as ${role}.\n\n` +
        `Sign in to PixelPatch with this email address (${to}), or create a free account with it, ` +
        `and accept the invite from the banner at the top of the app.\n\n` +
        `As a shop member you'll see the repairs assigned to you and the chats your shop hands to you.\n\n` +
        `If you weren't expecting this, you can ignore this email.`,
    });
    return true;
  } catch (err) {
    console.error("staff invite email failed:", err.code || err.message);
    return false;
  }
}

/* POST /api/business/employees/:id/invite { email } */
export const inviteEmployee = async (req, res) => {
  const employeeId = positiveId(req.params.id);
  const email = String(req.body?.email ?? "").trim().toLowerCase();
  if (!employeeId) return res.status(404).json({ message: "Employee not found" });
  if (!email || email.length > 100 || !EMAIL_RE.test(email)) {
    return res.status(400).json({ message: "Enter the email address the employee signs in with.", field: "email" });
  }
  try {
    const employee = await employeeOfShop(employeeId, req.shopId);
    if (!employee) return res.status(404).json({ message: "Employee not found" });
    if (Number(employee.is_active) !== 1) return res.status(409).json({ message: "Reactivate this employee before inviting them." });
    if (employee.user_id) return res.status(409).json({ message: "This employee has already joined with an account." });

    const [shop] = await query(
      "SELECT s.name, owner.email AS owner_email FROM shops s JOIN users owner ON owner.id = s.user_id WHERE s.id = ?",
      [req.shopId]
    );
    if (String(shop.owner_email).trim().toLowerCase() === email) {
      return res.status(400).json({ message: "That's your own email. Invite the employee's email instead.", field: "email" });
    }
    // If the account already exists, it must be able to join (utils/staff.js).
    const [account] = await query("SELECT id, role_id FROM users WHERE LOWER(email) = ? LIMIT 1", [email]);
    if (account) {
      if (Number(account.role_id) !== 1) {
        return res.status(409).json({ message: "That email belongs to a business or admin account, which can't join a shop as staff.", field: "email" });
      }
      const [member] = await query("SELECT shop_id FROM shop_employees WHERE user_id = ? AND is_active = 1 LIMIT 1", [account.id]);
      if (member) {
        return res.status(409).json({ message: "That account already works at a shop on PixelPatch.", field: "email" });
      }
    }

    await query(
      "UPDATE shop_employees SET invite_email = ?, invited_at = NOW(), updated_at = NOW() WHERE id = ? AND shop_id = ?",
      [email, employeeId, req.shopId]
    );
    const emailed = await sendInviteEmail({ to: email, shopName: shop.name, role: employee.role });
    return res.json({ success: true, emailed });
  } catch (err) {
    console.error("inviteEmployee:", err.code || err.message);
    return res.status(500).json({ message: "Couldn't send the invite." });
  }
};

/* DELETE /api/business/employees/:id/invite */
export const cancelInvite = async (req, res) => {
  const employeeId = positiveId(req.params.id);
  if (!employeeId) return res.status(404).json({ message: "Employee not found" });
  try {
    const [result] = await db.promise().query(
      "UPDATE shop_employees SET invite_email = NULL, invited_at = NULL, updated_at = NOW() WHERE id = ? AND shop_id = ? AND user_id IS NULL",
      [employeeId, req.shopId]
    );
    if (!result.affectedRows) return res.status(404).json({ message: "No open invite for this employee." });
    return res.json({ success: true });
  } catch (err) {
    console.error("cancelInvite:", err.code || err.message);
    return res.status(500).json({ message: "Couldn't cancel the invite." });
  }
};

/**
 * Unlinks an employee's account (they can't use the staff portal any more)
 * and hands their chats back to the owner. Their repairs stay assigned to
 * the record. Also used by deactivateEmployee. Returns the system messages.
 */
export async function unlinkEmployeeAccount({ employeeId, shopId, actorUserId }, conn) {
  const messages = await returnChatsToOwner({ employeeId, shopId, actorUserId }, conn);
  await query(
    `UPDATE shop_employees
        SET user_id = NULL, joined_at = NULL, invite_email = NULL, invited_at = NULL, updated_at = NOW()
      WHERE id = ? AND shop_id = ?`,
    [employeeId, shopId],
    conn
  );
  return messages;
}

/* POST /api/business/employees/:id/remove-access
   Works even with unfinished repairs: they stay under this employee's name
   so the owner can finish them (deactivating still needs them finished). */
export const removeEmployeeAccess = async (req, res) => {
  const employeeId = positiveId(req.params.id);
  if (!employeeId) return res.status(404).json({ message: "Employee not found" });
  try {
    const employee = await employeeOfShop(employeeId, req.shopId);
    if (!employee) return res.status(404).json({ message: "Employee not found" });
    if (!employee.user_id && !employee.invite_email) return res.status(409).json({ message: "This employee has no account or invite." });
    const messages = await withTransaction((conn) =>
      unlinkEmployeeAccount({ employeeId, shopId: req.shopId, actorUserId: req.user.id }, conn)
    );
    messages.forEach((message) => { broadcastMessage(message); broadcastChatUpdate(message.chat_id); });
    return res.json({ success: true, chats_returned: messages.length });
  } catch (err) {
    console.error("removeEmployeeAccess:", err.code || err.message);
    return res.status(500).json({ message: "Couldn't remove this employee's access." });
  }
};

/* POST /api/business/repairs/:id/chat -> { chat }
   The owner's "Message client" on a repair: that repair's own chat. */
export const openRepairChat = async (req, res) => {
  const requestId = positiveId(req.params.id);
  if (!requestId) return res.status(404).json({ message: "Repair not found" });
  try {
    const [request] = await query("SELECT client_id FROM service_requests WHERE id = ? AND shop_id = ?", [requestId, req.shopId]);
    if (!request) return res.status(404).json({ message: "Repair not found" });
    const chat = await findOrCreateChat({ clientId: request.client_id, shopId: req.shopId, requestId });
    return res.json({ chat });
  } catch (err) {
    console.error("openRepairChat:", err.code || err.message);
    return res.status(500).json({ message: "Couldn't open the chat." });
  }
};

async function shopChat(chatId, shopId) {
  const [chat] = await query(
    "SELECT id, request_id, handler_employee_id FROM chats WHERE id = ? AND shop_id = ?",
    [chatId, shopId]
  );
  return chat ?? null;
}

/* POST /api/business/chats/:id/transfer
   Hands a repair chat to the employee assigned to that repair, once they've
   joined with an account. The owner can then only read it. */
export const transferChat = async (req, res) => {
  const chatId = positiveId(req.params.id);
  if (!chatId) return res.status(404).json({ message: "Conversation not found" });
  try {
    const chat = await shopChat(chatId, req.shopId);
    if (!chat) return res.status(404).json({ message: "Conversation not found" });
    if (!chat.request_id) {
      return res.status(409).json({ message: "Only a repair's chat can be handed to an employee. You answer General chats." });
    }
    const [assigned] = await query(
      `SELECT se.id, se.first_name, se.role, se.user_id, se.is_active
         FROM request_assignments ra JOIN shop_employees se ON se.id = ra.employee_id
        WHERE ra.request_id = ? AND se.shop_id = ?`,
      [chat.request_id, req.shopId]
    );
    if (!assigned) return res.status(409).json({ message: "Assign an employee to this repair first." });
    if (!assigned.user_id || Number(assigned.is_active) !== 1) {
      return res.status(409).json({ message: `${assigned.first_name} hasn't joined with an account yet. Invite them from Employees.` });
    }
    if (Number(chat.handler_employee_id) === Number(assigned.id)) {
      return res.status(409).json({ message: `${assigned.first_name} already has this chat.` });
    }

    const [shop] = await query("SELECT name FROM shops WHERE id = ?", [req.shopId]);
    const message = await withTransaction(async (conn) => {
      await query("UPDATE chats SET handler_employee_id = ?, transferred_at = NOW() WHERE id = ?", [assigned.id, chatId], conn);
      return addSystemMessage(chatId, req.user.id, `${shop.name} handed this chat to ${assigned.first_name} (${assigned.role}).`, conn);
    });
    broadcastMessage(message);
    broadcastChatUpdate(chatId);
    return res.json({ success: true });
  } catch (err) {
    console.error("transferChat:", err.code || err.message);
    return res.status(500).json({ message: "Couldn't hand over the chat." });
  }
};

/* POST /api/business/chats/:id/take-back */
export const takeBackChat = async (req, res) => {
  const chatId = positiveId(req.params.id);
  if (!chatId) return res.status(404).json({ message: "Conversation not found" });
  try {
    const chat = await shopChat(chatId, req.shopId);
    if (!chat) return res.status(404).json({ message: "Conversation not found" });
    if (!chat.handler_employee_id) return res.status(409).json({ message: "You already have this chat." });

    const owner = await ownerFirstName(req.shopId);
    const message = await withTransaction(async (conn) => {
      await query("UPDATE chats SET handler_employee_id = NULL, transferred_at = NULL WHERE id = ?", [chatId], conn);
      return addSystemMessage(chatId, req.user.id, `${owner} (${OWNER_ROLE_LABEL}) took over this chat.`, conn);
    });
    broadcastMessage(message);
    broadcastChatUpdate(chatId);
    return res.json({ success: true });
  } catch (err) {
    console.error("takeBackChat:", err.code || err.message);
    return res.status(500).json({ message: "Couldn't take the chat back." });
  }
};
