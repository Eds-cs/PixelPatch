// app/settings.jsx
// There is no settings endpoint on the server, so this shows account and build
// information and the actions that do exist (sign out, manage data).
import { Alert, Platform, Pressable, ScrollView, Text, View } from "react-native";
import { Stack, useRouter } from "expo-router";
import Constants from "expo-constants";
import { Ionicons } from "@expo/vector-icons";

import Button from "../components/Button";
import { useAuth } from "../lib/auth";
import { API_URL } from "../lib/api";
import { COLORS } from "../constants/theme";

function Row({ icon, label, value }) {
  return (
    <View className="flex-row items-center border-b border-gray-100 px-4 py-3.5">
      <Ionicons name={icon} size={18} color={COLORS.textMuted} />
      <Text className="ml-3 flex-1 text-sm text-gray-500">{label}</Text>
      <Text className="ml-4 flex-1 text-right text-sm font-medium text-gray-900" numberOfLines={1}>
        {value || "—"}
      </Text>
    </View>
  );
}

function LinkRow({ icon, label, href }) {
  const router = useRouter();
  return (
    <Pressable
      onPress={() => router.push(href)}
      accessibilityRole="button"
      className="flex-row items-center border-b border-gray-100 px-4 py-3.5 active:bg-gray-50"
    >
      <Ionicons name={icon} size={18} color={COLORS.textMuted} />
      <Text className="ml-3 flex-1 text-sm font-medium text-gray-900">{label}</Text>
      <Ionicons name="chevron-forward" size={16} color={COLORS.textMuted} />
    </Pressable>
  );
}

export default function Settings() {
  const { user, logout } = useAuth();

  const confirmLogout = () => {
    if (Platform.OS === "web") {
      if (window.confirm("Sign out of PixelPatch?")) logout();
      return;
    }
    Alert.alert("Sign out", "Sign out of PixelPatch?", [
      { text: "Cancel", style: "cancel" },
      { text: "Sign out", style: "destructive", onPress: logout },
    ]);
  };

  const version = Constants.expoConfig?.version ?? "1.0.0";

  return (
    <ScrollView
      className="flex-1 bg-gray-50"
      contentContainerStyle={{ padding: 16, maxWidth: 720, width: "100%", alignSelf: "center" }}
    >
      <Stack.Screen options={{ title: "Settings", headerShown: true }} />

      <Text className="mb-2 text-sm font-bold uppercase tracking-wide text-gray-500">Account</Text>
      <View className="mb-6 overflow-hidden rounded-xl border border-gray-200 bg-white">
        <Row
          icon="person-outline"
          label="Signed in as"
          value={[user?.first_name, user?.last_name].filter(Boolean).join(" ")}
        />
        <Row icon="mail-outline" label="Email" value={user?.email} />
        <LinkRow icon="hardware-chip-outline" label="My devices" href="/devices" />
        <LinkRow icon="location-outline" label="My addresses" href="/addresses" />
      </View>

      <Text className="mb-2 text-sm font-bold uppercase tracking-wide text-gray-500">Support</Text>
      <View className="mb-6 overflow-hidden rounded-xl border border-gray-200 bg-white">
        <LinkRow icon="help-circle-outline" label="Help centre" href="/help" />
        <LinkRow icon="sparkles-outline" label="AI assistant" href="/assistant" />
        <LinkRow icon="information-circle-outline" label="About PixelPatch" href="/about" />
      </View>

      <Text className="mb-2 text-sm font-bold uppercase tracking-wide text-gray-500">App</Text>
      <View className="mb-6 overflow-hidden rounded-xl border border-gray-200 bg-white">
        <Row icon="pricetag-outline" label="Version" value={version} />
        <Row icon="phone-portrait-outline" label="Platform" value={Platform.OS} />
        <Row icon="server-outline" label="API" value={API_URL} />
      </View>

      <Button title="Sign out" variant="outline" onPress={confirmLogout} />
      <View className="h-8" />
    </ScrollView>
  );
}
