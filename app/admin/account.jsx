// Admin · Account. Who is signed in, and sign-out (the native drawer has no header menu).
import { ScrollView, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";

import Button from "../../components/Button";
import { useAuth } from "../../lib/auth";
import { confirmAction } from "../../lib/confirm";
import { useResponsive } from "../../lib/useResponsive";
import { COLORS } from "../../constants/theme";

function Row({ icon, label, value }) {
  return (
    <View className="flex-row items-center border-b border-gray-100 px-4 py-3.5">
      <Ionicons name={icon} size={18} color={COLORS.textMuted} />
      <Text className="ml-3 flex-1 text-sm text-gray-500">{label}</Text>
      <Text className="ml-4 flex-1 text-right text-sm font-medium text-gray-900">{value || "—"}</Text>
    </View>
  );
}

export default function AdminAccount() {
  const { user, logout } = useAuth();
  const { horizontalPadding } = useResponsive();

  return (
    <ScrollView
      className="flex-1 bg-gray-50"
      contentContainerStyle={{ paddingVertical: 20, paddingHorizontal: horizontalPadding, maxWidth: 720, width: "100%", alignSelf: "center" }}
    >
      <View className="mb-6 items-center rounded-xl border border-gray-200 bg-white p-6">
        <View className="mb-3 h-20 w-20 items-center justify-center rounded-full bg-blue-100">
          <Ionicons name="shield-half-outline" size={34} color={COLORS.primary} />
        </View>
        <Text className="text-lg font-bold text-gray-900">{[user?.first_name, user?.last_name].filter(Boolean).join(" ") || "Administrator"}</Text>
        <View className="mt-2 rounded-full bg-blue-100 px-3 py-1">
          <Text className="text-xs font-semibold text-blue-700">Admin account</Text>
        </View>
      </View>

      <View className="mb-6 overflow-hidden rounded-xl border border-gray-200 bg-white">
        <Row icon="mail-outline" label="Email" value={user?.email} />
        <Row icon="id-card-outline" label="Account ID" value={user?.id ? `#${user.id}` : null} />
      </View>

      <Text className="mb-6 text-xs leading-5 text-gray-500">
        Admin accounts manage the platform. They don&apos;t book repairs or run a shop, so client and business screens aren&apos;t available here.
      </Text>

      <Button
        title="Sign out"
        variant="outline"
        onPress={() => confirmAction("Sign out", "Sign out of PixelPatch?", logout, { confirmLabel: "Sign out" })}
      />
      <View className="h-8" />
    </ScrollView>
  );
}
