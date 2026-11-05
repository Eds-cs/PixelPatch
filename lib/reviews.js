export function reviewTimestamp(value) {
  if (!value) return 0;
  const timestamp = new Date(String(value).replace(" ", "T")).getTime();
  return Number.isFinite(timestamp) ? timestamp : 0;
}

export function summarizeReviews(reviews, now = Date.now()) {
  const counts = [0, 0, 0, 0, 0];
  let recent = 0;
  for (const review of reviews) {
    const rating = Number(review.rating);
    if (Number.isInteger(rating) && rating >= 1 && rating <= 5) counts[rating - 1]++;
    const timestamp = reviewTimestamp(review.created_at);
    if (timestamp > 0 && timestamp >= now - 30 * 86400000 && timestamp <= now) recent++;
  }
  const rated = counts.reduce((sum, count) => sum + count, 0);
  return {
    total: reviews.length, rated, counts,
    average: rated ? counts.reduce((sum, count, index) => sum + count * (index + 1), 0) / rated : null,
    positivePercent: rated ? Math.round((counts[3] + counts[4]) / rated * 100) : null,
    recent,
  };
}

export function filterReviews(reviews, { query = "", rating = 0, days = 0, sort = "newest" }, now = Date.now()) {
  const needle = query.trim().toLowerCase();
  return reviews.filter((review) => {
    if (rating && Number(review.rating) !== rating) return false;
    const timestamp = reviewTimestamp(review.created_at);
    if (days && (!timestamp || timestamp < now - days * 86400000 || timestamp > now)) return false;
    if (!needle) return true;
    return [review.first_name, review.last_name, review.comment, review.device_name,
      review.device_brand, review.device_model, review.services, review.issue_description,
      review.request_id, `#${review.request_id}`]
      .join(" ").toLowerCase().includes(needle);
  }).sort((a, b) => {
    const dateDifference = reviewTimestamp(b.created_at) - reviewTimestamp(a.created_at) || Number(b.id) - Number(a.id);
    if (sort === "oldest") return -dateDifference;
    if (sort === "lowest") return Number(a.rating) - Number(b.rating) || dateDifference;
    if (sort === "highest") return Number(b.rating) - Number(a.rating) || dateDifference;
    return dateDifference;
  });
}
