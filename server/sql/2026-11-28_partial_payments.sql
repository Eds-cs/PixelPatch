-- 2026-11-28: deposit and balance payments (AGENTS.md "Payment terms").
--
-- A job is paid in up to two parts, following its quotation's terms
-- (request_quotations.deposit_percent, allow_cash):
--   DEPOSIT  deposit_percent of the total, online, before work starts
--   BALANCE  the rest, before the repair is marked completed: online, or in
--            cash when the quotation allows it (confirmed in the app)
--   FULL     a 100% deposit: the whole amount online, before work starts
--
-- payments gets one row per part (payments.request_id was never unique):
--   kind          which part the row pays (existing rows are all FULL)
--   gateway       CASH for a cash balance confirmed by the shop
--   gateway_ref   the Xendit invoice id, so an unpaid online balance link can
--                 be expired when the shop confirms cash instead
--   confirmed_by  users.id of who confirmed a cash payment (no FK)
--
-- service_requests.deposit_paid_at: when nothing more had to be paid before
-- work could start (the deposit or full payment was verified, or the client
-- approved a quotation with a 0% deposit). Assignment and starting the repair
-- require it. payment_status stays 'PAID' = paid in full.
--
-- Verified before writing: every existing payment is a single 100% Xendit
-- payment, and no request has more than one payments row. Safe to re-run.

ALTER TABLE payments
  ADD COLUMN IF NOT EXISTS kind ENUM('FULL','DEPOSIT','BALANCE') NOT NULL DEFAULT 'FULL' AFTER shop_id,
  MODIFY COLUMN gateway ENUM('XENDIT','CASH') DEFAULT 'XENDIT',
  ADD COLUMN IF NOT EXISTS gateway_ref VARCHAR(100) NULL AFTER payment_link,
  ADD COLUMN IF NOT EXISTS confirmed_by INT NULL AFTER gateway_ref;

ALTER TABLE service_requests
  ADD COLUMN IF NOT EXISTS deposit_paid_at DATETIME NULL AFTER payment_status;

-- Requests already paid in full had their (100%) deposit paid then.
UPDATE service_requests sr
SET sr.deposit_paid_at = COALESCE(
  (SELECT MIN(p.paid_at) FROM payments p WHERE p.request_id = sr.id AND p.status = 'PAID'),
  sr.updated_at
)
WHERE sr.payment_status = 'PAID' AND sr.deposit_paid_at IS NULL;

-- Approved quotations with a 0% deposit had nothing to pay upfront.
UPDATE service_requests sr
JOIN request_quotations rq ON rq.request_id = sr.id
SET sr.deposit_paid_at = sr.updated_at
WHERE sr.deposit_paid_at IS NULL
  AND sr.decision = 'ACCEPTED'
  AND sr.client_approved = 1
  AND rq.deposit_percent = 0
  AND rq.status <> 'CANCELLED';
