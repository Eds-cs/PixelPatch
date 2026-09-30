// app/(tabs)/services.jsx — GET /api/public/services
import { useMemo, useState } from "react";
import { Pressable, Text, View } from "react-native";
import { useRouter } from "expo-router";

import AsyncList from "../../components/AsyncList";
import TextField from "../../components/TextField";
import { useFetch } from "../../lib/useFetch";

export default function Services() {
  const router = useRouter();
  const [query, setQuery] = useState("");
  const { data, error, loading, refreshing, refresh } = useFetch(
    "/public/services",
    (d) => d.services ?? []
  );

  const filtered = useMemo(() => {
    const list = data ?? [];
    const q = query.trim().toLowerCase();
    if (!q) return list;
    return list.filter(
      (s) =>
        s.name?.toLowerCase().includes(q) || s.category?.toLowerCase().includes(q)
    );
  }, [data, query]);

  return (
    <AsyncList
      loading={loading}
      error={error}
      refreshing={refreshing}
      onRefresh={refresh}
      data={filtered}
      keyExtractor={(item) => item.service_key}
      emptyText={query ? "No services match that search." : "No services listed yet."}
      ListHeaderComponent={
        <TextField
          placeholder="Search services…"
          value={query}
          onChangeText={setQuery}
          autoCapitalize="none"
          autoCorrect={false}
        />
      }
      renderItem={({ item }) => (
        <Pressable
          onPress={() => router.push(`/service/${encodeURIComponent(item.service_key)}`)}
          className="mb-3 rounded-xl border border-gray-200 bg-white p-4 active:bg-gray-50"
        >
          <Text className="text-base font-semibold text-gray-900">{item.name}</Text>
          <Text className="mt-0.5 text-sm text-gray-500">{item.category}</Text>
          <View className="mt-2 flex-row items-center justify-between">
            <Text className="text-sm font-medium text-blue-600">
              ₱{item.min_price} – ₱{item.max_price}
            </Text>
            <Text className="text-xs text-gray-500">
              {item.shop_count} shop{item.shop_count === 1 ? "" : "s"} · ★ {item.avg_shop_rating ?? "—"}
            </Text>
          </View>
        </Pressable>
      )}
    />
  );
}
