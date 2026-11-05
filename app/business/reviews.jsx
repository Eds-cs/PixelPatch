// Business-only review analytics and linked repair context.
import { useState } from "react";
import { ActivityIndicator, Pressable, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";

import AsyncList from "../../components/AsyncList";
import Button from "../../components/Button";
import TextField from "../../components/TextField";
import { useFetch } from "../../lib/useFetch";
import { useShop } from "../../lib/shop";
import { useResponsive } from "../../lib/useResponsive";
import { filterReviews, reviewTimestamp, summarizeReviews } from "../../lib/reviews";
import { COLORS } from "../../constants/theme";

const RATINGS = [0, 5, 4, 3, 2, 1].map((value) => ({ value, label: value ? `${value} star${value === 1 ? "" : "s"}` : "All ratings" }));
const PERIODS = [{ value: 0, label: "All time" }, { value: 30, label: "Last 30 days" }, { value: 90, label: "Last 90 days" }];
const SORTS = [{ value: "newest", label: "Newest" }, { value: "oldest", label: "Oldest" }, { value: "lowest", label: "Lowest rated" }, { value: "highest", label: "Highest rated" }];

function formatDate(value) {
  const timestamp = reviewTimestamp(value);
  if (!timestamp) return "Date unavailable";
  return new Date(timestamp).toLocaleString(undefined, {
    year: "numeric", month: "short", day: "numeric", hour: "numeric", minute: "2-digit",
  });
}

function Stars({ rating }) {
  const value = Number(rating) || 0;
  return (
    <View className="flex-row" accessible accessibilityLabel={`${value} out of 5 stars`}>
      {[1, 2, 3, 4, 5].map((n) => (
        <Ionicons key={n} name={n <= value ? "star" : "star-outline"} size={16} color="#f59e0b" />
      ))}
    </View>
  );
}

function Options({ label, options, value, onChange }) {
  return (
    <View className="mt-4">
      <Text className="mb-2 text-xs font-semibold uppercase text-gray-500">{label}</Text>
      <View className="flex-row flex-wrap gap-2">
        {options.map((option) => (
          <Pressable
            key={option.value}
            onPress={() => onChange(option.value)}
            accessibilityRole="button"
            accessibilityLabel={`${label}: ${option.label}`}
            accessibilityState={{ selected: option.value === value }}
            className={`min-h-11 justify-center rounded-lg border px-3 py-2 ${option.value === value ? "border-blue-600 bg-blue-50" : "border-gray-200 bg-white"}`}
          >
            <Text className={`text-sm font-medium ${option.value === value ? "text-blue-700" : "text-gray-600"}`}>{option.label}</Text>
          </Pressable>
        ))}
      </View>
    </View>
  );
}

function Detail({ label, value }) {
  return (
    <View className="mt-3">
      <Text className="text-xs font-medium text-gray-500">{label}</Text>
      <Text className="mt-1 text-sm leading-5 text-gray-800">{value || "Not recorded"}</Text>
    </View>
  );
}

export default function BusinessReviews() {
  const router = useRouter();
  const { isMobile, isDesktop } = useResponsive();
  const { shopId, loading: shopLoading, error: shopError } = useShop();
  const { data, error, loading, refreshing, refresh } = useFetch(
    shopId ? `/shops/${shopId}/reviews/details` : null,
    (d) => d.reviews ?? []
  );
  const [query, setQuery] = useState("");
  const [rating, setRating] = useState(0);
  const [days, setDays] = useState(0);
  const [sort, setSort] = useState("newest");
  const reviews = data ?? [];
  const summary = summarizeReviews(reviews);
  const visibleReviews = filterReviews(reviews, { query, rating, days, sort });
  const hasFilters = Boolean(query.trim() || rating || days || sort !== "newest");

  if (shopLoading) {
    return (
      <View className="flex-1 items-center justify-center bg-gray-50">
        <ActivityIndicator size="large" color={COLORS.primary} />
      </View>
    );
  }
  if (shopError || !shopId) {
    return (
      <View className="flex-1 items-center justify-center bg-gray-50 p-6">
        <Text className="text-center text-sm text-gray-500">{shopError || "No shop is associated with this account."}</Text>
      </View>
    );
  }

  return (
    <AsyncList
      loading={loading}
      error={error}
      refreshing={refreshing}
      onRefresh={refresh}
      data={visibleReviews}
      keyExtractor={(item) => String(item.id)}
      emptyText={reviews.length ? "No reviews match these filters. Try another rating, date range, or search." : "No reviews yet. Reviews from completed repairs will appear here."}
      ListHeaderComponent={
        <View>
          <View className="mb-4 flex-row flex-wrap items-center justify-between gap-3">
            <View className="flex-1">
              <Text accessibilityRole="header" className="text-2xl font-bold text-gray-900">Customer reviews</Text>
              <Text className="mt-1 text-sm leading-5 text-gray-500">Understand the feedback behind every repair.</Text>
            </View>
            <Button title="Refresh" variant="outline" onPress={refresh} loading={refreshing} />
          </View>

          <Text className="mb-2 text-xs font-semibold uppercase text-gray-500">All-time overview</Text>
          <View className="mb-4 flex-row flex-wrap justify-between gap-y-3">
            {[
              { label: "Average rating", value: summary.average === null ? "—" : `${summary.average.toFixed(1)} / 5`, note: `${summary.rated} rated reviews` },
              { label: "Total reviews", value: summary.total, note: "All customer reviews" },
              { label: "Positive ratings", value: summary.positivePercent === null ? "—" : `${summary.positivePercent}%`, note: "Reviews with 4 or 5 stars" },
              { label: "Recent reviews", value: summary.recent, note: "Received in the last 30 days" },
            ].map((stat) => (
              <View key={stat.label} style={{ width: isDesktop ? "24%" : "48%" }} className="rounded-xl border border-gray-200 bg-white p-4">
                <Text className="text-xs font-medium text-gray-500">{stat.label}</Text>
                <Text className="mt-2 text-2xl font-bold text-gray-900">{stat.value}</Text>
                <Text className="mt-1 text-xs leading-4 text-gray-500">{stat.note}</Text>
              </View>
            ))}
          </View>

          <View className={`mb-4 gap-4 ${isDesktop ? "flex-row" : ""}`}>
            <View className="rounded-xl border border-gray-200 bg-white p-4" style={isDesktop ? { width: "32%" } : undefined}>
              <Text className="mb-1 text-base font-semibold text-gray-900">Rating breakdown</Text>
              <Text className="mb-3 text-xs text-gray-500">All time · select a row to filter</Text>
              {[5, 4, 3, 2, 1].map((stars) => {
                const count = summary.counts[stars - 1];
                const percent = summary.rated ? Math.round(count / summary.rated * 100) : 0;
                return (
                  <Pressable key={stars} onPress={() => setRating(rating === stars ? 0 : stars)} accessibilityRole="button" accessibilityLabel={`${stars} stars: ${count} reviews, ${percent} percent`} accessibilityState={{ selected: rating === stars }} className={`min-h-11 flex-row items-center gap-2 rounded-lg px-2 ${rating === stars ? "bg-blue-50" : ""}`}>
                    <Text className="text-sm text-gray-600">{stars} ★</Text>
                    <View className="h-2 flex-1 overflow-hidden rounded-full bg-gray-100">
                      <View style={{ width: `${percent}%`, height: "100%", backgroundColor: "#f59e0b" }} />
                    </View>
                    <Text className="text-right text-xs text-gray-500" style={{ minWidth: 64 }}>{count} · {percent}%</Text>
                  </Pressable>
                );
              })}
            </View>

            <View className="flex-1 rounded-xl border border-gray-200 bg-white p-4">
              <Text className="mb-3 text-base font-semibold text-gray-900">Find feedback</Text>
              <TextField label="Search reviews" placeholder="Customer, device, service, repair #, or feedback" value={query} onChangeText={setQuery} autoCapitalize="none" />
              <Options label="Rating" options={RATINGS} value={rating} onChange={setRating} />
              <Options label="Review date" options={PERIODS} value={days} onChange={setDays} />
              <Options label="Sort by" options={SORTS} value={sort} onChange={setSort} />
              {hasFilters ? (
                <Pressable accessibilityRole="button" onPress={() => { setQuery(""); setRating(0); setDays(0); setSort("newest"); }} className="mt-3 min-h-11 justify-center self-start py-2">
                  <Text className="text-sm font-semibold text-blue-600">Reset filters</Text>
                </Pressable>
              ) : null}
            </View>
          </View>
          <Text className="mb-3 text-sm font-medium text-gray-600">Showing {visibleReviews.length} of {reviews.length} reviews</Text>
        </View>
      }
      renderItem={({ item }) => (
        <View className="mb-4 rounded-xl border border-gray-200 bg-white p-4">
          <View className="flex-row flex-wrap items-start justify-between gap-3">
            <View style={{ flexShrink: 1 }}>
              <Text className="text-base font-semibold text-gray-900">{[item.first_name, item.last_name].filter(Boolean).join(" ") || "Client"}</Text>
              <Text className="mt-1 text-xs text-gray-500">Reviewed {formatDate(item.created_at)}</Text>
            </View>
            <View>
              <Stars rating={item.rating} />
              <Text className="mt-1 text-xs text-gray-500">{item.rating} out of 5</Text>
            </View>
          </View>
          <Text className={`mt-4 text-base leading-6 ${item.comment?.trim() ? "text-gray-800" : "text-gray-400"}`}>{item.comment?.trim() || "No written feedback provided."}</Text>

          <View className={`mt-4 border-t border-gray-100 pt-1 ${isMobile ? "" : "flex-row gap-6"}`}>
            <View className="flex-1">
              <Detail label="Device" value={[item.device_brand, item.device_name, item.device_model].filter(Boolean).join(" · ")} />
              <Detail label="Services" value={item.services} />
              <Detail label="Reported issue" value={item.issue_description} />
            </View>
            <View className="flex-1">
              <Detail label="Repair request" value={item.request_id ? `#${item.request_id}` : null} />
              <Detail label="Repair completed" value={item.completed_at ? formatDate(item.completed_at) : null} />
              <Detail label="Service method" value={{ PICKUP: "Pickup", DROPOFF: "Drop-off", ONSITE: "On-site" }[item.delivery_method]} />
            </View>
          </View>
          <View className="mt-4 flex-row flex-wrap items-center justify-between gap-3">
            {item.repair_status === "COMPLETED" ? (
              <View className="flex-row items-center gap-1 rounded-full bg-emerald-50 px-3 py-2">
                <Ionicons name="checkmark-circle-outline" size={16} color={COLORS.success} />
                <Text className="text-xs font-medium text-emerald-700">Completed repair</Text>
              </View>
            ) : <Text className="text-xs text-gray-500">Repair details may be unavailable</Text>}
            {item.repair_id ? <Button title={`View repair #${item.repair_id}`} variant="outline" onPress={() => router.push(`/business/repairs/${item.repair_id}`)} /> : null}
          </View>
        </View>
      )}
    />
  );
}
