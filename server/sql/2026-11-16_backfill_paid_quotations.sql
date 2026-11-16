-- 2026-11-16: mark quotations PAID for requests that are already paid.
--
-- Before this date the Xendit webhook updated payments and
-- service_requests.payment_status but never request_quotations.status, so
-- paid quotations were left as PENDING. The webhook now sets PAID; this
-- backfills existing rows. Safe to re-run.

UPDATE request_quotations rq
JOIN service_requests sr ON sr.id = rq.request_id
SET rq.status = 'PAID', rq.updated_at = NOW()
WHERE sr.payment_status = 'PAID'
  AND rq.status = 'PENDING';
