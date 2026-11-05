// Shop dispute inbox. Proposals are business actions; decisions remain client actions.
import { useState } from "react";
import { Pressable, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";

import AsyncList from "../../../components/AsyncList";
import Button from "../../../components/Button";
import TextField from "../../../components/TextField";
import { DISPUTE_STATUSES, DisputeStatusBadge, disputeTimestamp, formatDisputeDate, resolutionLabel } from "../../../components/DisputeSummary";
import { useFetch } from "../../../lib/useFetch";
import { useResponsive } from "../../../lib/useResponsive";
import { COLORS } from "../../../constants/theme";

export default function BusinessDisputes() {
  const router = useRouter();
  const { isMobile, isDesktop } = useResponsive();
  const { data, error, loading, refreshing, refresh } = useFetch("/disputes/shop", (d) => d.disputes ?? []);
  const [status, setStatus] = useState("");
  const [query, setQuery] = useState("");
  const [sort, setSort] = useState("newest");
  const disputes = data ?? [];
  const counts = Object.fromEntries(DISPUTE_STATUSES.map((item) => [item.key, disputes.filter((dispute) => dispute.status === item.key).length]));
  const needle = query.trim().toLowerCase();
  const filtered = disputes.filter((item) =>
    (!status || item.status === status) &&
    (!needle || [item.id, `#${item.id}`, item.request_id, `#${item.request_id}`, item.first_name, item.last_name, item.device_name, item.complaint, item.issue_description, item.shop_response, resolutionLabel(item.proposed_resolution)].join(" ").toLowerCase().includes(needle))
  ).sort((a, b) => {
    if (sort === "response") {
      const priority = Number(b.status === "OPEN") - Number(a.status === "OPEN");
      if (priority) return priority;
    }
    const byDate = disputeTimestamp(b.created_at) - disputeTimestamp(a.created_at) || Number(b.id) - Number(a.id);
    return sort === "oldest" ? -byDate : byDate;
  });

  return (
    <AsyncList
      loading={loading} error={error} refreshing={refreshing} onRefresh={refresh}
      data={filtered} keyExtractor={(item) => String(item.id)}
      emptyText={disputes.length ? "No disputes match your search or status. Reset the filters to see all cases." : "No disputes have been filed for your shop."}
      ListHeaderComponent={
        <View>
          <View className="mb-5 flex-row flex-wrap items-center justify-between gap-3">
            <View className="flex-1">
              <Text accessibilityRole="header" className="text-2xl font-bold text-gray-900">Dispute inbox</Text>
              <Text className="mt-1 text-sm leading-5 text-gray-500">Understand the concern, review the repair, and propose a resolution.</Text>
            </View>
            <Button title="Refresh" variant="outline" onPress={refresh} loading={refreshing} />
          </View>
          <View className="mb-5 flex-row flex-wrap justify-between gap-y-3">
            {DISPUTE_STATUSES.map((item, index) => (
              <Pressable key={item.key} onPress={() => setStatus(status === item.key ? "" : item.key)} accessibilityRole="button" accessibilityLabel={`${item.label}: ${counts[item.key]} disputes`} accessibilityState={{ selected: status === item.key }} style={{ width: isMobile ? "48%" : "24%" }} className={`rounded-xl border p-4 ${status === item.key ? "border-blue-500 bg-blue-50" : "border-gray-200 bg-white"}`}>
                <Ionicons name={["chatbubble-ellipses-outline", "hourglass-outline", "checkmark-circle-outline", "close-circle-outline"][index]} size={22} color={item.color} />
                <Text className="mt-3 text-2xl font-bold text-gray-900">{counts[item.key]}</Text>
                <Text className="mt-1 text-sm font-semibold text-gray-700">{item.label}</Text>
              </Pressable>
            ))}
          </View>
          <View className="mb-4 rounded-xl border border-gray-200 bg-white p-4">
            <TextField label="Search disputes" value={query} onChangeText={setQuery} autoCapitalize="none" placeholder="Customer, device, complaint, or repair #" />
            <View className="flex-row flex-wrap gap-2">
              {[{ key: "", label: "All disputes" }, ...DISPUTE_STATUSES].map((item) => (
                <Pressable key={item.key} onPress={() => setStatus(item.key)} accessibilityRole="button" accessibilityState={{ selected: status === item.key }} className={`min-h-11 justify-center rounded-lg px-3 py-2 ${status === item.key ? "bg-blue-600" : "bg-gray-50"}`}>
                  <Text className={`text-sm font-semibold ${status === item.key ? "text-white" : "text-gray-600"}`}>{item.label}</Text>
                </Pressable>
              ))}
            </View>
            <View className="mt-3 flex-row flex-wrap items-center gap-2">
              <Text className="text-xs text-gray-500">Sort by</Text>
              {[["newest", "Newest"], ["oldest", "Oldest"], ["response", "Needs response first"]].map(([key, label]) => (
                <Pressable key={key} onPress={() => setSort(key)} accessibilityRole="button" accessibilityLabel={`Sort by ${label}`} accessibilityState={{ selected: sort === key }} className={`min-h-11 justify-center rounded-lg px-3 py-2 ${sort === key ? "bg-blue-50" : ""}`}><Text className={`text-xs font-semibold ${sort === key ? "text-blue-700" : "text-gray-500"}`}>{label}</Text></Pressable>
              ))}
            </View>
          </View>
          <View className="mb-3 flex-row flex-wrap items-center justify-between gap-2">
            <Text className="text-sm text-gray-500">{filtered.length} of {disputes.length} disputes</Text>
            {query || status || sort !== "newest" ? <Pressable onPress={() => { setQuery(""); setStatus(""); setSort("newest"); }} accessibilityRole="button" className="min-h-11 justify-center"><Text className="text-sm font-semibold text-blue-600">Reset filters</Text></Pressable> : null}
          </View>
          {isDesktop && filtered.length ? <View className="mb-2 flex-row gap-5 px-4">{[["Customer & repair", 3], ["Client's concern", 4], ["Resolution", 3]].map(([label, flex]) => <Text key={label} style={{ flex }} className="text-xs font-semibold uppercase text-gray-400">{label}</Text>)}</View> : null}
        </View>
      }
      renderItem={({ item }) => (
        <Pressable onPress={() => router.push(`/business/disputes/${item.id}`)} accessibilityRole="button" accessibilityLabel={`Open dispute #${item.id} for repair #${item.request_id}`} className={`mb-3 rounded-xl border bg-white p-4 active:bg-blue-50 ${item.status === "OPEN" ? "border-amber-200" : "border-gray-200"}`}>
          <View className={isDesktop ? "flex-row items-start gap-5" : ""}>
            <View style={isDesktop ? { flex: 3, minWidth: 0 } : undefined}>
              <View className="flex-row flex-wrap items-start justify-between gap-2">
                <Text className="text-xs font-semibold text-gray-400">Dispute #{item.id}</Text>
                {!isDesktop ? <DisputeStatusBadge status={item.status} /> : null}
              </View>
              <Text className="mt-2 text-base font-bold text-gray-900">{[item.first_name, item.last_name].filter(Boolean).join(" ") || "Client"}</Text>
              <Text className="mt-1 text-sm text-gray-600">{item.device_name || "Device not recorded"} · Repair #{item.request_id}</Text>
              <Text className="mt-2 text-xs leading-5 text-gray-400">Filed {formatDisputeDate(item.created_at)}</Text>
            </View>
            <View style={isDesktop ? { flex: 4, minWidth: 0 } : undefined} className={isDesktop ? "" : "mt-4"}>
              <Text className="mb-1 text-xs font-semibold uppercase text-gray-400">Client concern</Text>
              <Text numberOfLines={3} className="text-sm leading-5 text-gray-700">{item.complaint || "Open the dispute to review the client's explanation."}</Text>
              {item.proposed_resolution ? <Text className="mt-3 text-xs font-medium text-blue-600">Proposed: {resolutionLabel(item.proposed_resolution)}</Text> : null}
            </View>
            <View style={isDesktop ? { flex: 3, minWidth: 0 } : undefined} className={isDesktop ? "" : "mt-4 border-t border-gray-100 pt-3"}>
              {isDesktop ? <DisputeStatusBadge status={item.status} /> : null}
              <Text className="mt-2 text-xs leading-5 text-gray-500">{item.status === "OPEN" ? "Your response is needed." : item.status === "SHOP_PROPOSED" ? "The client reviews your proposal next." : item.status === "REJECTED" ? "The client declined the proposal." : item.status === "RESOLVED" ? "The client accepted the resolution." : "Open this case to review its status."}</Text>
              <View className="mt-3 flex-row items-center gap-2">
                <Text className="text-sm font-semibold text-blue-600">{item.status === "OPEN" ? "Review & respond" : "View dispute"}</Text>
                <Ionicons name="arrow-forward-outline" size={16} color={COLORS.primary} />
              </View>
            </View>
          </View>
        </Pressable>
      )}
    />
  );
}
