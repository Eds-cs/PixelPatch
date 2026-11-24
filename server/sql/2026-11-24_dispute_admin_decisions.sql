-- 2026-11-24: admins decide disputes the client and shop couldn't settle
-- (AGENTS.md business rule 7; app/admin/disputes.jsx).
--
-- An admin's decision is added to the dispute's history, written by 'ADMIN'.
-- The dispute itself uses the existing values: status = 'RESOLVED',
-- proposed_resolution = the decision ('REFUND' / 'RESERVICE', or NULL when the
-- complaint is declined), resolved_at = when.
--
-- Safe to re-run.

ALTER TABLE dispute_edits
  MODIFY edited_by ENUM('CLIENT', 'BUSINESS', 'ADMIN') NOT NULL;
