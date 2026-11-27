// app/staff/_layout.jsx — the staff portal for shop employees (lib/staff.jsx).
// Same responsive drawer as the business portal: a permanent sidebar on wider
// native screens, a slide-over drawer on phones; the web uses WebHeader.
// The root layout keeps non-members out of /staff.
import { Drawer, DrawerContentScrollView, DrawerItem, DrawerItemList } from "expo-router/drawer";
import { useRouter } from "expo-router";
import { Platform, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";

import { COLORS } from "../../constants/theme";
import { useResponsive } from "../../lib/useResponsive";
import { useStaff } from "../../lib/staff";

const SCREENS = [
  { name: "repairs/index", title: "My repairs", icon: "construct" },
  { name: "messages", title: "Messages", icon: "chatbubbles" },
];
const HIDDEN = ["repairs/[id]"];

function DrawerContent(props) {
  const router = useRouter();
  const { membership } = useStaff();
  return (
    <DrawerContentScrollView {...props}>
      {membership ? (
        <View className="mx-3 mb-3 rounded-xl bg-teal-50 px-3 py-3">
          <Text className="text-sm font-bold text-teal-950">{membership.shop_name}</Text>
          <Text className="mt-0.5 text-xs text-teal-900">{membership.first_name} · {membership.role}</Text>
        </View>
      ) : null}
      <DrawerItemList {...props} />
      <View className="mx-3 my-2 h-px bg-gray-200" />
      <DrawerItem
        label="Browse PixelPatch"
        icon={({ size }) => <Ionicons name="home-outline" size={size} color={COLORS.primary} />}
        labelStyle={{ color: COLORS.primary, fontWeight: "600" }}
        onPress={() => router.push("/")}
      />
    </DrawerContentScrollView>
  );
}

export default function StaffLayout() {
  const { isMobile, isTablet } = useResponsive();
  const permanent = Platform.OS !== "web" && !isMobile;

  return (
    <Drawer
      drawerContent={(props) => <DrawerContent {...props} />}
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
      {SCREENS.map(({ name, title, icon }) => (
        <Drawer.Screen
          key={name}
          name={name}
          options={{
            title,
            drawerIcon: ({ color, size }) => <Ionicons name={`${icon}-outline`} size={size} color={color} />,
          }}
        />
      ))}
      {HIDDEN.map((name) => (
        <Drawer.Screen key={name} name={name} options={{ title: "Repair", drawerItemStyle: { display: "none" } }} />
      ))}
    </Drawer>
  );
}
