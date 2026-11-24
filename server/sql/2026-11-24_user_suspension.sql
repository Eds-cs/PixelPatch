-- 2026-11-24: suspending accounts from the admin portal (app/admin/users.jsx).
--
-- suspended_at      when an admin suspended the account; NULL = active.
-- suspended_reason  why (shown to the admin; the person sees a general message).
-- suspended_by      the admin's users.id (no FK, like other audit columns).
--
-- A suspended account can't sign in, and its existing sessions stop working
-- (server/utils/accountStatus.js). Nothing is deleted; reactivating restores it.
--
-- Safe to re-run.

ALTER TABLE users
  ADD COLUMN IF NOT EXISTS suspended_at DATETIME NULL DEFAULT NULL AFTER photo_url,
  ADD COLUMN IF NOT EXISTS suspended_reason VARCHAR(500) NULL DEFAULT NULL AFTER suspended_at,
  ADD COLUMN IF NOT EXISTS suspended_by INT NULL DEFAULT NULL AFTER suspended_reason;
