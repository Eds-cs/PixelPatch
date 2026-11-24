// app/admin/_layout.jsx — admin portal navigation.
// Mirrors the business portal: a permanent sidebar on wider native screens,
// a slide-over drawer on phones, and the shared WebHeader on web. Sections
// with items waiting for an admin show a count (lib/adminSummary.js).
import { Drawer } from "expo-router/drawer";
import { Platform, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";

import { COLORS } from "../../constants/theme";
import { useResponsive } from "../../lib/useResponsive";
import { adminBadge, useAdminSummary } from "../../lib/adminSummary";

const SCREENS = [
  { name: "dashboard", title: "Dashboard", icon: "speedometer" },
  { name: "shops", title: "Shops", icon: "storefront" },
  { name: "services", title: "Services", icon: "shield-checkmark" },
  { name: "disputes", title: "Disputes", icon: "alert-circle" },
  { name: "repairs", title: "Repairs", icon: "construct" },
  { name: "users", title: "Users", icon: "people" },
  { name: "payments", title: "Payments", icon: "card" },
  { name: "reviews", title: "Reviews", icon: "star" },
  { name: "account", title: "Account", icon: "person-circle" },
];

export default function AdminLayout() {
  const { isMobile, isTablet } = useResponsive();
  const permanent = Platform.OS !== "web" && !isMobile;
  // Only the native drawer shows badges here; on web the WebHeader does.
  const { summary } = useAdminSummary(Platform.OS !== "web");

  return (
    <Drawer
      screenOptions={{
        drawerType: permanent ? "permanent" : "front",
        drawerStyle: { width: isTablet ? 224 : 256, backgroundColor: COLORS.surface },
        swipeEnabled: Platform.OS !== "web" && !permanent,
        drawerActiveTintColor: COLORS.primary,
        drawerInactiveTintColor: COLORS.textMuted,
        drawerActiveBackgroundColor: "#CCFBF1",
        headerShown: Platform.OS !== "web",
        headerStyle: { backgroundColor: COLORS.surface },
        headerTintColor: COLORS.text,
        headerTitleStyle: { fontWeight: "700" },
      }}
    >
      {SCREENS.map(({ name, title, icon }) => {
        const badge = adminBadge(summary, `/admin/${name}`);
        return (
          <Drawer.Screen
            key={name}
            name={name}
            options={{
              title,
              drawerLabel: ({ color }) => (
                <View
                  className="flex-row items-center justify-between"
                  accessibilityLabel={badge ? `${title}, ${badge} waiting` : title}
                >
                  <Text style={{ color, fontWeight: "600" }}>{title}</Text>
                  {badge ? (
                    <View style={{ minWidth: 22 }} className="items-center rounded-full bg-amber-500 px-1.5 py-0.5">
                      <Text className="text-xs font-bold text-white">{badge > 99 ? "99+" : badge}</Text>
                    </View>
                  ) : null}
                </View>
              ),
              drawerIcon: ({ color, size }) => <Ionicons name={`${icon}-outline`} size={size} color={color} />,
            }}
          />
        );
      })}
    </Drawer>
  );
}
