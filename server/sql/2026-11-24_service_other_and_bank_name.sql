-- 2026-11-24: typed device for "Others" services, and the bank of a bank payout.
--
-- shop_services.custom_category: when category = 'OTHER', the device the shop
--   typed (e.g. "Game console"). NULL otherwise. Shops now choose from
--   Smartphone, Tablet, Laptop, PC (DESKTOP) and Others
--   (server/utils/serviceCategories.js); CONTROLLER and SMARTWATCH stay valid
--   for services that already use them.
-- shop_payouts.bank_name: the bank, when method = 'BANK'. NULL otherwise.
--
-- Safe to re-run.

ALTER TABLE shop_services
  ADD COLUMN IF NOT EXISTS custom_category VARCHAR(60) NULL DEFAULT NULL AFTER category;

ALTER TABLE shop_payouts
  ADD COLUMN IF NOT EXISTS bank_name VARCHAR(100) NULL DEFAULT NULL AFTER method;
