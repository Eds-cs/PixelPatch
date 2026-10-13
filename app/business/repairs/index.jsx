// app/(business)/repairs/index.jsx — GET /api/business/repairs/:shopId
// The server resolves the shop from the JWT; the param is sent for correctness.
import { useMemo, useState } from "react";
import { ActivityIndicator, Pressable, Text, View } from "react-native";
import { useRouter } from "expo-router";

import AsyncList from "../../../components/AsyncList";
import { useFetch } from "../../../lib/useFetch";
import { useShop } from "../../../lib/shop";
import { COLORS } from "../../../constants/theme";

// service_requests.decision
const FILTERS = [
  { key: "all", label: "All" },
  { key: "pending", label: "Pending" },
  { key: "accepted", label: "Accepted" },
  { key: "rejected", label: "Rejected" },
];

const DECISION_STYLES = {
  pending: ["bg-amber-100", "text-amber-800"],
  accepted: ["bg-blue-100", "text-blue-800"],
  rejected: ["bg-red-100", "text-red-800"],
};

function DecisionBadge({ decision }) {
  const normalizedDecision = String(decision ?? "").toLowerCase();
  const [bg, fg] = DECISION_STYLES[normalizedDecision] ?? ["bg-gray-200", "text-gray-700"];
  return (
    <View className={`rounded-full px-2.5 py-1 ${bg}`}>
      <Text className={`text-xs font-semibold capitalize ${fg}`}>
        {normalizedDecision || "unknown"}
      </Text>
    </View>
  );
}

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
            <DecisionBadge decision={item.decisionStatus} />
          </View>

          {item.issue_description ? (
            <Text numberOfLines={2} className="mt-2 text-sm text-gray-600">
              {item.issue_description}
            </Text>
          ) : null}

          {item.services ? (
            <Text className="mt-2 text-xs text-blue-600">{item.services}</Text>
          ) : null}

          <Text className="mt-2 text-xs text-gray-400">Request #{item.id}</Text>
        </Pressable>
      )}
    />
  );
}
