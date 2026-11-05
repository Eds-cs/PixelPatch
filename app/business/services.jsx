// Shop service catalog. Uses the existing read-only service API.
import { useState } from "react";
import { ActivityIndicator, Pressable, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";

import AsyncList from "../../components/AsyncList";
import Button from "../../components/Button";
import TextField from "../../components/TextField";
import Modal from "../../components/Modal";
import { useFetch } from "../../lib/useFetch";
import { useShop } from "../../lib/shop";
import { useResponsive } from "../../lib/useResponsive";
import { COLORS } from "../../constants/theme";

const METHODS = [
  { key: "accepts_pickup", label: "Pickup", icon: "car-outline" },
  { key: "accepts_dropoff", label: "Drop-off", icon: "storefront-outline" },
  { key: "accepts_onsite", label: "On-site", icon: "location-outline" },
];
const money = (value) => value !== null && value !== undefined && value !== "" && Number.isFinite(Number(value))
  ? "₱" + Number(value).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })
  : "Not priced";
const categoryLabel = (value) => value ? String(value).toLowerCase().replace(/_/g, " ").replace(/\b\w/g, (letter) => letter.toUpperCase()) : "Uncategorized";
const supports = (service, key) => Number(service[key]) === 1;

function Methods({ service }) {
  const enabled = METHODS.filter((method) => supports(service, method.key));
  return (
    <View className="flex-row flex-wrap gap-2">
      {enabled.length ? enabled.map((method) => (
        <View key={method.key} className="flex-row items-center gap-1.5 rounded-md bg-gray-50 px-2 py-1.5">
          <Ionicons name={method.icon} size={14} color={COLORS.textMuted} />
          <Text className="text-xs font-medium text-gray-600">{method.label}</Text>
        </View>
      )) : <Text className="text-xs text-gray-400">Service methods not specified</Text>}
    </View>
  );
}

export default function BusinessServices() {
  const { isMobile, isDesktop } = useResponsive();
  const { shopId, loading: shopLoading, error: shopError } = useShop();
  const { data, error, loading, refreshing, refresh } = useFetch(shopId ? `/shops/${shopId}/services` : null, (d) => d.services ?? []);
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState("");
  const [method, setMethod] = useState("");
  const [sort, setSort] = useState("name");
  const [selected, setSelected] = useState(null);
  const services = data ?? [];
  const categories = [...new Set(services.map((item) => item.category).filter(Boolean))].sort();
  const prices = services.filter((item) => item.base_price !== null && item.base_price !== "" && Number.isFinite(Number(item.base_price))).map((item) => Number(item.base_price));
  const needle = query.trim().toLowerCase();
  const filtered = services.filter((item) =>
    (!category || item.category === category) && (!method || supports(item, method)) &&
    (!needle || [item.name, item.description, item.category, item.estimated_timeframe].join(" ").toLowerCase().includes(needle))
  ).sort((a, b) => {
    const nameOrder = String(a.name || "").localeCompare(String(b.name || "")) || Number(a.id) - Number(b.id);
    const priceA = a.base_price === null || a.base_price === "" || a.base_price === undefined ? NaN : Number(a.base_price);
    const priceB = b.base_price === null || b.base_price === "" || b.base_price === undefined ? NaN : Number(b.base_price);
    if (sort !== "name") {
      if (!Number.isFinite(priceA)) return Number.isFinite(priceB) ? 1 : nameOrder;
      if (!Number.isFinite(priceB)) return -1;
      return (sort === "lowest" ? priceA - priceB : priceB - priceA) || nameOrder;
    }
    return nameOrder;
  });

  if (shopLoading) return <View className="flex-1 items-center justify-center bg-gray-50"><ActivityIndicator size="large" color={COLORS.primary} /></View>;
  if (shopError || !shopId) return <View className="flex-1 items-center justify-center bg-gray-50 p-6"><Text className="text-center text-sm text-gray-500">{shopError || "No shop is associated with this account."}</Text></View>;

  return (
    <View className="flex-1 bg-gray-50">
      <AsyncList
        loading={loading} error={error} refreshing={refreshing} onRefresh={refresh}
        data={filtered} keyExtractor={(item) => String(item.id)}
        emptyText={services.length ? "No services match these filters. Try another category, method, or search." : "Your shop has no listed services yet."}
        ListHeaderComponent={
          <View>
            <View className="mb-5 flex-row flex-wrap items-center justify-between gap-3">
              <View className="flex-1">
                <Text accessibilityRole="header" className="text-2xl font-bold text-gray-900">Service catalog</Text>
                <Text className="mt-1 text-sm leading-5 text-gray-500">Explore your offerings, base prices, and service options.</Text>
              </View>
              <Button title="Refresh" variant="outline" onPress={refresh} loading={refreshing} />
            </View>
            <View className="mb-5 flex-row flex-wrap justify-between gap-y-3">
              {[
                { label: "Listed services", value: services.length, note: "In your shop catalog", icon: "pricetags-outline" },
                { label: "Device categories", value: categories.length, note: "Across your listed services", icon: "grid-outline" },
                { label: "Starting base price", value: prices.length ? money(Math.min(...prices)) : "—", note: "Lowest listed service price", icon: "cash-outline" },
              ].map((stat) => (
                <View key={stat.label} style={{ width: isMobile ? "100%" : "32%" }} className={`rounded-xl border border-gray-200 bg-white p-4 ${isMobile ? "flex-row items-center gap-4" : ""}`}>
                  <Ionicons name={stat.icon} size={24} color={COLORS.primary} />
                  <View className="flex-1">
                    <Text className={`text-xs font-medium text-gray-500 ${isMobile ? "" : "mt-3"}`}>{stat.label}</Text>
                    <Text className="mt-1 text-2xl font-bold text-gray-900">{stat.value}</Text>
                    <Text className="mt-1 text-xs leading-5 text-gray-400">{stat.note}</Text>
                  </View>
                </View>
              ))}
            </View>
            <View className="mb-4 rounded-xl border border-gray-200 bg-white p-4">
              <TextField label="Search services" value={query} onChangeText={setQuery} placeholder="Service name, category, or description" autoCapitalize="none" />
              <Text className="mb-2 text-xs font-semibold uppercase text-gray-500">Device category</Text>
              <View className="flex-row flex-wrap gap-2">
                {["", ...categories].map((value) => <Pressable key={value} onPress={() => setCategory(value)} accessibilityRole="button" accessibilityState={{ selected: category === value }} className={`min-h-11 justify-center rounded-lg px-3 py-2 ${category === value ? "bg-blue-600" : "bg-gray-50"}`}><Text className={`text-sm font-semibold ${category === value ? "text-white" : "text-gray-600"}`}>{value ? categoryLabel(value) : "All categories"}</Text></Pressable>)}
              </View>
              <Text className="mb-2 mt-4 text-xs font-semibold uppercase text-gray-500">Service method</Text>
              <View className="flex-row flex-wrap gap-2">
                {[{ key: "", label: "All methods" }, ...METHODS].map((item) => <Pressable key={item.key} onPress={() => setMethod(item.key)} accessibilityRole="button" accessibilityState={{ selected: method === item.key }} className={`min-h-11 justify-center rounded-lg px-3 py-2 ${method === item.key ? "bg-blue-50" : "bg-gray-50"}`}><Text className={`text-sm font-semibold ${method === item.key ? "text-blue-700" : "text-gray-600"}`}>{item.label}</Text></Pressable>)}
              </View>
              <View className="mt-3 flex-row flex-wrap items-center gap-2">
                <Text className="text-xs text-gray-500">Sort by</Text>
                {[["name", "Name A–Z"], ["lowest", "Price: low to high"], ["highest", "Price: high to low"]].map(([key, label]) => <Pressable key={key} onPress={() => setSort(key)} accessibilityRole="button" accessibilityLabel={`Sort by ${label}`} accessibilityState={{ selected: sort === key }} className={`min-h-11 justify-center rounded-lg px-3 py-2 ${sort === key ? "bg-blue-50" : ""}`}><Text className={`text-xs font-semibold ${sort === key ? "text-blue-700" : "text-gray-500"}`}>{label}</Text></Pressable>)}
              </View>
            </View>
            <View className="mb-3 flex-row flex-wrap items-center justify-between gap-2">
              <Text className="text-sm text-gray-500">{filtered.length} of {services.length} services</Text>
              {query || category || method || sort !== "name" ? <Pressable onPress={() => { setQuery(""); setCategory(""); setMethod(""); setSort("name"); }} accessibilityRole="button" className="min-h-11 justify-center"><Text className="text-sm font-semibold text-blue-600">Reset filters</Text></Pressable> : null}
            </View>
            {isDesktop && filtered.length ? <View className="mb-2 flex-row gap-5 px-4">{[["Service", 4], ["Service options", 3], ["Base price", 2]].map(([label, flex]) => <Text key={label} style={{ flex }} className="text-xs font-semibold uppercase text-gray-400">{label}</Text>)}</View> : null}
          </View>
        }
        renderItem={({ item }) => (
          <Pressable onPress={() => setSelected(item)} accessibilityRole="button" accessibilityLabel={`View service: ${item.name}, base price ${money(item.base_price)}`} className="mb-3 rounded-xl border border-gray-200 bg-white p-4 active:bg-blue-50">
            <View className={isDesktop ? "flex-row items-start gap-5" : ""}>
              <View style={isDesktop ? { flex: 4, minWidth: 0 } : undefined}>
                <Text className="mb-2 text-xs font-semibold text-blue-600">{categoryLabel(item.category)}</Text>
                <Text className="text-base font-bold text-gray-900">{item.name || "Unnamed service"}</Text>
                <Text numberOfLines={2} className="mt-2 text-sm leading-5 text-gray-500">{item.description || "No service description provided."}</Text>
              </View>
              <View style={isDesktop ? { flex: 3, minWidth: 0 } : undefined} className={isDesktop ? "" : "mt-4"}>
                <Methods service={item} />
                <Text className="mt-3 text-xs leading-5 text-gray-500">Estimated turnaround: {item.estimated_timeframe || "Not specified"}</Text>
              </View>
              <View style={isDesktop ? { flex: 2, minWidth: 0 } : undefined} className={isDesktop ? "" : "mt-4 flex-row flex-wrap items-center justify-between gap-2 border-t border-gray-100 pt-3"}>
                <View><Text className="text-xs text-gray-400">Base price</Text><Text className="mt-1 text-lg font-bold text-blue-600">{money(item.base_price)}</Text></View>
                <Text className="mt-3 text-sm font-semibold text-blue-600">View details →</Text>
              </View>
            </View>
          </Pressable>
        )}
      />
      <Modal visible={Boolean(selected)} onClose={() => setSelected(null)} title="Service details">
        {selected ? (
          <View>
            <Text className="text-xs font-semibold text-blue-600">{categoryLabel(selected.category)} · Service #{selected.id}</Text>
            <Text className="mt-2 text-xl font-bold text-gray-900">{selected.name}</Text>
            <Text className="mb-1 mt-5 text-xs font-semibold uppercase text-gray-400">Base price</Text>
            <Text className="text-2xl font-bold text-blue-600">{money(selected.base_price)}</Text>
            <Text className="mt-2 text-xs leading-5 text-gray-500">This is the listed base price. A repair quotation determines the final cost.</Text>
            <Text className="mb-2 mt-5 text-xs font-semibold uppercase text-gray-400">About this service</Text>
            <Text className="text-sm leading-6 text-gray-700">{selected.description || "No description provided."}</Text>
            <Text className="mb-2 mt-5 text-xs font-semibold uppercase text-gray-400">Service methods</Text>
            <Methods service={selected} />
            <Text className="mb-2 mt-5 text-xs font-semibold uppercase text-gray-400">Estimated turnaround</Text>
            <Text className="mb-4 text-sm text-gray-700">{selected.estimated_timeframe || "Not specified"}</Text>
          </View>
        ) : null}
      </Modal>
    </View>
  );
}
