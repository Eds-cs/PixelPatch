-- 2026-11-16: make service_requests.client_approved tri-state.
--
--   NULL = client has not decided on the quotation yet (new default)
--   1    = client approved the quotation
--   0    = client cancelled the request
--
-- Before this change the column was NOT NULL DEFAULT 0, so cancelling (which
-- writes 0) was indistinguishable from "not decided yet". Existing 0 rows are
-- treated as "not decided": no cancellation could ever have been recorded.

ALTER TABLE service_requests
  MODIFY client_approved TINYINT(1) NULL DEFAULT NULL;

UPDATE service_requests
SET client_approved = NULL
WHERE client_approved = 0;
