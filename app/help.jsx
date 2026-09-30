// app/help.jsx — describes the flow the app actually implements.
import { ScrollView, Text, View } from "react-native";
import { Stack, useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";

import Button from "../components/Button";
import { COLORS } from "../constants/theme";

const STEPS = [
  {
    icon: "search-outline",
    title: "Find a service or shop",
    body: "Browse services on the Services tab, or open a shop to see everything it repairs and what it charges.",
  },
  {
    icon: "document-text-outline",
    title: "Send a repair request",
    body: "Pick the device, choose pickup, drop-off or on-site, describe the problem and attach photos. Only the delivery methods a shop supports are offered.",
  },
  {
    icon: "clipboard-outline",
    title: "Assessment and quotation",
    body: "The shop inspects the device and sends a quotation. You approve it before any work starts, and you can cancel while the request is still pending or accepted.",
  },
  {
    icon: "card-outline",
    title: "Pay securely",
    body: "Once the shop issues a payment link, tap Pay now on the repair. Payment is confirmed by our payment provider, so the status updates on its own.",
  },
  {
    icon: "star-outline",
    title: "Rate the repair",
    body: "After a repair is completed you can leave a rating and feedback for the shop.",
  },
];

const FAQ = [
  {
    q: "Where do I track a repair?",
    a: "The Repairs tab lists every request with its current status. Tap one for the full detail, quotation and payment.",
  },
  {
    q: "Can I message the shop?",
    a: "Yes. The Messages tab holds a conversation for each shop you've dealt with, and messages arrive in real time.",
  },
  {
    q: "Something's wrong with my repair.",
    a: "Open the completed repair and raise a dispute. The shop can propose a refund or a re-service, which you then accept or reject.",
  },
  {
    q: "I run a repair shop.",
    a: "Open your profile and choose Become a partner to register your shop, list services and start receiving requests.",
  },
];

export default function Help() {
  const router = useRouter();

  return (
    <ScrollView
      className="flex-1 bg-gray-50"
      contentContainerStyle={{ padding: 16, maxWidth: 720, width: "100%", alignSelf: "center" }}
    >
      <Stack.Screen options={{ title: "Help centre", headerShown: true }} />

      <Text className="mb-1 text-xl font-bold text-gray-900">How PixelPatch works</Text>
      <Text className="mb-5 text-sm text-gray-500">
        From a broken device to a finished repair.
      </Text>

      <View className="mb-6">
        {STEPS.map((s, i) => (
          <View key={s.title} className="mb-3 flex-row rounded-xl border border-gray-200 bg-white p-4">
            <View className="mr-3 h-9 w-9 items-center justify-center rounded-full bg-blue-100">
              <Ionicons name={s.icon} size={18} color={COLORS.primary} />
            </View>
            <View className="flex-1">
              <Text className="text-base font-semibold text-gray-900">
                {i + 1}. {s.title}
              </Text>
              <Text className="mt-1 text-sm text-gray-600">{s.body}</Text>
            </View>
          </View>
        ))}
      </View>

      <Text className="mb-3 text-lg font-bold text-gray-900">Common questions</Text>
      <View className="mb-6">
        {FAQ.map((f) => (
          <View key={f.q} className="mb-3 rounded-xl border border-gray-200 bg-white p-4">
            <Text className="text-sm font-semibold text-gray-900">{f.q}</Text>
            <Text className="mt-1 text-sm text-gray-600">{f.a}</Text>
          </View>
        ))}
      </View>

      <View className="mb-8 rounded-xl border border-blue-200 bg-blue-50 p-4">
        <Text className="mb-1 text-base font-semibold text-blue-900">Still stuck?</Text>
        <Text className="mb-3 text-sm text-blue-800">
          Describe the problem to our assistant and it will help you troubleshoot and find a shop.
        </Text>
        <Button title="Open the AI assistant" onPress={() => router.push("/assistant")} />
      </View>
    </ScrollView>
  );
}
