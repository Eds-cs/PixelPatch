// Home: the first page anyone sees. Open to visitors without an account
// (browse services and shops, search); signed-in clients also get shortcuts.
// Uses the public listing APIs, which need no sign-in.
//
// Kept light to scroll: short copy, icon-led sections, alternating bands, and
// on phones the service and shop lists swipe sideways instead of stacking.
import { useState } from "react";
import { ActivityIndicator, Pressable, RefreshControl, ScrollView, Text, TextInput, View, useWindowDimensions } from "react-native";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";

import Button from "../../components/Button";
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
const priceText = (service) => {
  const minimum = price(service.min_price);
  const maximum = price(service.max_price);
  if (minimum && maximum) return minimum === maximum ? minimum : `${minimum} – ${maximum}`;
  return minimum || maximum || "Ask the shop";
};

// One-tap searches written the way people describe problems.
const COMMON_PROBLEMS = [
  { label: "Cracked screen", search: "screen" },
  { label: "Battery drains fast", search: "battery" },
  { label: "Won't charge", search: "charging" },
  { label: "Got wet", search: "water" },
  { label: "Slow laptop", search: "laptop" },
];

const TRUST_POINTS = [
  { icon: "shield-checkmark-outline", title: "Verified shops", note: "Every shop is checked by PixelPatch." },
  { icon: "pricetags-outline", title: "Prices upfront", note: "Compare base prices before you book." },
  { icon: "pulse-outline", title: "Track every step", note: "Follow your repair from quote to pickup." },
];

const STEPS = [
  { icon: "search-outline", title: "Browse", note: "Find a service and a shop you like." },
  { icon: "person-add-outline", title: "Sign up", note: "Free, when you're ready to book." },
  { icon: "clipboard-outline", title: "Get a quote", note: "The shop checks your device first." },
  { icon: "checkmark-done-outline", title: "Get it fixed", note: "Pay securely and track the repair." },
];

// Starter questions for the AI assistant; tapping one opens it pre-filled.
const ASSISTANT_PROMPTS = [
  "My phone won't charge anymore",
  "My laptop is overheating and slow",
  "My controller stick moves on its own",
];

// An illustration of how a conversation goes (not a real chat).
const EXAMPLE_CHAT = [
  { from: "user", text: "My phone won't charge anymore." },
  { from: "ai", text: "Let's narrow it down. Does it charge with a different cable and adapter?" },
  { from: "user", text: "No, still nothing." },
  { from: "ai", text: "Try gently cleaning the charging port with a dry, soft brush. Any change?" },
  { from: "user", text: "Still not charging." },
  { from: "ai", text: "Then the charging port is likely damaged. That's a job for a technician. Here's a shop that can take a look:" },
];

const CLIENT_SHORTCUTS = [
  { label: "My repairs", icon: "construct-outline", href: "/repairs" },
  { label: "Messages", icon: "chatbubbles-outline", href: "/chat" },
  { label: "My devices", icon: "phone-portrait-outline", href: "/devices" },
  { label: "Addresses", icon: "location-outline", href: "/addresses" },
];

function Stars({ value, light = false }) {
  const rating = Number(value);
  const rated = Number.isFinite(rating) && rating > 0;
  return (
    <View className="flex-row items-center gap-1">
      <Ionicons name={rated ? "star" : "star-outline"} size={13} color={rated ? "#f59e0b" : light ? "#5EEAD4" : COLORS.textMuted} />
      <Text className={`text-xs font-semibold ${light ? "text-primary-soft" : "text-gray-600"}`}>{rated ? rating.toFixed(1) : "New"}</Text>
    </View>
  );
}

function SectionTitle({ title, action, onPress }) {
  return (
    <View className="mb-4 flex-row items-center justify-between gap-3">
      <Text accessibilityRole="header" className="flex-1 text-xl font-bold text-gray-900">{title}</Text>
      {onPress ? (
        <Pressable onPress={onPress} accessibilityRole="link" className="min-h-11 flex-row items-center gap-1 pl-2">
          <Text className="text-sm font-semibold text-primary">{action}</Text>
          <Ionicons name="arrow-forward-outline" size={16} color={COLORS.primary} />
        </Pressable>
      ) : null}
    </View>
  );
}

function ListingState({ loading, error, onRetry, emptyText }) {
  return (
    <View className="w-full items-center rounded-2xl border border-dashed border-gray-300 bg-white p-6">
      {loading ? (
        <View className="flex-row items-center gap-3">
          <ActivityIndicator color={COLORS.primary} />
          <Text className="text-sm text-gray-500">Loading…</Text>
        </View>
      ) : (
        <>
          <Ionicons name={error ? "cloud-offline-outline" : "search-outline"} size={24} color={COLORS.textMuted} />
          <Text className="mt-2 text-center text-sm text-gray-500">{error || emptyText}</Text>
          {error ? <Button title="Try again" variant="outline" className="mt-4" onPress={onRetry} /> : null}
        </>
      )}
    </View>
  );
}

// Phones: a sideways-swiping row with the next card peeking in. Wider screens:
// a grid whose short last row starts on the left.
function CardRow({ items, renderCard, keyOf, isMobile, columns }) {
  const { width } = useWindowDimensions();
  if (isMobile) {
    const cardWidth = Math.min(300, width * 0.74);
    return (
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        snapToInterval={cardWidth + 12}
        decelerationRate="fast"
        contentContainerStyle={{ gap: 12, paddingRight: 16 }}
      >
        {items.map((item) => <View key={keyOf(item)} style={{ width: cardWidth }}>{renderCard(item)}</View>)}
      </ScrollView>
    );
  }
  const cardWidth = columns === 3 ? "32%" : "48.5%";
  const gap = columns === 3 ? "2%" : "3%";
  return (
    <View className="flex-row flex-wrap gap-y-4">
      {items.map((item, index) => (
        <View key={keyOf(item)} style={{ width: cardWidth, marginRight: (index + 1) % columns === 0 ? 0 : gap }}>
          {renderCard(item)}
        </View>
      ))}
    </View>
  );
}

export default function Home() {
  const router = useRouter();
  const { user, isLoggedIn, isBusiness, isAdmin } = useAuth();
  // Shop owners browse and book at other shops like any client.
  const isClient = isLoggedIn && !isAdmin;
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
    (!needle || [item.name, categoryName(item.category)].join(" ").toLowerCase().includes(needle))
  );
  const filteredShops = shopList.filter((shop) =>
    !needle || [shop.name, formatAddress(shop)].join(" ").toLowerCase().includes(needle)
  );
  const searching = Boolean(needle || category);
  const columns = isDesktop ? 3 : 2;
  const shopLimit = isDesktop ? 3 : 4;
  const shownShops = showAllShops || isMobile ? filteredShops : filteredShops.slice(0, shopLimit);
  const container = { width: "100%", maxWidth: 1200, alignSelf: "center", paddingHorizontal: horizontalPadding };
  const topService = serviceList[0];
  const topShop = shopList[0];
  const resetSearch = () => { setQuery(""); setCategory(""); };
  // The assistant needs an account (each reply costs money); visitors sign in
  // first and land on it with their question ready.
  const openAssistant = (text) => {
    const target = text ? `/assistant?prompt=${encodeURIComponent(text)}` : "/assistant";
    if (isLoggedIn) router.push(target);
    else router.push({ pathname: "/login", params: { redirect: target } });
  };

  const serviceCard = (service) => (
    <Pressable onPress={() => router.push(`/service/${encodeURIComponent(service.service_key)}`)} accessibilityRole="link" accessibilityLabel={`Compare shops for ${service.name}, from ${priceText(service)}`} className={`${isMobile ? "" : "h-full "}rounded-2xl border border-gray-200 bg-white p-4 active:bg-teal-50`}>
      <View className="flex-row items-center gap-3">
        <View className="h-11 w-11 items-center justify-center rounded-xl bg-teal-50"><Ionicons name={CATEGORY_ICONS[service.category] || "build-outline"} size={22} color={COLORS.primary} /></View>
        <View className="flex-1">
          <Text numberOfLines={1} className="text-base font-bold text-gray-900">{service.name}</Text>
          <Text className="text-xs text-gray-500">{categoryName(service.category)}</Text>
        </View>
      </View>
      <View className="mt-4 flex-row items-end justify-between">
        <View>
          <Text className="text-xs text-gray-400">From</Text>
          <Text className="text-lg font-bold text-price">{priceText(service)}</Text>
        </View>
        <View className="flex-row items-center gap-1 rounded-full bg-gray-100 px-2.5 py-1">
          <Ionicons name="storefront-outline" size={12} color={COLORS.textMuted} />
          <Text className="text-xs font-medium text-gray-600">{service.shop_count} shop{Number(service.shop_count) === 1 ? "" : "s"}</Text>
        </View>
      </View>
    </Pressable>
  );

  const shopCard = (shop) => (
    <Pressable onPress={() => router.push(`/shop/${shop.id}`)} accessibilityRole="link" accessibilityLabel={`View repair shop ${shop.name}`} className={`${isMobile ? "" : "h-full "}rounded-2xl border border-gray-200 bg-white p-4 active:bg-teal-50`}>
      <View className="flex-row items-center gap-3">
        <View className="h-12 w-12 items-center justify-center rounded-full bg-amber-100"><Text className="text-lg font-bold text-amber-900">{String(shop.name || "?").trim().charAt(0).toUpperCase()}</Text></View>
        <View className="flex-1">
          <Text numberOfLines={1} className="text-base font-bold text-gray-900">{shop.name}</Text>
          <View className="mt-0.5 flex-row items-center gap-2">
            <Stars value={shop.rating_average} />
            <View className="flex-row items-center gap-1"><Ionicons name="checkmark-circle" size={13} color={COLORS.success} /><Text className="text-xs font-medium text-emerald-700">Verified</Text></View>
          </View>
        </View>
      </View>
      <View className="mt-4 flex-row items-center gap-2"><Ionicons name="location-outline" size={15} color={COLORS.textMuted} /><Text numberOfLines={1} className="flex-1 text-sm text-gray-500">{shop.barangay || formatAddress(shop) || "Zamboanga City"}</Text></View>
      <View className="mt-1.5 flex-row items-center gap-2"><Ionicons name="time-outline" size={15} color={COLORS.textMuted} /><Text numberOfLines={1} className="flex-1 text-sm text-gray-500">{[shop.open_time?.slice(0, 5), shop.closing_time?.slice(0, 5)].filter(Boolean).join("–") || "Hours not listed"}</Text></View>
    </Pressable>
  );

  return (
    <ScrollView
      className="flex-1 bg-gray-50"
      keyboardShouldPersistTaps="handled"
      keyboardDismissMode="on-drag"
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={refreshAll} tintColor={COLORS.primary} />}
    >
      {/* Hero */}
      <View className="bg-teal-950">
        <View style={[container, { paddingTop: isMobile ? 32 : 56, paddingBottom: isMobile ? 32 : 64 }]} className={isDesktop ? "flex-row items-center gap-12" : ""}>
          <View style={isDesktop ? { flex: 1.25, minWidth: 0 } : undefined}>
            <View className="mb-5 flex-row items-center gap-2 self-start rounded-full bg-amber-400/15 px-3 py-1.5">
              <Ionicons name="location" size={14} color="#FBBF24" />
              <Text className="text-xs font-semibold text-amber-300">Serving Zamboanga City</Text>
            </View>
            {isClient && user?.first_name ? (
              <Text className="mb-2 text-base font-medium text-teal-200">Welcome back, {user.first_name} 👋</Text>
            ) : null}
            <Text accessibilityRole="header" className={`font-extrabold leading-tight text-white ${isMobile ? "text-4xl" : "text-5xl"}`}>
              Device repair, <Text className="text-amber-400">made simple.</Text>
            </Text>
            <Text className="mt-4 max-w-xl text-base leading-7 text-teal-100">
              Find verified repair shops in Zamboanga City, compare services and prices, and book when
              you&apos;re ready.
            </Text>

            <View className="mt-7 flex-row items-center rounded-2xl bg-white pl-4">
              <Ionicons name="search-outline" size={20} color={COLORS.textMuted} />
              <TextInput
                value={query}
                onChangeText={setQuery}
                placeholder="What needs fixing?"
                placeholderTextColor="#8A9B98"
                accessibilityLabel="Search repairs, devices and shops"
                autoCapitalize="none"
                autoCorrect={false}
                returnKeyType="search"
                className="h-14 flex-1 px-3 text-base text-gray-900"
              />
              {query ? (
                <Pressable onPress={() => setQuery("")} accessibilityRole="button" accessibilityLabel="Clear search" className="h-14 w-12 items-center justify-center">
                  <Ionicons name="close-circle" size={20} color={COLORS.textMuted} />
                </Pressable>
              ) : null}
            </View>

            <View className="mt-4 flex-row flex-wrap gap-2">
              {COMMON_PROBLEMS.map((problem) => {
                const active = needle === problem.search;
                return (
                  <Pressable key={problem.label} onPress={() => setQuery(active ? "" : problem.search)} accessibilityRole="button" accessibilityState={{ selected: active }} className={`rounded-full border px-3 py-2 ${active ? "border-white bg-white" : "border-white/20 bg-white/5 active:bg-white/10"}`}>
                    <Text className={`text-sm font-medium ${active ? "text-teal-950" : "text-teal-100"}`}>{problem.label}</Text>
                  </Pressable>
                );
              })}
            </View>

            <Pressable onPress={() => openAssistant()} accessibilityRole="link" className="mt-6 flex-row items-center gap-2 self-start">
              <Ionicons name="sparkles" size={16} color="#FBBF24" />
              <Text className="text-sm text-teal-100">Not sure what&apos;s wrong? <Text className="font-semibold text-amber-300 underline">Ask our AI assistant</Text></Text>
            </Pressable>
          </View>

          {/* A glimpse of real listings (desktop only) */}
          {isDesktop && topService && topShop ? (
            <View style={{ flex: 1, minWidth: 0 }} className="gap-4">
              <View className="rounded-2xl bg-white p-5" style={{ transform: [{ rotate: "-2deg" }], shadowColor: "#000", shadowOpacity: 0.25, shadowRadius: 24, shadowOffset: { width: 0, height: 12 } }}>
                <View className="self-start rounded-full bg-amber-100 px-2.5 py-1"><Text className="text-xs font-bold uppercase tracking-wide text-amber-900">Popular repair</Text></View>
                <View className="mt-3 flex-row items-center gap-3">
                  <View className="h-11 w-11 items-center justify-center rounded-xl bg-teal-50"><Ionicons name={CATEGORY_ICONS[topService.category] || "build-outline"} size={22} color={COLORS.primary} /></View>
                  <View className="flex-1"><Text className="text-base font-bold text-gray-900">{topService.name}</Text><Text className="text-xs text-gray-500">{categoryName(topService.category)}</Text></View>
                  <Text className="text-lg font-bold text-price">{priceText(topService)}</Text>
                </View>
              </View>
              <View className="ml-10 rounded-2xl border border-white/10 bg-teal-900 p-5" style={{ transform: [{ rotate: "1.5deg" }] }}>
                <Text className="text-xs font-bold uppercase tracking-wide text-amber-300">Top-rated shop</Text>
                <View className="mt-3 flex-row items-center gap-3">
                  <View className="h-11 w-11 items-center justify-center rounded-full bg-amber-400"><Text className="text-lg font-bold text-amber-950">{String(topShop.name).charAt(0)}</Text></View>
                  <View className="flex-1"><Text className="text-base font-bold text-white">{topShop.name}</Text><Stars value={topShop.rating_average} light /></View>
                  <Ionicons name="checkmark-circle" size={22} color="#4ade80" />
                </View>
              </View>
            </View>
          ) : null}
        </View>
      </View>

      {/* Trust strip */}
      <View className="border-b border-gray-200 bg-white">
        <View style={[container, { paddingVertical: 18 }]} className={isMobile ? "gap-4" : "flex-row justify-between gap-6"}>
          {TRUST_POINTS.map((point) => (
            <View key={point.title} className="flex-1 flex-row items-center gap-3">
              <View className="h-10 w-10 items-center justify-center rounded-full bg-teal-50"><Ionicons name={point.icon} size={20} color={COLORS.primary} /></View>
              <View className="flex-1">
                <Text className="text-sm font-bold text-gray-900">{point.title}</Text>
                <Text className="text-xs text-gray-500">{point.note}</Text>
              </View>
            </View>
          ))}
        </View>
      </View>

      {/* AI assistant showcase */}
      <View style={[container, { paddingTop: 32 }]}>
        <View className={`overflow-hidden rounded-3xl border border-gray-200 bg-white ${isDesktop ? "flex-row" : ""}`}>
          <View style={isDesktop ? { flex: 1.1, minWidth: 0 } : undefined} className={isMobile ? "p-6" : "p-10"}>
            <View className="mb-4 flex-row items-center gap-2 self-start rounded-full bg-amber-100 px-3 py-1.5">
              <Ionicons name="sparkles" size={13} color="#B45309" />
              <Text className="text-xs font-bold text-amber-900">PixelPatch AI assistant</Text>
            </View>
            <Text accessibilityRole="header" className={`font-extrabold leading-tight text-gray-900 ${isMobile ? "text-2xl" : "text-3xl"}`}>
              Not sure what&apos;s wrong? Ask before you book.
            </Text>
            <Text className="mt-3 text-base leading-7 text-gray-600">
              Describe the problem in your own words. The assistant asks a few questions to figure out
              what&apos;s going on.
            </Text>

            <View className="mt-6 gap-4">
              <View className="flex-row items-start gap-3">
                <View className="h-10 w-10 items-center justify-center rounded-xl bg-teal-50"><Ionicons name="construct-outline" size={20} color={COLORS.primary} /></View>
                <View className="flex-1">
                  <Text className="text-base font-bold text-gray-900">Fix it yourself</Text>
                  <Text className="text-sm leading-5 text-gray-600">Step-by-step checks you can try at home first.</Text>
                </View>
              </View>
              <View className="flex-row items-start gap-3">
                <View className="h-10 w-10 items-center justify-center rounded-xl bg-teal-50"><Ionicons name="storefront-outline" size={20} color={COLORS.primary} /></View>
                <View className="flex-1">
                  <Text className="text-base font-bold text-gray-900">Or get the right shop</Text>
                  <Text className="text-sm leading-5 text-gray-600">If it needs a technician, it suggests shops that can help.</Text>
                </View>
              </View>
            </View>

            <Text className="mb-2 mt-7 text-xs font-semibold uppercase tracking-wide text-gray-400">Try asking</Text>
            <View className="flex-row flex-wrap gap-2">
              {ASSISTANT_PROMPTS.map((text) => (
                <Pressable key={text} onPress={() => openAssistant(text)} accessibilityRole="link" accessibilityLabel={`Ask the assistant: ${text}`} className="flex-row items-center gap-2 rounded-full border border-gray-200 bg-gray-50 px-3 py-2 active:bg-teal-50">
                  <Ionicons name="chatbubble-outline" size={14} color={COLORS.textMuted} />
                  <Text className="text-sm text-gray-700">{text}</Text>
                </Pressable>
              ))}
            </View>

            <View className="mt-7 flex-row flex-wrap items-center gap-3">
              <Pressable onPress={() => openAssistant()} accessibilityRole="link" className="h-12 flex-row items-center gap-2 rounded-xl bg-primary px-6 active:bg-teal-800">
                <Ionicons name="sparkles" size={18} color="#ffffff" />
                <Text className="text-base font-semibold text-white">Ask the assistant</Text>
              </Pressable>
              {!isLoggedIn ? <Text className="text-sm text-gray-500">Free with an account</Text> : null}
            </View>
          </View>

          {/* Example conversation */}
          <View style={isDesktop ? { flex: 1, minWidth: 0 } : undefined} className={`bg-gray-100 ${isMobile ? "p-5" : "p-8"}`}>
            <View className="mb-4 flex-row items-center justify-between">
              <View className="flex-row items-center gap-2">
                <View className="h-8 w-8 items-center justify-center rounded-full bg-primary"><Ionicons name="sparkles" size={15} color="#ffffff" /></View>
                <Text className="text-sm font-bold text-gray-900">PixelPatch AI</Text>
              </View>
              <Text className="text-xs text-gray-400">Example conversation</Text>
            </View>
            <View className="gap-2.5">
              {EXAMPLE_CHAT.map((message, index) => (
                <View key={index} className={`max-w-[85%] rounded-2xl px-4 py-2.5 ${message.from === "user" ? "self-end rounded-br-md bg-primary" : "self-start rounded-bl-md bg-white"}`}>
                  <Text className={`text-sm leading-5 ${message.from === "user" ? "text-white" : "text-gray-800"}`}>{message.text}</Text>
                </View>
              ))}
              {topShop ? (
                <Pressable onPress={() => router.push(`/shop/${topShop.id}`)} accessibilityRole="link" className="max-w-[85%] flex-row items-center gap-3 self-start rounded-2xl border border-gray-200 bg-white p-3 active:bg-gray-50">
                  <View className="h-9 w-9 items-center justify-center rounded-full bg-amber-100"><Text className="font-bold text-amber-900">{String(topShop.name).charAt(0)}</Text></View>
                  <View className="flex-1">
                    <Text numberOfLines={1} className="text-sm font-bold text-gray-900">{topShop.name}</Text>
                    <Stars value={topShop.rating_average} />
                  </View>
                  <Ionicons name="chevron-forward" size={16} color={COLORS.textMuted} />
                </Pressable>
              ) : null}
            </View>
          </View>
        </View>
      </View>

      <View style={[container, { paddingTop: 40 }]}>
        {/* Signed-in client shortcuts */}
        {isClient ? (
          <View className="mb-10 flex-row flex-wrap gap-3">
            {CLIENT_SHORTCUTS.map((item) => (
              <Pressable key={item.href} onPress={() => router.push(item.href)} accessibilityRole="link" className="flex-row items-center gap-2 rounded-full border border-gray-200 bg-white px-4 py-2.5 active:bg-teal-50">
                <Ionicons name={item.icon} size={18} color={COLORS.primary} />
                <Text className="text-sm font-semibold text-gray-800">{item.label}</Text>
              </Pressable>
            ))}
          </View>
        ) : null}

        {/* Browse by device */}
        {categories.length ? (
          <View className="mb-10">
            <SectionTitle title="Browse by device" />
            <View className="flex-row flex-wrap gap-3">
              {categories.map((value) => {
                const active = category === value;
                const count = serviceList.filter((item) => item.category === value).length;
                return (
                  <Pressable key={value} onPress={() => setCategory(active ? "" : value)} accessibilityRole="button" accessibilityLabel={`${categoryName(value)}, ${count} services`} accessibilityState={{ selected: active }} style={{ width: isMobile ? "31%" : 150 }} className={`items-center rounded-2xl border px-3 py-5 ${active ? "border-primary bg-primary" : "border-gray-200 bg-white active:bg-teal-50"}`}>
                    <Ionicons name={CATEGORY_ICONS[value] || "build-outline"} size={30} color={active ? "#ffffff" : COLORS.primary} />
                    <Text className={`mt-2 text-sm font-bold ${active ? "text-white" : "text-gray-900"}`}>{categoryName(value)}</Text>
                    <Text className={`text-xs ${active ? "text-primary-soft" : "text-gray-500"}`}>{count} service{count === 1 ? "" : "s"}</Text>
                  </Pressable>
                );
              })}
            </View>
          </View>
        ) : null}

        {/* Services */}
        <View className="mb-10">
          <SectionTitle
            title={searching ? `${filteredServices.length} service${filteredServices.length === 1 ? "" : "s"} found` : "Popular repairs"}
            action={searching ? "Clear" : "See all"}
            onPress={searching ? resetSearch : () => router.push("/services")}
          />
          {services.loading || services.error || !filteredServices.length ? (
            <ListingState loading={services.loading} error={services.error} onRetry={services.refresh} emptyText={serviceList.length ? "No services match. Try another word." : "No services listed yet."} />
          ) : (
            <CardRow items={filteredServices.slice(0, 6)} renderCard={serviceCard} keyOf={(s) => s.service_key} isMobile={isMobile} columns={columns} />
          )}
        </View>

        {/* Shops */}
        <View className="mb-12">
          <SectionTitle
            title={needle ? `${filteredShops.length} shop${filteredShops.length === 1 ? "" : "s"} found` : "Top-rated shops"}
            action={showAllShops ? "Show fewer" : "See all"}
            onPress={!isMobile && filteredShops.length > shopLimit ? () => setShowAllShops((v) => !v) : undefined}
          />
          {shops.loading || shops.error || !filteredShops.length ? (
            <ListingState loading={shops.loading} error={shops.error} onRetry={shops.refresh} emptyText={shopList.length ? "No shops match. Try a shop name or barangay." : "No verified shops yet."} />
          ) : (
            <CardRow items={shownShops} renderCard={shopCard} keyOf={(s) => s.id} isMobile={isMobile} columns={columns} />
          )}
        </View>
      </View>

      {/* How it works */}
      <View className="bg-amber-50">
        <View style={[container, { paddingVertical: 40 }]}>
          <Text accessibilityRole="header" className="text-center text-2xl font-bold text-gray-900">How it works</Text>
          <Text className="mb-8 mt-1 text-center text-sm text-gray-500">Four simple steps</Text>
          <View className={isMobile ? "gap-5" : "flex-row gap-4"}>
            {STEPS.map((step, index) => (
              <View key={step.title} style={isMobile ? undefined : { flex: 1, minWidth: 0 }} className={isMobile ? "flex-row items-center gap-4" : "items-center"}>
                <View className="h-14 w-14 items-center justify-center rounded-full bg-white">
                  <Ionicons name={step.icon} size={24} color={COLORS.primary} />
                  <View className="absolute -right-1 -top-1 h-6 w-6 items-center justify-center rounded-full bg-amber-400"><Text className="text-xs font-bold text-amber-950">{index + 1}</Text></View>
                </View>
                <View className={isMobile ? "flex-1" : "mt-3 items-center"}>
                  <Text className="text-base font-bold text-gray-900">{step.title}</Text>
                  <Text className={`mt-0.5 text-sm text-gray-600 ${isMobile ? "" : "text-center"}`}>{step.note}</Text>
                </View>
              </View>
            ))}
          </View>
        </View>
      </View>

      <View style={[container, { paddingTop: 40 }]}>
        {/* Partner invitation */}
        {!isBusiness && !isAdmin ? (
          <Pressable onPress={() => router.push("/become-partner")} accessibilityRole="link" className="mb-10 flex-row items-center gap-4 rounded-2xl bg-white p-5 active:bg-teal-50">
            <View className="h-14 w-14 items-center justify-center rounded-2xl bg-primary-soft"><Ionicons name="storefront" size={24} color={COLORS.primary} /></View>
            <View className="flex-1">
              <Text className="text-base font-bold text-gray-900">Own a repair shop?</Text>
              <Text className="mt-0.5 text-sm text-gray-600">Join PixelPatch and reach more customers in Zamboanga City.</Text>
            </View>
            <Ionicons name="chevron-forward" size={20} color={COLORS.textMuted} />
          </Pressable>
        ) : null}

        {/* Visitor call to action */}
        {!isLoggedIn ? (
          <View className={`mb-10 overflow-hidden rounded-3xl bg-amber-400 ${isMobile ? "p-6" : "flex-row items-center justify-between gap-6 p-10"}`}>
            <View className={isMobile ? "mb-5" : "flex-1"}>
              <Text className="text-2xl font-bold text-amber-950">Ready to get it fixed?</Text>
              <Text className="mt-2 text-sm leading-6 text-amber-900">Create a free account to book repairs and chat with shops.</Text>
            </View>
            <View className={isMobile ? "gap-3" : "flex-row gap-3"}>
              <Pressable onPress={() => router.push("/signup")} accessibilityRole="link" className="h-12 items-center justify-center rounded-xl bg-teal-950 px-6 active:bg-teal-900">
                <Text className="text-base font-semibold text-white">Create free account</Text>
              </Pressable>
              <Pressable onPress={() => router.push("/login")} accessibilityRole="link" className="h-12 items-center justify-center rounded-xl border border-amber-950/25 px-6 active:bg-amber-300">
                <Text className="text-base font-semibold text-amber-950">Sign in</Text>
              </Pressable>
            </View>
          </View>
        ) : null}

        {/* Footer */}
        <View className="mb-6 flex-row flex-wrap items-center justify-between gap-3 border-t border-gray-200 pt-6">
          <Text className="text-sm text-gray-500">© {new Date().getFullYear()} PixelPatch · Zamboanga City</Text>
          <View className="flex-row gap-5">
            {[["About", "/about"], ["Help", "/help"], ["Services", "/services"]].map(([label, href]) => (
              <Pressable key={href} onPress={() => router.push(href)} accessibilityRole="link" className="min-h-11 justify-center">
                <Text className="text-sm font-medium text-gray-600">{label}</Text>
              </Pressable>
            ))}
          </View>
        </View>
      </View>
    </ScrollView>
  );
}
