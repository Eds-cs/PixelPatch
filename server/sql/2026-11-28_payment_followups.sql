-- 2026-11-28: when the client approved the quotation.
--
-- service_requests.client_approved_at: set when the client approves (or when
-- the webhook records a payment for a request approved before this column).
-- A shop may withdraw an approved repair whose deposit is still unpaid 3 days
-- after approval (AGENTS.md section 15, Step 5).
--
-- Safe to re-run.

ALTER TABLE service_requests
  ADD COLUMN IF NOT EXISTS client_approved_at DATETIME NULL AFTER client_approved;

-- Requests approved before this column: the best guess is their last update.
UPDATE service_requests
SET client_approved_at = updated_at
WHERE client_approved = 1 AND client_approved_at IS NULL;
