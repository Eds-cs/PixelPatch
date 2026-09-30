// app/(business)/services.jsx — GET /api/shops/:id/services
import { ActivityIndicator, Text, View } from "react-native";

import AsyncList from "../../components/AsyncList";
import { useFetch } from "../../lib/useFetch";
import { useShop } from "../../lib/shop";
import { COLORS } from "../../constants/theme";

const PESO = "\u20B1";

export default function BusinessServices() {
  const { shopId, loading: shopLoading, error: shopError } = useShop();
  const { data, error, loading, refreshing, refresh } = useFetch(
    shopId ? `/shops/${shopId}/services` : null,
    (d) => d.services ?? []
  );

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
      data={data}
      keyExtractor={(item) => String(item.id)}
      emptyText="You haven't listed any services yet."
      renderItem={({ item }) => (
        <View className="mb-3 rounded-xl border border-gray-200 bg-white p-4">
          <View className="flex-row items-start justify-between">
            <View className="flex-1 pr-3">
              <Text className="text-base font-semibold text-gray-900">{item.name}</Text>
              {item.category ? (
                <Text className="mt-0.5 text-sm text-gray-500">{item.category}</Text>
              ) : null}
            </View>
            <Text className="text-base font-bold text-blue-600">
              {PESO}
              {item.base_price}
            </Text>
          </View>

          {item.estimated_timeframe ? (
            <Text className="mt-2 text-xs text-gray-500">
              Turnaround: {item.estimated_timeframe}
            </Text>
          ) : null}

          {item.description ? (
            <Text className="mt-2 text-sm text-gray-600">{item.description}</Text>
          ) : null}
        </View>
      )}
    />
  );
}
