// app/about.jsx — description text is the app's own from app.json / the PWA manifest.
import { ScrollView, Text, View } from "react-native";
import { Stack } from "expo-router";
import Constants from "expo-constants";
import { Ionicons } from "@expo/vector-icons";

import { COLORS } from "../constants/theme";

const FEATURES = [
  { icon: "storefront-outline", label: "Verified repair shops with public pricing and reviews" },
  { icon: "chatbubble-ellipses-outline", label: "Real-time messaging with the shop handling your device" },
  { icon: "sparkles-outline", label: "An AI assistant that helps you troubleshoot first" },
  { icon: "shield-checkmark-outline", label: "Quotation approval before any work begins" },
  { icon: "card-outline", label: "Secure online payment once the repair is quoted" },
];

export default function About() {
  const version = Constants.expoConfig?.version ?? "1.0.0";

  return (
    <ScrollView
      className="flex-1 bg-gray-50"
      contentContainerStyle={{ padding: 16, maxWidth: 720, width: "100%", alignSelf: "center" }}
    >
      <Stack.Screen options={{ title: "About", headerShown: true }} />

      <View className="mb-6 items-center rounded-xl border border-gray-200 bg-white p-6">
        <View className="mb-3 h-16 w-16 items-center justify-center rounded-2xl bg-blue-600">
          <Ionicons name="construct" size={30} color="#fff" />
        </View>
        <Text className="text-2xl font-extrabold text-blue-600">PixelPatch</Text>
        <Text className="mt-1 text-sm text-gray-400">Version {version}</Text>
      </View>

      <View className="mb-6 rounded-xl border border-gray-200 bg-white p-5">
        <Text className="text-base leading-6 text-gray-700">
          Repair service platform for electronic devices. Find trusted technicians near you. Have
          trouble with your gadgets? PixelPatch connects you with skilled professionals and helps
          you troubleshoot with our state of the art chatbot for quick and reliable repairs.
        </Text>
      </View>

      <Text className="mb-3 text-lg font-bold text-gray-900">What you can do</Text>
      <View className="mb-8 overflow-hidden rounded-xl border border-gray-200 bg-white">
        {FEATURES.map((f) => (
          <View key={f.label} className="flex-row items-center border-b border-gray-100 px-4 py-3.5">
            <Ionicons name={f.icon} size={18} color={COLORS.primary} />
            <Text className="ml-3 flex-1 text-sm text-gray-700">{f.label}</Text>
          </View>
        ))}
      </View>
    </ScrollView>
  );
}
