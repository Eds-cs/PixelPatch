// app/payment-success.jsx
// Landing target for XENDIT_SUCCESS_URL (web redirect) and for the native
// deep link pixelpatch://payment-success. Payment is confirmed by the Xendit
// webhook, so this screen reports the redirect only — it never asserts payment
// succeeded on its own.
import { useEffect } from "react";
import { Text, View } from "react-native";
import { Stack, useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";

import Button from "../components/Button";

export default function PaymentSuccess() {
  const router = useRouter();

  useEffect(() => {
    const t = setTimeout(() => router.replace("/repairs"), 4000);
    return () => clearTimeout(t);
  }, [router]);

  return (
    <View className="flex-1 items-center justify-center bg-gray-50 p-8">
      <Stack.Screen options={{ title: "Payment", headerShown: true }} />

      <View className="mb-5 h-20 w-20 items-center justify-center rounded-full bg-emerald-100">
        <Ionicons name="checkmark-circle" size={44} color="#059669" />
      </View>

      <Text className="mb-2 text-center text-xl font-bold text-gray-900">
        Payment submitted
      </Text>
      <Text className="mb-8 max-w-sm text-center text-sm text-gray-500">
        Thanks! We&apos;re confirming the transaction with our payment provider. Your
        repair updates as soon as it clears.
      </Text>

      <View className="w-full max-w-xs">
        <Button title="View my repairs" onPress={() => router.replace("/repairs")} />
      </View>
    </View>
  );
}
