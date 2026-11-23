-- 2026-11-23: device types and type-specific specifications.
--
-- PixelPatch repairs three kinds of devices: phones, laptops and desktop
-- computers (the system unit, "CPU"). Each type asks for its own
-- specifications (server/utils/deviceSpecs.js):
--   device_type  PHONE | LAPTOP | DESKTOP. NULL for devices added before this
--                change; the app asks their owners to choose one when editing.
--   specs        JSON object of the type's extra specifications, e.g.
--                {"processor": "Intel Core i5-1135G7", "ram": "8 GB", "storage": "512 GB SSD"}.
--                brand, model, serial_number and model_number keep their columns.
--
-- Safe to re-run.

ALTER TABLE devices
  ADD COLUMN IF NOT EXISTS device_type ENUM('PHONE','LAPTOP','DESKTOP') NULL DEFAULT NULL AFTER user_id,
  ADD COLUMN IF NOT EXISTS specs LONGTEXT NULL DEFAULT NULL AFTER brand;
