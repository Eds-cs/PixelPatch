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
import { COLORS } from "../constants/theme";
import WebHeader from "../components/WebHeader";

// Screens that stay reachable while signed out.
const PUBLIC_GROUP = "(auth)";

function RootNavigator() {
  const { isLoggedIn, loading, isBusiness } = useAuth();
  const segments = useSegments();
  const router = useRouter();

  // expo-router's assertIsReady() throws "Attempted to navigate before mounting
  // the Root Layout component" if router.replace runs before the navigator has
  // committed. The <Stack> below is rendered unconditionally so it is always
  // mounted by the time this effect runs — effects fire after commit.
  useEffect(() => {
    if (loading) return;

    const inPublicGroup = segments[0] === PUBLIC_GROUP;

    if (!isLoggedIn && !inPublicGroup) {
      router.replace("/login");
    } else if (isLoggedIn && inPublicGroup) {
      // Shop owners land in their portal; clients begin with AI troubleshooting.
      router.replace(isBusiness ? "/business/dashboard" : "/assistant");
    }
  }, [isLoggedIn, loading, isBusiness, segments, router]);

  const inPublicGroup = segments[0] === PUBLIC_GROUP;
  const showWebHeader = Platform.OS === "web" && isLoggedIn && !inPublicGroup;

  return (
    <View style={{ flex: 1 }}>
      {showWebHeader ? <WebHeader /> : null}
      {/* Rendered unconditionally — the root layout must present a navigator on
          its first render, so the loading state is an overlay, never a swap. */}
      <Stack screenOptions={{ headerShown: false }}>
        <Stack.Screen name="(auth)" />
        <Stack.Screen name="(tabs)" />
        <Stack.Screen name="business" />
      </Stack>

      {loading ? (
        <View
          style={StyleSheet.absoluteFill}
          className="items-center justify-center bg-white"
          pointerEvents="auto"
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
          <SocketProvider>
            <StatusBar style="dark" />
            <RootNavigator />
          </SocketProvider>
        </AuthProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}
