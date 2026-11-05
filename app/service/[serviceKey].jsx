// Compare verified shops offering the selected service.
import { useState } from "react";
import { ActivityIndicator, Pressable, ScrollView, Text, View, RefreshControl } from "react-native";
import { Stack, useLocalSearchParams, useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";

import Button from "../../components/Button";
import TextField from "../../components/TextField";
import { SERVICE_ICONS, ServiceRating, compareServicePrices, serviceCategory, servicePrice, servicePriceRange } from "../../components/ServiceSummary";
import { useFetch } from "../../lib/useFetch";
import { useResponsive } from "../../lib/useResponsive";
import { formatAddress } from "../../lib/format";
import { COLORS } from "../../constants/theme";

export default function ServiceDetail() {
  const { serviceKey } = useLocalSearchParams();
  const router = useRouter();
  const { isMobile, isDesktop, horizontalPadding } = useResponsive();
  const [query, setQuery] = useState("");
  const [sort, setSort] = useState("rating");
  const { data, error, loading, refreshing, refresh } = useFetch(`/public/services/${encodeURIComponent(serviceKey)}`);

  if (loading) return <View className="flex-1 items-center justify-center bg-gray-50"><ActivityIndicator size="large" color={COLORS.primary} /></View>;
  if (error || !data?.service) {
    return (
      <View className="flex-1 items-center justify-center bg-gray-50 p-6">
        <Stack.Screen options={{ title: "Service", headerShown: true }} />
        <Text className="mb-4 text-center text-sm text-gray-500">{error || "Service not found."}</Text>
        <Button title="Try again" onPress={refresh} loading={refreshing} />
        <Button title="Back to services" variant="ghost" className="mt-2" onPress={() => router.push("/services")} />
      </View>
    );
  }
  const service = data.service;
  const shops = data.shops ?? [];
  const needle = query.trim().toLowerCase();
  const filtered = shops.filter((shop) => !needle || [shop.shop_name, formatAddress(shop)].join(" ").toLowerCase().includes(needle))
    .sort((a, b) => {
      if (sort === "lowest" || sort === "highest") return compareServicePrices(a.base_price, b.base_price, sort === "highest") || String(a.shop_name || "").localeCompare(String(b.shop_name || ""));
      return Number(b.rating_average || 0) - Number(a.rating_average || 0) || String(a.shop_name || "").localeCompare(String(b.shop_name || ""));
    });
  const cardWidth = isMobile ? "100%" : isDesktop ? "32%" : "48.5%";

  return (
    <ScrollView
      className="flex-1 bg-gray-50"
      contentContainerStyle={{ paddingVertical: 20, paddingHorizontal: horizontalPadding, maxWidth: isDesktop ? 1200 : 960, width: "100%", alignSelf: "center" }}
      keyboardShouldPersistTaps="handled"
      keyboardDismissMode="on-drag"
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={refresh} tintColor={COLORS.primary} />}
    >
      <Stack.Screen options={{ title: service.name || "Service", headerShown: true }} />
      <Pressable onPress={() => router.push("/services")} accessibilityRole="button" className="mb-3 min-h-11 flex-row items-center gap-2 self-start">
        <Ionicons name="arrow-back-outline" size={18} color={COLORS.primary} />
        <Text className="text-sm font-semibold text-blue-600">Back to services</Text>
      </Pressable>

      <View className={`mb-6 gap-5 rounded-2xl border border-gray-200 bg-white p-5 ${isDesktop ? "flex-row items-center" : ""}`}>
        <View style={isDesktop ? { flex: 2, minWidth: 0 } : undefined}>
          <View className="mb-3 h-12 w-12 items-center justify-center rounded-xl bg-blue-50"><Ionicons name={SERVICE_ICONS[service.category] || "build-outline"} size={25} color={COLORS.primary} /></View>
          <Text className="text-xs font-semibold text-blue-600">{serviceCategory(service.category)}</Text>
          <Text accessibilityRole="header" className="mt-2 text-2xl font-bold text-gray-900">{service.name}</Text>
          <Text className="mt-2 text-sm leading-6 text-gray-500">Compare shops offering this service, then open a shop to explore its details and request a repair.</Text>
        </View>
        <View style={isDesktop ? { flex: 1, minWidth: 0 } : undefined} className="rounded-xl bg-blue-50 p-4">
          <Text className="text-xs font-medium text-blue-700">Listed base price range</Text>
          <Text className="mt-2 text-2xl font-bold text-blue-600">{servicePriceRange(service.min_price, service.max_price)}</Text>
          <Text className="mt-2 text-xs leading-5 text-blue-800">Your shop assesses the device before preparing a quotation. These listed prices help you compare options.</Text>
        </View>
      </View>

      <View className="mb-4 flex-row flex-wrap items-center justify-between gap-3">
        <View className="flex-1">
          <Text accessibilityRole="header" className="text-xl font-bold text-gray-900">Choose your repair shop</Text>
          <Text className="mt-1 text-sm leading-5 text-gray-500">{shops.length} shop{shops.length === 1 ? "" : "s"} offering this service</Text>
        </View>
        <Button title="Refresh" variant="outline" onPress={refresh} loading={refreshing} />
      </View>
      <View className="mb-4 rounded-xl border border-gray-200 bg-white p-4">
        <TextField label="Search these shops" placeholder="Shop name or location" value={query} onChangeText={setQuery} autoCapitalize="none" autoCorrect={false} />
        <View className="flex-row flex-wrap items-center gap-2">
          <Text className="text-xs font-medium text-gray-500">Sort by</Text>
          {[["rating", "Shop rating"], ["lowest", "Lowest base price"], ["highest", "Highest base price"]].map(([key, label]) => (
            <Pressable key={key} onPress={() => setSort(key)} accessibilityRole="button" accessibilityLabel={`Sort by ${label}`} accessibilityState={{ selected: sort === key }} className={`min-h-11 justify-center rounded-lg px-3 py-2 ${sort === key ? "bg-blue-600" : "bg-gray-50"}`}>
              <Text className={`text-xs font-semibold ${sort === key ? "text-white" : "text-gray-500"}`}>{label}</Text>
            </Pressable>
          ))}
        </View>
      </View>
      <View className="mb-4 flex-row flex-wrap items-center justify-between gap-2">
        <Text className="text-sm text-gray-500">Showing {filtered.length} of {shops.length} shops</Text>
        {query || sort !== "rating" ? <Pressable onPress={() => { setQuery(""); setSort("rating"); }} accessibilityRole="button" className="min-h-11 justify-center"><Text className="text-sm font-semibold text-blue-600">Reset filters</Text></Pressable> : null}
      </View>

      <View className="mb-5 flex-row flex-wrap justify-between gap-y-4">
        {filtered.map((shop) => (
          <View key={shop.shop_id} style={{ width: cardWidth }} className="rounded-2xl border border-gray-200 bg-white p-5">
            <View className="mb-3 flex-row flex-wrap items-center justify-between gap-2">
              <View className="h-11 w-11 items-center justify-center rounded-xl bg-gray-50"><Ionicons name="storefront-outline" size={23} color={COLORS.primary} /></View>
              <ServiceRating rating={shop.rating_average} />
            </View>
            <Text className="text-lg font-bold text-gray-900">{shop.shop_name}</Text>
            {Number(shop.is_verified) === 1 ? <View className="mt-2 flex-row items-center gap-1"><Ionicons name="checkmark-circle" size={14} color={COLORS.success} /><Text className="text-xs font-medium text-emerald-700">Verified shop</Text></View> : null}
            <View className="mt-3 flex-row items-start gap-2"><Ionicons name="location-outline" size={16} color={COLORS.textMuted} /><Text className="flex-1 text-sm leading-5 text-gray-500">{formatAddress(shop) || "Address not listed"}</Text></View>
            <View className="my-4 rounded-xl bg-gray-50 p-3">
              <Text className="text-xs text-gray-500">Listed base price</Text>
              <Text className="mt-1 text-xl font-bold text-blue-600">{servicePrice(shop.base_price)}</Text>
              <View className="mt-3 flex-row items-start gap-2"><Ionicons name="time-outline" size={16} color={COLORS.textMuted} /><Text className="flex-1 text-xs leading-5 text-gray-500">Estimated turnaround: {shop.estimated_timeframe || "Ask the shop"}</Text></View>
            </View>
            <Button title="View shop" variant="outline" onPress={() => router.push(`/shop/${shop.shop_id}`)} />
          </View>
        ))}
        {!filtered.length ? <View className="w-full rounded-xl border border-gray-200 bg-white p-6"><Text className="text-center text-sm leading-5 text-gray-500">{shops.length ? "No shops match your search. Try another shop name or location." : "No verified shops currently offer this service."}</Text></View> : null}
      </View>
    </ScrollView>
  );
}
