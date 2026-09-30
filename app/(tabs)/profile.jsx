import { Alert, Platform, Pressable, ScrollView, Text, View } from "react-native";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";

import Button from "../../components/Button";
import { useAuth } from "../../lib/auth";
import { useFetch } from "../../lib/useFetch";
import { COLORS } from "../../constants/theme";

function Row({ icon, label, value }) {
  return (
    <View className="flex-row items-center border-b border-gray-100 px-4 py-3.5">
      <Ionicons name={icon} size={18} color={COLORS.textMuted} />
      <Text className="ml-3 flex-1 text-sm text-gray-500">{label}</Text>
      <Text className="text-sm font-medium text-gray-900">{value || "—"}</Text>
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

export default function Profile() {
  const { user, logout, isBusiness } = useAuth();
  const myShop = useFetch("/my-shop");
  const ownsShop = Boolean(myShop.data?.success);

  const confirmLogout = () => {
    // Alert has no web implementation in react-native-web.
    if (Platform.OS === "web") {
      if (window.confirm("Sign out of PixelPatch?")) logout();
      return;
    }
    Alert.alert("Sign out", "Sign out of PixelPatch?", [
      { text: "Cancel", style: "cancel" },
      { text: "Sign out", style: "destructive", onPress: logout },
    ]);
  };

  const fullName = [user?.first_name, user?.middle_name, user?.last_name]
    .filter(Boolean)
    .join(" ");

  return (
    <ScrollView
      className="flex-1 bg-gray-50"
      contentContainerStyle={{ padding: 16, maxWidth: 720, width: "100%", alignSelf: "center" }}
    >
      <View className="mb-6 items-center rounded-xl border border-gray-200 bg-white p-6">
        <View className="mb-3 h-20 w-20 items-center justify-center rounded-full bg-blue-100">
          <Text className="text-2xl font-bold text-blue-700">
            {(user?.first_name || "?").charAt(0).toUpperCase()}
          </Text>
        </View>
        <Text className="text-lg font-bold text-gray-900">{fullName || "PixelPatch user"}</Text>
        <Text className="mt-0.5 text-sm text-gray-500">{user?.email}</Text>
        {isBusiness ? (
          <View className="mt-2 rounded-full bg-blue-100 px-3 py-1">
            <Text className="text-xs font-semibold text-blue-700">Business account</Text>
          </View>
        ) : null}
      </View>

      <View className="mb-6 overflow-hidden rounded-xl border border-gray-200 bg-white">
        <Row icon="person-outline" label="Name" value={fullName} />
        <Row icon="mail-outline" label="Email" value={user?.email} />
        <Row icon="call-outline" label="Phone" value={user?.phone} />
        <Row icon="id-card-outline" label="Account ID" value={user?.id ? `#${user.id}` : null} />
      </View>

      <View className="mb-6 overflow-hidden rounded-xl border border-gray-200 bg-white">
        <LinkRow icon="hardware-chip-outline" label="My devices" href="/devices" />
        <LinkRow icon="location-outline" label="My addresses" href="/addresses" />
        <LinkRow icon="sparkles-outline" label="AI assistant" href="/assistant" />
        {/* registerBusiness never promotes users.role_id, so shop ownership is
            resolved from /my-shop rather than from the role on the token. */}
        {ownsShop ? (
          <LinkRow icon="storefront-outline" label="Business portal" href="/business/dashboard" />
        ) : (
          <LinkRow icon="briefcase-outline" label="Become a partner" href="/become-partner" />
        )}
      </View>

      <View className="mb-6 overflow-hidden rounded-xl border border-gray-200 bg-white">
        <LinkRow icon="settings-outline" label="Settings" href="/settings" />
        <LinkRow icon="help-circle-outline" label="Help centre" href="/help" />
        <LinkRow icon="information-circle-outline" label="About" href="/about" />
      </View>

      <Button title="Sign out" variant="outline" onPress={confirmLogout} />
    </ScrollView>
  );
}
