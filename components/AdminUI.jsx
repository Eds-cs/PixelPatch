// components/AdminUI.jsx
// Building blocks shared by the admin screens (app/admin/), so every section
// has the same header, filter tabs, pills, empty states and detail rows.
import { Pressable, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";

import { COLORS } from "../constants/theme";

/** "Nov 24, 2026, 9:05 PM" from a MySQL datetime or ISO string; "—" if empty. */
export function adminDate(value, { time = true } = {}) {
  if (!value) return "—";
  const date = new Date(String(value).replace(" ", "T"));
  if (Number.isNaN(date.getTime())) return "—";
  return date.toLocaleString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
    ...(time ? { hour: "numeric", minute: "2-digit" } : {}),
  });
}

export const adminMoney = (value) =>
  value === null || value === undefined || value === "" || !Number.isFinite(Number(value))
    ? "—"
    : "₱" + Number(value).toLocaleString(undefined, { maximumFractionDigits: 2 });

export function AdminPageHeader({ title, description, right = null }) {
  return (
    <View className="mb-4 flex-row flex-wrap items-start justify-between gap-3">
      <View className="flex-1" style={{ minWidth: 220 }}>
        <Text accessibilityRole="header" className="text-2xl font-bold text-gray-900">{title}</Text>
        {description ? <Text className="mt-1 text-sm leading-5 text-gray-500">{description}</Text> : null}
      </View>
      {right}
    </View>
  );
}

/** tabs: [{ key, label }]; counts: { [key]: number } (optional). Wraps on small screens. */
export function AdminTabs({ tabs, value, onChange, counts = {} }) {
  return (
    <View accessibilityRole="tablist" className="mb-3 flex-row flex-wrap gap-2">
      {tabs.map((tab) => {
        const active = value === tab.key;
        const count = counts[tab.key];
        return (
          <Pressable
            key={tab.key}
            onPress={() => onChange(tab.key)}
            accessibilityRole="tab"
            accessibilityState={{ selected: active }}
            className={`min-h-11 flex-row items-center justify-center rounded-lg px-3 py-2 ${
              active ? "bg-primary" : "border border-gray-200 bg-white"
            }`}
          >
            <Text className={`text-sm font-semibold ${active ? "text-white" : "text-gray-700"}`}>
              {tab.label}
              {count !== null && count !== undefined ? ` (${count})` : ""}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

const PILL_TONES = {
  gray: "bg-gray-100 text-gray-700",
  teal: "bg-teal-50 text-teal-800",
  green: "bg-emerald-100 text-emerald-800",
  amber: "bg-amber-100 text-amber-800",
  red: "bg-red-100 text-red-800",
  blue: "bg-sky-100 text-sky-800",
};

export function AdminPill({ label, tone = "gray" }) {
  const [bg, fg] = (PILL_TONES[tone] ?? PILL_TONES.gray).split(" ");
  return (
    <View className={`self-start rounded-full px-2.5 py-1 ${bg}`}>
      <Text className={`text-xs font-semibold ${fg}`}>{label}</Text>
    </View>
  );
}

export function AdminEmpty({ icon = "file-tray-outline", text }) {
  return (
    <View className="items-center rounded-2xl border border-gray-200 bg-white p-8">
      <Ionicons name={icon} size={32} color={COLORS.textMuted} />
      <Text className="mt-2 text-center text-sm text-gray-500">{text}</Text>
    </View>
  );
}

/** A labelled value with an icon, for detail panels. */
export function AdminDetail({ icon, label, children }) {
  return (
    <View className="mb-3 flex-row items-start">
      <Ionicons name={icon} size={16} color={COLORS.textMuted} style={{ marginTop: 2 }} />
      <View className="ml-2 flex-1">
        <Text className="text-xs font-semibold uppercase text-gray-400">{label}</Text>
        <Text className="mt-0.5 text-sm text-gray-800">{children}</Text>
      </View>
    </View>
  );
}

/** A tappable list card with a chevron. */
export function AdminCard({ onPress, accessibilityLabel, children, highlight = false }) {
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      className={`mb-3 flex-row items-center gap-3 rounded-2xl border p-4 active:bg-teal-50 ${
        highlight ? "border-amber-300 bg-amber-50" : "border-gray-200 bg-white"
      }`}
    >
      <View className="flex-1">{children}</View>
      <Ionicons name="chevron-forward" size={18} color={COLORS.textMuted} />
    </Pressable>
  );
}

export function AdminNotice({ message, onDismiss }) {
  if (!message) return null;
  return (
    <View className="mb-4 flex-row items-start gap-2 rounded-lg bg-teal-50 p-3">
      <Ionicons name="checkmark-circle" size={18} color={COLORS.primary} />
      <Text className="flex-1 text-sm text-teal-900">{message}</Text>
      <Pressable onPress={onDismiss} accessibilityLabel="Dismiss" hitSlop={8}>
        <Ionicons name="close" size={18} color={COLORS.textMuted} />
      </Pressable>
    </View>
  );
}
