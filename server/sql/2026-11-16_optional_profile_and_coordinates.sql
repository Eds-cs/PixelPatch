-- 2026-11-16: allow values the app does not collect to be unknown (NULL).
--
-- users.birthdate and users.phone were NOT NULL, but the signup screen does
-- not ask for a birthdate and labels phone optional, so every app signup
-- failed with "Column 'birthdate' cannot be null".
--
-- addresses.latitude / longitude were NOT NULL, but no screen collects
-- coordinates, so adding an address from the app always failed. Business
-- registration worked around this by writing 0,0, which is a real location
-- (off the coast of Africa); those placeholder rows are cleared to NULL.

ALTER TABLE users
  MODIFY birthdate DATE NULL DEFAULT NULL,
  MODIFY phone VARCHAR(20) NULL DEFAULT NULL;

ALTER TABLE addresses
  MODIFY latitude DECIMAL(10,7) NULL DEFAULT NULL,
  MODIFY longitude DECIMAL(10,7) NULL DEFAULT NULL;

UPDATE addresses
SET latitude = NULL, longitude = NULL
WHERE latitude = 0 AND longitude = 0;
