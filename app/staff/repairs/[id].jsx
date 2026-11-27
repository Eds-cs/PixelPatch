// app/staff/repairs/[id].jsx — one repair assigned to this employee
// (GET /api/staff/repairs/:id). An employee can start the repair and mark it
// completed (POST .../start, .../complete), call the client for a pickup or
// on-site job while that's allowed, and open the repair's chat once the owner
// hands it over. Quotations, assignment and payment stay with the owner.
import { useState } from "react";
import { ActivityIndicator, Linking, RefreshControl, ScrollView, Text, View } from "react-native";
import { Stack, useLocalSearchParams, useRouter } from "expo-router";

import Button from "../../../components/Button";
import { RepairRow as Row, RepairSection as Section, RepairStatusBadge, formatRepairDate } from "../../../components/RepairSummary";
import api from "../../../lib/api";
import { confirmAction } from "../../../lib/confirm";
import { useFetch } from "../../../lib/useFetch";
import { useResponsive } from "../../../lib/useResponsive";
import { formatPhone } from "../../../lib/phone";
import { specRows, typeLabel } from "../../../lib/deviceSpecs";
import { COLORS } from "../../../constants/theme";

const METHOD = { PICKUP: "Pickup", DROPOFF: "Drop-off", ONSITE: "On-site" };

export default function StaffRepair() {
  const { id } = useLocalSearchParams();
  const router = useRouter();
  const { horizontalPadding, isMobile } = useResponsive();
  const { data: repair, error, loading, refreshing, refresh } = useFetch(`/staff/repairs/${id}`, (d) => d.repair ?? null);
  const [busy, setBusy] = useState(null);
  const [actionError, setActionError] = useState(null);

  if (loading) {
    return <View className="flex-1 items-center justify-center bg-gray-50"><ActivityIndicator size="large" color={COLORS.primary} /></View>;
  }
  if (error || !repair) {
    return (
      <View className="flex-1 items-center justify-center bg-gray-50 p-6">
        <Stack.Screen options={{ title: `Repair #${id}` }} />
        <Text className="text-center text-sm text-gray-500">{error || "Repair not found."}</Text>
        <View className="mt-4"><Button title="Back to my repairs" variant="outline" onPress={() => router.push("/staff/repairs")} /></View>
      </View>
    );
  }

  const run = (action, label) => confirmAction(
    label,
    action === "start"
      ? "The client will see that work on their device has started."
      : "The client will see the repair as completed and can then leave a review.",
    async () => {
      setBusy(action);
      setActionError(null);
      try {
        await api.post(`/staff/repairs/${id}/${action}`);
        await refresh();
      } catch (e) {
        setActionError(e.message || "Couldn't update the repair.");
      } finally {
        setBusy(null);
      }
    },
    { confirmLabel: label }
  );

  return (
    <ScrollView
      className="flex-1 bg-gray-50"
      contentContainerStyle={{ paddingVertical: 16, paddingHorizontal: horizontalPadding, maxWidth: 960, width: "100%", alignSelf: "center" }}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={refresh} tintColor={COLORS.primary} />}
    >
      <Stack.Screen options={{ title: `Repair #${repair.id}` }} />
      <View className="mb-4 flex-row flex-wrap items-start justify-between gap-3">
        <View style={{ flex: 1, minWidth: 200 }}>
          <Text accessibilityRole="header" className="text-2xl font-bold text-gray-900">Repair #{repair.id}</Text>
          <Text className="mt-1 text-sm text-gray-500">{repair.device?.name || "Device"} · {repair.client}</Text>
        </View>
        <RepairStatusBadge status={repair.status} decision={repair.decisionStatus} clientApproved={1} />
      </View>

      {actionError ? <Text accessibilityRole="alert" className="mb-3 rounded-lg bg-red-50 p-3 text-sm text-red-700">{actionError}</Text> : null}

      <View className={`mb-4 ${isMobile ? "gap-3" : "flex-row flex-wrap gap-3"}`}>
        {repair.canStart ? <View style={isMobile ? undefined : { minWidth: 200 }}><Button title="Start repair" loading={busy === "start"} disabled={Boolean(busy)} onPress={() => run("start", "Start repair")} /></View> : null}
        {repair.canComplete ? <View style={isMobile ? undefined : { minWidth: 200 }}><Button title="Mark completed" loading={busy === "complete"} disabled={Boolean(busy)} onPress={() => run("complete", "Mark completed")} /></View> : null}
        {repair.chatId ? <View style={isMobile ? undefined : { minWidth: 200 }}><Button title="Open chat with client" variant="outline" onPress={() => router.push(`/chat/${repair.chatId}`)} /></View> : null}
      </View>
      {!repair.chatId ? (
        <Text className="mb-4 text-xs leading-5 text-gray-500">The chat with the client stays with your shop owner until they hand it to you.</Text>
      ) : null}
      {!repair.canStart && repair.status !== "IN_PROGRESS" && repair.status !== "COMPLETED" ? (
        <Text className="mb-4 text-xs leading-5 text-gray-500">You can start this repair once the client has paid.</Text>
      ) : null}

      {repair.clientPhone ? (
        <View className="mb-4 rounded-xl border border-teal-100 bg-teal-50 p-3">
          <View className="flex-row flex-wrap items-center justify-between gap-2">
            <View className="flex-1" style={{ minWidth: 160 }}>
              <Text className="text-xs font-semibold text-teal-900">Client phone</Text>
              <Text selectable className="mt-0.5 text-base font-semibold text-gray-900">{formatPhone(repair.clientPhone)}</Text>
            </View>
            <Button title="Call client" variant="ghost" onPress={() => Linking.openURL(`tel:${String(repair.clientPhone).replace(/[^\d+]/g, "")}`)} />
          </View>
          <Text className="mt-2 text-xs leading-5 text-teal-900">
            {`For coordinating this ${repair.deliveryMethod === "ONSITE" ? "on-site visit" : "pickup and return"} only. It's hidden 3 days after the repair is completed.`}
          </Text>
        </View>
      ) : null}

      <Section title="Job">
        <Row label="Client" value={repair.client} />
        <Row label="Services" value={repair.services.join(", ")} />
        <Row label="Delivery" value={METHOD[repair.deliveryMethod] || repair.deliveryMethod} />
        {repair.serviceAddress ? <Row label={repair.deliveryMethod === "ONSITE" ? "Service address" : "Pickup address"} value={repair.serviceAddress} /> : null}
        <Row label="Preferred date" value={formatRepairDate(repair.preferredDate)} />
        <Row label="Estimated completion" value={formatRepairDate(repair.estimatedCompletion)} />
        {repair.deliveryMethod !== "ONSITE" ? <Row label="Device received" value={repair.isReceived ? `Yes, ${formatRepairDate(repair.receivedAt)}` : "Not yet"} /> : null}
        <Row label="Payment" value={repair.paymentStatus === "PAID" ? "Paid" : "Not paid yet"} />
        {repair.completedAt ? <Row label="Completed" value={formatRepairDate(repair.completedAt)} /> : null}
      </Section>

      <Section title="Device">
        <Row label="Device" value={repair.device?.name} />
        {repair.device?.device_type ? <Row label="Type" value={typeLabel(repair.device.device_type)} /> : null}
        {specRows(repair.device).map((spec) => <Row key={spec.label} label={spec.label} value={spec.value} />)}
      </Section>

      <Section title="Reported issue">
        <Text selectable className="text-sm leading-6 text-gray-800">{repair.issueDescription || "No description."}</Text>
        {repair.notes ? <Text selectable className="mt-3 text-sm leading-6 text-gray-600">Notes: {repair.notes}</Text> : null}
      </Section>
    </ScrollView>
  );
}
