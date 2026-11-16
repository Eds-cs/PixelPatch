// components/AdminPlaceholder.jsx
// Shared layout for admin sections that are planned but not built yet. Each
// page lists what the admin will be able to control there, so the portal's
// scope is visible while the features are implemented one by one.
import { ScrollView, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";

import { useResponsive } from "../lib/useResponsive";
import { COLORS } from "../constants/theme";

export default function AdminPlaceholder({ icon, title, summary, capabilities = [], note }) {
  const { isMobile, isDesktop, horizontalPadding } = useResponsive();

  return (
    <ScrollView
      className="flex-1 bg-gray-50"
      contentContainerStyle={{ paddingVertical: 20, paddingHorizontal: horizontalPadding, maxWidth: isDesktop ? 1200 : 960, width: "100%", alignSelf: "center" }}
    >
      <View className="mb-5 flex-row flex-wrap items-start gap-3">
        <View className="h-12 w-12 items-center justify-center rounded-xl bg-blue-50">
          <Ionicons name={icon} size={24} color={COLORS.primary} />
        </View>
        <View className="flex-1" style={{ minWidth: 200 }}>
          <Text accessibilityRole="header" className="text-2xl font-bold text-gray-900">{title}</Text>
          <Text className="mt-1 text-sm leading-5 text-gray-500">{summary}</Text>
        </View>
        <View className="self-start rounded-full bg-amber-100 px-3 py-1.5">
          <Text className="text-xs font-semibold text-amber-800">Coming soon</Text>
        </View>
      </View>

      <View className="mb-4 rounded-xl border border-dashed border-gray-300 bg-white p-5">
        <Text className="mb-1 text-base font-bold text-gray-900">Planned admin controls</Text>
        <Text className="mb-4 text-xs leading-5 text-gray-500">
          This section is a placeholder. Nothing here changes data yet.
        </Text>
        <View className={isMobile ? "" : "flex-row flex-wrap justify-between"}>
          {capabilities.map((item) => (
            <View key={item.title} style={isMobile ? undefined : { width: isDesktop ? "32%" : "48.5%" }} className="mb-3 rounded-lg bg-gray-50 p-4">
              <View className="flex-row items-center gap-2">
                <Ionicons name={item.icon || "ellipse-outline"} size={18} color={COLORS.textMuted} />
                <Text className="flex-1 text-sm font-semibold text-gray-800">{item.title}</Text>
              </View>
              <Text className="mt-2 text-xs leading-5 text-gray-500">{item.detail}</Text>
            </View>
          ))}
        </View>
      </View>

      {note ? (
        <View className="flex-row items-start gap-3 rounded-xl border border-blue-100 bg-blue-50 p-4">
          <Ionicons name="information-circle-outline" size={20} color={COLORS.primary} />
          <Text className="flex-1 text-sm leading-5 text-blue-800">{note}</Text>
        </View>
      ) : null}
    </ScrollView>
  );
}
