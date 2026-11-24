// Admin · Dashboard: what needs an admin now (a to-do queue), then platform
// counts and the admin sections. Data: GET /api/admin/summary (lib/adminSummary.js).
import { ActivityIndicator, Pressable, RefreshControl, ScrollView, Text, View } from "react-native";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";

import Button from "../../components/Button";
import { useAuth } from "../../lib/auth";
import { useAdminSummary, waitingFor } from "../../lib/adminSummary";
import { useResponsive } from "../../lib/useResponsive";
import { COLORS } from "../../constants/theme";

// Each to-do: the summary count, its oldest timestamp, and where to handle it.
const TODOS = [
  {
    key: "pending_shops",
    since: "pending_shops_since",
    href: "/admin/shops",
    icon: "storefront-outline",
    one: "shop to verify",
    many: "shops to verify",
    note: "Check the business permit and details, then approve or reject.",
  },
  {
    key: "pending_services",
    since: "pending_services_since",
    href: "/admin/services",
    icon: "shield-checkmark-outline",
    one: "service to review",
    many: "services to review",
    note: "Clients can't book a service until it's approved.",
  },
  {
    key: "disputes_need_admin",
    since: "disputes_need_admin_since",
    href: "/admin/disputes",
    icon: "alert-circle-outline",
    one: "dispute needs a decision",
    many: "disputes need a decision",
    note: "The client turned down the shop's offer, or the shop didn't reply within 2 days.",
  },
  {
    key: "repairs_awaiting_shop",
    since: "repairs_awaiting_shop_since",
    href: "/admin/repairs",
    icon: "hourglass-outline",
    one: "repair waiting on a shop",
    many: "repairs waiting on a shop",
    note: "The shop hasn't accepted or rejected it for over 2 days.",
  },
];

const SECTIONS = [
  { href: "/admin/shops", icon: "storefront-outline", title: "Shops", note: "Verify new shops, documents and payout accounts.", ready: true },
  { href: "/admin/services", icon: "shield-checkmark-outline", title: "Services", note: "Review services shops add or change, in bulk.", ready: true },
  { href: "/admin/disputes", icon: "alert-circle-outline", title: "Disputes", note: "Decide disputes clients and shops can't settle.", ready: true },
  { href: "/admin/repairs", icon: "construct-outline", title: "Repairs", note: "Every repair request across shops, read-only.", ready: true },
  { href: "/admin/users", icon: "people-outline", title: "Users", note: "Find accounts, see their activity, suspend abuse.", ready: true },
  { href: "/admin/payments", icon: "card-outline", title: "Payments", note: "Xendit payments, refunds and shop payouts." },
  { href: "/admin/reviews", icon: "star-outline", title: "Reviews", note: "Moderate reported reviews." },
];

function TodoRow({ todo, count, since, onPress }) {
  const waiting = waitingFor(since);
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={`${count} ${count === 1 ? todo.one : todo.many}. Open`}
      className="mb-3 flex-row items-center gap-3 rounded-xl border border-amber-200 bg-amber-50 p-4 active:bg-amber-100"
    >
      <View className="h-10 w-10 items-center justify-center rounded-full bg-white">
        <Ionicons name={todo.icon} size={20} color="#b45309" />
      </View>
      <View className="flex-1">
        <Text className="text-base font-bold text-gray-900">
          {count} {count === 1 ? todo.one : todo.many}
        </Text>
        <Text className="mt-0.5 text-xs leading-5 text-gray-600">
          {waiting ? `Oldest waiting ${waiting}. ` : ""}
          {todo.note}
        </Text>
      </View>
      <Ionicons name="chevron-forward" size={20} color={COLORS.textMuted} />
    </Pressable>
  );
}

export default function AdminDashboard() {
  const router = useRouter();
  const { user } = useAuth();
  const { isMobile, isDesktop, horizontalPadding } = useResponsive();
  const { summary, error, loading, refreshing, refresh } = useAdminSummary();
  const todos = TODOS.map((todo) => ({ todo, count: Number(summary[todo.key] || 0), since: summary[todo.since] })).filter(
    (item) => item.count > 0
  );

  const stats = [
    { label: "Active repairs", value: summary.active_repairs, icon: "construct-outline" },
    { label: "Disputes in progress", value: summary.active_disputes, icon: "chatbubbles-outline" },
    { label: "Verified shops", value: summary.verified_shops, icon: "storefront-outline" },
    { label: "Accounts", value: summary.users, icon: "people-outline" },
  ];

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

      <Text accessibilityRole="header" className="mb-3 text-lg font-bold text-gray-900">Needs your attention</Text>
      {loading ? (
        <View className="mb-6 items-center rounded-xl border border-gray-200 bg-white p-6">
          <ActivityIndicator color={COLORS.primary} />
        </View>
      ) : todos.length ? (
        <View className="mb-6">
          {todos.map(({ todo, count, since }) => (
            <TodoRow key={todo.key} todo={todo} count={count} since={since} onPress={() => router.push(todo.href)} />
          ))}
        </View>
      ) : (
        <View className="mb-6 flex-row items-center gap-3 rounded-xl border border-primary-soft bg-teal-50 p-4">
          <Ionicons name="checkmark-circle-outline" size={24} color={COLORS.primary} />
          <View className="flex-1">
            <Text className="text-base font-bold text-gray-900">All caught up</Text>
            <Text className="mt-0.5 text-xs text-gray-600">No shops, services, disputes or stuck repairs are waiting for an admin.</Text>
          </View>
        </View>
      )}

      <View className="mb-6 flex-row flex-wrap justify-between gap-y-3">
        {stats.map((stat) => (
          <View key={stat.label} style={{ width: isMobile ? "48%" : "24%" }} className="rounded-xl border border-gray-200 bg-white p-4">
            <Ionicons name={stat.icon} size={21} color={COLORS.primary} />
            <Text className="mt-3 text-xs font-medium text-gray-500">{stat.label}</Text>
            {loading ? (
              <ActivityIndicator className="mt-2 self-start" color={COLORS.primary} />
            ) : (
              <Text className="mt-1 text-xl font-bold text-gray-900">{stat.value ?? 0}</Text>
            )}
          </View>
        ))}
      </View>

      <Text accessibilityRole="header" className="mb-3 text-lg font-bold text-gray-900">Admin sections</Text>
      <View className="mb-6 flex-row flex-wrap justify-between gap-y-3">
        {SECTIONS.map((section) => (
          <Pressable
            key={section.href}
            onPress={() => router.push(section.href)}
            accessibilityRole="button"
            accessibilityLabel={`${section.title}${section.ready ? "" : ", coming soon"}`}
            style={{ width: isMobile ? "100%" : isDesktop ? "32%" : "48.5%" }}
            className="rounded-xl border border-gray-200 bg-white p-4 active:bg-teal-50"
          >
            <View className="flex-row items-center justify-between gap-2">
              <Ionicons name={section.icon} size={22} color={COLORS.primary} />
              {section.ready ? null : (
                <Text className="rounded-full bg-amber-100 px-2 py-0.5 text-xs font-semibold text-amber-800">Coming soon</Text>
              )}
            </View>
            <Text className="mt-3 text-sm font-bold text-gray-900">{section.title}</Text>
            <Text className="mt-1 text-xs leading-5 text-gray-500">{section.note}</Text>
          </Pressable>
        ))}
      </View>
    </ScrollView>
  );
}
