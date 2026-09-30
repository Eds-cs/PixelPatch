// app/(business)/profile.jsx — GET /api/shops/:id
import { ActivityIndicator, Alert, Platform, RefreshControl, ScrollView, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";

import Button from "../../components/Button";
import { useFetch } from "../../lib/useFetch";
import { useShop } from "../../lib/shop";
import { useAuth } from "../../lib/auth";
import { COLORS } from "../../constants/theme";

function Row({ icon, label, value }) {
  return (
    <View className="flex-row items-center border-b border-gray-100 px-4 py-3.5">
      <Ionicons name={icon} size={18} color={COLORS.textMuted} />
      <Text className="ml-3 flex-1 text-sm text-gray-500">{label}</Text>
      <Text className="ml-4 flex-1 text-right text-sm font-medium text-gray-900">
        {value || "\u2014"}
      </Text>
    </View>
  );
}

export default function BusinessProfile() {
  const { shopId, loading: shopLoading, error: shopError } = useShop();
  const { user, logout } = useAuth();
  const { data, error, loading, refreshing, refresh } = useFetch(
    shopId ? `/shops/${shopId}` : null,
    (d) => d.shop ?? null
  );

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

  if (shopLoading || loading) {
    return (
      <View className="flex-1 items-center justify-center bg-gray-50">
        <ActivityIndicator size="large" color={COLORS.primary} />
      </View>
    );
  }

  const shop = data;

  return (
    <ScrollView
      className="flex-1 bg-gray-50"
      contentContainerStyle={{ padding: 16, maxWidth: 960, width: "100%", alignSelf: "center" }}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={refresh} tintColor={COLORS.primary} />
      }
    >
      {shopError || error ? (
        <View className="mb-4 rounded-xl border border-gray-200 bg-white p-4">
          <Text className="text-sm text-gray-500">{shopError || error}</Text>
        </View>
      ) : null}

      <View className="mb-6 items-center rounded-xl border border-gray-200 bg-white p-6">
        <View className="mb-3 h-20 w-20 items-center justify-center rounded-full bg-blue-100">
          <Ionicons name="storefront" size={32} color={COLORS.primary} />
        </View>
        <Text className="text-lg font-bold text-gray-900">{shop?.name || "Your shop"}</Text>
        {shop?.is_verified ? (
          <View className="mt-2 flex-row items-center rounded-full bg-emerald-100 px-3 py-1">
            <Ionicons name="checkmark-circle" size={13} color="#047857" />
            <Text className="ml-1 text-xs font-semibold text-emerald-700">Verified</Text>
          </View>
        ) : (
          <View className="mt-2 rounded-full bg-amber-100 px-3 py-1">
            <Text className="text-xs font-semibold text-amber-800">Pending verification</Text>
          </View>
        )}
      </View>

      <View className="mb-6 overflow-hidden rounded-xl border border-gray-200 bg-white">
        <Row icon="business-outline" label="Shop ID" value={shopId ? `#${shopId}` : null} />
        <Row icon="star-outline" label="Rating" value={shop?.rating_average} />
        <Row
          icon="time-outline"
          label="Hours"
          value={
            shop?.open_time && shop?.closing_time
              ? `${String(shop.open_time).slice(0, 5)} - ${String(shop.closing_time).slice(0, 5)}`
              : null
          }
        />
        <Row
          icon="calendar-outline"
          label="Days"
          value={shop?.days_from && shop?.days_to ? `${shop.days_from} - ${shop.days_to}` : null}
        />
        <Row icon="call-outline" label="Contact" value={shop?.contact_number || user?.phone} />
      </View>

      <View className="mb-6 overflow-hidden rounded-xl border border-gray-200 bg-white">
        <Row icon="person-outline" label="Owner" value={[user?.first_name, user?.last_name].filter(Boolean).join(" ")} />
        <Row icon="mail-outline" label="Email" value={user?.email} />
      </View>

      <Button title="Sign out" variant="outline" onPress={confirmLogout} />
      <View className="h-8" />
    </ScrollView>
  );
}
