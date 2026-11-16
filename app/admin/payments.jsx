// Admin · Payments (placeholder). Xendit payments and shop payouts.
import AdminPlaceholder from "../../components/AdminPlaceholder";

export default function AdminPayments() {
  return (
    <AdminPlaceholder
      icon="card-outline"
      title="Payments"
      summary="Track money moving through PixelPatch."
      capabilities={[
        { icon: "receipt-outline", title: "Payment records", detail: "Every Xendit invoice with amount, method (GCash, Maya, card) and status." },
        { icon: "warning-outline", title: "Mismatches", detail: "Payments whose status differs from the repair, or invoices created but never paid." },
        { icon: "return-down-back-outline", title: "Refunds", detail: "Record refunds agreed through disputes." },
        { icon: "wallet-outline", title: "Shop payouts", detail: "What each shop is owed and the payout account it registered." },
      ]}
      note="Payment status is only ever set by the verified Xendit webhook, never by a redirect or by hand."
    />
  );
}
