import { Ionicons } from "@expo/vector-icons";
import { useState } from "react";
import { Animated, Easing, Modal, Platform, Pressable, ScrollView, StyleSheet, Text, View, useWindowDimensions } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { usePathname, useRouter } from "expo-router";

import { useAuth } from "../lib/auth";
import { COLORS } from "../constants/theme";
import { useResponsive } from "../lib/useResponsive";
import { adminBadge, useAdminSummary } from "../lib/adminSummary";
import { useStaff } from "../lib/staff";

const CLIENT_NAV = [
  { label: "Home", href: "/", exact: true },
  { label: "Services", href: "/services" },
  { label: "Repairs", href: "/repairs" },
  { label: "Assistant", href: "/assistant" },
  { label: "Chats", href: "/chat" },
];

// Signed-out visitors: the pages they can browse without an account.
const GUEST_NAV = [
  { label: "Home", href: "/", exact: true },
  { label: "Services", href: "/services" },
  { label: "Help", href: "/help" },
];

const BUSINESS_NAV = [
  { label: "Dashboard", href: "/business/dashboard", exact: true },
  { label: "Repairs", href: "/business/repairs" },
  { label: "Messages", href: "/business/messages" },
  { label: "Disputes", href: "/business/disputes" },
  { label: "Employees", href: "/business/employees" },
  { label: "Services", href: "/business/services" },
  { label: "Reviews", href: "/business/reviews" },
];

// Switches between a shop owner's portal and the customer side.
const BROWSE_LINK = { label: "Browse PixelPatch", href: "/", exact: true, switcher: true };
const MY_SHOP_LINK = { label: "My shop", href: "/business/dashboard", switcher: true };

// Shop employees with their own account (lib/staff.jsx): their repairs and
// the chats handed to them, plus the customer side like any client.
const STAFF_NAV = [
  { label: "My repairs", href: "/staff/repairs" },
  { label: "Messages", href: "/staff/messages" },
];
const STAFF_LINK = { label: "Staff portal", href: "/staff/repairs", switcher: true };

const ADMIN_NAV = [
  // Work queues first (they show waiting counts), then oversight sections.
  { label: "Dashboard", href: "/admin/dashboard", exact: true },
  { label: "Shops", href: "/admin/shops" },
  { label: "Services", href: "/admin/services" },
  { label: "Disputes", href: "/admin/disputes" },
  { label: "Repairs", href: "/admin/repairs" },
  { label: "Users", href: "/admin/users" },
  { label: "Payments", href: "/admin/payments" },
  { label: "Reviews", href: "/admin/reviews" },
];

function isActive(pathname, href, exact) {
  return exact ? pathname === href : pathname === href || pathname.startsWith(`${href}/`);
}

export default function WebHeader() {
  const router = useRouter();
  const pathname = usePathname();
  const { user, isLoggedIn, isBusiness, isAdmin, logout } = useAuth();
  const { isStaff } = useStaff();
  const { layout, isMobile, isDesktop, horizontalPadding } = useResponsive();
  // Admins: how many items wait in each section (badges on the links).
  const { summary: adminSummary } = useAdminSummary(Boolean(isAdmin));
  const [menuPath, setMenuPath] = useState(null);
  const menuOpen = isMobile && menuPath === pathname;
  // Phone menu: a panel that slides in from the right edge over a dimmed page.
  // 0 = hidden off the right edge, 1 = fully open.
  const { width: screenWidth } = useWindowDimensions();
  const panelWidth = Math.min(320, Math.round(screenWidth * 0.85));
  // Created once and kept for the life of the header.
  const [slide] = useState(() => new Animated.Value(0));
  const useNativeDriver = Platform.OS !== "web";
  const openMenu = () => {
    slide.setValue(0);
    setMenuPath(pathname);
  };
  // Slide in once the modal is on screen (onShow), so no effect is needed.
  const animateIn = () =>
    Animated.timing(slide, { toValue: 1, duration: 260, easing: Easing.out(Easing.cubic), useNativeDriver }).start();
  const closeMenu = () =>
    Animated.timing(slide, { toValue: 0, duration: 200, easing: Easing.in(Easing.cubic), useNativeDriver }).start(() =>
      setMenuPath(null)
    );
  // Shop owners use PixelPatch two ways: their shop's portal (/business/...)
  // and the customer side (browsing, booking at other shops). The header
  // follows whichever side they are on and links to the other.
  const inShopPortal = isBusiness && (pathname === "/business" || pathname.startsWith("/business/"));
  const inStaffPortal = isStaff && (pathname === "/staff" || pathname.startsWith("/staff/"));
  const navigation = !isLoggedIn
    ? GUEST_NAV
    : isAdmin
      ? ADMIN_NAV
      : isBusiness
        ? inShopPortal ? [...BUSINESS_NAV, BROWSE_LINK] : [...CLIENT_NAV, MY_SHOP_LINK]
        : isStaff
          ? inStaffPortal ? [...STAFF_NAV, BROWSE_LINK] : [...CLIENT_NAV, STAFF_LINK]
          : CLIENT_NAV;
  const profileHref = isAdmin ? "/admin/account" : inShopPortal ? "/business/profile" : "/profile";
  // Visible label: the signed-in person's first name, else one word for the role.
  const firstName = String(user?.first_name ?? "").trim();
  const profileLabel = firstName || (isAdmin ? "Admin" : inShopPortal ? "Shop" : "Profile");
  // Screen readers still hear where the link goes.
  const profileDestination = isAdmin ? "admin account" : inShopPortal ? "shop profile" : "profile";
  const profileA11yLabel = firstName ? `${firstName}, open ${profileDestination}` : `Open ${profileDestination}`;
  const homeHref = isAdmin ? "/admin/dashboard" : inShopPortal ? "/business/dashboard" : inStaffPortal ? "/staff/repairs" : "/";

  const navigate = (href) => {
    setMenuPath(null);
    router.push(href);
  };

  const links = navigation.map((item) => {
    const active = !item.switcher && isActive(pathname, item.href, item.exact);
    const badge = isAdmin ? adminBadge(adminSummary, item.href) : 0;
    return (
      <Pressable
        key={`${item.label}-${item.href}`}
        onPress={() => navigate(item.href)}
        accessibilityRole="link"
        accessibilityLabel={badge ? `${item.label}, ${badge} waiting` : undefined}
        accessibilityState={{ selected: active }}
        className={`flex-row items-center rounded-md px-3 py-3 ${active ? "bg-teal-50" : ""}`}
      >
        {item.switcher ? (
          <Ionicons
            name={item.href === "/" ? "home-outline" : "storefront-outline"}
            size={16}
            color={COLORS.primary}
            style={{ marginRight: 6 }}
          />
        ) : null}
        <Text
          className={`text-sm font-semibold ${
            active ? "text-teal-800" : item.switcher ? "text-primary" : "text-gray-600"
          }`}
        >
          {item.label}
        </Text>
        {badge ? (
          <View style={{ minWidth: 20 }} className="ml-1.5 items-center rounded-full bg-amber-500 px-1.5 py-0.5">
            <Text className="text-xs font-bold text-white">{badge > 99 ? "99+" : badge}</Text>
          </View>
        ) : null}
      </Pressable>
    );
  });

  // Visitors come back to the page they were on after signing in.
  const authLink = (screen) =>
    pathname && pathname !== "/" ? { pathname: screen, params: { redirect: pathname } } : screen;

  const guestActions = (
    <View className={isMobile ? "mt-4 gap-2 border-t border-gray-200 pt-4" : "flex-row items-center gap-2"}>
      <Pressable
        onPress={() => navigate(authLink("/login"))}
        accessibilityRole="link"
        className={`rounded-md px-3 py-3 ${isMobile ? "border border-gray-300 items-center" : ""}`}
      >
        <Text className="text-sm font-semibold text-gray-700">Sign in</Text>
      </Pressable>
      <Pressable
        onPress={() => navigate(authLink("/signup"))}
        accessibilityRole="link"
        className="items-center rounded-md bg-primary px-4 py-3 active:bg-teal-800"
      >
        <Text className="text-sm font-semibold text-white">Create account</Text>
      </Pressable>
    </View>
  );

  const accountActions = !isLoggedIn ? guestActions : (
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
          <Text className="text-2xl font-extrabold text-gray-900">Pixel<Text className="text-primary">Patch</Text></Text>
        </Pressable>

        {isDesktop ? <View className="flex-1 flex-row items-center">{links}</View> : null}
        {isMobile ? (
          <Pressable
            onPress={openMenu}
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
      <Modal
        visible={menuOpen}
        transparent
        animationType="none"
        onShow={animateIn}
        onRequestClose={closeMenu}
        accessibilityViewIsModal
        supportedOrientations={["portrait", "landscape"]}
      >
        <View className="flex-1 flex-row justify-end">
          {/* Dimmed page behind the panel; tapping it closes the menu. */}
          <Animated.View style={[StyleSheet.absoluteFill, { backgroundColor: "rgba(7, 17, 16, 0.45)", opacity: slide }]}>
            <Pressable onPress={closeMenu} accessibilityRole="button" accessibilityLabel="Close navigation menu" style={StyleSheet.absoluteFill} />
          </Animated.View>
          <Animated.View
            style={{
              width: panelWidth,
              height: "100%",
              transform: [{ translateX: slide.interpolate({ inputRange: [0, 1], outputRange: [panelWidth, 0] }) }],
              shadowColor: "#000",
              shadowOpacity: 0.2,
              shadowRadius: 16,
              shadowOffset: { width: -4, height: 0 },
              elevation: 16,
              // Set directly: className isn't applied to Animated.View on the web.
              backgroundColor: COLORS.surface,
            }}
          >
            <SafeAreaView edges={["top", "bottom", "right"]} className="flex-1">
              <View className="min-h-16 flex-row items-center justify-between border-b border-gray-200 px-4">
                <Text accessibilityRole="header" className="text-xl font-extrabold text-gray-900">Pixel<Text className="text-primary">Patch</Text></Text>
                <Pressable
                  onPress={closeMenu}
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
          </Animated.View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}
