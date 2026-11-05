// Business repair queue. Workflow fields stay separate; stages below are view filters.
import { useMemo, useState } from "react";
import { ActivityIndicator, Pressable, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";

import AsyncList from "../../../components/AsyncList";
import Button from "../../../components/Button";
import TextField from "../../../components/TextField";
import { RepairStatusBadge } from "../../../components/RepairSummary";
import { useFetch } from "../../../lib/useFetch";
import { useShop } from "../../../lib/shop";
import { useResponsive } from "../../../lib/useResponsive";
import { COLORS } from "../../../constants/theme";

const FILTERS = [
  { key: "all", label: "All requests" },
  { key: "new", label: "Needs decision", icon: "file-tray-outline", note: "Accept or reject", color: "#d97706" },
  { key: "review", label: "In review", icon: "clipboard-outline", note: "Assessment, quote & payment", color: "#2563eb" },
  { key: "progress", label: "In progress", icon: "construct-outline", note: "Repair work underway", color: "#4f46e5" },
  { key: "completed", label: "Completed", icon: "checkmark-circle-outline", note: "Finished repairs", color: "#059669" },
  { key: "rejected", label: "Rejected" },
];
const SORTS = [
  { key: "newest", label: "Newest" },
  { key: "oldest", label: "Oldest" },
  { key: "decision", label: "Needs decision first" },
];

// Presentation grouping only: never used to authorize or mutate a repair.
export function getRepairQueueStage(repair) {
  const decision = String(repair.decisionStatus ?? "").toUpperCase();
  const status = String(repair.status ?? "").toUpperCase();
  if (decision === "REJECTED") return "rejected";
  if (decision === "PENDING") return "new";
  if (decision !== "ACCEPTED") return "other";
  if (status === "COMPLETED") return "completed";
  if (status === "IN_PROGRESS") return "progress";
  return "review";
}

function timestamp(repair) {
  return new Date(String(repair.created_at ?? "").replace(" ", "T")).getTime() || 0;
}

function requestDate(repair) {
  const value = timestamp(repair);
  return value ? new Date(value).toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" }) : "Date unavailable";
}

function PaymentLabel({ repair }) {
  if (getRepairQueueStage(repair) === "rejected") {
    return <Text className="text-xs text-gray-400">Payment not applicable</Text>;
  }
  const status = String(repair.payment_status ?? "").toUpperCase();
  const paid = status === "PAID";
  const failed = status === "FAILED";
  return (
    <View className="flex-row items-center gap-1.5">
      <Ionicons name={paid ? "checkmark-circle" : failed ? "alert-circle-outline" : "time-outline"} size={14} color={paid ? COLORS.success : failed ? COLORS.danger : COLORS.textMuted} />
      <Text className={`text-xs font-medium ${paid ? "text-emerald-700" : failed ? "text-red-700" : "text-gray-500"}`}>
        {paid ? "Paid" : failed ? "Payment failed" : status === "PENDING" ? "Payment pending" : "Payment not recorded"}
      </Text>
    </View>
  );
}

function QueueItem({ repair, desktop, mobile, onPress }) {
  const stage = getRepairQueueStage(repair);
  const action = stage === "new" ? "Review request" : stage === "completed" ? "View repair" : stage === "rejected" ? "View request" : "Open workspace";
  const device = repair.deviceType || "Device not specified";
  const date = requestDate(repair);
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={`${action} #${repair.id}, ${device}, ${repair.client || "Client"}`}
      className={`mb-3 rounded-xl border bg-white p-4 active:bg-blue-50 ${stage === "new" ? "border-amber-200" : "border-gray-200"}`}
    >
      <View className={desktop ? "flex-row items-center gap-4" : ""}>
        <View style={desktop ? { flex: 3, minWidth: 0 } : undefined}>
          <View className="flex-row items-start gap-3">
            <View className={`h-11 w-11 items-center justify-center rounded-xl ${stage === "new" ? "bg-amber-50" : "bg-blue-50"}`}>
              <Ionicons name="build-outline" size={20} color={stage === "new" ? "#d97706" : COLORS.primary} />
            </View>
            <View className="flex-1">
              <View className="flex-row flex-wrap items-center gap-2">
                <Text className="text-xs font-semibold text-gray-400">#{repair.id}</Text>
                {stage === "new" ? <Text className="text-xs font-semibold text-amber-700">Decision needed</Text> : null}
              </View>
              <Text className="mt-1 text-base font-bold text-gray-900">{device}</Text>
              <Text className="mt-1 text-sm text-gray-500">{repair.client || "Client"}</Text>
            </View>
            {!desktop ? <RepairStatusBadge status={repair.status} decision={repair.decisionStatus} /> : null}
          </View>
        </View>

        <View style={desktop ? { flex: 3, minWidth: 0 } : undefined} className={desktop ? "" : "mt-4"}>
          <Text numberOfLines={2} className="text-sm leading-5 text-gray-700">{repair.issue_description || "No issue description provided."}</Text>
          <Text numberOfLines={1} className="mt-2 text-xs font-medium text-blue-600">{repair.services || "Services not specified"}</Text>
        </View>

        {desktop ? (
          <>
            <View style={{ flex: 2, minWidth: 0 }} className="items-start gap-2">
              <RepairStatusBadge status={repair.status} decision={repair.decisionStatus} />
              <PaymentLabel repair={repair} />
            </View>
            <View style={{ flex: 2, minWidth: 0 }}>
              <Text className="text-xs text-gray-500">{date}</Text>
              <View className="mt-3 flex-row items-center gap-1">
                <Text className="flex-shrink text-sm font-semibold text-blue-600">{action}</Text>
                <Ionicons name="arrow-forward-outline" size={16} color={COLORS.primary} />
              </View>
            </View>
          </>
        ) : (
          <View className="mt-4 border-t border-gray-100 pt-3">
            <View className="flex-row flex-wrap items-center justify-between gap-2">
              <PaymentLabel repair={repair} />
              <Text className="text-xs text-gray-400">Requested {date}</Text>
            </View>
            <View className={`mt-3 flex-row items-center ${mobile ? "justify-between" : "justify-end gap-2"}`}>
              <Text className="text-sm font-semibold text-blue-600">{action}</Text>
              <Ionicons name="arrow-forward-outline" size={18} color={COLORS.primary} />
            </View>
          </View>
        )}
      </View>
    </Pressable>
  );
}

export default function BusinessRepairs() {
  const router = useRouter();
  const { isMobile, isDesktop } = useResponsive();
  const { shopId, loading: shopLoading, error: shopError } = useShop();
  const [filter, setFilter] = useState("all");
  const [query, setQuery] = useState("");
  const [sort, setSort] = useState("newest");
  const { data, error, loading, refreshing, refresh } = useFetch(
    shopId ? `/business/repairs/${shopId}` : null,
    (d) => d.repairs ?? []
  );

  const { filtered, counts } = useMemo(() => {
    const list = data ?? [];
    const totals = { all: list.length };
    list.forEach((repair) => {
      const stage = getRepairQueueStage(repair);
      totals[stage] = (totals[stage] || 0) + 1;
    });
    const needle = query.trim().toLowerCase();
    const matches = list.filter((repair) =>
      (filter === "all" || getRepairQueueStage(repair) === filter) &&
      (!needle || [repair.id, `#${repair.id}`, repair.deviceType, repair.client, repair.issue_description, repair.services]
        .join(" ").toLowerCase().includes(needle))
    ).sort((a, b) => {
      if (sort === "decision") {
        const priority = Number(getRepairQueueStage(b) === "new") - Number(getRepairQueueStage(a) === "new");
        if (priority) return priority;
      }
      const dateOrder = timestamp(b) - timestamp(a) || Number(b.id) - Number(a.id);
      return sort === "oldest" ? -dateOrder : dateOrder;
    });
    return { filtered: matches, counts: totals };
  }, [data, filter, query, sort]);

  if (shopLoading) {
    return <View className="flex-1 items-center justify-center bg-gray-50"><ActivityIndicator size="large" color={COLORS.primary} /></View>;
  }
  if (shopError || !shopId) {
    return <View className="flex-1 items-center justify-center bg-gray-50 p-6"><Text className="text-center text-sm text-gray-500">{shopError || "No shop is associated with this account."}</Text></View>;
  }

  return (
    <AsyncList
      loading={loading}
      error={error}
      refreshing={refreshing}
      onRefresh={refresh}
      data={filtered}
      keyExtractor={(item) => String(item.id)}
      emptyText={data?.length ? "No requests match your search or stage. Reset the filters to see all repairs." : "Your queue is clear. New repair requests will appear here."}
      ListHeaderComponent={
        <View>
          <View className="mb-5 flex-row flex-wrap items-center justify-between gap-3">
            <View className="flex-1">
              <Text accessibilityRole="header" className="text-2xl font-bold text-gray-900">Repair workspace</Text>
              <Text className="mt-1 text-sm leading-5 text-gray-500">Keep requests moving, from first review to finished repair.</Text>
            </View>
            <Button title="Refresh" variant="outline" onPress={refresh} loading={refreshing} />
          </View>

          <View className="mb-5 flex-row flex-wrap justify-between gap-y-3">
            {FILTERS.filter((item) => item.icon).map((item) => (
              <Pressable
                key={item.key}
                onPress={() => setFilter(filter === item.key ? "all" : item.key)}
                accessibilityRole="button"
                accessibilityLabel={`${item.label}: ${counts[item.key] || 0} requests`}
                accessibilityState={{ selected: filter === item.key }}
                style={{ width: isMobile ? "48%" : "24%" }}
                className={`rounded-xl border p-4 ${filter === item.key ? "border-blue-500 bg-blue-50" : "border-gray-200 bg-white"}`}
              >
                <Ionicons name={item.icon} size={22} color={item.color} />
                <Text className="mt-3 text-2xl font-bold text-gray-900">{counts[item.key] || 0}</Text>
                <Text className="mt-1 text-sm font-semibold text-gray-800">{item.label}</Text>
                <Text className="mt-1 text-xs leading-4 text-gray-500">{item.note}</Text>
              </Pressable>
            ))}
          </View>

          <View className="mb-4 rounded-xl border border-gray-200 bg-white p-4">
            <View className="flex-row flex-wrap gap-2">
              {FILTERS.map((item) => (
                <Pressable key={item.key} onPress={() => setFilter(item.key)} accessibilityRole="button" accessibilityState={{ selected: filter === item.key }} className={`min-h-11 flex-row items-center gap-2 rounded-lg px-3 py-2 ${filter === item.key ? "bg-blue-600" : "bg-gray-50"}`}>
                  <Text className={`text-sm font-semibold ${filter === item.key ? "text-white" : "text-gray-600"}`}>{item.label}</Text>
                  <Text className={`text-xs ${filter === item.key ? "text-blue-100" : "text-gray-400"}`}>{counts[item.key] || 0}</Text>
                </Pressable>
              ))}
            </View>
            <View className="mt-4">
              <TextField label="Search requests" placeholder="Device, customer, service, issue, or request #" value={query} onChangeText={setQuery} autoCapitalize="none" className="mb-0" />
            </View>
            <View className="mt-3 flex-row flex-wrap items-center gap-2">
              <Text className="mr-1 text-xs font-medium text-gray-500">Sort by</Text>
              {SORTS.map((item) => (
                <Pressable key={item.key} onPress={() => setSort(item.key)} accessibilityRole="button" accessibilityLabel={`Sort by ${item.label}`} accessibilityState={{ selected: sort === item.key }} className={`min-h-11 justify-center rounded-lg px-3 py-2 ${sort === item.key ? "bg-blue-50" : ""}`}>
                  <Text className={`text-xs font-semibold ${sort === item.key ? "text-blue-700" : "text-gray-500"}`}>{item.label}</Text>
                </Pressable>
              ))}
            </View>
          </View>

          <View className="mb-3 flex-row flex-wrap items-center justify-between gap-2">
            <Text className="text-sm font-medium text-gray-500">{filtered.length} of {counts.all || 0} requests</Text>
            {filter !== "all" || query || sort !== "newest" ? (
              <Pressable onPress={() => { setFilter("all"); setQuery(""); setSort("newest"); }} accessibilityRole="button" className="min-h-11 justify-center px-2">
                <Text className="text-sm font-semibold text-blue-600">Reset filters</Text>
              </Pressable>
            ) : null}
          </View>
          {isDesktop && filtered.length ? (
            <View className="mb-2 flex-row gap-4 px-4">
              {[["Device & customer", 3], ["Issue & services", 3], ["Status & payment", 2], ["Requested / action", 2]].map(([label, flex]) => (
                <Text key={label} style={{ flex }} className="text-xs font-semibold uppercase text-gray-400">{label}</Text>
              ))}
            </View>
          ) : null}
        </View>
      }
      renderItem={({ item }) => <QueueItem repair={item} desktop={isDesktop} mobile={isMobile} onPress={() => router.push(`/business/repairs/${item.id}`)} />}
    />
  );
}
