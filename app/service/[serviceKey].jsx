// app/service/[serviceKey].jsx — GET /api/public/services/:serviceKey
import { ActivityIndicator, Pressable, ScrollView, Text, View, RefreshControl } from "react-native";
import { Stack, useLocalSearchParams, useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";

import { useFetch } from "../../lib/useFetch";
import { COLORS } from "../../constants/theme";

export default function ServiceDetail() {
  const { serviceKey } = useLocalSearchParams();
  const router = useRouter();
  const { data, error, loading, refreshing, refresh } = useFetch(
    `/public/services/${encodeURIComponent(serviceKey)}`
  );

  if (loading) {
    return (
      <View className="flex-1 items-center justify-center bg-gray-50">
        <ActivityIndicator size="large" color={COLORS.primary} />
      </View>
    );
  }

  if (error) {
    return (
      <View className="flex-1 items-center justify-center bg-gray-50 p-6">
        <Stack.Screen options={{ title: "Service", headerShown: true }} />
        <Text className="text-center text-sm text-gray-500">{error}</Text>
      </View>
    );
  }

  const service = data?.service;
  const shops = data?.shops ?? [];

  return (
    <ScrollView
      className="flex-1 bg-gray-50"
      contentContainerStyle={{ padding: 16, maxWidth: 720, width: "100%", alignSelf: "center" }}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={refresh} tintColor={COLORS.primary} />
      }
    >
      <Stack.Screen options={{ title: service?.name ?? "Service", headerShown: true }} />

      <View className="mb-6 rounded-xl border border-gray-200 bg-white p-5">
        <Text className="text-xl font-bold text-gray-900">{service?.name}</Text>
        <Text className="mt-1 text-sm text-gray-500">{service?.category}</Text>

        <View className="mt-4 flex-row justify-between">
          <View>
            <Text className="text-xs text-gray-500">Price range</Text>
            <Text className="mt-0.5 text-base font-semibold text-blue-600">
              ₱{service?.min_price} – ₱{service?.max_price}
            </Text>
          </View>
          <View>
            <Text className="text-xs text-gray-500">Turnaround</Text>
            <Text className="mt-0.5 text-base font-semibold text-gray-900">
              {service?.min_estimated_time} – {service?.max_estimated_time}
            </Text>
          </View>
        </View>
      </View>

      <Text className="mb-3 text-lg font-bold text-gray-900">
        {shops.length} shop{shops.length === 1 ? "" : "s"} offering this
      </Text>

      {shops.map((shop) => (
        <Pressable
          key={shop.shop_id}
          onPress={() => router.push(`/shop/${shop.shop_id}`)}
          className="mb-3 rounded-xl border border-gray-200 bg-white p-4 active:bg-gray-50"
        >
          <View className="flex-row items-start justify-between">
            <Text className="flex-1 pr-2 text-base font-semibold text-gray-900">
              {shop.shop_name}
            </Text>
            <View className="flex-row items-center">
              <Ionicons name="star" size={13} color="#f59e0b" />
              <Text className="ml-1 text-xs text-gray-600">
                {Number(shop.rating_average ?? 0).toFixed(1)}
              </Text>
            </View>
          </View>

          <Text className="mt-1 text-sm text-gray-500">
            {[shop.street, shop.barangay, shop.province].filter(Boolean).join(", ")}
          </Text>

          <View className="mt-3 flex-row items-center justify-between">
            <Text className="text-sm font-semibold text-blue-600">₱{shop.base_price}</Text>
            <Text className="text-xs text-gray-500">{shop.estimated_timeframe}</Text>
          </View>
        </Pressable>
      ))}

      {shops.length === 0 ? (
        <Text className="text-sm text-gray-500">No shops currently offer this service.</Text>
      ) : null}
    </ScrollView>
  );
}
