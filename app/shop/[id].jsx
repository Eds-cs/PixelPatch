// app/shop/[id].jsx
// GET /api/shops/:id, /api/shops/:id/services, /api/shops/:id/reviews
import { ActivityIndicator, RefreshControl, ScrollView, Text, View } from "react-native";
import { Stack, useLocalSearchParams, useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";

import Button from "../../components/Button";
import { useFetch } from "../../lib/useFetch";
import { COLORS } from "../../constants/theme";

const PESO = "₱";

function Stars({ rating }) {
  const value = Math.round(Number(rating) || 0);
  return (
    <View className="flex-row">
      {[1, 2, 3, 4, 5].map((n) => (
        <Ionicons key={n} name={n <= value ? "star" : "star-outline"} size={14} color="#f59e0b" />
      ))}
    </View>
  );
}

export default function ShopDetail() {
  const { id } = useLocalSearchParams();
  const router = useRouter();

  const shop = useFetch(`/shops/${id}`, (d) => d.shop ?? null);
  const services = useFetch(`/shops/${id}/services`, (d) => d.services ?? []);
  const reviews = useFetch(`/shops/${id}/reviews`, (d) => d.reviews ?? []);

  if (shop.loading) {
    return (
      <View className="flex-1 items-center justify-center bg-gray-50">
        <ActivityIndicator size="large" color={COLORS.primary} />
      </View>
    );
  }

  const s = shop.data;

  return (
    <ScrollView
      className="flex-1 bg-gray-50"
      contentContainerStyle={{ padding: 16, maxWidth: 720, width: "100%", alignSelf: "center" }}
      refreshControl={
        <RefreshControl
          refreshing={shop.refreshing}
          onRefresh={() => {
            shop.refresh();
            services.refresh();
            reviews.refresh();
          }}
          tintColor={COLORS.primary}
        />
      }
    >
      <Stack.Screen options={{ title: s?.name ?? "Shop", headerShown: true }} />

      <View className="mb-4 rounded-xl border border-gray-200 bg-white p-5">
        <View className="flex-row items-start justify-between">
          <Text className="flex-1 pr-3 text-xl font-bold text-gray-900">{s?.name}</Text>
          {s?.is_verified ? (
            <View className="flex-row items-center rounded-full bg-emerald-100 px-2.5 py-1">
              <Ionicons name="checkmark-circle" size={12} color="#047857" />
              <Text className="ml-1 text-xs font-semibold text-emerald-700">Verified</Text>
            </View>
          ) : null}
        </View>

        <View className="mt-2 flex-row items-center">
          <Stars rating={s?.rating_average} />
          <Text className="ml-2 text-sm text-gray-600">
            {Number(s?.rating_average ?? 0).toFixed(1)} ({reviews.data?.length ?? 0})
          </Text>
        </View>

        {s?.open_time && s?.closing_time ? (
          <Text className="mt-3 text-sm text-gray-500">
            Open {String(s.open_time).slice(0, 5)} – {String(s.closing_time).slice(0, 5)}
            {s.days_from ? ` · ${s.days_from}–${s.days_to}` : ""}
          </Text>
        ) : null}
      </View>

      <Button
        title="Request a repair"
        className="mb-6"
        onPress={() => router.push(`/request/${id}`)}
      />

      <Text className="mb-3 text-lg font-bold text-gray-900">Services</Text>
      <View className="mb-6">
        {(services.data ?? []).map((svc) => (
          <View key={svc.id} className="mb-3 rounded-xl border border-gray-200 bg-white p-4">
            <View className="flex-row items-start justify-between">
              <View className="flex-1 pr-3">
                <Text className="text-base font-semibold text-gray-900">{svc.name}</Text>
                {svc.category ? (
                  <Text className="mt-0.5 text-sm text-gray-500">{svc.category}</Text>
                ) : null}
              </View>
              <Text className="text-base font-bold text-blue-600">
                {PESO}
                {svc.base_price}
              </Text>
            </View>
            {svc.estimated_timeframe ? (
              <Text className="mt-2 text-xs text-gray-500">{svc.estimated_timeframe}</Text>
            ) : null}
          </View>
        ))}
        {(services.data ?? []).length === 0 ? (
          <Text className="text-sm text-gray-500">This shop has no listed services.</Text>
        ) : null}
      </View>

      <Text className="mb-3 text-lg font-bold text-gray-900">Reviews</Text>
      <View className="mb-8">
        {(reviews.data ?? []).slice(0, 10).map((r) => (
          <View key={r.id} className="mb-3 rounded-xl border border-gray-200 bg-white p-4">
            <View className="flex-row items-center justify-between">
              <Text className="text-sm font-semibold text-gray-900">
                {[r.first_name, r.last_name].filter(Boolean).join(" ") || "Client"}
              </Text>
              <Stars rating={r.rating} />
            </View>
            {r.comment ? (
              <Text className="mt-2 text-sm text-gray-700">{r.comment}</Text>
            ) : null}
          </View>
        ))}
        {(reviews.data ?? []).length === 0 ? (
          <Text className="text-sm text-gray-500">No reviews yet.</Text>
        ) : null}
      </View>
    </ScrollView>
  );
}
