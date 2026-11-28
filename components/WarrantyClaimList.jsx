// components/WarrantyClaimList.jsx
// A repair's warranty claims (business rule 9) for the client or the shop:
// status, the problem, photos, the shop's or PixelPatch's answer, and the
// warranty repair once accepted. Actions come from the screen (`actions`).
import { Image, Pressable, Text, View } from "react-native";
import { useRouter } from "expo-router";

import { mediaUrl } from "../lib/api";
import { calendarDate } from "./RepairSummary";

const DELIVERY = { PICKUP: "Pickup", DROPOFF: "Drop-off", ONSITE: "On-site" };
const TONES = {
  amber: ["bg-amber-50", "text-amber-800"],
  green: ["bg-emerald-50", "text-emerald-800"],
  red: ["bg-red-50", "text-red-700"],
  blue: ["bg-blue-50", "text-blue-800"],
  gray: ["bg-gray-100", "text-gray-600"],
};

/** [label, tone] for a claim, worded for the viewer. */
export function claimStatus(claim, viewer = "client") {
  const shop = viewer === "shop";
  switch (claim.status) {
    case "OPEN":
      return [shop ? (claim.overdue ? "Answer overdue" : "Waiting for your answer") : "Waiting for the shop", claim.overdue ? "red" : "amber"];
    case "ACCEPTED":
      return [claim.admin_note ? "Repair ordered by PixelPatch" : "Accepted", "green"];
    case "DECLINED":
      return [shop ? "You declined" : "Declined by the shop", "red"];
    case "ESCALATED":
      return ["PixelPatch is reviewing", "blue"];
    case "CLOSED":
      return ["Declined by PixelPatch", "gray"];
    default:
      return [claim.status, "gray"];
  }
}

function Pill({ label, tone }) {
  const [bg, fg] = TONES[tone] ?? TONES.gray;
  return (
    <View className={`self-start rounded-full px-2.5 py-1 ${bg}`}>
      <Text className={`text-xs font-semibold ${fg}`}>{label}</Text>
    </View>
  );
}

/**
 * claims:   from the repair detail (warranty_claims / warrantyClaims)
 * viewer:   "client" or "shop"
 * repairHref: (id) => route of a repair for this viewer
 * actions:  (claim) => node | null, shown under each claim
 */
export default function WarrantyClaimList({ claims = [], viewer = "client", repairHref, actions }) {
  const router = useRouter();
  if (!claims.length) return null;

  return (
    <View className="gap-3">
      {claims.map((claim) => {
        const [label, tone] = claimStatus(claim, viewer);
        return (
          <View key={claim.id} className="rounded-xl border border-gray-200 bg-white p-4">
            <View className="flex-row flex-wrap items-center justify-between gap-2">
              <Text className="text-sm font-bold text-gray-900">Warranty claim #{claim.id}</Text>
              <Pill label={label} tone={tone} />
            </View>
            <Text className="mt-1 text-xs text-gray-500">
              {`Sent ${calendarDate(claim.created_at) ?? ""} · ${DELIVERY[claim.delivery_method] ?? claim.delivery_method} · preferred ${calendarDate(claim.preferred_date) ?? "date not set"}`}
            </Text>
            <Text selectable className="mt-2 text-sm leading-6 text-gray-800">{claim.problem}</Text>

            {claim.photos?.length ? (
              <View className="mt-3 flex-row flex-wrap gap-2">
                {claim.photos.map((photo) => (
                  <Image
                    key={photo}
                    source={{ uri: mediaUrl(photo) }}
                    className="h-20 w-20 rounded-lg bg-gray-100"
                    resizeMode="cover"
                    accessibilityLabel="Photo of the problem"
                  />
                ))}
              </View>
            ) : null}

            {claim.status === "OPEN" ? (
              <Text className="mt-3 text-xs leading-5 text-gray-500">
                {viewer === "shop"
                  ? `Accept or decline by ${calendarDate(claim.reply_due) ?? "within 2 days"}. If you don't answer, the client can ask PixelPatch to decide.`
                  : `The shop has until ${calendarDate(claim.reply_due) ?? "2 days"} to answer.`}
              </Text>
            ) : null}

            {claim.shop_response ? (
              <View className="mt-3 rounded-lg bg-gray-50 p-3">
                <Text className="text-xs font-semibold text-gray-700">{viewer === "shop" ? "Your reason" : "The shop's reason"}</Text>
                <Text selectable className="mt-1 text-sm leading-5 text-gray-700">{claim.shop_response}</Text>
              </View>
            ) : null}
            {claim.admin_note ? (
              <View className="mt-3 rounded-lg bg-blue-50 p-3">
                <Text className="text-xs font-semibold text-blue-900">PixelPatch decision</Text>
                <Text selectable className="mt-1 text-sm leading-5 text-blue-900">{claim.admin_note}</Text>
              </View>
            ) : null}

            {claim.linked_request_id && repairHref ? (
              <Pressable
                onPress={() => router.push(repairHref(claim.linked_request_id))}
                accessibilityRole="link"
                className="mt-3 min-h-11 justify-center self-start"
              >
                <Text className="text-sm font-semibold text-primary">{`Open warranty repair #${claim.linked_request_id}`}</Text>
              </Pressable>
            ) : null}

            {actions ? actions(claim) : null}
          </View>
        );
      })}
    </View>
  );
}
