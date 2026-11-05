// Business overview. Revenue range is separate from fixed monthly/all-time metrics.
import { useState } from "react";
import { ActivityIndicator, Pressable, RefreshControl, ScrollView, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";

import Button from "../../components/Button";
import { useFetch } from "../../lib/useFetch";
import { useResponsive } from "../../lib/useResponsive";
import { COLORS } from "../../constants/theme";

const RANGES = [
  { key: "week", label: "This week" },
  { key: "month", label: "This month" },
  { key: "year", label: "This year" },
];
const money = (value) => "₱" + Number(value || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });

function RevenueBars({ rows, range }) {
  const max = Math.max(1, ...rows.map((row) => Number(row.revenue) || 0));
  if (!rows.length) {
    return (
      <View className="items-center rounded-xl bg-gray-50 px-5 py-10">
        <Ionicons name="bar-chart-outline" size={30} color={COLORS.textMuted} />
        <Text className="mt-3 text-sm font-semibold text-gray-700">No paid revenue in this period</Text>
        <Text className="mt-1 text-center text-xs leading-5 text-gray-500">Confirmed payments will appear here.</Text>
      </View>
    );
  }
  return rows.map((row) => {
    const value = Number(row.revenue) || 0;
    const month = Number(row.label);
    const label = range === "year" && month >= 1 && month <= 12
      ? new Date(2000, month - 1, 1).toLocaleDateString(undefined, { month: "long" })
      : `Day ${row.label}`;
    return (
      <View key={row.label} className="mb-4" accessible accessibilityLabel={`${label}: ${money(value)}`}>
        <View className="mb-2 flex-row flex-wrap items-center justify-between gap-2">
          <Text className="text-xs font-medium text-gray-500">{label}</Text>
          <Text className="text-sm font-semibold text-gray-800">{money(value)}</Text>
        </View>
        <View className="h-2.5 overflow-hidden rounded-full bg-blue-50">
          <View className="h-full rounded-full bg-blue-600" style={{ width: `${Math.max(0, value / max * 100)}%` }} />
        </View>
      </View>
    );
  });
}

function DashboardContent({ range, onRangeChange }) {
  const router = useRouter();
  const { isMobile, isDesktop, horizontalPadding } = useResponsive();
  const { data, error, loading, refreshing, refresh } = useFetch(`/business/dashboard?range=${range}`);

  if (loading) {
    return <View className="flex-1 items-center justify-center bg-gray-50"><ActivityIndicator size="large" color={COLORS.primary} /></View>;
  }
  if (!data) {
    return (
      <View className="flex-1 items-center justify-center bg-gray-50 p-6">
        <Text className="mb-4 text-center text-sm text-gray-500">{error || "Dashboard unavailable."}</Text>
        <Button title="Try again" onPress={refresh} loading={refreshing} />
      </View>
    );
  }
  const status = data.statusBreakdown ?? {};
  const revenueRows = data.revenueByPeriod ?? [];
  const revenueTotal = revenueRows.reduce((sum, row) => sum + Number(row.revenue || 0), 0);
  const period = RANGES.find((item) => item.key === range).label.toLowerCase();
  const pending = Number(status.pending || 0);

  return (
    <ScrollView
      className="flex-1 bg-gray-50"
      contentContainerStyle={{ paddingVertical: 20, paddingHorizontal: horizontalPadding, maxWidth: isDesktop ? 1200 : 960, width: "100%", alignSelf: "center" }}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={refresh} tintColor={COLORS.primary} />}
    >
      <View className="mb-5 flex-row flex-wrap items-center justify-between gap-3">
        <View className="flex-1">
          <Text accessibilityRole="header" className="text-2xl font-bold text-gray-900">Business overview</Text>
          <Text className="mt-1 text-sm leading-5 text-gray-500">Your shop, repairs, and revenue at a glance.</Text>
        </View>
        <Button title="Refresh" variant="outline" onPress={refresh} loading={refreshing} />
      </View>

      {error ? <Text accessibilityRole="alert" className="mb-4 rounded-xl bg-red-50 p-4 text-sm text-red-700">Could not refresh: {error}. Showing the last loaded figures.</Text> : null}

      <Pressable onPress={() => router.push("/business/repairs")} accessibilityRole="button" className={`mb-5 flex-row items-center gap-3 rounded-xl border p-4 ${pending ? "border-amber-200 bg-amber-50" : "border-blue-100 bg-blue-50"}`}>
        <Ionicons name={pending ? "file-tray-outline" : "checkmark-circle-outline"} size={24} color={pending ? "#b45309" : COLORS.primary} />
        <View className="flex-1">
          <Text className="text-sm font-bold text-gray-900">{pending ? `${pending} request${pending === 1 ? "" : "s"} awaiting your decision` : "No requests awaiting a decision"}</Text>
          <Text className="mt-1 text-xs leading-5 text-gray-600">{pending ? "Open the repair workspace to review incoming requests." : "Open the repair workspace to check ongoing work."}</Text>
        </View>
        <Ionicons name="arrow-forward-outline" size={20} color={COLORS.textMuted} />
      </Pressable>

      <View className="mb-5 flex-row flex-wrap justify-between gap-y-3">
        {[
          { label: "Customers", value: data.clientsThisMonth, scope: "Unique clients · this month", icon: "people-outline" },
          { label: "Repair requests", value: data.requestsThisMonth, scope: "New requests · this month", icon: "construct-outline" },
          { label: "Paid transactions", value: data.totalTransactions, scope: "Confirmed payments · all time", icon: "receipt-outline" },
          { label: "Average request estimate", value: money(data.averageRange), scope: "Request estimates · all time", icon: "calculator-outline" },
        ].map((stat) => (
          <View key={stat.label} style={{ width: isMobile ? "48%" : "24%" }} className="rounded-xl border border-gray-200 bg-white p-4">
            <Ionicons name={stat.icon} size={21} color={COLORS.primary} />
            <Text className="mt-3 text-xs font-medium text-gray-500">{stat.label}</Text>
            <Text className="mt-1 text-xl font-bold text-gray-900">{stat.value ?? 0}</Text>
            <Text className="mt-2 text-xs leading-4 text-gray-400">{stat.scope}</Text>
          </View>
        ))}
      </View>

      <View className={`mb-5 gap-4 ${isDesktop ? "flex-row items-start" : ""}`}>
        <View style={isDesktop ? { flex: 2, minWidth: 0 } : undefined} className="rounded-2xl border border-gray-200 bg-white p-5">
          <View className="mb-5 flex-row flex-wrap items-center justify-between gap-3">
            <View>
              <Text className="text-lg font-bold text-gray-900">Revenue overview</Text>
              <Text className="mt-1 text-xs text-gray-500">Confirmed paid payments only</Text>
            </View>
            <View className="flex-row flex-wrap gap-1 rounded-lg bg-gray-50 p-1">
              {RANGES.map((item) => (
                <Pressable key={item.key} onPress={() => onRangeChange(item.key)} accessibilityRole="button" accessibilityLabel={`Revenue: ${item.label}`} accessibilityState={{ selected: range === item.key }} className={`min-h-11 justify-center rounded-md px-3 py-2 ${range === item.key ? "bg-blue-600" : ""}`}>
                  <Text className={`text-xs font-semibold ${range === item.key ? "text-white" : "text-gray-500"}`}>{item.label}</Text>
                </Pressable>
              ))}
            </View>
          </View>
          <Text className="text-xs font-medium uppercase text-gray-400">Paid revenue · {period}</Text>
          <Text className="mb-1 mt-2 text-3xl font-bold text-blue-600">{money(revenueTotal)}</Text>
          <Text className="mb-6 text-xs text-gray-400">{range === "year" ? "Monthly totals for the current year" : "Daily totals by day of the month"}</Text>
          <RevenueBars rows={revenueRows} range={range} />
        </View>

        <View style={isDesktop ? { flex: 1, minWidth: 0 } : undefined} className="rounded-2xl border border-gray-200 bg-white p-5">
          <Text className="text-lg font-bold text-gray-900">Repair activity</Text>
          <Text className="mb-4 mt-1 text-xs text-gray-500">All-time request counts</Text>
          {[
            { label: "Needs decision", value: status.pending, color: "#d97706" },
            { label: "Accepted overall", value: status.accepted, color: COLORS.primary },
            { label: "In progress", value: status.in_progress, color: "#4f46e5" },
            { label: "Completed", value: status.completed, color: COLORS.success },
          ].map((item) => (
            <View key={item.label} className="flex-row items-center gap-3 border-b border-gray-100 py-3">
              <View className="h-2 w-2 rounded-full" style={{ backgroundColor: item.color }} />
              <Text className="flex-1 text-sm text-gray-600">{item.label}</Text>
              <Text className="text-base font-bold text-gray-900">{item.value || 0}</Text>
            </View>
          ))}
          <Text className="mb-4 mt-3 text-xs leading-5 text-gray-400">Accepted includes requests that are in progress or completed. These counts are not separate totals.</Text>
          <Button title="Open repair workspace" variant="outline" onPress={() => router.push("/business/repairs")} />
        </View>
      </View>

      <Text className="mb-3 text-lg font-bold text-gray-900">Manage your shop</Text>
      <View className="mb-5 flex-row flex-wrap justify-between gap-y-3">
        {[
          { title: "Repair workspace", note: "Review and track requests", icon: "build-outline", href: "/business/repairs" },
          { title: "Your team", note: "Employee directory", icon: "people-outline", href: "/business/employees" },
          { title: "Services", note: "Manage what you offer", icon: "pricetags-outline", href: "/business/services" },
          { title: "Customer reviews", note: "Explore customer feedback", icon: "star-outline", href: "/business/reviews" },
        ].map((item) => (
          <Pressable key={item.href} onPress={() => router.push(item.href)} accessibilityRole="button" style={{ width: isMobile ? "48%" : "24%" }} className="rounded-xl border border-gray-200 bg-white p-4 active:bg-blue-50">
            <Ionicons name={item.icon} size={22} color={COLORS.primary} />
            <Text className="mt-3 text-sm font-bold text-gray-900">{item.title}</Text>
            <Text className="mt-1 text-xs leading-5 text-gray-500">{item.note}</Text>
          </Pressable>
        ))}
      </View>
    </ScrollView>
  );
}

export default function BusinessDashboard() {
  const [range, setRange] = useState("month");
  // A different range gets its own fetch state, so old totals never acquire a
  // new period label while the next request is loading.
  return <DashboardContent key={range} range={range} onRangeChange={setRange} />;
}
