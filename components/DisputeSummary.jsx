import { Text, View } from "react-native";

export const DISPUTE_STATUSES = [
  { key: "OPEN", label: "Needs response", background: "bg-amber-50", foreground: "text-amber-800", color: "#d97706" },
  { key: "SHOP_PROPOSED", label: "Awaiting client", background: "bg-blue-50", foreground: "text-blue-700", color: "#2563eb" },
  { key: "RESOLVED", label: "Resolved", background: "bg-emerald-50", foreground: "text-emerald-700", color: "#059669" },
  { key: "REJECTED", label: "Proposal declined", background: "bg-red-50", foreground: "text-red-700", color: "#dc2626" },
];

export function DisputeStatusBadge({ status }) {
  const item = DISPUTE_STATUSES.find((entry) => entry.key === status);
  return (
    <View className={`self-start rounded-full px-3 py-1.5 ${item?.background || "bg-gray-100"}`}>
      <Text className={`text-xs font-semibold ${item?.foreground || "text-gray-600"}`}>{item?.label || status || "Unknown"}</Text>
    </View>
  );
}

export function disputeTimestamp(value) {
  return value ? new Date(String(value).replace(" ", "T")).getTime() || 0 : 0;
}

export function formatDisputeDate(value) {
  const timestamp = disputeTimestamp(value);
  return timestamp ? new Date(timestamp).toLocaleString(undefined, {
    month: "short", day: "numeric", year: "numeric", hour: "numeric", minute: "2-digit",
  }) : "Not recorded";
}

export function resolutionLabel(value) {
  return { REFUND: "Refund", RESERVICE: "Re-service" }[value] || value || "No proposal yet";
}
