// app/(business)/reviews.jsx — GET /api/shops/:id/reviews
import { ActivityIndicator, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";

import AsyncList from "../../components/AsyncList";
import { useFetch } from "../../lib/useFetch";
import { useShop } from "../../lib/shop";
import { COLORS } from "../../constants/theme";

function Stars({ rating }) {
  const value = Math.round(Number(rating) || 0);
  return (
    <View className="flex-row">
      {[1, 2, 3, 4, 5].map((n) => (
        <Ionicons
          key={n}
          name={n <= value ? "star" : "star-outline"}
          size={14}
          color="#f59e0b"
        />
      ))}
    </View>
  );
}

export default function BusinessReviews() {
  const { shopId, loading: shopLoading, error: shopError } = useShop();
  const { data, error, loading, refreshing, refresh } = useFetch(
    shopId ? `/shops/${shopId}/reviews` : null,
    (d) => d.reviews ?? []
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
      emptyText="No reviews yet."
      renderItem={({ item }) => (
        <View className="mb-3 rounded-xl border border-gray-200 bg-white p-4">
          <View className="flex-row items-center justify-between">
            <Text className="text-base font-semibold text-gray-900">
              {[item.first_name, item.last_name].filter(Boolean).join(" ") || "Client"}
            </Text>
            <Stars rating={item.rating} />
          </View>

          {item.comment ? (
            <Text className="mt-2 text-sm text-gray-700">{item.comment}</Text>
          ) : null}

          {item.created_at ? (
            <Text className="mt-2 text-xs text-gray-400">{item.created_at}</Text>
          ) : null}
        </View>
      )}
    />
  );
}
