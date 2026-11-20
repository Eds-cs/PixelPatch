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

const ADMIN_NAV = [
  { label: "Dashboard", href: "/admin/dashboard", exact: true },
  { label: "Services", href: "/admin/services" },
  { label: "Shops", href: "/admin/shops" },
  { label: "Users", href: "/admin/users" },
  { label: "Repairs", href: "/admin/repairs" },
  { label: "Disputes", href: "/admin/disputes" },
  { label: "Payments", href: "/admin/payments" },
  { label: "Reviews", href: "/admin/reviews" },
];

function isActive(pathname, href, exact) {
  return exact ? pathname === href : pathname === href || pathname.startsWith(`${href}/`);
}

export default function WebHeader() {
  const router = useRouter();
  const pathname = usePathname();
  const { user, isBusiness, isAdmin, logout } = useAuth();
  const { layout, isMobile, isDesktop, horizontalPadding } = useResponsive();
  const [menuPath, setMenuPath] = useState(null);
  const menuOpen = isMobile && menuPath === pathname;
  const navigation = isAdmin ? ADMIN_NAV : isBusiness ? BUSINESS_NAV : CLIENT_NAV;
  const profileHref = isAdmin ? "/admin/account" : isBusiness ? "/business/profile" : "/profile";
  // Visible label: the signed-in person's first name, else one word for the role.
  const firstName = String(user?.first_name ?? "").trim();
  const profileLabel = firstName || (isAdmin ? "Admin" : isBusiness ? "Shop" : "Profile");
  // Screen readers still hear where the link goes.
  const profileDestination = isAdmin ? "admin account" : isBusiness ? "shop profile" : "profile";
  const profileA11yLabel = firstName ? `${firstName}, open ${profileDestination}` : `Open ${profileDestination}`;
  const homeHref = isAdmin ? "/admin/dashboard" : isBusiness ? "/business/dashboard" : "/";

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
        className={`rounded-md px-3 py-3 ${active ? "bg-brand-50" : ""}`}
      >
        <Text className={`text-sm font-semibold ${active ? "text-brand-700" : "text-gray-600"}`}>
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
        accessibilityLabel={profileA11yLabel}
        accessibilityState={{ selected: isActive(pathname, profileHref) }}
        className="flex-row items-center rounded-md px-3 py-3"
      >
        <Ionicons name="person-circle-outline" size={22} color={COLORS.textMuted} />
        {/* Long names are truncated so the header never overflows. */}
        <Text numberOfLines={1} style={{ maxWidth: isMobile ? undefined : 140 }} className="ml-2 text-sm font-semibold text-gray-700">{profileLabel}</Text>
      </Pressable>
      {/* The top bar shows only the profile link; sign-out lives on each
          role's profile page. The phone menu keeps it for quick access. */}
      {isMobile ? (
        <Pressable
          onPress={() => { setMenuPath(null); logout(); }}
          accessibilityRole="button"
          className="mt-2 rounded-md border border-gray-300 px-3 py-3"
        >
          <Text className="text-sm font-semibold text-gray-700">Sign out</Text>
        </Pressable>
      ) : null}
    </View>
  );

  return (
    <SafeAreaView edges={["top", "left", "right"]} className="w-full border-b border-gray-200 bg-white">
      <View className="mx-auto w-full max-w-7xl" style={{ paddingHorizontal: horizontalPadding }}>
      <View className="min-h-16 flex-row items-center justify-between">
        <Pressable
          onPress={() => navigate(homeHref)}
          accessibilityRole="link"
          className="mr-4 shrink-0 py-3"
        >
          <Text className="text-2xl font-extrabold text-brand-600">PixelPatch</Text>
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
            <Text accessibilityRole="header" className="text-xl font-bold text-brand-600">PixelPatch</Text>
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
