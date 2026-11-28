-- 2026-11-28: repair cards in chat.
--
-- When a shop accepts a repair request (or a warranty repair is created),
-- PixelPatch posts a "Repair confirmed" card in that repair's chat: repair
-- number, device, services, delivery method and address, preferred date and
-- a View details button (server/utils/repairCards.js).
--
-- chat_messages.card holds the card as JSON on a SYSTEM message;
-- message_text keeps a plain line for inbox previews. Never put phone
-- numbers or emails in a card (AGENTS.md section 25).
--
-- Safe to re-run.

ALTER TABLE chat_messages
  ADD COLUMN IF NOT EXISTS card LONGTEXT NULL AFTER message_text;
