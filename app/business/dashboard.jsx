// app/(business)/dashboard.jsx — GET /api/business/dashboard?range=
import { useState } from "react";
import { ActivityIndicator, Pressable, RefreshControl, ScrollView, Text, View } from "react-native";

import { useFetch } from "../../lib/useFetch";
import { COLORS } from "../../constants/theme";

const RANGES = [
  { key: "week", label: "Week" },
  { key: "month", label: "Month" },
  { key: "year", label: "Year" },
];

function Stat({ label, value, tone = "default" }) {
  const toneClass =
    tone === "primary" ? "text-blue-600" : tone === "muted" ? "text-gray-500" : "text-gray-900";
  return (
    <View className="mb-3 min-w-[45%] flex-1 rounded-xl border border-gray-200 bg-white p-4">
      <Text className="text-xs font-medium uppercase tracking-wide text-gray-500">{label}</Text>
      <Text className={`mt-1 text-2xl font-extrabold ${toneClass}`}>{value}</Text>
    </View>
  );
}

// Lightweight inline bars — avoids pulling a chart library into the native bundle.
function RevenueBars({ data }) {
  const rows = data ?? [];
  const max = Math.max(1, ...rows.map((r) => Number(r.revenue) || 0));

  if (rows.length === 0) {
    return <Text className="text-sm text-gray-500">No revenue recorded for this range.</Text>;
  }

  return (
    <View>
      {rows.map((r, i) => {
        const value = Number(r.revenue) || 0;
        return (
          <View key={`${r.label}-${i}`} className="mb-2.5">
            <View className="mb-1 flex-row justify-between">
              <Text className="text-xs text-gray-600">{r.label}</Text>
              <Text className="text-xs font-semibold text-gray-900">
                {"\u20B1"}{value.toLocaleString()}
              </Text>
            </View>
            <View className="h-2 overflow-hidden rounded-full bg-gray-100">
              <View
                className="h-2 rounded-full bg-blue-600"
                style={{ width: `${Math.max(2, (value / max) * 100)}%` }}
              />
            </View>
          </View>
        );
      })}
    </View>
  );
}

export default function BusinessDashboard() {
  const [range, setRange] = useState("month");
  const { data, error, loading, refreshing, refresh } = useFetch(
    `/business/dashboard?range=${range}`
  );

  if (loading) {
    return (
      <View className="flex-1 items-center justify-center bg-gray-50">
        <ActivityIndicator size="large" color={COLORS.primary} />
      </View>
    );
  }

  const status = data?.statusBreakdown ?? {};

  return (
    <ScrollView
      className="flex-1 bg-gray-50"
      contentContainerStyle={{ padding: 16, maxWidth: 960, width: "100%", alignSelf: "center" }}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={refresh} tintColor={COLORS.primary} />
      }
    >
      <View className="mb-4 flex-row rounded-lg border border-gray-200 bg-white p-1">
        {RANGES.map((r) => (
          <Pressable
            key={r.key}
            onPress={() => setRange(r.key)}
            accessibilityRole="button"
            accessibilityState={{ selected: range === r.key }}
            className={`flex-1 items-center rounded-md py-2 ${
              range === r.key ? "bg-blue-600" : "bg-transparent"
            }`}
          >
            <Text
              className={`text-sm font-semibold ${
                range === r.key ? "text-white" : "text-gray-600"
              }`}
            >
              {r.label}
            </Text>
          </Pressable>
        ))}
      </View>

      {error ? (
        <View className="mb-4 rounded-xl border border-gray-200 bg-white p-4">
          <Text className="text-sm text-gray-500">{error}</Text>
        </View>
      ) : null}

      <View className="mb-2 flex-row flex-wrap gap-3">
        <Stat label="Clients this month" value={data?.clientsThisMonth ?? 0} />
        <Stat label="Requests this month" value={data?.requestsThisMonth ?? 0} />
        <Stat label="Transactions" value={data?.totalTransactions ?? 0} />
        <Stat
          label="Avg. estimate"
          value={`\u20B1${Number(data?.averageRange ?? 0).toLocaleString()}`}
          tone="primary"
        />
      </View>

      <Text className="mb-3 mt-4 text-lg font-bold text-gray-900">Request status</Text>
      <View className="mb-6 rounded-xl border border-gray-200 bg-white p-4">
        {[
          ["Pending", status.pending, "bg-amber-500"],
          ["Accepted", status.accepted, "bg-blue-500"],
          ["In progress", status.in_progress, "bg-indigo-500"],
          ["Completed", status.completed, "bg-emerald-500"],
        ].map(([label, count, dot]) => (
          <View key={label} className="flex-row items-center justify-between py-2">
            <View className="flex-row items-center">
              <View className={`mr-2.5 h-2.5 w-2.5 rounded-full ${dot}`} />
              <Text className="text-sm text-gray-700">{label}</Text>
            </View>
            <Text className="text-sm font-bold text-gray-900">{count ?? 0}</Text>
          </View>
        ))}
      </View>

      <Text className="mb-3 text-lg font-bold text-gray-900">Revenue</Text>
      <View className="mb-8 rounded-xl border border-gray-200 bg-white p-4">
        <RevenueBars data={data?.revenueByPeriod} />
      </View>
    </ScrollView>
  );
}
