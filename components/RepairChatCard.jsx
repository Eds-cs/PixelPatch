// components/RepairChatCard.jsx
// A repair card in chat (server/utils/repairCards.js), drawn instead of a
// plain SYSTEM line. REPAIR_CONFIRMED: posted when the shop accepts a repair
// request, like an order confirmation. "View details" opens the repair for
// whoever is reading (client, owner or staff).
import { Image, Pressable, Text, View } from "react-native";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";

import { mediaUrl } from "../lib/api";
import { typeIcon } from "../lib/deviceSpecs";
import { calendarDate } from "./RepairSummary";
import { COLORS } from "../constants/theme";

const DELIVERY = {
  PICKUP: ["Pickup", "The shop collects your device"],
  DROPOFF: ["Drop-off", "Bring your device to the shop"],
  ONSITE: ["On-site", "A technician visits you"],
};
const REPAIR_ROUTE = { CLIENT: "/repair/", OWNER: "/business/repairs/", STAFF: "/staff/repairs/" };

const initials = (name) =>
  String(name ?? "")
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((word) => word[0].toUpperCase())
    .join("") || "PP";

function Row({ label, value }) {
  if (!value) return null;
  return (
    <View className="flex-row gap-3 py-1.5">
      <Text className="w-28 text-sm text-gray-500">{label}</Text>
      <Text selectable className="flex-1 text-right text-sm text-gray-900">{value}</Text>
    </View>
  );
}

/**
 * card:     the message's card
 * viewerAs: "CLIENT" | "OWNER" | "STAFF" (GET /chat/:id `as`)
 * maxWidth: the chat's bubble width
 */
export default function RepairChatCard({ card, viewerAs = "CLIENT", maxWidth }) {
  const router = useRouter();
  if (card?.type !== "REPAIR_CONFIRMED") return null;

  const client = viewerAs === "CLIENT";
  const device = card.device ?? {};
  const deviceName = [device.brand, device.model].filter(Boolean).join(" ") || device.name || "Device";
  const [method, methodHint] = DELIVERY[card.delivery_method] ?? [card.delivery_method, null];
  const photo = device.photo_url ? mediaUrl(device.photo_url) : null;
  const route = REPAIR_ROUTE[viewerAs] ?? REPAIR_ROUTE.CLIENT;
  const services = card.services ?? [];

  return (
    <View className="mb-3 flex-row items-start gap-2 self-start" style={{ maxWidth }}>
      <View className="h-9 w-9 items-center justify-center rounded-full border border-gray-200 bg-white">
        <Text className="text-[11px] font-bold text-gray-700">{initials(card.shop_name)}</Text>
      </View>
      <View
        className="flex-1 rounded-2xl rounded-tl-md bg-white p-4"
        style={{ shadowColor: "#000", shadowOpacity: 0.05, shadowRadius: 3, shadowOffset: { width: 0, height: 1 }, elevation: 1 }}
        accessibilityLabel={`${card.warranty_of ? "Warranty repair" : "Repair"} ${card.request_id} confirmed by ${card.shop_name}`}
      >
        <View className="flex-row items-center gap-2">
          <Ionicons name="checkmark-circle" size={20} color={COLORS.success} />
          <Text className="flex-1 text-base font-bold text-gray-900">
            {card.warranty_of ? "Warranty repair confirmed" : "Repair confirmed"}
          </Text>
        </View>
        <Text className="mt-1 text-sm leading-5 text-gray-600">
          {client
            ? `${card.shop_name} accepted your repair request.${card.delivery_method === "DROPOFF" ? " Bring your device on your preferred date." : ""}`
            : `You accepted this repair request. Next: assess the device and send the quotation.`}
        </Text>

        {/* The device, like the product row of an order */}
        <View className="mt-3 flex-row items-center gap-3 rounded-xl bg-gray-50 p-3">
          {photo ? (
            <Image source={{ uri: photo }} className="h-14 w-14 rounded-lg bg-gray-100" resizeMode="cover" accessibilityLabel={deviceName} />
          ) : (
            <View className="h-14 w-14 items-center justify-center rounded-lg bg-teal-50">
              <Ionicons name={typeIcon(device.type) || "hardware-chip-outline"} size={26} color={COLORS.primary} />
            </View>
          )}
          <View className="flex-1" style={{ minWidth: 0 }}>
            <Text className="text-sm font-bold text-gray-900" numberOfLines={1}>{deviceName}</Text>
            <Text className="mt-0.5 text-xs text-gray-500" numberOfLines={2}>
              {services.length ? services.join(", ") : card.warranty_of ? "Covered by the warranty" : "Services after assessment"}
            </Text>
          </View>
        </View>

        <View className="mt-2">
          <Row label="Repair no." value={`#${card.request_id}`} />
          {card.warranty_of ? <Row label="Warranty for" value={`Repair #${card.warranty_of}`} /> : null}
          <Row label="Delivery" value={methodHint ? `${method} · ${methodHint}` : method} />
          <Row label={card.delivery_method === "DROPOFF" ? "Shop address" : "Address"} value={card.address} />
          <Row label="Preferred date" value={calendarDate(card.preferred_date)} />
          <Row label="Price" value={card.warranty_of ? "Free for covered work" : "Quoted after assessment"} />
        </View>
        {card.issue ? (
          <Text className="mt-2 text-xs italic leading-5 text-gray-500" numberOfLines={3}>&ldquo;{card.issue}&rdquo;</Text>
        ) : null}

        <Pressable
          onPress={() => router.push(`${route}${card.request_id}`)}
          accessibilityRole="button"
          className="mt-4 min-h-11 items-center justify-center rounded-xl bg-gray-100 active:bg-gray-200"
        >
          <Text className="text-sm font-semibold text-gray-900">View details</Text>
        </Pressable>
      </View>
    </View>
  );
}
