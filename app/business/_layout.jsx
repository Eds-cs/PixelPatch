// app/(business)/_layout.jsx
// Replaces legacy-web BusinessLayout's fixed w-64 sidebar, which had no mobile
// behaviour at all. Here the same nav is a permanent sidebar on wide screens
// and a slide-over drawer on phones.
import { Drawer } from "expo-router/drawer";
import { Platform } from "react-native";
import { Ionicons } from "@expo/vector-icons";

import { COLORS } from "../../constants/theme";
import { ShopProvider } from "../../lib/shop";
import { useResponsive } from "../../lib/useResponsive";

const SCREENS = [
  { name: "dashboard", title: "Dashboard", icon: "grid" },
  { name: "repairs/index", title: "Repairs", icon: "construct" },
  { name: "disputes/index", title: "Disputes", icon: "alert-circle" },
  { name: "employees", title: "Employees", icon: "people" },
  { name: "services", title: "Services", icon: "pricetags" },
  { name: "reviews", title: "Reviews", icon: "star" },
  { name: "profile", title: "Shop Profile", icon: "storefront" },
];

// Detail routes live in the drawer navigator but must not appear as nav items.
const HIDDEN = ["repairs/[id]", "disputes/[id]"];

export default function BusinessLayout() {
  const { isMobile, isTablet } = useResponsive();
  const permanent = Platform.OS !== "web" && !isMobile;

  return (
    <ShopProvider>
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

      {HIDDEN.map((name) => (
        <Drawer.Screen key={name} name={name} options={{ drawerItemStyle: { display: "none" } }} />
      ))}
    </Drawer>
    </ShopProvider>
  );
}
