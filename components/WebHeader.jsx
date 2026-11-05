import { Ionicons } from "@expo/vector-icons";
import { useState } from "react";
import { Modal, Pressable, ScrollView, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { usePathname, useRouter } from "expo-router";

import { useAuth } from "../lib/auth";
import { COLORS } from "../constants/theme";
import { useResponsive } from "../lib/useResponsive";

const CLIENT_NAV = [
  { label: "Home", href: "/", exact: true },
  { label: "Services", href: "/services" },
  { label: "Repairs", href: "/repairs" },
  { label: "Assistant", href: "/assistant" },
  { label: "Chats", href: "/chat" },
];

const BUSINESS_NAV = [
  { label: "Dashboard", href: "/business/dashboard", exact: true },
  { label: "Repairs", href: "/business/repairs" },
  { label: "Disputes", href: "/business/disputes" },
  { label: "Employees", href: "/business/employees" },
  { label: "Services", href: "/business/services" },
  { label: "Reviews", href: "/business/reviews" },
];

function isActive(pathname, href, exact) {
  return exact ? pathname === href : pathname === href || pathname.startsWith(`${href}/`);
}

export default function WebHeader() {
  const router = useRouter();
  const pathname = usePathname();
  const { isBusiness, logout } = useAuth();
  const { layout, isMobile, isDesktop, horizontalPadding } = useResponsive();
  const [menuPath, setMenuPath] = useState(null);
  const menuOpen = isMobile && menuPath === pathname;
  const navigation = isBusiness ? BUSINESS_NAV : CLIENT_NAV;
  const profileHref = isBusiness ? "/business/profile" : "/profile";

  const navigate = (href) => {
    setMenuPath(null);
    router.push(href);
  };

  const links = navigation.map((item) => {
    const active = isActive(pathname, item.href, item.exact);
    return (
      <Pressable
        key={item.href}
        onPress={() => navigate(item.href)}
        accessibilityRole="link"
        accessibilityState={{ selected: active }}
        className={`rounded-md px-3 py-3 ${active ? "bg-blue-50" : ""}`}
      >
        <Text className={`text-sm font-semibold ${active ? "text-blue-700" : "text-gray-600"}`}>
          {item.label}
        </Text>
      </Pressable>
    );
  });

  const accountActions = (
    <View className={isMobile ? "mt-4 border-t border-gray-200 pt-3" : "flex-row items-center"}>
      <Pressable
        onPress={() => navigate(profileHref)}
        accessibilityRole="link"
        accessibilityLabel={isBusiness ? "Shop profile" : "Profile"}
        accessibilityState={{ selected: isActive(pathname, profileHref) }}
        className="flex-row items-center rounded-md px-3 py-3"
      >
        <Ionicons name="person-circle-outline" size={22} color={COLORS.textMuted} />
        <Text className="ml-2 text-sm font-semibold text-gray-700">{isBusiness ? "Shop profile" : "Profile"}</Text>
      </Pressable>
      <Pressable
        onPress={() => { setMenuPath(null); logout(); }}
        accessibilityRole="button"
        className="rounded-md border border-gray-300 px-3 py-3"
      >
        <Text className="text-sm font-semibold text-gray-700">Sign out</Text>
      </Pressable>
    </View>
  );

  return (
    <SafeAreaView edges={["top", "left", "right"]} className="w-full border-b border-gray-200 bg-white">
      <View className="mx-auto w-full max-w-7xl" style={{ paddingHorizontal: horizontalPadding }}>
      <View className="min-h-16 flex-row items-center justify-between">
        <Pressable
          onPress={() => navigate(isBusiness ? "/business/dashboard" : "/")}
          accessibilityRole="link"
          className="mr-4 shrink-0 py-3"
        >
          <Text className="text-2xl font-extrabold text-blue-600">PixelPatch</Text>
        </Pressable>

        {isDesktop ? <View className="flex-1 flex-row items-center">{links}</View> : null}
        {isMobile ? (
          <Pressable
            onPress={() => setMenuPath(pathname)}
            accessibilityRole="button"
            accessibilityLabel="Open navigation menu"
            accessibilityState={{ expanded: menuOpen }}
            className="h-12 w-12 items-center justify-center rounded-md"
          >
            <Ionicons name="menu-outline" size={28} color={COLORS.text} />
          </Pressable>
        ) : accountActions}
      </View>
      {layout === "tablet" ? (
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 8 }}>
          {links}
        </ScrollView>
      ) : null}
      </View>
      <Modal visible={menuOpen} animationType="slide" onRequestClose={() => setMenuPath(null)} accessibilityViewIsModal supportedOrientations={["portrait", "landscape"]}>
        <SafeAreaView className="flex-1 bg-white">
          <View className="min-h-16 flex-row items-center justify-between border-b border-gray-200 px-4">
            <Text accessibilityRole="header" className="text-xl font-bold text-blue-600">PixelPatch</Text>
            <Pressable
              onPress={() => setMenuPath(null)}
              accessibilityRole="button"
              accessibilityLabel="Close navigation menu"
              className="h-12 w-12 items-center justify-center"
            >
              <Ionicons name="close-outline" size={28} color={COLORS.text} />
            </Pressable>
          </View>
          <ScrollView contentContainerStyle={{ padding: 16 }}>
            {links}
            {accountActions}
          </ScrollView>
        </SafeAreaView>
      </Modal>
    </SafeAreaView>
  );
}
