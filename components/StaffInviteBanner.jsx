// components/StaffInviteBanner.jsx
// "TechFix Pro invited you to join as Technician": shown under the header to
// an account with an open shop invite (lib/staff.jsx). Accepting opens the
// staff portal; declining removes the invite.
import { useState } from "react";
import { Text, View } from "react-native";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";

import Button from "./Button";
import api from "../lib/api";
import { useStaff } from "../lib/staff";
import { useResponsive } from "../lib/useResponsive";
import { COLORS } from "../constants/theme";

export default function StaffInviteBanner() {
  const router = useRouter();
  const { invites, membership, reload } = useStaff();
  const { isMobile, horizontalPadding } = useResponsive();
  const [busy, setBusy] = useState(null); // `${id}:accept` | `${id}:decline`
  const [error, setError] = useState(null);

  if (membership || !invites?.length) return null;
  const invite = invites[0];

  const answer = async (action) => {
    if (busy) return;
    setBusy(`${invite.id}:${action}`);
    setError(null);
    try {
      await api.post(`/staff/invites/${invite.id}/${action}`);
      await reload();
      if (action === "accept") router.push("/staff/repairs");
    } catch (e) {
      setError(e.message || "Couldn't answer the invite.");
    } finally {
      setBusy(null);
    }
  };

  return (
    <View className="border-b border-teal-100 bg-teal-50">
      <View className="w-full self-center py-3" style={{ maxWidth: 1200, paddingHorizontal: horizontalPadding }}>
        <View className={isMobile ? "gap-3" : "flex-row items-center gap-4"}>
          <View className="flex-row items-start gap-3" style={isMobile ? undefined : { flex: 1 }}>
            <Ionicons name="storefront-outline" size={22} color={COLORS.primary} style={{ marginTop: 1 }} />
            <View className="flex-1">
              <Text className="text-sm font-bold text-teal-950">
                {invite.shop_name} invited you to join as {invite.role}
              </Text>
              <Text className="mt-1 text-xs leading-5 text-teal-900">
                {"You'll see the repairs assigned to you and the chats the shop hands to you. An account can work at one shop."}
              </Text>
              {error ? <Text accessibilityRole="alert" className="mt-1 text-xs text-red-700">{error}</Text> : null}
            </View>
          </View>
          <View className="flex-row flex-wrap gap-2">
            <View style={{ minWidth: 120, flexGrow: isMobile ? 1 : 0 }}>
              <Button title="Accept" loading={busy === `${invite.id}:accept`} disabled={Boolean(busy)} onPress={() => answer("accept")} />
            </View>
            <View style={{ minWidth: 120, flexGrow: isMobile ? 1 : 0 }}>
              <Button title="Decline" variant="outline" loading={busy === `${invite.id}:decline`} disabled={Boolean(busy)} onPress={() => answer("decline")} />
            </View>
          </View>
        </View>
      </View>
    </View>
  );
}
