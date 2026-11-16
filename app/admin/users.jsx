// Admin · Users (placeholder). Planned controls for every account.
import AdminPlaceholder from "../../components/AdminPlaceholder";

export default function AdminUsers() {
  return (
    <AdminPlaceholder
      icon="people-outline"
      title="Users"
      summary="Every client, business and admin account on PixelPatch."
      capabilities={[
        { icon: "search-outline", title: "Find accounts", detail: "Search by name, email or phone and filter by role (client, business, admin)." },
        { icon: "id-card-outline", title: "View account details", detail: "Profile, sign-up date, devices, addresses, owned shop and repair history." },
        { icon: "swap-horizontal-outline", title: "Change roles", detail: "Promote or demote accounts. Role IDs: 1 user, 2 admin, 3 business." },
        { icon: "ban-outline", title: "Suspend or reactivate", detail: "Block sign-in for abusive or fraudulent accounts without deleting their history." },
        { icon: "key-outline", title: "Account recovery", detail: "Help users who are locked out, without ever seeing their password." },
        { icon: "document-text-outline", title: "Activity log", detail: "See important account actions (activity_logs table is ready but unused)." },
      ]}
      note="Today, role changes and account fixes require editing the database directly."
    />
  );
}
