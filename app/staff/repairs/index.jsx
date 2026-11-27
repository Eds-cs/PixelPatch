// app/staff/repairs/index.jsx — "My repairs": only the repairs assigned to
// this employee (GET /api/staff/repairs). Unfinished repairs first.
import { useState } from "react";
import { Pressable, Text, View } from "react-native";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";

import AsyncList from "../../../components/AsyncList";
import { RepairStatusBadge, formatRepairDate } from "../../../components/RepairSummary";
import { useFetch } from "../../../lib/useFetch";
import { useStaff } from "../../../lib/staff";
import { useResponsive } from "../../../lib/useResponsive";
import { COLORS } from "../../../constants/theme";

const FILTERS = [
  ["open", "To do"],
  ["completed", "Completed"],
  ["all", "All"],
];
const METHOD = { PICKUP: "Pickup", DROPOFF: "Drop-off", ONSITE: "On-site" };

export default function StaffRepairs() {
  const router = useRouter();
  const { membership } = useStaff();
  const { isMobile } = useResponsive();
  const { data, error, loading, refreshing, refresh } = useFetch("/staff/repairs", (d) => d.repairs ?? []);
  const [filter, setFilter] = useState("open");

  const all = data ?? [];
  const open = all.filter((repair) => repair.status !== "COMPLETED");
  const shown = filter === "open" ? open : filter === "completed" ? all.filter((repair) => repair.status === "COMPLETED") : all;

  return (
    <View className="flex-1 bg-gray-50">
      <AsyncList
        loading={loading}
        error={error}
        refreshing={refreshing}
        onRefresh={refresh}
        data={shown}
        keyExtractor={(item) => String(item.id)}
        emptyText={all.length ? "No repairs in this view." : "No repairs are assigned to you yet. Your shop owner assigns them from the repair workspace."}
        ListHeaderComponent={
          <View>
            <View className="mb-5">
              <Text accessibilityRole="header" className="text-2xl font-bold text-gray-900">My repairs</Text>
              <Text className="mt-1 text-sm leading-5 text-gray-500">
                {membership ? `${membership.first_name} · ${membership.role} at ${membership.shop_name}. ` : ""}
                Repairs your shop assigned to you.
              </Text>
            </View>
            <View className="mb-4 flex-row flex-wrap gap-2">
              {FILTERS.map(([key, label]) => (
                <Pressable
                  key={key}
                  onPress={() => setFilter(key)}
                  accessibilityRole="button"
                  accessibilityState={{ selected: filter === key }}
                  className={`min-h-11 justify-center rounded-lg px-3 py-2 ${filter === key ? "bg-primary" : "bg-white border border-gray-200"}`}
                >
                  <Text className={`text-sm font-semibold ${filter === key ? "text-white" : "text-gray-600"}`}>
                    {label}{key === "open" ? ` (${open.length})` : ""}
                  </Text>
                </Pressable>
              ))}
            </View>
          </View>
        }
        renderItem={({ item }) => (
          <Pressable
            onPress={() => router.push(`/staff/repairs/${item.id}`)}
            accessibilityRole="button"
            accessibilityLabel={`Open repair #${item.id}, ${item.device_name || "device"}, ${item.client}`}
            className="mb-3 rounded-xl border border-gray-200 bg-white p-4 active:bg-teal-50"
          >
            <View className="flex-row flex-wrap items-start justify-between gap-2">
              <View style={{ flex: 1, minWidth: 180 }}>
                <Text className="text-base font-bold text-gray-900">Repair #{item.id} · {item.device_name || "Device"}</Text>
                <Text className="mt-1 text-sm text-gray-600">{item.client}</Text>
              </View>
              <RepairStatusBadge status={item.status} decision={item.decision} clientApproved={1} />
            </View>
            {item.services ? <Text numberOfLines={2} className="mt-2 text-sm text-gray-500">{item.services}</Text> : null}
            <View className={`mt-3 ${isMobile ? "gap-1" : "flex-row flex-wrap gap-4"}`}>
              <Text className="text-xs text-gray-500">{METHOD[item.delivery_method] || item.delivery_method} · {formatRepairDate(item.preferred_date)}</Text>
              {item.chat_id ? (
                <View className="flex-row items-center gap-1">
                  <Ionicons name="chatbubbles-outline" size={13} color={COLORS.primary} />
                  <Text className="text-xs font-semibold text-primary">Chat handed to you</Text>
                </View>
              ) : null}
            </View>
          </Pressable>
        )}
      />
    </View>
  );
}
