// Featured repair services from verified shops.
import { useState } from "react";
import { Pressable, Text, View } from "react-native";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";

import AsyncList from "../../components/AsyncList";
import Button from "../../components/Button";
import TextField from "../../components/TextField";
import { SERVICE_ICONS, ServiceRating, compareServicePrices, serviceCategory, servicePriceRange } from "../../components/ServiceSummary";
import { useFetch } from "../../lib/useFetch";
import { useResponsive } from "../../lib/useResponsive";
import { COLORS } from "../../constants/theme";

const SORTS = [
  { key: "recommended", label: "Featured order" },
  { key: "lowest", label: "Lowest starting price" },
  { key: "highest", label: "Highest starting price" },
  { key: "rating", label: "Shop rating" },
  { key: "shops", label: "Most shop options" },
];

export default function Services() {
  const router = useRouter();
  const { isMobile, isDesktop } = useResponsive();
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState("");
  const [sort, setSort] = useState("recommended");
  const { data, error, loading, refreshing, refresh } = useFetch("/public/services", (d) => d.services ?? []);
  const services = data ?? [];
  const categories = [...new Set(services.map((service) => service.category).filter(Boolean))].sort();
  const needle = query.trim().toLowerCase();
  const filtered = services.filter((service) =>
    (!category || service.category === category) &&
    (!needle || [service.name, service.category, serviceCategory(service.category)].join(" ").toLowerCase().includes(needle))
  ).sort((a, b) => {
    if (sort === "recommended") return 0;
    const names = String(a.name || "").localeCompare(String(b.name || ""));
    if (sort === "lowest" || sort === "highest") return compareServicePrices(a.min_price, b.min_price, sort === "highest") || names;
    if (sort === "rating") return Number(b.avg_shop_rating || 0) - Number(a.avg_shop_rating || 0) || names;
    return Number(b.shop_count || 0) - Number(a.shop_count || 0) || names;
  });
  const columns = isMobile ? 1 : isDesktop ? 3 : 2;
  const rows = [];
  for (let index = 0; index < filtered.length; index += columns) rows.push(filtered.slice(index, index + columns));
  const cardWidth = isMobile ? "100%" : isDesktop ? "32%" : "48.5%";

  return (
    <AsyncList
      loading={loading} error={error} refreshing={refreshing} onRefresh={refresh}
      data={rows} keyExtractor={(row) => row[0].service_key}
      emptyText={services.length ? "No featured services match your filters. Try another device type or search." : "No services are listed yet. Check back for repair options."}
      ListHeaderComponent={
        <View>
          <View className="mb-5 flex-row flex-wrap items-center justify-between gap-3">
            <View className="flex-1">
              <Text accessibilityRole="header" className="text-2xl font-bold text-gray-900">Find a repair service</Text>
              <Text className="mt-1 text-sm leading-5 text-gray-500">Explore services, compare base prices, and choose your shop.</Text>
            </View>
            <Button title="Refresh" variant="outline" loading={refreshing} onPress={refresh} />
          </View>

          <View className="mb-5 flex-row items-start gap-3 rounded-2xl border border-blue-100 bg-blue-50 p-4">
            <Ionicons name="shield-checkmark-outline" size={25} color={COLORS.primary} />
            <View className="flex-1">
              <Text className="text-sm font-bold text-blue-900">Compare with a little more clarity</Text>
              <Text className="mt-1 text-sm leading-5 text-blue-800">These services are offered by verified shops. Listed base prices help you compare; your shop assesses the device before preparing the final quotation.</Text>
            </View>
          </View>

          <View className="mb-4 rounded-xl border border-gray-200 bg-white p-4">
            <TextField label="Search featured services" value={query} onChangeText={setQuery} autoCapitalize="none" autoCorrect={false} placeholder="Try screen repair, battery, or laptop" />
            {categories.length ? (
              <>
                <Text className="mb-2 text-xs font-semibold uppercase text-gray-400">What device needs help?</Text>
                <View className="flex-row flex-wrap gap-2">
                  {["", ...categories].map((value) => (
                    <Pressable key={value} onPress={() => setCategory(value)} accessibilityRole="button" accessibilityLabel={value ? `Filter ${serviceCategory(value)} services` : "All device categories"} accessibilityState={{ selected: category === value }} className={`min-h-11 flex-row items-center gap-2 rounded-lg border px-3 py-2 ${category === value ? "border-blue-600 bg-blue-50" : "border-gray-200"}`}>
                      <Ionicons name={SERVICE_ICONS[value] || "grid-outline"} size={17} color={category === value ? COLORS.primary : COLORS.textMuted} />
                      <Text className={`text-sm font-semibold ${category === value ? "text-blue-700" : "text-gray-600"}`}>{value ? serviceCategory(value) : "All devices"}</Text>
                    </Pressable>
                  ))}
                </View>
              </>
            ) : null}
            <View className="mt-4 border-t border-gray-100 pt-3">
              <Text className="mb-2 text-xs font-semibold uppercase text-gray-400">Sort services</Text>
              <View className="flex-row flex-wrap gap-2">
                {SORTS.map((item) => (
                  <Pressable key={item.key} onPress={() => setSort(item.key)} accessibilityRole="button" accessibilityLabel={`Sort by ${item.label}`} accessibilityState={{ selected: sort === item.key }} className={`min-h-11 justify-center rounded-lg px-3 py-2 ${sort === item.key ? "bg-blue-600" : "bg-gray-50"}`}>
                    <Text className={`text-xs font-semibold ${sort === item.key ? "text-white" : "text-gray-500"}`}>{item.label}</Text>
                  </Pressable>
                ))}
              </View>
            </View>
          </View>

          <View className="mb-4 flex-row flex-wrap items-center justify-between gap-2">
            <Text className="text-sm text-gray-500">{filtered.length} of {services.length} featured services</Text>
            {query || category || sort !== "recommended" ? <Pressable onPress={() => { setQuery(""); setCategory(""); setSort("recommended"); }} accessibilityRole="button" className="min-h-11 justify-center"><Text className="text-sm font-semibold text-blue-600">Reset filters</Text></Pressable> : null}
          </View>
        </View>
      }
      renderItem={({ item: row }) => (
        <View className="mb-4 flex-row items-stretch justify-between">
          {row.map((service) => (
            <Pressable key={service.service_key} onPress={() => router.push(`/service/${encodeURIComponent(service.service_key)}`)} accessibilityRole="button" accessibilityLabel={`Compare shops for ${service.name}, ${serviceCategory(service.category)}`} style={{ width: cardWidth }} className="rounded-2xl border border-gray-200 bg-white p-5 active:bg-blue-50">
              <View className="mb-4 flex-row items-center gap-3">
                <View className="h-12 w-12 items-center justify-center rounded-xl bg-blue-50"><Ionicons name={SERVICE_ICONS[service.category] || "build-outline"} size={25} color={COLORS.primary} /></View>
                <Text className="flex-1 text-xs font-semibold text-blue-600">{serviceCategory(service.category)}</Text>
              </View>
              <Text className="text-lg font-bold text-gray-900">{service.name}</Text>
              <View className="mt-3"><ServiceRating rating={service.avg_shop_rating} average /></View>
              <View className="my-4 rounded-xl bg-gray-50 p-3">
                <Text className="text-xs text-gray-500">Listed base price range</Text>
                <Text className="mt-1 text-lg font-bold text-blue-600">{servicePriceRange(service.min_price, service.max_price)}</Text>
                <Text className="mt-1 text-xs leading-5 text-gray-400">Final quotation follows assessment.</Text>
              </View>
              <View className="flex-row items-center gap-2">
                <Ionicons name="storefront-outline" size={16} color={COLORS.textMuted} />
                <Text className="flex-1 text-sm text-gray-600">{service.shop_count} verified shop{Number(service.shop_count) === 1 ? "" : "s"} offering this</Text>
              </View>
              <View className="mt-5 flex-row items-center justify-between gap-2 border-t border-gray-100 pt-4">
                <Text className="flex-1 text-sm font-bold text-blue-600">Compare shops</Text>
                <Ionicons name="arrow-forward-outline" size={19} color={COLORS.primary} />
              </View>
            </Pressable>
          ))}
        </View>
      )}
    />
  );
}
