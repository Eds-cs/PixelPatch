// app/_layout.jsx — root layout: providers, auth gate.
import "../global.css";

import { useEffect } from "react";
import { Stack, useRouter, useSegments } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { ActivityIndicator, Platform, StyleSheet, View } from "react-native";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { GestureHandlerRootView } from "react-native-gesture-handler";

import { AuthProvider, useAuth } from "../lib/auth";
import { SocketProvider } from "../lib/socket";
import { ServiceAreaProvider, useServiceArea } from "../lib/serviceArea";
import { COLORS } from "../constants/theme";
import WebHeader from "../components/WebHeader";

// Screens that stay reachable while signed out.
const PUBLIC_GROUP = "(auth)";
const ADMIN_GROUP = "admin";
// Shared informational screens an admin may still open outside the portal.
const ADMIN_SHARED = ["settings", "help", "about"];
// Screens a client without a Zamboanga City address may still open.
const NO_ADDRESS_ALLOWED = ["addresses", "settings", "help", "about"];

function homeFor({ isAdmin, isBusiness }) {
  if (isAdmin) return "/admin/dashboard";
  // Shop owners land in their portal; clients begin with AI troubleshooting.
  return isBusiness ? "/business/dashboard" : "/assistant";
}

function RootNavigator() {
  const { isLoggedIn, loading, isBusiness, isAdmin } = useAuth();
  const { needsAddress } = useServiceArea();
  const segments = useSegments();
  const router = useRouter();

  // expo-router's assertIsReady() throws "Attempted to navigate before mounting
  // the Root Layout component" if router.replace runs before the navigator has
  // committed. The <Stack> below is rendered unconditionally so it is always
  // mounted by the time this effect runs — effects fire after commit.
  useEffect(() => {
    if (loading) return;

    const inPublicGroup = segments[0] === PUBLIC_GROUP;
    const inAdminGroup = segments[0] === ADMIN_GROUP;

    if (!isLoggedIn && !inPublicGroup) {
      router.replace("/login");
    } else if (isLoggedIn && inPublicGroup) {
      router.replace(homeFor({ isAdmin, isBusiness }));
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
  }, [isLoggedIn, loading, isBusiness, isAdmin, needsAddress, segments, router]);

  const inPublicGroup = segments[0] === PUBLIC_GROUP;
  // Native business and admin routes use their drawer header; every other
  // screen shares the responsive navigation, including native client screens.
  const nativeBusinessDrawer =
    Platform.OS !== "web" && (segments[0] === "business" || segments[0] === ADMIN_GROUP);
  const showWebHeader = isLoggedIn && !inPublicGroup && !nativeBusinessDrawer;

  return (
    <View style={{ flex: 1 }}>
      {showWebHeader ? <WebHeader /> : null}
      {/* Rendered unconditionally — the root layout must present a navigator on
          its first render, so the loading state is an overlay, never a swap. */}
      <Stack screenOptions={{ headerShown: false }}>
        <Stack.Screen name="(auth)" />
        <Stack.Screen name="(tabs)" />
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
