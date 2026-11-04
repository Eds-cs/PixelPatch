// app/(tabs)/repairs.jsx — GET /api/client/repairs (auth required)
import { Pressable, Text, View } from "react-native";
import { useRouter } from "expo-router";

import AsyncList from "../../components/AsyncList";
import { formatRepairDate, RepairStatusBadge } from "../../components/RepairSummary";
import { useFetch } from "../../lib/useFetch";

export default function Repairs() {
  const router = useRouter();
  const { data, error, loading, refreshing, refresh } = useFetch(
    "/client/repairs",
    (d) => d.repairs ?? []
  );

  return (
    <AsyncList
      loading={loading}
      error={error}
      refreshing={refreshing}
      onRefresh={refresh}
      data={data}
      keyExtractor={(item) => String(item.id)}
      emptyText="You have no repair requests yet."
      renderItem={({ item }) => (
        <Pressable
          onPress={() => router.push(`/repair/${item.id}`)}
          className="mb-3 rounded-xl border border-gray-200 bg-white p-4 active:bg-gray-50"
        >
          <View className="flex-row items-start justify-between">
            <View className="flex-1 pr-3">
              <Text className="text-base font-semibold text-gray-900">
                {[item.device_brand, item.device_model].filter(Boolean).join(" ") ||
                  item.device_name}
              </Text>
              <Text className="mt-0.5 text-sm text-gray-500">{item.shop_name}</Text>
            </View>
            <RepairStatusBadge status={item.status} decision={item.decision} />
          </View>

          <View className="mt-3 flex-row items-center justify-between">
            <Text className="text-xs text-gray-500">
              #{item.id} · {formatRepairDate(item.created_at)}
            </Text>
            {String(item.decision ?? "").toUpperCase() !== "REJECTED" && item.payment_status ? (
              <Text className="text-xs font-medium text-gray-600">
                Payment: {String(item.payment_status).replace(/_/g, " ").toLowerCase()}
              </Text>
            ) : null}
          </View>
          {item.decision ? (
            <Text className="mt-2 text-xs text-gray-500">
              Decision: {String(item.decision).toLowerCase()}
            </Text>
          ) : null}
        </Pressable>
      )}
    />
  );
}
