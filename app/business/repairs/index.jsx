// app/(business)/repairs/index.jsx — GET /api/business/repairs/:shopId
// The server resolves the shop from the JWT; the param is sent for correctness.
import { useMemo, useState } from "react";
import { ActivityIndicator, Pressable, Text, View } from "react-native";
import { useRouter } from "expo-router";

import AsyncList from "../../../components/AsyncList";
import { formatRepairDate, RepairStatusBadge } from "../../../components/RepairSummary";
import { useFetch } from "../../../lib/useFetch";
import { useShop } from "../../../lib/shop";
import { COLORS } from "../../../constants/theme";

// Decision filter; the card's primary badge shows the shared repair status.
const FILTERS = [
  { key: "all", label: "All" },
  { key: "pending", label: "Pending" },
  { key: "accepted", label: "Accepted" },
  { key: "rejected", label: "Rejected" },
];

export default function BusinessRepairs() {
  const router = useRouter();
  const { shopId, loading: shopLoading, error: shopError } = useShop();
  const [filter, setFilter] = useState("all");

  const { data, error, loading, refreshing, refresh } = useFetch(
    shopId ? `/business/repairs/${shopId}` : null,
    (d) => d.repairs ?? []
  );

  const filtered = useMemo(() => {
    const list = data ?? [];
    return filter === "all"
      ? list
      : list.filter((repair) => String(repair.decisionStatus ?? "").toLowerCase() === filter);
  }, [data, filter]);

  if (shopLoading) {
    return (
      <View className="flex-1 items-center justify-center bg-gray-50">
        <ActivityIndicator size="large" color={COLORS.primary} />
      </View>
    );
  }

  if (shopError) {
    return (
      <View className="flex-1 items-center justify-center bg-gray-50 p-6">
        <Text className="text-center text-sm text-gray-500">{shopError}</Text>
      </View>
    );
  }

  return (
    <AsyncList
      loading={loading}
      error={error}
      refreshing={refreshing}
      onRefresh={refresh}
      data={filtered}
      keyExtractor={(item) => String(item.id)}
      emptyText={filter === "all" ? "No repair requests yet." : `No ${filter} requests.`}
      ListHeaderComponent={
        <View className="mb-4 flex-row rounded-lg border border-gray-200 bg-white p-1">
          {FILTERS.map((f) => (
            <Pressable
              key={f.key}
              onPress={() => setFilter(f.key)}
              accessibilityRole="button"
              accessibilityState={{ selected: filter === f.key }}
              className={`flex-1 items-center rounded-md py-2 ${
                filter === f.key ? "bg-blue-600" : "bg-transparent"
              }`}
            >
              <Text
                className={`text-xs font-semibold ${
                  filter === f.key ? "text-white" : "text-gray-600"
                }`}
              >
                {f.label}
              </Text>
            </Pressable>
          ))}
        </View>
      }
      renderItem={({ item }) => (
        <Pressable
          onPress={() => router.push(`/business/repairs/${item.id}`)}
          className="mb-3 rounded-xl border border-gray-200 bg-white p-4 active:bg-gray-50"
        >
          <View className="flex-row items-start justify-between">
            <View className="flex-1 pr-3">
              <Text className="text-base font-semibold text-gray-900">{item.deviceType}</Text>
              <Text className="mt-0.5 text-sm text-gray-500">{item.client}</Text>
            </View>
            <RepairStatusBadge status={item.status} decision={item.decisionStatus} />
          </View>

          {item.issue_description ? (
            <Text numberOfLines={2} className="mt-2 text-sm text-gray-600">
              {item.issue_description}
            </Text>
          ) : null}

          {item.services ? (
            <Text className="mt-2 text-xs text-blue-600">{item.services}</Text>
          ) : null}

          <View className="mt-2 flex-row items-center justify-between">
            <Text className="text-xs text-gray-400">
              Request #{item.id} · {formatRepairDate(item.created_at)}
            </Text>
            {String(item.decisionStatus ?? "").toUpperCase() !== "REJECTED" && item.payment_status ? (
              <Text className="text-xs font-medium text-gray-600">
                Payment: {String(item.payment_status).replace(/_/g, " ").toLowerCase()}
              </Text>
            ) : null}
          </View>
          <Text className="mt-1 text-xs text-gray-500">
            Decision: {String(item.decisionStatus ?? "unknown").toLowerCase()}
          </Text>
        </Pressable>
      )}
    />
  );
}
