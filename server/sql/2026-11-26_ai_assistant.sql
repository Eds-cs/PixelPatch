-- 2026-11-26: AI assistant improvements (server/controllers/aiController.js).
--
-- ai_messages.feedback        a client's thumbs up/down on an assistant reply
--                             (NULL = no feedback). Lets weak answers be found.
-- ai_messages.recommendation  JSON stored on an assistant reply that recommended
--                             shops: { shop_ids, shop_names, shop_notes,
--                             device_type, issue_category, summary }. The shop cards are rebuilt from the live
--                             database when the chat is reopened, so a shop that
--                             stops being verified disappears from old chats.
--
-- ai_usage  one row per message sent to OpenAI: the model, token counts, and
--           whether it worked. Used for the per-user limits (20 messages per
--           10 minutes, 100 a day) and for tracking cost. Kept when a chat is
--           deleted (no message text is stored here), so deleting chats does
--           not reset the daily limit. conversation_id has no FK for the same
--           reason.
--
-- Older chats used a '[SYSTEM] Recommended shops' marker row in ai_messages;
-- those rows are removed here, since the marker is replaced by
-- ai_messages.recommendation.
--
-- Safe to re-run.

ALTER TABLE ai_messages
  ADD COLUMN IF NOT EXISTS feedback ENUM('UP','DOWN') NULL DEFAULT NULL AFTER sender,
  ADD COLUMN IF NOT EXISTS recommendation LONGTEXT NULL DEFAULT NULL AFTER feedback;

CREATE TABLE IF NOT EXISTS ai_usage (
  id INT NOT NULL AUTO_INCREMENT,
  user_id INT NOT NULL,
  conversation_id INT NULL DEFAULT NULL,
  model VARCHAR(50) NOT NULL,
  prompt_tokens INT NULL DEFAULT NULL,
  completion_tokens INT NULL DEFAULT NULL,
  status ENUM('PENDING','OK','FAILED') NOT NULL DEFAULT 'PENDING',
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY ai_usage_user_time (user_id, created_at),
  CONSTRAINT ai_usage_user_fk FOREIGN KEY (user_id) REFERENCES users (id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

DELETE FROM ai_messages WHERE message_text = '[SYSTEM] Recommended shops';
