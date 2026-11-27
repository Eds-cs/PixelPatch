-- 2026-11-27: shop employee accounts, one chat per repair, chat transfer and
-- sender badges (AGENTS.md section 20 business rule 8, section 25).
--
-- shop_employees.user_id      the employee's own PixelPatch account, once they
--                             accept the invite (NULL = no account linked).
--                             UNIQUE: an account works for one shop only.
-- shop_employees.invite_email the email the owner invited (NULL = no open invite).
--                             The invite is accepted by signing in with an
--                             account that has this (verified) email.
-- shop_employees.invited_at, joined_at
--
-- chats.request_id            already exists: NULL = the client's General chat
--                             with the shop, set = that repair's own chat.
-- chats.handler_employee_id   the employee the owner handed the chat to
--                             (NULL = the owner has it). Only a repair chat,
--                             and only to the employee assigned to that repair.
-- chats.transferred_at
--
-- chat_messages.sender_kind   CLIENT, OWNER, STAFF or SYSTEM (a "handed this
--                             chat to ..." line). NULL on older messages.
-- chat_messages.sender_label  "Juan · Technician", saved with the message so it
--                             still shows correctly after someone leaves.
--
-- Existing chats become General chats: before this, request_id only pointed at
-- the client's latest repair at that shop.
--
-- Safe to re-run.

ALTER TABLE shop_employees
  ADD COLUMN IF NOT EXISTS user_id INT NULL DEFAULT NULL AFTER shop_id,
  ADD COLUMN IF NOT EXISTS invite_email VARCHAR(100) NULL DEFAULT NULL AFTER email,
  ADD COLUMN IF NOT EXISTS invited_at DATETIME NULL DEFAULT NULL AFTER invite_email,
  ADD COLUMN IF NOT EXISTS joined_at DATETIME NULL DEFAULT NULL AFTER invited_at,
  ADD UNIQUE INDEX IF NOT EXISTS shop_employees_user_unique (user_id),
  ADD INDEX IF NOT EXISTS shop_employees_invite_email (invite_email);

-- MariaDB has no "ADD CONSTRAINT IF NOT EXISTS" for foreign keys; add it once.
SET @fk := (SELECT COUNT(*) FROM information_schema.REFERENTIAL_CONSTRAINTS
             WHERE CONSTRAINT_SCHEMA = DATABASE() AND CONSTRAINT_NAME = 'shop_employees_user_fk');
SET @sql := IF(@fk = 0,
  'ALTER TABLE shop_employees ADD CONSTRAINT shop_employees_user_fk FOREIGN KEY (user_id) REFERENCES users (id)',
  'DO 0');
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- Was this migration already applied? (Decides the one-time UPDATE below.)
SET @first_run := (SELECT COUNT(*) = 0 FROM information_schema.COLUMNS
                    WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'chats' AND COLUMN_NAME = 'handler_employee_id');

ALTER TABLE chats
  ADD COLUMN IF NOT EXISTS handler_employee_id INT NULL DEFAULT NULL AFTER shop_id,
  ADD COLUMN IF NOT EXISTS transferred_at DATETIME NULL DEFAULT NULL AFTER handler_employee_id,
  ADD INDEX IF NOT EXISTS chats_client_shop_request (client_id, shop_id, request_id);

SET @fk := (SELECT COUNT(*) FROM information_schema.REFERENTIAL_CONSTRAINTS
             WHERE CONSTRAINT_SCHEMA = DATABASE() AND CONSTRAINT_NAME = 'chats_handler_fk');
SET @sql := IF(@fk = 0,
  'ALTER TABLE chats ADD CONSTRAINT chats_handler_fk FOREIGN KEY (handler_employee_id) REFERENCES shop_employees (id)',
  'DO 0');
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

ALTER TABLE chat_messages
  ADD COLUMN IF NOT EXISTS sender_kind ENUM('CLIENT','OWNER','STAFF','SYSTEM') NULL DEFAULT NULL AFTER sender_id,
  ADD COLUMN IF NOT EXISTS sender_label VARCHAR(150) NULL DEFAULT NULL AFTER sender_kind;

-- Existing chats become General chats. Only on the first run: afterwards a
-- chat with a request_id is a real repair chat.
UPDATE chats SET request_id = NULL WHERE @first_run = 1 AND request_id IS NOT NULL;
