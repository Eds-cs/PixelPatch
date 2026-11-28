-- 2026-11-28: warranty terms (AGENTS.md section 20, business rule 9).
--
-- A warranty is optional and the shop sets it: one length per job, what it
-- covers, and a short note of what it doesn't. It starts when the repair is
-- completed (service_requests.completed_at).
--
-- request_quotation_warranties (one row per quotation that has a warranty):
--   coverage    PARTS, LABOUR or BOTH (NULL on older rows = BOTH)
--   exclusions  what isn't covered, e.g. "Drops and water damage"
--
-- shops.default_warranty_*: the shop's usual warranty, copied into each new
-- quotation (the shop may change it per job), like the payment-term defaults.
-- default_warranty_value NULL = no default warranty.
--
-- Safe to re-run.

ALTER TABLE request_quotation_warranties
  ADD COLUMN IF NOT EXISTS coverage ENUM('PARTS','LABOUR','BOTH') NULL AFTER warranty_unit,
  ADD COLUMN IF NOT EXISTS exclusions VARCHAR(300) NULL AFTER coverage;

ALTER TABLE shops
  ADD COLUMN IF NOT EXISTS default_warranty_value SMALLINT UNSIGNED NULL AFTER default_deposit_percent,
  ADD COLUMN IF NOT EXISTS default_warranty_unit ENUM('DAY','WEEK','MONTH','YEAR') NULL AFTER default_warranty_value,
  ADD COLUMN IF NOT EXISTS default_warranty_coverage ENUM('PARTS','LABOUR','BOTH') NULL AFTER default_warranty_unit,
  ADD COLUMN IF NOT EXISTS default_warranty_exclusions VARCHAR(300) NULL AFTER default_warranty_coverage;

-- Warranty claims. While a repair's warranty is active the client can ask for
-- warranty service. The shop has 2 days to accept or decline. Accepting (or
-- an admin ordering the repair) creates a NEW repair request linked to the
-- original, already ACCEPTED, that goes through the normal workflow with ₱0
-- for covered work. Declined, or unanswered for 2 days: the client can ask
-- PixelPatch to review, and an admin orders the repair or closes the claim.
--   OPEN       waiting for the shop
--   ACCEPTED   linked_request_id is the warranty repair
--   DECLINED   the shop declined (shop_response); the client may escalate
--   ESCALATED  waiting for an admin
--   CLOSED     an admin declined the claim (admin_note)
CREATE TABLE IF NOT EXISTS warranty_claims (
  id INT NOT NULL AUTO_INCREMENT,
  request_id INT NOT NULL,
  client_id INT NOT NULL,
  shop_id INT NOT NULL,
  problem TEXT NOT NULL,
  delivery_method ENUM('PICKUP','DROPOFF','ONSITE') NOT NULL,
  pickup_address_id INT NULL,
  preferred_date DATE NOT NULL,
  status ENUM('OPEN','ACCEPTED','DECLINED','ESCALATED','CLOSED') NOT NULL DEFAULT 'OPEN',
  shop_response TEXT NULL,
  admin_note TEXT NULL,
  decided_by INT NULL,
  linked_request_id INT NULL,
  created_at DATETIME NOT NULL DEFAULT current_timestamp(),
  responded_at DATETIME NULL,
  escalated_at DATETIME NULL,
  resolved_at DATETIME NULL,
  PRIMARY KEY (id),
  UNIQUE KEY uniq_warranty_linked_request (linked_request_id),
  KEY idx_warranty_request (request_id),
  KEY idx_warranty_shop_status (shop_id, status),
  KEY idx_warranty_status (status),
  CONSTRAINT fk_warranty_request FOREIGN KEY (request_id) REFERENCES service_requests (id),
  CONSTRAINT fk_warranty_client FOREIGN KEY (client_id) REFERENCES users (id),
  CONSTRAINT fk_warranty_shop FOREIGN KEY (shop_id) REFERENCES shops (id),
  CONSTRAINT fk_warranty_address FOREIGN KEY (pickup_address_id) REFERENCES addresses (id),
  CONSTRAINT fk_warranty_linked FOREIGN KEY (linked_request_id) REFERENCES service_requests (id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- Photos the client added to a claim (files under uploads/requests/, like a
-- repair request's photos). Copied to the warranty repair's attachments.
CREATE TABLE IF NOT EXISTS warranty_claim_photos (
  id INT NOT NULL AUTO_INCREMENT,
  claim_id INT NOT NULL,
  file_name VARCHAR(255) NOT NULL,
  PRIMARY KEY (id),
  KEY idx_warranty_photo_claim (claim_id),
  CONSTRAINT fk_warranty_photo_claim FOREIGN KEY (claim_id) REFERENCES warranty_claims (id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
