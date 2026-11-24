-- 2026-11-24: payment terms (online deposit and cash) for shops and quotations.
--
-- PixelPatch takes no commission; shops pay a subscription. A job can be paid
-- partly online and partly in cash (AGENTS.md, "Business rules" and
-- "Payment terms"):
--   deposit_percent  share of the quotation total paid ONLINE before work
--                    starts (0-100). The rest is the balance, paid when the
--                    repair is done.
--   cash             whether that balance may be paid in cash.
--
-- shops.accepts_cash / shops.default_deposit_percent are the shop's defaults,
-- set at registration and in the business profile. Each quotation copies them
-- when it is created (the shop may change them for that job) and keeps its own
-- copy, so changing the defaults never changes a quotation already sent.
--
-- The defaults (100% online, no cash) are exactly how payment worked before
-- this change, so existing shops and quotations behave as before.
--
-- Safe to re-run.

ALTER TABLE shops
  ADD COLUMN IF NOT EXISTS accepts_cash TINYINT(1) NOT NULL DEFAULT 0 AFTER email,
  ADD COLUMN IF NOT EXISTS default_deposit_percent TINYINT UNSIGNED NOT NULL DEFAULT 100 AFTER accepts_cash;

ALTER TABLE request_quotations
  ADD COLUMN IF NOT EXISTS deposit_percent TINYINT UNSIGNED NOT NULL DEFAULT 100 AFTER estimated_cost,
  ADD COLUMN IF NOT EXISTS allow_cash TINYINT(1) NOT NULL DEFAULT 0 AFTER deposit_percent;

ALTER TABLE shops
  DROP CONSTRAINT IF EXISTS chk_shops_default_deposit_percent;
ALTER TABLE shops
  ADD CONSTRAINT chk_shops_default_deposit_percent CHECK (default_deposit_percent <= 100);

ALTER TABLE request_quotations
  DROP CONSTRAINT IF EXISTS chk_quotations_deposit_percent;
ALTER TABLE request_quotations
  ADD CONSTRAINT chk_quotations_deposit_percent CHECK (deposit_percent <= 100);
