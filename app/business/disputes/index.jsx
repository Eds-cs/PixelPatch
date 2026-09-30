// app/(business)/disputes/index.jsx — GET /api/disputes/shop
import { Pressable, Text, View } from "react-native";
import { useRouter } from "expo-router";

import AsyncList from "../../../components/AsyncList";
import { useFetch } from "../../../lib/useFetch";

const STATUS_STYLES = {
  OPEN: ["bg-amber-100", "text-amber-800"],
  PROPOSED: ["bg-blue-100", "text-blue-800"],
  ACCEPTED: ["bg-emerald-100", "text-emerald-800"],
  REJECTED: ["bg-red-100", "text-red-800"],
  RESOLVED: ["bg-emerald-100", "text-emerald-800"],
};

function StatusBadge({ status }) {
  const [bg, fg] = STATUS_STYLES[status] ?? ["bg-gray-200", "text-gray-700"];
  return (
    <View className={`rounded-full px-2.5 py-1 ${bg}`}>
      <Text className={`text-xs font-semibold ${fg}`}>{status ?? "UNKNOWN"}</Text>
    </View>
  );
}

export default function BusinessDisputes() {
  const router = useRouter();
  const { data, error, loading, refreshing, refresh } = useFetch(
    "/disputes/shop",
    (d) => d.disputes ?? []
  );

  return (
    <AsyncList
      loading={loading}
      error={error}
      refreshing={refreshing}
      onRefresh={refresh}
      data={data}
      keyExtractor={(item) => String(item.id)}
      emptyText="No disputes filed against your shop."
      renderItem={({ item }) => (
        <Pressable
          onPress={() => router.push(`/business/disputes/${item.id}`)}
          className="mb-3 rounded-xl border border-gray-200 bg-white p-4 active:bg-gray-50"
        >
          <View className="flex-row items-start justify-between">
            <View className="flex-1 pr-3">
              <Text className="text-base font-semibold text-gray-900">
                {[item.first_name, item.last_name].filter(Boolean).join(" ")}
              </Text>
              <Text className="mt-0.5 text-sm text-gray-500">
                Request #{item.request_id}
              </Text>
            </View>
            <StatusBadge status={item.status} />
          </View>

          {item.proposed_resolution ? (
            <Text className="mt-2 text-sm text-blue-600">
              Proposed: {item.proposed_resolution}
            </Text>
          ) : null}

          <Text className="mt-2 text-xs text-gray-400">Filed {item.created_at}</Text>
        </Pressable>
      )}
    />
  );
}
