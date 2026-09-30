// app/(tabs)/repairs.jsx — GET /api/client/repairs (auth required)
import { Pressable, Text, View } from "react-native";
import { useRouter } from "expo-router";

import AsyncList from "../../components/AsyncList";
import { useFetch } from "../../lib/useFetch";

// service_requests.status values, mapped to badge colours.
const STATUS_STYLES = {
  pending: "bg-amber-100 text-amber-800",
  accepted: "bg-blue-100 text-blue-800",
  in_progress: "bg-indigo-100 text-indigo-800",
  done: "bg-emerald-100 text-emerald-800",
  completed: "bg-emerald-100 text-emerald-800",
  rejected: "bg-red-100 text-red-800",
  cancelled: "bg-gray-200 text-gray-700",
};

function StatusBadge({ status }) {
  const label = String(status ?? "unknown").replace(/_/g, " ");
  const style = STATUS_STYLES[status] ?? "bg-gray-200 text-gray-700";
  const [bg, fg] = style.split(" ");
  return (
    <View className={`rounded-full px-2.5 py-1 ${bg}`}>
      <Text className={`text-xs font-semibold capitalize ${fg}`}>{label}</Text>
    </View>
  );
}

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
            <StatusBadge status={item.status} />
          </View>

          <View className="mt-3 flex-row items-center justify-between">
            <Text className="text-xs text-gray-500">#{item.id} · {item.created_at}</Text>
            {item.payment_status ? (
              <Text className="text-xs font-medium capitalize text-gray-600">
                {String(item.payment_status).replace(/_/g, " ")}
              </Text>
            ) : null}
          </View>
        </Pressable>
      )}
    />
  );
}
