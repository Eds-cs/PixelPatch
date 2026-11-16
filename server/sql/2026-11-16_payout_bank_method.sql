-- 2026-11-16: allow BANK as a shop payout method.
--
-- The business registration screen offers GCASH, MAYA and BANK, but the
-- shop_payouts.method enum only allowed CARD, GCASH and MAYA. Additive change:
-- CARD is kept for existing data. Registration now stores the payout account
-- it collects (it was previously validated and then discarded).

ALTER TABLE shop_payouts
  MODIFY method ENUM('CARD','GCASH','MAYA','BANK') NOT NULL;
