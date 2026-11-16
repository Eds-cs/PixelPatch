-- 2026-11-16: recompute shops.rating_average from reviews.
--
-- Nothing updated this column before, so it held seed values that did not
-- match the reviews table. createReview now refreshes it after every new
-- review (server/utils/shopRating.js). 0.00 means the shop has no reviews yet,
-- matching what business registration writes for a new shop. Safe to re-run.

UPDATE shops s
SET s.rating_average = (
  SELECT ROUND(IFNULL(AVG(r.rating), 0), 2)
  FROM reviews r
  WHERE r.shop_id = s.id
);
