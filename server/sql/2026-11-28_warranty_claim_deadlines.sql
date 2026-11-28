-- 2026-11-28: warranty claim deadlines that skip the shop's closed days.
--
-- warranty_claims.reply_due: when the shop's 2 days to answer end, counting
-- only the days the shop is open (shops.days_from .. days_to), worked out
-- when the claim is made (server/utils/warrantyClaims.js replyDueFor). After
-- it, the client can ask PixelPatch to review.
--
-- Safe to re-run.

ALTER TABLE warranty_claims
  ADD COLUMN IF NOT EXISTS reply_due DATETIME NULL AFTER preferred_date;

-- Claims made before this column: 2 calendar days, as before.
UPDATE warranty_claims
SET reply_due = created_at + INTERVAL 2 DAY
WHERE reply_due IS NULL;
