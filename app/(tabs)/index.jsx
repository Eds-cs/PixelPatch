// Customer home: discovery and shortcuts using the existing public listing APIs.
import { useState } from "react";
import { ActivityIndicator, Pressable, RefreshControl, ScrollView, Text, View } from "react-native";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";

import Button from "../../components/Button";
import TextField from "../../components/TextField";
import { useFetch } from "../../lib/useFetch";
import { useAuth } from "../../lib/auth";
import { useResponsive } from "../../lib/useResponsive";
import { formatAddress } from "../../lib/format";
import { COLORS } from "../../constants/theme";

const CATEGORY_ICONS = {
  SMARTPHONE: "phone-portrait-outline", LAPTOP: "laptop-outline", DESKTOP: "desktop-outline",
  TABLET: "tablet-portrait-outline", SMARTWATCH: "watch-outline", CONTROLLER: "game-controller-outline",
};
const categoryName = (value) => value
  ? String(value).toLowerCase().replace(/_/g, " ").replace(/\b\w/g, (letter) => letter.toUpperCase())
  : "Other devices";
const price = (value) => value !== null && value !== undefined && value !== "" && Number.isFinite(Number(value))
  ? "₱" + Number(value).toLocaleString(undefined, { maximumFractionDigits: 2 })
  : null;

function PriceRange({ service }) {
  const minimum = price(service.min_price);
  const maximum = price(service.max_price);
  return <Text className="text-base font-bold text-blue-600">{minimum && maximum ? minimum === maximum ? minimum : `${minimum} – ${maximum}` : minimum || maximum || "Ask shop for pricing"}</Text>;
}

function Rating({ value }) {
  const rating = Number(value);
  return (
    <View className="flex-row items-center gap-1">
      <Ionicons name={rating > 0 ? "star" : "star-outline"} size={14} color={rating > 0 ? "#f59e0b" : COLORS.textMuted} />
      <Text className="text-xs font-semibold text-gray-600">{Number.isFinite(rating) && rating > 0 ? rating.toFixed(1) : "Not yet rated"}</Text>
    </View>
  );
}

function schedule(shop) {
  const opening = shop.open_time?.slice(0, 5);
  const closing = shop.closing_time?.slice(0, 5);
  const hours = opening && closing ? `${opening}–${closing}` : "";
  const days = [shop.days_from, shop.days_to].filter(Boolean).join("–");
  return [days, hours].filter(Boolean).join(" · ") || "Hours not listed";
}

function SectionHeading({ title, subtitle, action, onPress }) {
  return (
    <View className="mb-4 flex-row flex-wrap items-center justify-between gap-2">
      <View className="flex-1">
        <Text accessibilityRole="header" className="text-xl font-bold text-gray-900">{title}</Text>
        <Text className="mt-1 text-sm leading-5 text-gray-500">{subtitle}</Text>
      </View>
      {onPress ? (
        <Pressable onPress={onPress} accessibilityRole="button" className="min-h-11 flex-row items-center gap-1 px-2">
          <Text className="text-sm font-semibold text-blue-600">{action}</Text>
          <Ionicons name="arrow-forward-outline" size={16} color={COLORS.primary} />
        </Pressable>
      ) : null}
    </View>
  );
}

function ListingState({ loading, error, onRetry, emptyText }) {
  return (
    <View className="w-full items-center rounded-xl border border-gray-200 bg-white p-6">
      {loading ? (
        <View className="flex-row items-center gap-3">
          <ActivityIndicator color={COLORS.primary} />
          <Text className="text-sm text-gray-500">Loading listings…</Text>
        </View>
      ) : (
        <>
          <Ionicons name={error ? "cloud-offline-outline" : "search-outline"} size={26} color={COLORS.textMuted} />
          <Text className="mt-3 text-center text-sm leading-5 text-gray-500">{error || emptyText}</Text>
          {error ? <Button title="Try again" variant="outline" className="mt-4" onPress={onRetry} /> : null}
        </>
      )}
    </View>
  );
}

export default function Home() {
  const router = useRouter();
  const { user } = useAuth();
  const { isMobile, isDesktop, horizontalPadding } = useResponsive();
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState("");
  const [showAllShops, setShowAllShops] = useState(false);
  const shops = useFetch("/public/shops", (d) => d.shops ?? []);
  const services = useFetch("/public/services", (d) => d.services ?? []);
  const refreshing = shops.refreshing || services.refreshing;
  const refreshAll = () => { shops.refresh(); services.refresh(); };
  const serviceList = services.data ?? [];
  const shopList = shops.data ?? [];
  const categories = [...new Set(serviceList.map((item) => item.category).filter(Boolean))].sort();
  const needle = query.trim().toLowerCase();
  const filteredServices = serviceList.filter((item) =>
    (!category || item.category === category) &&
    (!needle || [item.name, item.category].join(" ").toLowerCase().includes(needle))
  );
  const filteredShops = shopList.filter((shop) =>
    !needle || [shop.name, formatAddress(shop)].join(" ").toLowerCase().includes(needle)
  );
  const hasFilters = Boolean(needle || category);
  const cardWidth = isMobile ? "100%" : isDesktop ? "32%" : "48.5%";

  return (
    <ScrollView
      className="flex-1 bg-gray-50"
      contentContainerStyle={{ paddingVertical: 20, paddingHorizontal: horizontalPadding, maxWidth: isDesktop ? 1200 : 960, width: "100%", alignSelf: "center" }}
      keyboardShouldPersistTaps="handled"
      keyboardDismissMode="on-drag"
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={refreshAll} tintColor={COLORS.primary} />}
    >
      <View className="mb-5 flex-row items-center justify-between gap-3">
        <View className="flex-1">
          <Text className="text-sm font-medium text-gray-500">Welcome{user?.first_name ? `, ${user.first_name}` : ""}</Text>
          <Text accessibilityRole="header" className="mt-1 text-2xl font-bold text-gray-900">What needs fixing today?</Text>
        </View>
        <Pressable onPress={() => router.push("/profile")} accessibilityRole="button" accessibilityLabel="Open your profile" className="h-12 w-12 items-center justify-center rounded-full border border-blue-100 bg-blue-50">
          <Ionicons name="person-outline" size={22} color={COLORS.primary} />
        </Pressable>
      </View>

      <View className={`mb-6 gap-4 ${isDesktop ? "flex-row items-stretch" : ""}`}>
        <View style={isDesktop ? { flex: 2, minWidth: 0 } : undefined} className={`rounded-2xl bg-blue-600 ${isMobile ? "p-5" : "p-7"}`}>
          <View className="mb-4 flex-row items-center gap-2">
            <Ionicons name="build-outline" size={19} color="#bfdbfe" />
            <Text className="text-xs font-semibold uppercase tracking-wide text-blue-100">A little care. A fresh start.</Text>
          </View>
          <Text className={`font-bold leading-tight text-white ${isMobile ? "text-3xl" : "text-4xl"}`}>Get your device back to its best.</Text>
          <Text className="mb-5 mt-3 text-base leading-6 text-blue-100">Explore repair services, compare listed prices, and find a shop for your device.</Text>
          <Pressable onPress={() => router.push("/services")} accessibilityRole="button" className="min-h-12 flex-row flex-wrap items-center justify-center gap-2 self-start rounded-xl bg-white px-5 py-3">
            <Text className="text-sm font-bold text-blue-700">Find repair services</Text>
            <Ionicons name="arrow-forward-outline" size={18} color={COLORS.primary} />
          </Pressable>
        </View>

        <Pressable onPress={() => router.push("/assistant")} accessibilityRole="button" accessibilityLabel="Open the troubleshooting assistant" style={isDesktop ? { flex: 1, minWidth: 0 } : undefined} className="rounded-2xl border border-blue-100 bg-blue-50 p-5 active:bg-blue-100">
          <View className="mb-4 h-11 w-11 items-center justify-center rounded-xl bg-white">
            <Ionicons name="chatbubble-ellipses-outline" size={23} color={COLORS.primary} />
          </View>
          <Text className="text-lg font-bold text-gray-900">Not sure what is wrong?</Text>
          <Text className="mt-2 text-sm leading-6 text-gray-600">Describe the issue to the AI assistant and explore troubleshooting steps.</Text>
          <View className="mt-4 flex-row flex-wrap items-center gap-2">
            <Text className="text-sm font-bold text-blue-600">Start troubleshooting</Text>
            <Ionicons name="arrow-forward-outline" size={17} color={COLORS.primary} />
          </View>
        </Pressable>
      </View>

      <View className="mb-7 flex-row flex-wrap justify-between gap-y-3">
        {[
          { label: "My repairs", note: "Follow your repair progress", icon: "construct-outline", href: "/repairs" },
          { label: "Messages", note: "Talk with your repair shop", icon: "chatbubbles-outline", href: "/chat" },
          { label: "My devices", note: "Keep device details handy", icon: "phone-portrait-outline", href: "/devices" },
          { label: "My addresses", note: "Manage service locations", icon: "location-outline", href: "/addresses" },
        ].map((item) => (
          <Pressable key={item.href} onPress={() => router.push(item.href)} accessibilityRole="button" style={{ width: isMobile ? "48%" : "24%" }} className="rounded-xl border border-gray-200 bg-white p-4 active:bg-blue-50">
            <Ionicons name={item.icon} size={22} color={COLORS.primary} />
            <Text className="mt-3 text-sm font-bold text-gray-900">{item.label}</Text>
            <Text className="mt-1 text-xs leading-5 text-gray-500">{item.note}</Text>
          </Pressable>
        ))}
      </View>

      <View className="mb-6 rounded-2xl border border-gray-200 bg-white p-4">
        <Text className="mb-1 text-lg font-bold text-gray-900">Find your next repair</Text>
        <Text className="mb-4 text-sm leading-5 text-gray-500">Search this selection of featured services and verified shops.</Text>
        <TextField label="Search featured listings" placeholder="Service, device type, shop, or location" value={query} onChangeText={setQuery} autoCapitalize="none" autoCorrect={false} />
        {categories.length ? (
          <>
            <Text className="mb-2 text-xs font-semibold uppercase text-gray-400">Filter services by device</Text>
            <View className="flex-row flex-wrap gap-2">
              {["", ...categories].map((value) => (
                <Pressable key={value} onPress={() => setCategory(value)} accessibilityRole="button" accessibilityLabel={value ? `Show ${categoryName(value)} services` : "Show all featured services"} accessibilityState={{ selected: category === value }} className={`min-h-11 flex-row items-center gap-2 rounded-lg border px-3 py-2 ${category === value ? "border-blue-600 bg-blue-50" : "border-gray-200 bg-white"}`}>
                  <Ionicons name={CATEGORY_ICONS[value] || "grid-outline"} size={17} color={category === value ? COLORS.primary : COLORS.textMuted} />
                  <Text className={`text-sm font-semibold ${category === value ? "text-blue-700" : "text-gray-600"}`}>{value ? categoryName(value) : "All devices"}</Text>
                </Pressable>
              ))}
            </View>
          </>
        ) : null}
        {hasFilters ? (
          <Pressable onPress={() => { setQuery(""); setCategory(""); }} accessibilityRole="button" className="mt-3 min-h-11 justify-center self-start">
            <Text className="text-sm font-semibold text-blue-600">Reset browse filters</Text>
          </Pressable>
        ) : null}
      </View>

      <SectionHeading title="Explore repair services" subtitle="Compare listed base prices from verified shops." action="See services" onPress={() => router.push("/services")} />
      <View className="mb-7 flex-row flex-wrap justify-between gap-y-4">
        {services.loading || services.error || !filteredServices.length ? (
          <ListingState loading={services.loading} error={services.error} onRetry={services.refresh} emptyText={serviceList.length ? "No featured services match these filters. Try another search or device category." : "No services are listed yet. Check back soon."} />
        ) : filteredServices.slice(0, 6).map((service) => (
          <Pressable key={service.service_key} onPress={() => router.push(`/service/${encodeURIComponent(service.service_key)}`)} accessibilityRole="button" accessibilityLabel={`Explore ${service.name}, ${categoryName(service.category)}`} style={{ width: cardWidth }} className="rounded-xl border border-gray-200 bg-white p-4 active:bg-blue-50">
            <View className="mb-4 flex-row items-center justify-between gap-2">
              <View className="h-11 w-11 items-center justify-center rounded-xl bg-blue-50"><Ionicons name={CATEGORY_ICONS[service.category] || "build-outline"} size={23} color={COLORS.primary} /></View>
              <Text className="flex-1 text-right text-xs font-medium text-gray-500">{categoryName(service.category)}</Text>
            </View>
            <Text className="text-base font-bold text-gray-900">{service.name}</Text>
            <View className="mt-3"><PriceRange service={service} /></View>
            <Text className="mt-1 text-xs text-gray-400">Listed base price{Number(service.min_price) === Number(service.max_price) ? "" : " range"}</Text>
            <View className="mt-4 flex-row flex-wrap items-center justify-between gap-2 border-t border-gray-100 pt-3">
              <Text className="text-xs text-gray-500">{service.shop_count} shop{Number(service.shop_count) === 1 ? "" : "s"}</Text>
              <Text className="text-sm font-semibold text-blue-600">Compare shops →</Text>
            </View>
          </Pressable>
        ))}
      </View>

      <SectionHeading title="Discover repair shops" subtitle="Featured verified shops, ordered by their listed ratings." />
      <View className="mb-7 flex-row flex-wrap justify-between gap-y-4">
        {shops.loading || shops.error || !filteredShops.length ? (
          <ListingState loading={shops.loading} error={shops.error} onRetry={shops.refresh} emptyText={shopList.length ? "No featured shops match your search. Try a shop name or location." : "No verified shops are available yet."} />
        ) : (showAllShops ? filteredShops : filteredShops.slice(0, 6)).map((shop) => (
          <Pressable key={shop.id} onPress={() => router.push(`/shop/${shop.id}`)} accessibilityRole="button" accessibilityLabel={`View repair shop ${shop.name}`} style={{ width: cardWidth }} className="rounded-xl border border-gray-200 bg-white p-4 active:bg-blue-50">
            <View className="mb-4 flex-row flex-wrap items-center justify-between gap-2">
              <View className="h-12 w-12 items-center justify-center rounded-xl bg-gray-50"><Ionicons name="storefront-outline" size={25} color={COLORS.primary} /></View>
              <Rating value={shop.rating_average} />
            </View>
            <Text className="text-base font-bold text-gray-900">{shop.name}</Text>
            {Number(shop.is_verified) === 1 ? <View className="mt-2 flex-row items-center gap-1"><Ionicons name="checkmark-circle" size={14} color={COLORS.success} /><Text className="text-xs font-medium text-emerald-700">Verified shop</Text></View> : null}
            <View className="mt-4 flex-row items-start gap-2"><Ionicons name="location-outline" size={16} color={COLORS.textMuted} /><Text numberOfLines={3} className="flex-1 text-sm leading-5 text-gray-500">{formatAddress(shop) || "Address not listed"}</Text></View>
            <View className="mt-2 flex-row items-start gap-2"><Ionicons name="time-outline" size={16} color={COLORS.textMuted} /><Text className="flex-1 text-xs leading-5 text-gray-500">{schedule(shop)}</Text></View>
            <View className="mt-4 flex-row items-center justify-between border-t border-gray-100 pt-3"><Text className="text-sm font-semibold text-blue-600">View shop & services</Text><Ionicons name="arrow-forward-outline" size={17} color={COLORS.primary} /></View>
          </Pressable>
        ))}
      </View>

      {!shops.loading && !shops.error && filteredShops.length > 6 ? (
        <Button title={showAllShops ? "Show fewer shops" : "Show more featured shops"} variant="outline" className="mb-7" onPress={() => setShowAllShops((current) => !current)} />
      ) : null}

      <View className="mb-4 rounded-2xl border border-gray-200 bg-white p-5">
        <SectionHeading title="From problem to progress" subtitle="A few steps to get your repair moving." />
        <View className={isMobile ? "gap-5" : "flex-row gap-5"}>
          {[
            { title: "Find your service", note: "Explore services and choose a repair shop." },
            { title: "Review your quotation", note: "Your shop assesses the device before you approve and pay." },
            { title: "Follow the repair", note: "Track progress and stay in touch with your shop." },
          ].map((step, index) => (
            <View key={step.title} style={isMobile ? undefined : { flex: 1, minWidth: 0 }} className="flex-row items-start gap-3">
              <View className="h-8 w-8 items-center justify-center rounded-full bg-blue-50"><Text className="text-sm font-bold text-blue-600">{index + 1}</Text></View>
              <View className="flex-1"><Text className="text-sm font-bold text-gray-800">{step.title}</Text><Text className="mt-1 text-xs leading-5 text-gray-500">{step.note}</Text></View>
            </View>
          ))}
        </View>
      </View>
    </ScrollView>
  );
}
