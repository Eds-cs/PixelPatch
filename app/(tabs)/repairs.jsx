// Customer repair tracking. Filters are presentation groups, not workflow states.
import { useState } from "react";
import { Pressable, Text, View } from "react-native";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";

import AsyncList from "../../components/AsyncList";
import Button from "../../components/Button";
import TextField from "../../components/TextField";
import { RepairStatusBadge } from "../../components/RepairSummary";
import { useFetch } from "../../lib/useFetch";
import { useResponsive } from "../../lib/useResponsive";
import { COLORS } from "../../constants/theme";

const FILTERS = [
  { key: "all", label: "All repairs" },
  { key: "waiting", label: "Awaiting shop" },
  { key: "review", label: "In review" },
  { key: "progress", label: "In progress" },
  { key: "completed", label: "Completed" },
  { key: "rejected", label: "Not accepted" },
];
function stage(repair) {
  const decision = String(repair.decision || "").toUpperCase();
  const status = String(repair.status || "").toUpperCase();
  if (decision === "REJECTED") return "rejected";
  if (decision === "PENDING") return "waiting";
  if (decision !== "ACCEPTED") return "other";
  if (status === "COMPLETED") return "completed";
  if (status === "IN_PROGRESS") return "progress";
  return "review";
}
function timestamp(repair) {
  return new Date(String(repair.created_at || "").replace(" ", "T")).getTime() || 0;
}
function requestedDate(repair) {
  const value = timestamp(repair);
  return value ? new Date(value).toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" }) : "Date unavailable";
}
function deviceName(repair) {
  return [repair.device_brand, repair.device_model].filter(Boolean).join(" ") || repair.device_name || "Your device";
}
function nextStep(repair) {
  const current = stage(repair);
  if (current === "rejected") return "The shop did not accept this request. Open it to see the reason.";
  if (current === "waiting") return "Your request is waiting for the shop's decision.";
  if (current === "progress") return "Repair work is underway. Open your repair for details.";
  if (current === "completed") return "Your repair is complete. View the details and your review options.";
  if (Number(repair.client_approved) === 1 && repair.payment_status === "PAID") return "Payment confirmed. Check technician and repair updates.";
  if (Number(repair.client_approved) === 1) return "Quotation approved. Open your repair to check payment options.";
  return "Check the assessment and quotation in your repair details.";
}
function PaymentState({ repair }) {
  if (stage(repair) === "rejected") return <Text className="text-xs text-gray-400">Payment not applicable</Text>;
  const value = String(repair.payment_status || "").toUpperCase();
  const paid = value === "PAID";
  const failed = value === "FAILED";
  return (
    <View className="flex-row items-center gap-1.5">
      <Ionicons name={paid ? "checkmark-circle" : failed ? "alert-circle-outline" : "time-outline"} size={15} color={paid ? COLORS.success : failed ? COLORS.danger : COLORS.textMuted} />
      <Text className={`text-xs font-medium ${paid ? "text-emerald-700" : failed ? "text-red-700" : "text-gray-500"}`}>{paid ? "Payment confirmed" : failed ? "Payment failed" : value === "PENDING" ? "Payment pending" : "Payment not recorded"}</Text>
    </View>
  );
}

export default function Repairs() {
  const router = useRouter();
  const { isMobile, isDesktop } = useResponsive();
  const [filter, setFilter] = useState("all");
  const [query, setQuery] = useState("");
  const [sort, setSort] = useState("newest");
  const { data, error, loading, refreshing, refresh } = useFetch("/client/repairs", (d) => d.repairs ?? []);
  const repairs = data ?? [];
  const counts = Object.fromEntries(FILTERS.map((item) => [item.key, item.key === "all" ? repairs.length : repairs.filter((repair) => stage(repair) === item.key).length]));
  const active = repairs.filter((repair) => !["completed", "rejected"].includes(stage(repair))).length;
  const needle = query.trim().toLowerCase();
  const filtered = repairs.filter((repair) =>
    (filter === "all" || stage(repair) === filter) &&
    (!needle || [repair.id, `#${repair.id}`, repair.device_name, repair.device_brand, repair.device_model, repair.shop_name].join(" ").toLowerCase().includes(needle))
  ).sort((a, b) => {
    if (sort === "active") {
      const closed = (repair) => Number(["completed", "rejected"].includes(stage(repair)));
      const priority = closed(a) - closed(b);
      if (priority) return priority;
    }
    const byDate = timestamp(b) - timestamp(a) || Number(b.id) - Number(a.id);
    return sort === "oldest" ? -byDate : byDate;
  });

  return (
    <AsyncList
      loading={loading} error={error} refreshing={refreshing} onRefresh={refresh}
      data={filtered} keyExtractor={(item) => String(item.id)}
      emptyText={repairs.length ? "No repairs match these filters. Try another device, shop, or repair number." : "No repair requests yet. Browse services above to find a shop for your device."}
      ListHeaderComponent={
        <View>
          <View className="mb-5 flex-row flex-wrap items-center justify-between gap-3">
            <View className="flex-1">
              <Text accessibilityRole="header" className="text-2xl font-bold text-gray-900">My repairs</Text>
              <Text className="mt-1 text-sm leading-5 text-gray-500">Stay close to every update, from request to repair.</Text>
            </View>
            <Button title="Find a service" variant="outline" onPress={() => router.push("/services")} />
          </View>
          <View className="mb-5 flex-row flex-wrap justify-between gap-y-3">
            {[
              { key: "active", label: "Active requests", value: active, icon: "layers-outline", note: "Awaiting a decision or repair work" },
              { key: "waiting", label: "Awaiting shop", value: counts.waiting, icon: "hourglass-outline", note: "Waiting for acceptance" },
              { key: "progress", label: "In progress", value: counts.progress, icon: "construct-outline", note: "Repair work underway" },
              { key: "completed", label: "Completed", value: counts.completed, icon: "checkmark-circle-outline", note: "Finished repairs" },
            ].map((stat) => (
              <View key={stat.key} style={{ width: isMobile ? "48%" : "24%" }} className="rounded-xl border border-gray-200 bg-white p-4">
                <Ionicons name={stat.icon} size={22} color={COLORS.primary} />
                <Text className="mt-3 text-2xl font-bold text-gray-900">{stat.value}</Text>
                <Text className="mt-1 text-sm font-semibold text-gray-800">{stat.label}</Text>
                <Text className="mt-1 text-xs leading-5 text-gray-400">{stat.note}</Text>
              </View>
            ))}
          </View>

          <View className="mb-4 rounded-xl border border-gray-200 bg-white p-4">
            <TextField label="Search your repairs" placeholder="Device, shop name, or repair #" value={query} onChangeText={setQuery} autoCapitalize="none" autoCorrect={false} />
            <View className="flex-row flex-wrap gap-2">
              {FILTERS.map((item) => (
                <Pressable key={item.key} onPress={() => setFilter(item.key)} accessibilityRole="button" accessibilityState={{ selected: filter === item.key }} className={`min-h-11 flex-row items-center gap-2 rounded-lg px-3 py-2 ${filter === item.key ? "bg-blue-600" : "bg-gray-50"}`}>
                  <Text className={`text-sm font-semibold ${filter === item.key ? "text-white" : "text-gray-600"}`}>{item.label}</Text>
                  <Text className={`text-xs ${filter === item.key ? "text-blue-100" : "text-gray-400"}`}>{counts[item.key]}</Text>
                </Pressable>
              ))}
            </View>
            <View className="mt-3 flex-row flex-wrap items-center gap-2">
              <Text className="text-xs text-gray-500">Sort by</Text>
              {[["newest", "Newest"], ["oldest", "Oldest"], ["active", "Active requests first"]].map(([key, label]) => (
                <Pressable key={key} onPress={() => setSort(key)} accessibilityRole="button" accessibilityLabel={`Sort by ${label}`} accessibilityState={{ selected: sort === key }} className={`min-h-11 justify-center rounded-lg px-3 py-2 ${sort === key ? "bg-blue-50" : ""}`}><Text className={`text-xs font-semibold ${sort === key ? "text-blue-700" : "text-gray-500"}`}>{label}</Text></Pressable>
              ))}
            </View>
          </View>
          <View className="mb-4 flex-row flex-wrap items-center justify-between gap-2">
            <Text className="text-sm text-gray-500">{filtered.length} of {repairs.length} requests</Text>
            <View className="flex-row flex-wrap gap-4">
              {query || filter !== "all" || sort !== "newest" ? <Pressable onPress={() => { setQuery(""); setFilter("all"); setSort("newest"); }} accessibilityRole="button" className="min-h-11 justify-center"><Text className="text-sm font-semibold text-blue-600">Reset filters</Text></Pressable> : null}
              <Pressable onPress={refresh} disabled={refreshing} accessibilityRole="button" accessibilityState={{ busy: refreshing, disabled: refreshing }} className="min-h-11 justify-center"><Text className="text-sm font-semibold text-blue-600">{refreshing ? "Refreshing…" : "Refresh"}</Text></Pressable>
            </View>
          </View>
          {isDesktop && filtered.length ? <View className="mb-2 flex-row gap-5 px-5">{[["Device & shop", 3], ["Repair update", 4], ["Request details", 2]].map(([label, flex]) => <Text key={label} style={{ flex }} className="text-xs font-semibold uppercase text-gray-400">{label}</Text>)}</View> : null}
        </View>
      }
      renderItem={({ item }) => (
        <Pressable onPress={() => router.push(`/repair/${item.id}`)} accessibilityRole="button" accessibilityLabel={`View repair #${item.id} for ${deviceName(item)} at ${item.shop_name || "your shop"}`} className="mb-4 rounded-2xl border border-gray-200 bg-white p-5 active:bg-blue-50">
          <View className={isDesktop ? "flex-row items-start gap-5" : ""}>
            <View style={isDesktop ? { flex: 3, minWidth: 0 } : undefined}>
              <View className="mb-3 flex-row flex-wrap items-center justify-between gap-2">
                <Text className="text-xs font-semibold text-gray-400">Repair #{item.id}</Text>
                {!isDesktop ? <RepairStatusBadge status={item.status} decision={item.decision} /> : null}
              </View>
              <Text className="text-lg font-bold text-gray-900">{deviceName(item)}</Text>
              {item.device_name && item.device_name !== deviceName(item) ? <Text className="mt-1 text-xs text-gray-400">{item.device_name}</Text> : null}
              <View className="mt-3 flex-row items-start gap-2"><Ionicons name="storefront-outline" size={16} color={COLORS.textMuted} /><Text className="flex-1 text-sm text-gray-600">{item.shop_name || "Shop not specified"}</Text></View>
            </View>
            <View style={isDesktop ? { flex: 4, minWidth: 0 } : undefined} className={isDesktop ? "" : "mt-4"}>
              {isDesktop ? <RepairStatusBadge status={item.status} decision={item.decision} /> : null}
              <Text className={`text-sm leading-6 text-gray-600 ${isDesktop ? "mt-3" : ""}`}>{nextStep(item)}</Text>
              <View className="mt-3"><PaymentState repair={item} /></View>
            </View>
            <View style={isDesktop ? { flex: 2, minWidth: 0 } : undefined} className={isDesktop ? "" : "mt-4 border-t border-gray-100 pt-3"}>
              <Text className="text-xs text-gray-400">Requested</Text>
              <Text className="mt-1 text-xs text-gray-600">{requestedDate(item)}</Text>
              <View className="mt-4 flex-row items-center gap-2"><Text className="text-sm font-bold text-blue-600">View repair</Text><Ionicons name="arrow-forward-outline" size={17} color={COLORS.primary} /></View>
            </View>
          </View>
        </Pressable>
      )}
    />
  );
}
