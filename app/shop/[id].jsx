// app/shop/[id].jsx
// GET /api/shops/:id, /api/shops/:id/services, /api/shops/:id/reviews
//
// Wide screens: a header band, then two columns (about, services and reviews
// on the left; booking, location, hours and contact beside them). Phones: one
// column, with booking and location first.
import { useEffect, useRef, useState } from "react";
import { ActivityIndicator, Pressable, RefreshControl, ScrollView, Text, View, useWindowDimensions } from "react-native";
import { Stack, useLocalSearchParams, useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";

import Button from "../../components/Button";
import ShopMap from "../../components/ShopMap";
import { formatAddress } from "../../lib/format";
import { mapsDirectionsUrl, mapsSearchUrl, openInMaps } from "../../lib/maps";
import { useFetch } from "../../lib/useFetch";
import { useAuth } from "../../lib/auth";
import { shopTermsLabel } from "../../lib/paymentTerms";
import { categoryLabel } from "../../lib/serviceCategories";
import api from "../../lib/api";
import { COLORS } from "../../constants/theme";

import { SHOW_BACK_BUTTONS } from "../../lib/navigation";
const PESO = "₱";
// Two columns from this width; below it, one column.
const TWO_COLUMNS_AT = 900;
const DAYS = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
const money = (value) =>
  Number.isFinite(Number(value)) ? `${PESO}${Number(value).toLocaleString(undefined, { maximumFractionDigits: 2 })}` : `${PESO}${value}`;
const hhmm = (value) => String(value ?? "").slice(0, 5);

// "Open now" from the shop's days (e.g. Monday–Saturday) and hours, using the
// viewer's clock. Returns null when the shop hasn't listed its hours.
function openStatus(shop, now = new Date()) {
  const opens = hhmm(shop?.open_time);
  const closes = hhmm(shop?.closing_time);
  const from = DAYS.indexOf(shop?.days_from);
  const to = DAYS.indexOf(shop?.days_to);
  if (!opens || !closes || from < 0 || to < 0) return null;
  const today = now.getDay();
  const openToday = from <= to ? today >= from && today <= to : today >= from || today <= to;
  const time = `${String(now.getHours()).padStart(2, "0")}:${String(now.getMinutes()).padStart(2, "0")}`;
  if (openToday && time >= opens && time < closes) return { open: true, text: `Open now · closes ${closes}` };
  return { open: false, text: openToday && time < opens ? `Closed · opens ${opens}` : "Closed now" };
}

function Stars({ rating, size = 14 }) {
  const value = Math.round(Number(rating) || 0);
  return (
    <View className="flex-row">
      {[1, 2, 3, 4, 5].map((n) => (
        <Ionicons key={n} name={n <= value ? "star" : "star-outline"} size={size} color={COLORS.accent} />
      ))}
    </View>
  );
}

function Card({ title, children, className = "" }) {
  return (
    <View className={`rounded-2xl border border-gray-200 bg-white p-5 ${className}`}>
      {title ? <Text className="mb-3 text-base font-bold text-gray-900">{title}</Text> : null}
      {children}
    </View>
  );
}

function InfoRow({ icon, children, onPress, label }) {
  const content = (
    <View className="flex-row items-start gap-3 py-1.5">
      <Ionicons name={icon} size={18} color={COLORS.textMuted} style={{ marginTop: 1 }} />
      <View className="flex-1">{children}</View>
    </View>
  );
  return onPress ? (
    <Pressable onPress={onPress} accessibilityRole="link" accessibilityLabel={label} className="rounded-lg active:bg-gray-50">
      {content}
    </Pressable>
  ) : content;
}

export default function ShopDetail() {
  // ?message=1 comes back from sign-in after a visitor pressed "Message the shop".
  const { id, message } = useLocalSearchParams();
  const router = useRouter();
  const { isLoggedIn, user } = useAuth();
  const { width } = useWindowDimensions();
  const twoColumns = width >= TWO_COLUMNS_AT;
  const padding = width < 768 ? 16 : 24;
  const [allReviews, setAllReviews] = useState(false);
  const [messaging, setMessaging] = useState(false);
  const [messageError, setMessageError] = useState(null);
  const autoMessaged = useRef(false);

  const shop = useFetch(`/shops/${id}`, (d) => d.shop ?? null);
  const services = useFetch(`/shops/${id}/services`, (d) => d.services ?? []);
  const reviews = useFetch(`/shops/${id}/reviews`, (d) => d.reviews ?? []);

  const goBack = () => (router.canGoBack() ? router.back() : router.push("/"));

  // POST /api/chat/start reuses an existing conversation with this shop or
  // creates one, then the chat opens.
  const openShopChat = () =>
    api.post("/chat/start", { shop_id: id }).then(({ data }) => {
      if (!data?.chat?.id) throw new Error("The conversation could not be opened.");
      router.push(`/chat/${data.chat.id}`);
    });

  const messageShop = () => {
    if (!isLoggedIn) {
      // Sign in first, then come back here and open the chat.
      router.push({ pathname: "/login", params: { redirect: `/shop/${id}?message=1` } });
      return;
    }
    if (messaging) return;
    setMessaging(true);
    setMessageError(null);
    openShopChat()
      .catch((e) => setMessageError(e.message || "The conversation could not be opened."))
      .finally(() => setMessaging(false));
  };

  const shopData = shop.data;
  const canMessage =
    Number(shopData?.is_verified) === 1 && !(user && String(shopData?.user_id) === String(user.id));

  // Back from sign-in with ?message=1: open the chat once.
  useEffect(() => {
    if (message !== "1" || !isLoggedIn || !canMessage || autoMessaged.current) return;
    autoMessaged.current = true;
    openShopChat().catch((e) => setMessageError(e.message || "The conversation could not be opened."));
    // openShopChat only depends on id and router.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [message, isLoggedIn, canMessage]);

  if (shop.loading) {
    return (
      <View className="flex-1 items-center justify-center bg-gray-50">
        <Stack.Screen options={{ title: "Shop", headerShown: false }} />
        <ActivityIndicator size="large" color={COLORS.primary} />
      </View>
    );
  }

  const s = shop.data;

  // Couldn't load, or no such shop: say so instead of showing an empty shop.
  if (shop.error || !s) {
    return (
      <View className="flex-1 items-center justify-center bg-gray-50 p-6">
        <Stack.Screen options={{ title: "Shop", headerShown: false }} />
        <Ionicons name={shop.error ? "cloud-offline-outline" : "storefront-outline"} size={32} color={COLORS.textMuted} />
        <Text className="mt-3 max-w-sm text-center text-base text-gray-600">
          {shop.error ? "We couldn't load this shop. Check your connection and try again." : "This shop doesn't exist or is no longer listed."}
        </Text>
        <View className="mt-5 flex-row flex-wrap justify-center gap-3">
          {shop.error ? <Button title="Try again" onPress={shop.refresh} /> : null}
          <Button title="Browse shops" variant="outline" onPress={() => router.push("/")} />
        </View>
      </View>
    );
  }

  const serviceList = services.data ?? [];
  const reviewList = reviews.data ?? [];
  const shownReviews = allReviews ? reviewList : reviewList.slice(0, 4);
  const rating = Number(s.rating_average) || 0;
  const status = openStatus(s);
  const verified = Number(s.is_verified) === 1;
  const address = formatAddress(s);

  /* ---------- side panel pieces (also used in the phone layout) ---------- */

  // Shop owners browsing their own page: nothing to book or message.
  const ownShop = Boolean(user && String(shopData?.user_id) === String(user.id));

  const bookingCard = ownShop ? (
    <Card>
      <Text className="text-base font-bold text-gray-900">This is your shop</Text>
      <Text className="mb-4 mt-1 text-sm leading-5 text-gray-600">
        This is how customers see your page. Manage repairs, services and messages from your business portal.
      </Text>
      <Button title="Open my business portal" onPress={() => router.push("/business/dashboard")} />
    </Card>
  ) : (
    <Card>
      {verified ? (
        <>
          <Text className="text-base font-bold text-gray-900">Need a repair?</Text>
          <Text className="mb-4 mt-1 text-sm leading-5 text-gray-600">
            Send your device details and get a quote before any work starts, or message the shop with a question first.
          </Text>
          {isLoggedIn ? (
            <Button title="Request a repair" onPress={() => router.push(`/request/${id}`)} />
          ) : (
            // Browsing is open to everyone; contacting a shop needs an account.
            <Button
              title="Sign in to request a repair"
              onPress={() => router.push({ pathname: "/login", params: { redirect: `/request/${id}` } })}
            />
          )}
          {canMessage ? (
            <Pressable
              onPress={messageShop}
              disabled={messaging}
              accessibilityRole="button"
              accessibilityLabel={`Message ${s.name}`}
              accessibilityState={{ busy: messaging }}
              className={`mt-2 h-12 flex-row items-center justify-center gap-2 rounded-lg border border-gray-300 bg-white px-4 active:bg-gray-50 ${messaging ? "opacity-60" : ""}`}
            >
              {messaging ? <ActivityIndicator size="small" color={COLORS.primary} /> : <Ionicons name="chatbubble-ellipses-outline" size={18} color={COLORS.primary} />}
              <Text className="text-base font-semibold text-gray-800">Message the shop</Text>
            </Pressable>
          ) : null}
          {messageError ? <Text accessibilityRole="alert" className="mt-2 text-sm text-red-700">{messageError}</Text> : null}
          {isLoggedIn ? null : (
            <>
              <Text className="mt-3 text-center text-xs text-gray-500">
                New here?{" "}
                <Text
                  accessibilityRole="link"
                  onPress={() => router.push({ pathname: "/signup", params: { redirect: `/request/${id}` } })}
                  className="font-semibold text-primary"
                >
                  Create a free account
                </Text>
              </Text>
            </>
          )}
        </>
      ) : (
        <Text className="rounded-xl bg-amber-50 p-4 text-sm leading-5 text-amber-800">
          This shop is waiting for PixelPatch verification and can&apos;t take repair requests yet.
        </Text>
      )}
    </Card>
  );

  // Location: address, map (web, when a Maps key is set) and Google Maps links.
  const locationCard = (
    <Card title="Location">
      <View className="flex-row items-start gap-3">
        <View className="h-10 w-10 items-center justify-center rounded-full bg-teal-50">
          <Ionicons name="location" size={20} color={COLORS.primary} />
        </View>
        <Text selectable className="flex-1 text-sm leading-5 text-gray-700">{address || "Address not listed"}</Text>
      </View>
      <ShopMap address={s} title={s.name} />
      <View className="mt-4 gap-2">
        <Pressable
          onPress={() => openInMaps(mapsDirectionsUrl(s))}
          accessibilityRole="link"
          accessibilityLabel={`Get directions to ${s.name} in Google Maps`}
          className="h-11 flex-row items-center justify-center gap-2 rounded-lg bg-primary px-4 active:bg-teal-800"
        >
          <Ionicons name="navigate" size={16} color="#ffffff" />
          <Text className="text-sm font-semibold text-white">Get directions</Text>
        </Pressable>
        <Pressable
          onPress={() => openInMaps(mapsSearchUrl(s))}
          accessibilityRole="link"
          accessibilityLabel={`Open ${s.name} in Google Maps`}
          className="h-11 flex-row items-center justify-center gap-2 rounded-lg border border-gray-300 bg-white px-4 active:bg-gray-50"
        >
          <Ionicons name="map-outline" size={16} color={COLORS.text} />
          <Text className="text-sm font-semibold text-gray-800">Open in Google Maps</Text>
        </Pressable>
      </View>
    </Card>
  );

  const detailsCard = (
    <Card title="Hours & contact">
      <InfoRow icon="time-outline">
        <Text className="text-sm text-gray-800">
          {s.days_from ? `${s.days_from}–${s.days_to}` : "Days not listed"}
        </Text>
        <Text className="text-sm text-gray-500">
          {s.open_time && s.closing_time ? `${hhmm(s.open_time)} – ${hhmm(s.closing_time)}` : "Hours not listed"}
        </Text>
      </InfoRow>
      <InfoRow icon="wallet-outline">
        <Text className="text-sm text-gray-800">{shopTermsLabel(s)}</Text>
        <Text className="text-xs text-gray-500">The exact terms are on each quotation.</Text>
      </InfoRow>
      {/* The shop's phone and email are not shown (the API leaves them out):
          clients reach shops through PixelPatch chat, which keeps the job,
          payment and any dispute protected. */}
      <InfoRow
        icon="chatbubbles-outline"
        label={canMessage ? `Message ${s.name}` : undefined}
        onPress={canMessage ? messageShop : undefined}
      >
        <Text className={`text-sm ${canMessage ? "font-semibold text-teal-800" : "text-gray-800"}`}>
          {canMessage ? "Message the shop on PixelPatch" : "Contact through PixelPatch chat"}
        </Text>
        <Text className="text-xs text-gray-500">
          {"Keep chats and payments here so you're covered by disputes and refunds."}
        </Text>
      </InfoRow>
    </Card>
  );

  /* ---------- main column pieces ---------- */

  const aboutSection = s.description ? (
    <View className="mb-8">
      <Text accessibilityRole="header" className="mb-2 text-xl font-bold text-gray-900">About</Text>
      <Text className="text-base leading-7 text-gray-700">{s.description}</Text>
    </View>
  ) : null;

  const servicesSection = (
    <View className="mb-8">
      <View className="mb-3 flex-row items-baseline justify-between">
        <Text accessibilityRole="header" className="text-xl font-bold text-gray-900">Services</Text>
        {serviceList.length ? <Text className="text-sm text-gray-500">{serviceList.length} offered</Text> : null}
      </View>
      {services.loading ? (
        <ActivityIndicator color={COLORS.primary} />
      ) : serviceList.length === 0 ? (
        <Text className="text-sm text-gray-500">This shop has no listed services.</Text>
      ) : (
        <View className="flex-row flex-wrap gap-y-3">
          {serviceList.map((svc, index) => (
            <View
              key={svc.id}
              style={width >= 600 ? { width: "48.5%", marginRight: index % 2 === 0 ? "3%" : 0 } : { width: "100%" }}
              className="rounded-2xl border border-gray-200 bg-white p-4"
            >
              <Text className="text-base font-semibold text-gray-900">{svc.name}</Text>
              {svc.category ? <Text className="mt-0.5 text-xs text-gray-500">{categoryLabel(svc.category, svc.custom_category)}</Text> : null}
              <View className="mt-4 flex-row items-end justify-between gap-2">
                {svc.estimated_timeframe ? (
                  <View className="shrink-0 flex-row items-center gap-1 rounded-full bg-gray-100 px-2.5 py-1">
                    <Ionicons name="time-outline" size={12} color={COLORS.textMuted} />
                    <Text numberOfLines={1} className="text-xs text-gray-600">{svc.estimated_timeframe}</Text>
                  </View>
                ) : <View />}
                <Text className="text-lg font-bold text-price">{money(svc.base_price)}</Text>
              </View>
            </View>
          ))}
        </View>
      )}
      {serviceList.length ? (
        <Text className="mt-3 text-xs text-gray-500">Listed base prices. Your final price comes with the shop&apos;s quote.</Text>
      ) : null}
    </View>
  );

  const reviewsSection = (
    <View className="mb-8">
      <Text accessibilityRole="header" className="mb-3 text-xl font-bold text-gray-900">Reviews</Text>
      {reviewList.length ? (
        <View className="mb-4 flex-row items-center gap-4 rounded-2xl bg-amber-50 p-4">
          <Text className="text-4xl font-extrabold text-gray-900">{rating.toFixed(1)}</Text>
          <View>
            <Stars rating={rating} size={16} />
            <Text className="mt-1 text-sm text-gray-600">
              Based on {reviewList.length} review{reviewList.length === 1 ? "" : "s"}
            </Text>
          </View>
        </View>
      ) : null}
      {reviewList.length === 0 ? (
        <Text className="text-sm text-gray-500">No reviews yet.</Text>
      ) : (
        <View className="gap-3">
          {shownReviews.map((r) => {
            const name = [r.first_name, r.last_name].filter(Boolean).join(" ") || "Client";
            return (
              <View key={r.id} className="rounded-2xl border border-gray-200 bg-white p-4">
                <View className="flex-row items-center gap-3">
                  <View className="h-9 w-9 items-center justify-center rounded-full bg-gray-100">
                    <Text className="text-sm font-bold text-gray-700">{name.charAt(0).toUpperCase()}</Text>
                  </View>
                  <View className="flex-1">
                    <Text className="text-sm font-semibold text-gray-900">{name}</Text>
                    {r.created_at ? (
                      <Text className="text-xs text-gray-400">
                        {new Date(r.created_at).toLocaleDateString(undefined, { year: "numeric", month: "short", day: "numeric" })}
                      </Text>
                    ) : null}
                  </View>
                  <Stars rating={r.rating} />
                </View>
                {r.comment ? <Text className="mt-3 text-sm leading-6 text-gray-700">{r.comment}</Text> : null}
              </View>
            );
          })}
        </View>
      )}
      {reviewList.length > 4 ? (
        <Pressable onPress={() => setAllReviews((v) => !v)} accessibilityRole="button" className="mt-3 min-h-11 justify-center self-start">
          <Text className="text-sm font-semibold text-primary">
            {allReviews ? "Show fewer reviews" : `Show all ${reviewList.length} reviews`}
          </Text>
        </Pressable>
      ) : null}
    </View>
  );

  return (
    <ScrollView
      className="flex-1 bg-gray-50"
      refreshControl={
        <RefreshControl
          refreshing={shop.refreshing}
          onRefresh={() => { shop.refresh(); services.refresh(); reviews.refresh(); }}
          tintColor={COLORS.primary}
        />
      }
    >
      <Stack.Screen options={{ title: s.name ?? "Shop", headerShown: false }} />

      {/* Header band */}
      <View className="border-b border-gray-200 bg-white">
        <View style={{ width: "100%", maxWidth: 1200, alignSelf: "center", paddingHorizontal: padding, paddingTop: 12, paddingBottom: twoColumns ? 28 : 20 }}>
          {SHOW_BACK_BUTTONS ? (
            <Pressable onPress={goBack} accessibilityRole="link" className="mb-4 min-h-10 flex-row items-center gap-1 self-start">
              <Ionicons name="arrow-back" size={16} color={COLORS.textMuted} />
              <Text className="text-sm font-medium text-gray-600">Back</Text>
            </Pressable>
          ) : null}
          <View className="flex-row items-center gap-4">
            <View style={{ width: twoColumns ? 72 : 56, height: twoColumns ? 72 : 56 }} className="items-center justify-center rounded-2xl bg-amber-100">
              <Text className={`font-extrabold text-amber-900 ${twoColumns ? "text-3xl" : "text-2xl"}`}>{String(s.name || "?").trim().charAt(0).toUpperCase()}</Text>
            </View>
            <View className="flex-1">
              <View className="flex-row flex-wrap items-center gap-x-3 gap-y-1">
                <Text accessibilityRole="header" className={`font-extrabold text-gray-900 ${twoColumns ? "text-3xl" : "text-2xl"}`}>{s.name}</Text>
                {verified ? (
                  <View className="flex-row items-center gap-1 rounded-full bg-success-soft px-2.5 py-1">
                    <Ionicons name="checkmark-circle" size={13} color={COLORS.success} />
                    <Text className="text-xs font-semibold text-success">Verified</Text>
                  </View>
                ) : null}
              </View>
              <View className="mt-2 flex-row flex-wrap items-center gap-x-4 gap-y-1">
                <View className="flex-row items-center gap-1.5">
                  <Stars rating={rating} />
                  <Text className="text-sm font-semibold text-gray-800">{rating ? rating.toFixed(1) : "New"}</Text>
                  <Text className="text-sm text-gray-500">({reviewList.length})</Text>
                </View>
                {s.barangay ? (
                  <View className="flex-row items-center gap-1">
                    <Ionicons name="location-outline" size={14} color={COLORS.textMuted} />
                    <Text className="text-sm text-gray-600">{s.barangay}, Zamboanga City</Text>
                  </View>
                ) : null}
                {status ? (
                  <View className="flex-row items-center gap-1.5">
                    <View className={`h-2 w-2 rounded-full ${status.open ? "bg-success" : "bg-gray-400"}`} />
                    <Text className={`text-sm font-medium ${status.open ? "text-success" : "text-gray-600"}`}>{status.text}</Text>
                  </View>
                ) : null}
              </View>
            </View>
          </View>
        </View>
      </View>

      {/* Body */}
      <View style={{ width: "100%", maxWidth: 1200, alignSelf: "center", paddingHorizontal: padding, paddingTop: 24, paddingBottom: 32 }}>
        {twoColumns ? (
          <View className="flex-row items-start gap-8">
            <View style={{ flex: 1, minWidth: 0 }}>
              {aboutSection}
              {servicesSection}
              {reviewsSection}
            </View>
            <View style={{ width: 340 }} className="gap-4">
              {bookingCard}
              {locationCard}
              {detailsCard}
            </View>
          </View>
        ) : (
          <View>
            <View className="mb-8 gap-4">
              {bookingCard}
              {locationCard}
            </View>
            {aboutSection}
            {servicesSection}
            {reviewsSection}
            {detailsCard}
          </View>
        )}
      </View>
    </ScrollView>
  );
}
