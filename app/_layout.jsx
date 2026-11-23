// app/_layout.jsx — root layout: providers, auth gate.
import "../global.css";

import { useEffect } from "react";
import { Stack, useGlobalSearchParams, usePathname, useRouter, useSegments } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { ActivityIndicator, Platform, StyleSheet, View } from "react-native";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { GestureHandlerRootView } from "react-native-gesture-handler";

import { AuthProvider, useAuth } from "../lib/auth";
import { SocketProvider } from "../lib/socket";
import { ServiceAreaProvider, useServiceArea } from "../lib/serviceArea";
import { COLORS } from "../constants/theme";
import WebHeader from "../components/WebHeader";

import { SHOW_BACK_BUTTONS } from "../lib/navigation";
// The app opens on the home page. Without this, the phone apps open the first
// screen listed below, the sign-in group, because the start address is just "/".
export const unstable_settings = { initialRouteName: "(tabs)" };

// Sign-in, sign-up and password reset.
const AUTH_GROUP = "(auth)";
const ADMIN_GROUP = "admin";
// Pages anyone can browse without an account. Everything else (requesting a
// repair, chats, the AI assistant, profile...) asks visitors to sign in first.
const BROWSABLE_SCREENS = ["shop", "service", "about", "help"];
const BROWSABLE_TABS = [undefined, "index", "services"]; // home and services

function isBrowsable(segments) {
  if (segments[0] === "(tabs)") return BROWSABLE_TABS.includes(segments[1]);
  return BROWSABLE_SCREENS.includes(segments[0]);
}

// Where to go after signing in: only a path inside this app, never another site.
function safeRedirect(value) {
  return typeof value === "string" && value.startsWith("/") && !value.startsWith("//") ? value : null;
}
// Shared informational screens an admin may still open outside the portal.
const ADMIN_SHARED = ["settings", "help", "about"];
// Screens a client without a Zamboanga City address may still open.
const NO_ADDRESS_ALLOWED = ["addresses", "settings", "help", "about"];

// Websites have the browser's back button: title bars keep their title but
// drop the back arrow there (lib/navigation.js). Phones keep the default arrow.
const WEB_HEADER_OPTIONS = SHOW_BACK_BUTTONS ? {} : { headerBackVisible: false, headerLeft: () => null };

function homeFor({ isAdmin, isBusiness }) {
  if (isAdmin) return "/admin/dashboard";
  // Shop owners land in their portal; clients begin with AI troubleshooting.
  return isBusiness ? "/business/dashboard" : "/assistant";
}

function RootNavigator() {
  const { isLoggedIn, loading, isBusiness, isAdmin } = useAuth();
  const { needsAddress } = useServiceArea();
  const segments = useSegments();
  const pathname = usePathname();
  const { redirect } = useGlobalSearchParams();
  const router = useRouter();

  // expo-router's assertIsReady() throws "Attempted to navigate before mounting
  // the Root Layout component" if router.replace runs before the navigator has
  // committed. The <Stack> below is rendered unconditionally so it is always
  // mounted by the time this effect runs — effects fire after commit.
  useEffect(() => {
    if (loading) return;

    const inAuthGroup = segments[0] === AUTH_GROUP;
    const inAdminGroup = segments[0] === ADMIN_GROUP;

    if (!isLoggedIn && !inAuthGroup && !isBrowsable(segments)) {
      // Account-only page: sign in first, then come back here.
      router.replace({ pathname: "/login", params: { redirect: pathname } });
    } else if (isLoggedIn && inAuthGroup) {
      router.replace(safeRedirect(redirect) ?? homeFor({ isAdmin, isBusiness }));
    } else if (isLoggedIn && inAdminGroup && !isAdmin) {
      // The server refuses admin APIs anyway; keep non-admins out of the UI too.
      router.replace(homeFor({ isAdmin, isBusiness }));
    } else if (isLoggedIn && isAdmin && !inAdminGroup && !ADMIN_SHARED.includes(segments[0])) {
      // Admin accounts are not client or business accounts.
      router.replace("/admin/dashboard");
    } else if (isLoggedIn && needsAddress && !NO_ADDRESS_ALLOWED.includes(segments[0])) {
      // PixelPatch only serves Zamboanga City: clients add an address there first.
      router.replace("/addresses");
    }
  }, [isLoggedIn, loading, isBusiness, isAdmin, needsAddress, segments, pathname, redirect, router]);

  const inAuthGroup = segments[0] === AUTH_GROUP;
  // Native business and admin routes use their drawer header; every other
  // screen shares the responsive navigation, including native client screens.
  const nativeBusinessDrawer =
    Platform.OS !== "web" && (segments[0] === "business" || segments[0] === ADMIN_GROUP);
  // Visitors get the header too, with sign-in buttons, while browsing.
  const showWebHeader =
    !inAuthGroup && !nativeBusinessDrawer && (isLoggedIn || isBrowsable(segments));

  return (
    <View style={{ flex: 1 }}>
      {showWebHeader ? <WebHeader /> : null}
      {/* Rendered unconditionally — the root layout must present a navigator on
          its first render, so the loading state is an overlay, never a swap. */}
      <Stack screenOptions={{ headerShown: false, ...WEB_HEADER_OPTIONS }}>
        <Stack.Screen name="(tabs)" />
        <Stack.Screen name="(auth)" />
        <Stack.Screen name="business" />
        <Stack.Screen name="admin" />
      </Stack>

      {loading ? (
        <View
          style={[StyleSheet.absoluteFill, { pointerEvents: "auto" }]}
          className="items-center justify-center bg-white"
        >
          <ActivityIndicator size="large" color={COLORS.primary} />
        </View>
      ) : null}
    </View>
  );
}

export default function RootLayout() {
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <AuthProvider>
          <ServiceAreaProvider>
            <SocketProvider>
              <StatusBar style="dark" />
              <RootNavigator />
            </SocketProvider>
          </ServiceAreaProvider>
        </AuthProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}
