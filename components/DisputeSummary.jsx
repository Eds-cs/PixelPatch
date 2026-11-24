import { Text, View } from "react-native";

import { disputeStatusTone, palette, toneClassesFor } from "../constants/theme";

// Colors come from the theme's status tones (constants/theme.js).
const dispute = (key, label) => {
  const tone = disputeStatusTone[key];
  const { bg, text } = toneClassesFor(tone);
  return { key, label, background: bg, foreground: text, color: palette.light[tone] };
};

export const DISPUTE_STATUSES = [
  dispute("OPEN", "Needs response"),
  dispute("SHOP_PROPOSED", "Awaiting client"),
  dispute("RESOLVED", "Resolved"),
  dispute("REJECTED", "Proposal declined"),
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

// A RESOLVED dispute with no resolution was declined by a PixelPatch admin.
export function resolutionLabel(value, status) {
  if (!value && status === "RESOLVED") return "Complaint declined";
  return { REFUND: "Refund", RESERVICE: "Re-service" }[value] || value || "No proposal yet";
}
