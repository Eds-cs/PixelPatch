-- 2026-11-16: admin review for shop services.
--
-- New services (from registration or the business catalog) start PENDING and
-- are hidden from clients until an admin approves them. Changing what a
-- service is (name, category, description) sends it back to PENDING; price,
-- turnaround and service-method edits do not. A REJECTED service carries the
-- admin's reason in review_note and returns to PENDING when the shop edits it.
--
-- Existing services are marked APPROVED: their shops were already approved
-- with them.

ALTER TABLE shop_services
  ADD COLUMN review_status ENUM('PENDING','APPROVED','REJECTED') NOT NULL DEFAULT 'PENDING',
  ADD COLUMN review_note TEXT NULL,
  ADD COLUMN reviewed_by INT(11) NULL,
  ADD COLUMN reviewed_at DATETIME NULL,
  ADD KEY idx_shop_services_review_status (review_status),
  ADD CONSTRAINT fk_shop_services_reviewed_by FOREIGN KEY (reviewed_by) REFERENCES users (id);

UPDATE shop_services SET review_status = 'APPROVED';
