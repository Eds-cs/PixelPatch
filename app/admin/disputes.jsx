// Admin · Disputes (placeholder). Escalated disputes between clients and shops.
import AdminPlaceholder from "../../components/AdminPlaceholder";

export default function AdminDisputes() {
  return (
    <AdminPlaceholder
      icon="alert-circle-outline"
      title="Disputes"
      summary="Step in when a client and a shop can't agree."
      capabilities={[
        { icon: "file-tray-full-outline", title: "Dispute inbox", detail: "Every dispute across shops with its status: open, shop proposed, resolved or declined." },
        { icon: "chatbubbles-outline", title: "Full history", detail: "The client's complaint, the shop's proposal and every message in between." },
        { icon: "hammer-outline", title: "Mediate", detail: "Decide declined disputes, for example ordering a refund or a re-service." },
        { icon: "flag-outline", title: "Spot patterns", detail: "Shops or clients with repeated disputes." },
      ]}
    />
  );
}
