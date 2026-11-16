// Admin · Dashboard. Live counts from GET /api/admin/summary and links to each section.
import { ActivityIndicator, Pressable, RefreshControl, ScrollView, Text, View } from "react-native";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";

import Button from "../../components/Button";
import { useAuth } from "../../lib/auth";
import { useFetch } from "../../lib/useFetch";
import { useResponsive } from "../../lib/useResponsive";
import { COLORS } from "../../constants/theme";

const SECTIONS = [
  { href: "/admin/services", icon: "shield-checkmark-outline", title: "Services", note: "Review services shops add or change, in bulk.", ready: true },
  { href: "/admin/shops", icon: "storefront-outline", title: "Shops", note: "Verify new shops, documents and payout accounts." },
  { href: "/admin/users", icon: "people-outline", title: "Users", note: "Accounts, roles and suspensions." },
  { href: "/admin/repairs", icon: "construct-outline", title: "Repairs", note: "Platform-wide view of repair requests." },
  { href: "/admin/disputes", icon: "alert-circle-outline", title: "Disputes", note: "Mediate disputes clients and shops can't settle." },
  { href: "/admin/payments", icon: "card-outline", title: "Payments", note: "Xendit payments, refunds and shop payouts." },
  { href: "/admin/reviews", icon: "star-outline", title: "Reviews", note: "Moderate reported reviews." },
];

export default function AdminDashboard() {
  const router = useRouter();
  const { user } = useAuth();
  const { isMobile, isDesktop, horizontalPadding } = useResponsive();
  const { data, error, loading, refreshing, refresh } = useFetch("/admin/summary", (d) => d.summary ?? {});
  const summary = data ?? {};
  const pendingServices = Number(summary.pending_services || 0);

  return (
    <ScrollView
      className="flex-1 bg-gray-50"
      contentContainerStyle={{ paddingVertical: 20, paddingHorizontal: horizontalPadding, maxWidth: isDesktop ? 1200 : 960, width: "100%", alignSelf: "center" }}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={refresh} tintColor={COLORS.primary} />}
    >
      <View className="mb-5 flex-row flex-wrap items-center justify-between gap-3">
        <View className="flex-1" style={{ minWidth: 200 }}>
          <Text className="text-sm font-medium text-gray-500">Admin{user?.first_name ? ` · ${user.first_name}` : ""}</Text>
          <Text accessibilityRole="header" className="mt-1 text-2xl font-bold text-gray-900">PixelPatch administration</Text>
        </View>
        <Button title="Refresh" variant="outline" onPress={refresh} loading={refreshing} />
      </View>

      {error ? <Text accessibilityRole="alert" className="mb-4 rounded-xl bg-red-50 p-4 text-sm text-red-700">{error}</Text> : null}

      <Pressable
        onPress={() => router.push("/admin/services")}
        accessibilityRole="button"
        className={`mb-5 flex-row items-center gap-3 rounded-xl border p-4 ${pendingServices ? "border-amber-200 bg-amber-50" : "border-blue-100 bg-blue-50"}`}
      >
        <Ionicons name={pendingServices ? "hourglass-outline" : "checkmark-circle-outline"} size={24} color={pendingServices ? "#b45309" : COLORS.primary} />
        <View className="flex-1">
          <Text className="text-sm font-bold text-gray-900">
            {loading ? "Checking the review queue…" : pendingServices ? `${pendingServices} service${pendingServices === 1 ? "" : "s"} waiting for review` : "No services waiting for review"}
          </Text>
          <Text className="mt-1 text-xs leading-5 text-gray-600">Clients can&apos;t see or book a service until it is approved.</Text>
        </View>
        <Ionicons name="arrow-forward-outline" size={20} color={COLORS.textMuted} />
      </Pressable>

      <View className="mb-6 flex-row flex-wrap justify-between gap-y-3">
        {[
          { label: "Services to review", value: summary.pending_services, icon: "shield-checkmark-outline" },
          { label: "Shops awaiting verification", value: summary.pending_shops, icon: "storefront-outline" },
          { label: "Open disputes", value: summary.open_disputes, icon: "alert-circle-outline" },
          { label: "Accounts", value: summary.users, icon: "people-outline" },
        ].map((stat) => (
          <View key={stat.label} style={{ width: isMobile ? "48%" : "24%" }} className="rounded-xl border border-gray-200 bg-white p-4">
            <Ionicons name={stat.icon} size={21} color={COLORS.primary} />
            <Text className="mt-3 text-xs font-medium text-gray-500">{stat.label}</Text>
            {loading ? <ActivityIndicator className="mt-2 self-start" color={COLORS.primary} /> : <Text className="mt-1 text-xl font-bold text-gray-900">{stat.value ?? 0}</Text>}
          </View>
        ))}
      </View>

      <Text className="mb-3 text-lg font-bold text-gray-900">Admin sections</Text>
      <View className="mb-6 flex-row flex-wrap justify-between gap-y-3">
        {SECTIONS.map((section) => (
          <Pressable
            key={section.href}
            onPress={() => router.push(section.href)}
            accessibilityRole="button"
            accessibilityLabel={`${section.title}${section.ready ? "" : ", coming soon"}`}
            style={{ width: isMobile ? "100%" : isDesktop ? "32%" : "48.5%" }}
            className="rounded-xl border border-gray-200 bg-white p-4 active:bg-blue-50"
          >
            <View className="flex-row items-center justify-between gap-2">
              <Ionicons name={section.icon} size={22} color={COLORS.primary} />
              {section.ready ? null : <Text className="rounded-full bg-amber-100 px-2 py-0.5 text-xs font-semibold text-amber-800">Coming soon</Text>}
            </View>
            <Text className="mt-3 text-sm font-bold text-gray-900">{section.title}</Text>
            <Text className="mt-1 text-xs leading-5 text-gray-500">{section.note}</Text>
          </Pressable>
        ))}
      </View>
    </ScrollView>
  );
}
