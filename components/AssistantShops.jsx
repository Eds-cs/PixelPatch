// Shop cards the AI assistant recommends (app/assistant.jsx), and the
// hand-off to a real shop: "Message shop" opens the shop chat with the
// assistant's summary as an editable draft, "Request repair" opens the
// request form pre-filled with the problem.
//
// The shops come from the server (server/utils/ai/findShops.js): verified,
// in Zamboanga City, with an approved service. Nothing here is invented by
// the model.
import { useState } from "react";
import { ActivityIndicator, Pressable, Text, View } from "react-native";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";

import api from "../lib/api";
import { COLORS } from "../constants/theme";

const peso = (value) => `₱${Number(value || 0).toLocaleString("en-PH", { maximumFractionDigits: 2 })}`;

// Assistant device type -> devices.device_type, for pre-selecting the device
// on the request form (tablets have no device type of their own).
export const REQUEST_DEVICE_TYPE = { SMARTPHONE: "PHONE", LAPTOP: "LAPTOP", DESKTOP: "DESKTOP" };

/** Opens shop chats and repair requests from a recommendation. */
export function useShopHandoff() {
  const router = useRouter();
  const [busyShopId, setBusyShopId] = useState(null);
  const [error, setError] = useState(null);

  const messageShop = async (shop, handoff, before) => {
    if (busyShopId) return;
    setBusyShopId(shop.id);
    setError(null);
    try {
      const { data } = await api.post("/chat/start", { shop_id: shop.id });
      const chatId = data?.chat?.id;
      if (!chatId) throw new Error("Couldn't open a chat with this shop.");
      before?.();
      router.push({ pathname: "/chat/[id]", params: { id: String(chatId), ...(handoff?.summary ? { draft: handoff.summary, from: "assistant" } : {}) } });
    } catch (e) {
      setError({ shopId: shop.id, text: e.message || "Couldn't open a chat with this shop." });
    } finally {
      setBusyShopId(null);
    }
  };

  const requestRepair = (shop, handoff, before) => {
    before?.();
    const params = { shopId: String(shop.id), from: "assistant" };
    if (handoff?.summary) params.issue = handoff.summary;
    if (shop.service?.id) params.serviceId = String(shop.service.id);
    const deviceType = REQUEST_DEVICE_TYPE[handoff?.device_type];
    if (deviceType) params.deviceType = deviceType;
    router.push({ pathname: "/request/[shopId]", params });
  };

  return { messageShop, requestRepair, busyShopId, error };
}

function Rating({ rating, count }) {
  if (!count || rating === null || rating === undefined) {
    return <Text className="text-xs text-gray-500">No reviews yet</Text>;
  }
  return (
    <View className="flex-row items-center gap-1">
      <Ionicons name="star" size={13} color="#f59e0b" />
      <Text className="text-xs font-semibold text-gray-700">{Number(rating).toFixed(1)}</Text>
      <Text className="text-xs text-gray-500">({count} review{count === 1 ? "" : "s"})</Text>
    </View>
  );
}

export function AssistantShopCard({ shop, handoff, handoffApi, onLeave }) {
  const router = useRouter();
  const { messageShop, requestRepair, busyShopId, error } = handoffApi;
  const busy = busyShopId === shop.id;
  const locked = busyShopId !== null;
  const service = shop.service ?? {};

  return (
    <View className="rounded-2xl border border-gray-200 bg-white p-4">
      <Pressable
        onPress={() => { onLeave?.(); router.push(`/shop/${shop.id}`); }}
        accessibilityRole="link"
        accessibilityLabel={`View ${shop.name}`}
        className="flex-row items-start gap-3 active:opacity-70"
      >
        <View className="h-10 w-10 items-center justify-center rounded-full bg-primary">
          <Text className="text-base font-bold text-white">{String(shop.name || "?").trim().charAt(0).toUpperCase()}</Text>
        </View>
        <View className="flex-1" style={{ minWidth: 0 }}>
          <View className="flex-row flex-wrap items-center gap-x-2 gap-y-1">
            <Text className="text-sm font-bold text-gray-900" style={{ flexShrink: 1 }}>{shop.name}</Text>
            {shop.verified ? (
              <View className="flex-row items-center gap-1 rounded-full bg-teal-50 px-2 py-0.5">
                <Ionicons name="shield-checkmark" size={11} color={COLORS.primary} />
                <Text className="text-[11px] font-semibold text-teal-800">Verified</Text>
              </View>
            ) : null}
          </View>
          <View className="mt-1 flex-row flex-wrap items-center gap-x-3 gap-y-1">
            <Rating rating={shop.rating} count={shop.review_count} />
            {shop.barangay ? <Text className="text-xs text-gray-500">{shop.barangay}</Text> : null}
          </View>
        </View>
        <Ionicons name="chevron-forward" size={18} color={COLORS.textMuted} />
      </Pressable>

      <View className="mt-3 rounded-xl bg-gray-50 px-3 py-2.5">
        <Text className="text-sm font-semibold text-gray-900">{service.name}</Text>
        <Text className="mt-0.5 text-xs text-gray-600">
          From <Text className="font-bold text-price">{peso(service.price)}</Text>
          {service.timeframe ? ` · ${service.timeframe}` : ""}
        </Text>
        <View className="mt-1.5 flex-row items-center gap-1">
          <Ionicons name="ribbon-outline" size={12} color={COLORS.textMuted} />
          <Text className="text-xs text-gray-500">Warranty terms come with the quote</Text>
        </View>
      </View>

      <View className="mt-3 flex-row flex-wrap gap-2">
        <Pressable
          onPress={() => messageShop(shop, handoff, onLeave)}
          disabled={locked}
          accessibilityRole="button"
          accessibilityLabel={`Message ${shop.name}`}
          accessibilityState={{ disabled: locked, busy }}
          className={`min-h-11 flex-1 flex-row items-center justify-center gap-2 rounded-xl border border-gray-300 bg-white px-3 active:bg-gray-50 ${locked && !busy ? "opacity-50" : ""}`}
          style={{ minWidth: 140 }}
        >
          {busy ? <ActivityIndicator size="small" color={COLORS.primary} /> : <Ionicons name="chatbubble-ellipses-outline" size={17} color={COLORS.primary} />}
          <Text className="text-sm font-semibold text-primary">Message shop</Text>
        </Pressable>
        <Pressable
          onPress={() => requestRepair(shop, handoff, onLeave)}
          disabled={locked}
          accessibilityRole="button"
          accessibilityLabel={`Request a repair from ${shop.name}`}
          className={`min-h-11 flex-1 flex-row items-center justify-center gap-2 rounded-xl bg-primary px-3 active:bg-teal-800 ${locked ? "opacity-50" : ""}`}
          style={{ minWidth: 140 }}
        >
          <Ionicons name="construct-outline" size={17} color="#ffffff" />
          <Text className="text-sm font-semibold text-white">Request repair</Text>
        </Pressable>
      </View>
      {error?.shopId === shop.id ? <Text accessibilityRole="alert" className="mt-2 text-xs text-red-700">{error.text}</Text> : null}
    </View>
  );
}

/**
 * The recommended shops under an assistant reply (or in a pop-up). With no
 * shops it says so and offers the full shop list.
 */
export function AssistantShopList({ shops, handoff, handoffApi, onLeave, title = "Verified shops that can help" }) {
  const router = useRouter();
  if (!shops?.length) {
    return (
      <View className="rounded-2xl border border-dashed border-gray-300 bg-gray-50 p-4">
        <Text className="text-sm font-semibold text-gray-900">No matching verified shop right now</Text>
        <Text className="mt-1 text-sm leading-5 text-gray-600">You can still browse every shop on PixelPatch.</Text>
        <Pressable onPress={() => { onLeave?.(); router.push("/services"); }} accessibilityRole="link" className="mt-2 min-h-11 justify-center self-start">
          <Text className="text-sm font-semibold text-primary">Browse shops</Text>
        </Pressable>
      </View>
    );
  }
  return (
    <View>
      {title ? <Text className="mb-2 text-sm font-semibold text-gray-900">{title}</Text> : null}
      <View className="gap-3">
        {shops.map((shop) => (
          <AssistantShopCard key={shop.id} shop={shop} handoff={handoff} handoffApi={handoffApi} onLeave={onLeave} />
        ))}
      </View>
    </View>
  );
}
