// app/payment-failed.jsx — landing target for XENDIT_FAILURE_URL.
import { Text, View } from "react-native";
import { Stack, useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";

import Button from "../components/Button";

export default function PaymentFailed() {
  const router = useRouter();

  return (
    <View className="flex-1 items-center justify-center bg-gray-50 p-8">
      <Stack.Screen options={{ title: "Payment", headerShown: true }} />

      <View className="mb-5 h-20 w-20 items-center justify-center rounded-full bg-red-100">
        <Ionicons name="close-circle" size={44} color="#dc2626" />
      </View>

      <Text className="mb-2 text-center text-xl font-bold text-gray-900">
        Payment didn&apos;t go through
      </Text>
      <Text className="mb-8 max-w-sm text-center text-sm text-gray-500">
        Nothing was charged. You can try again from the repair&apos;s payment section.
      </Text>

      <View className="w-full max-w-xs">
        <Button title="Back to my repairs" onPress={() => router.replace("/repairs")} />
      </View>
    </View>
  );
}
