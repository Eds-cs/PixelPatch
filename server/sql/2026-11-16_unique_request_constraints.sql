-- 2026-11-16: enforce one assessment, one quotation, and one review per
-- repair request at the database level.
--
-- Before this the rules were enforced only in controller code, so a
-- double-submit could create duplicates. Verified no duplicates existed
-- before applying. Each UNIQUE index replaces the plain index the foreign key
-- used; the foreign key constraints themselves are unchanged.

ALTER TABLE request_assessments
  ADD UNIQUE KEY uniq_assessment_request (request_id),
  DROP INDEX request_id;

ALTER TABLE request_quotations
  ADD UNIQUE KEY uniq_quotation_request (request_id),
  DROP INDEX request_id;

ALTER TABLE reviews
  ADD UNIQUE KEY uniq_review_request (request_id),
  DROP INDEX request_id;
