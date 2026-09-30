// app/(tabs)/index.jsx — Home. GET /api/public/shops + /api/public/services
import { Pressable, ScrollView, Text, View, RefreshControl, ActivityIndicator } from "react-native";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";

import { useFetch } from "../../lib/useFetch";
import { useAuth } from "../../lib/auth";
import { COLORS } from "../../constants/theme";

function Stars({ rating }) {
  const value = Number(rating) || 0;
  return (
    <View className="flex-row items-center">
      <Ionicons name="star" size={13} color="#f59e0b" />
      <Text className="ml-1 text-xs text-gray-600">{value.toFixed(1)}</Text>
    </View>
  );
}

export default function Home() {
  const router = useRouter();
  const { user } = useAuth();

  const shops = useFetch("/public/shops", (d) => d.shops ?? []);
  const services = useFetch("/public/services", (d) => d.services ?? []);

  const loading = shops.loading || services.loading;
  const refreshing = shops.refreshing || services.refreshing;
  const refreshAll = () => {
    shops.refresh();
    services.refresh();
  };

  if (loading) {
    return (
      <View className="flex-1 items-center justify-center bg-gray-50">
        <ActivityIndicator size="large" color={COLORS.primary} />
      </View>
    );
  }

  return (
    <ScrollView
      className="flex-1 bg-gray-50"
      contentContainerStyle={{ padding: 16, maxWidth: 720, width: "100%", alignSelf: "center" }}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={refreshAll} tintColor={COLORS.primary} />
      }
    >
      <Text className="text-2xl font-extrabold text-gray-900">
        Hi{user?.first_name ? `, ${user.first_name}` : ""} 👋
      </Text>
      <Text className="mb-6 mt-1 text-base text-gray-500">
        What needs fixing today?
      </Text>

      <Pressable
        onPress={() => router.push("/services")}
        className="mb-8 flex-row items-center rounded-xl border border-gray-200 bg-white p-4 active:bg-gray-50"
      >
        <Ionicons name="search" size={20} color={COLORS.textMuted} />
        <Text className="ml-3 text-base text-gray-400">Search repair services…</Text>
      </Pressable>

      <Text className="mb-3 text-lg font-bold text-gray-900">Popular services</Text>
      {services.error ? (
        <Text className="mb-8 text-sm text-gray-500">{services.error}</Text>
      ) : (
        <View className="mb-8">
          {(services.data ?? []).slice(0, 5).map((s) => (
            <Pressable
              key={s.service_key}
              onPress={() => router.push(`/service/${encodeURIComponent(s.service_key)}`)}
              className="mb-3 rounded-xl border border-gray-200 bg-white p-4 active:bg-gray-50"
            >
              <Text className="text-base font-semibold text-gray-900">{s.name}</Text>
              <Text className="mt-0.5 text-sm text-gray-500">{s.category}</Text>
              <View className="mt-2 flex-row items-center justify-between">
                <Text className="text-sm font-medium text-blue-600">
                  ₱{s.min_price} – ₱{s.max_price}
                </Text>
                <Text className="text-xs text-gray-500">
                  {s.shop_count} shop{s.shop_count === 1 ? "" : "s"}
                </Text>
              </View>
            </Pressable>
          ))}
          {(services.data ?? []).length === 0 ? (
            <Text className="text-sm text-gray-500">No services listed yet.</Text>
          ) : null}
        </View>
      )}

      <Text className="mb-3 text-lg font-bold text-gray-900">Top rated shops</Text>
      {shops.error ? (
        <Text className="text-sm text-gray-500">{shops.error}</Text>
      ) : (
        <View className="mb-6">
          {(shops.data ?? []).slice(0, 5).map((shop) => (
            <Pressable
              key={shop.id}
              onPress={() => router.push(`/shop/${shop.id}`)}
              className="mb-3 rounded-xl border border-gray-200 bg-white p-4 active:bg-gray-50"
            >
              <View className="flex-row items-center justify-between">
                <Text className="flex-1 text-base font-semibold text-gray-900">{shop.name}</Text>
                <Stars rating={shop.rating_average} />
              </View>
              <Text className="mt-1 text-sm text-gray-500">
                {[shop.street, shop.barangay, shop.province].filter(Boolean).join(", ")}
              </Text>
              <Text className="mt-1 text-xs text-gray-500">
                {shop.open_time?.slice(0, 5)} – {shop.closing_time?.slice(0, 5)} · {shop.days_from}–{shop.days_to}
              </Text>
            </Pressable>
          ))}
          {(shops.data ?? []).length === 0 ? (
            <Text className="text-sm text-gray-500">No verified shops yet.</Text>
          ) : null}
        </View>
      )}
    </ScrollView>
  );
}
