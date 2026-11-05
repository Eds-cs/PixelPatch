import { Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { COLORS } from "../constants/theme";

export const SERVICE_ICONS = {
  SMARTPHONE: "phone-portrait-outline", LAPTOP: "laptop-outline", DESKTOP: "desktop-outline",
  TABLET: "tablet-portrait-outline", SMARTWATCH: "watch-outline", CONTROLLER: "game-controller-outline",
};

export function serviceCategory(value) {
  return value ? String(value).toLowerCase().replace(/_/g, " ").replace(/\b\w/g, (letter) => letter.toUpperCase()) : "Other devices";
}

export function numericServicePrice(value) {
  return value !== null && value !== undefined && value !== "" && Number.isFinite(Number(value)) ? Number(value) : null;
}

export function servicePrice(value) {
  const number = numericServicePrice(value);
  return number === null ? "Ask shop for pricing" : "₱" + number.toLocaleString(undefined, { maximumFractionDigits: 2 });
}

export function servicePriceRange(minimum, maximum) {
  const low = numericServicePrice(minimum);
  const high = numericServicePrice(maximum);
  if (low === null) return servicePrice(high);
  if (high === null || low === high) return servicePrice(low);
  return `${servicePrice(low)} – ${servicePrice(high)}`;
}

export function compareServicePrices(a, b, descending = false) {
  const first = numericServicePrice(a);
  const second = numericServicePrice(b);
  if (first === null) return second === null ? 0 : 1;
  if (second === null) return -1;
  return descending ? second - first : first - second;
}

export function ServiceRating({ rating, average = false }) {
  const value = Number(rating);
  const hasRating = Number.isFinite(value) && value > 0;
  return (
    <View className="flex-row flex-wrap items-center gap-1">
      <Ionicons name={hasRating ? "star" : "star-outline"} size={14} color={hasRating ? "#f59e0b" : COLORS.textMuted} />
      <Text className="text-xs font-semibold text-gray-600">{hasRating ? value.toFixed(1) : "Not yet rated"}</Text>
      {average && hasRating ? <Text className="text-xs text-gray-400">avg. shop rating</Text> : null}
    </View>
  );
}
