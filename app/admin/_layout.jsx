// app/admin/_layout.jsx — admin portal navigation.
// Mirrors the business portal: a permanent sidebar on wider native screens,
// a slide-over drawer on phones, and the shared WebHeader on web.
import { Drawer } from "expo-router/drawer";
import { Platform } from "react-native";
import { Ionicons } from "@expo/vector-icons";

import { COLORS } from "../../constants/theme";
import { useResponsive } from "../../lib/useResponsive";

const SCREENS = [
  { name: "dashboard", title: "Dashboard", icon: "speedometer" },
  { name: "services", title: "Services", icon: "shield-checkmark" },
  { name: "shops", title: "Shops", icon: "storefront" },
  { name: "users", title: "Users", icon: "people" },
  { name: "repairs", title: "Repairs", icon: "construct" },
  { name: "disputes", title: "Disputes", icon: "alert-circle" },
  { name: "payments", title: "Payments", icon: "card" },
  { name: "reviews", title: "Reviews", icon: "star" },
  { name: "account", title: "Account", icon: "person-circle" },
];

export default function AdminLayout() {
  const { isMobile, isTablet } = useResponsive();
  const permanent = Platform.OS !== "web" && !isMobile;

  return (
    <Drawer
      screenOptions={{
        drawerType: permanent ? "permanent" : "front",
        drawerStyle: { width: isTablet ? 224 : 256, backgroundColor: COLORS.surface },
        swipeEnabled: Platform.OS !== "web" && !permanent,
        drawerActiveTintColor: COLORS.primary,
        drawerInactiveTintColor: COLORS.textMuted,
        drawerActiveBackgroundColor: "#eff6ff",
        headerShown: Platform.OS !== "web",
        headerStyle: { backgroundColor: COLORS.surface },
        headerTintColor: COLORS.text,
        headerTitleStyle: { fontWeight: "700" },
      }}
    >
      {SCREENS.map(({ name, title, icon }) => (
        <Drawer.Screen
          key={name}
          name={name}
          options={{
            title,
            drawerIcon: ({ color, size }) => (
              <Ionicons name={`${icon}-outline`} size={size} color={color} />
            ),
          }}
        />
      ))}
    </Drawer>
  );
}
