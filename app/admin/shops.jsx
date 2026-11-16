// Admin · Shops (placeholder). Shop verification will live here.
import AdminPlaceholder from "../../components/AdminPlaceholder";

export default function AdminShops() {
  return (
    <AdminPlaceholder
      icon="storefront-outline"
      title="Shops"
      summary="Verify new repair shops and keep listed shops trustworthy."
      capabilities={[
        { icon: "shield-checkmark-outline", title: "Verify new shops", detail: "Review registrations (shops.is_verified = 0) and approve or reject them. Unverified shops are hidden and can't take requests." },
        { icon: "document-attach-outline", title: "Check documents", detail: "Review business permits and IDs (shop_documents is ready but unused)." },
        { icon: "card-outline", title: "Payout accounts", detail: "Verify the GCash, Maya or bank account each shop registered (shop_payouts, status PENDING)." },
        { icon: "create-outline", title: "Correct shop details", detail: "Fix names, hours, contact details and addresses on a shop's behalf." },
        { icon: "pause-circle-outline", title: "Suspend a shop", detail: "Hide a shop from clients while an issue is investigated." },
        { icon: "analytics-outline", title: "Shop health", detail: "Ratings, completed repairs, disputes and response times per shop." },
      ]}
      note="Today, shops are approved by setting shops.is_verified = 1 in the database. Services a shop adds are reviewed separately under Services."
    />
  );
}
