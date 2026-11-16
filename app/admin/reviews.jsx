// Admin · Reviews (placeholder). Moderation of client reviews.
import AdminPlaceholder from "../../components/AdminPlaceholder";

export default function AdminReviews() {
  return (
    <AdminPlaceholder
      icon="star-outline"
      title="Reviews"
      summary="Keep shop reviews honest and respectful."
      capabilities={[
        { icon: "flag-outline", title: "Reported reviews", detail: "Handle reviews that shops or clients report as abusive or fake." },
        { icon: "eye-off-outline", title: "Hide or restore", detail: "Hide a review from the public without deleting it, then recalculate the shop's rating." },
        { icon: "stats-chart-outline", title: "Rating overview", detail: "Ratings per shop over time, recomputed from actual reviews." },
      ]}
    />
  );
}
