// Admin · Repairs (placeholder). Platform-wide oversight of repair requests.
import AdminPlaceholder from "../../components/AdminPlaceholder";

export default function AdminRepairs() {
  return (
    <AdminPlaceholder
      icon="construct-outline"
      title="Repairs"
      summary="Oversee repair requests across every shop."
      capabilities={[
        { icon: "list-outline", title: "All repair requests", detail: "Filter by shop, client, decision, status, payment status and date." },
        { icon: "git-branch-outline", title: "Workflow view", detail: "Follow each request through acceptance, assessment, quotation, approval, payment, assignment and completion." },
        { icon: "time-outline", title: "Stuck repairs", detail: "Spot requests waiting too long for a shop decision, quotation or completion." },
        { icon: "eye-outline", title: "Read-only by design", detail: "Admins observe and support; the repair workflow itself stays with shops and clients." },
      ]}
    />
  );
}
