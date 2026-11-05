// app/(business)/disputes/[id].jsx — GET /api/disputes/:id
// The shop can only PROPOSE a resolution; accept/reject are client-side actions
// (the server checks client_id on those routes).
import { useCallback, useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Platform,
  Pressable,
  RefreshControl,
  ScrollView,
  Text,
  View,
} from "react-native";
import { Stack, useLocalSearchParams, useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";

import Button from "../../../components/Button";
import TextField from "../../../components/TextField";
import Modal from "../../../components/Modal";
import api from "../../../lib/api";
import { COLORS } from "../../../constants/theme";
import { useResponsive } from "../../../lib/useResponsive";
import { DisputeStatusBadge, formatDisputeDate, resolutionLabel } from "../../../components/DisputeSummary";

const RESOLUTIONS = [
  { key: "REFUND", label: "Refund", hint: "Return the amount paid to the client." },
  { key: "RESERVICE", label: "Re-service", hint: "Redo the repair at no extra cost." },
];

const notify = (title, message) => {
  if (Platform.OS === "web") window.alert(`${title}\n\n${message}`);
  else Alert.alert(title, message);
};

function Section({ title, children }) {
  return (
    <View className="mb-4 rounded-xl border border-gray-200 bg-white p-4">
      <Text className="mb-3 text-sm font-bold uppercase tracking-wide text-gray-500">{title}</Text>
      {children}
    </View>
  );
}

function Row({ label, value }) {
  return (
    <View className="flex-row justify-between py-1.5">
      <Text className="text-sm text-gray-500">{label}</Text>
      <Text className="ml-4 flex-1 text-right text-sm font-medium text-gray-900">
        {value || "—"}
      </Text>
    </View>
  );
}

export default function BusinessDisputeDetail() {
  const { id } = useLocalSearchParams();
  const router = useRouter();
  const { isDesktop, horizontalPadding } = useResponsive();

  const [dispute, setDispute] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState(null);
  const [busy, setBusy] = useState(false);

  const [open, setOpen] = useState(false);
  const [resolution, setResolution] = useState("REFUND");
  const [response, setResponse] = useState("");
  const [proposalError, setProposalError] = useState(null);

  const load = useCallback(
    async (isRefresh) => {
      if (isRefresh) setRefreshing(true);
      setError(null);
      try {
        const { data } = await api.get(`/disputes/${id}`);
        setDispute(data?.dispute ?? null);
      } catch (e) {
        setError(e.message || "Couldn't load this dispute.");
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [id]
  );

  useEffect(() => {
    load(false);
  }, [load]);

  const propose = async () => {
    if (busy) return;
    setBusy(true);
    setProposalError(null);
    try {
      await api.post(`/disputes/${id}/propose`, {
        resolution,
        response: response.trim(),
      });
      setOpen(false);
      await load(true);
      notify("Sent", "Your proposed resolution was sent to the client.");
      setResponse("");
    } catch (e) {
      setProposalError(e.message || "Couldn't send the proposal. Please try again.");
    } finally {
      setBusy(false);
    }
  };

  if (loading) {
    return (
      <View className="flex-1 items-center justify-center bg-gray-50">
        <ActivityIndicator size="large" color={COLORS.primary} />
      </View>
    );
  }

  if (error || !dispute) {
    return (
      <View className="flex-1 items-center justify-center bg-gray-50 p-6">
        <Stack.Screen options={{ title: `Dispute #${id}` }} />
        <Text className="text-center text-sm text-gray-500">{error || "Dispute not found."}</Text>
      </View>
    );
  }

  // The server only accepts a proposal while the dispute is still OPEN.
  const canPropose = dispute.status === "OPEN";

  return (
    <ScrollView
      className="flex-1 bg-gray-50"
      contentContainerStyle={{ paddingVertical: 16, paddingHorizontal: horizontalPadding, maxWidth: isDesktop ? 1200 : 960, width: "100%", alignSelf: "center" }}
      refreshControl={
        <RefreshControl
          refreshing={refreshing}
          onRefresh={() => load(true)}
          tintColor={COLORS.primary}
        />
      }
    >
      <Stack.Screen options={{ title: `Dispute #${id}` }} />

      <Pressable onPress={() => router.push("/business/disputes")} accessibilityRole="button" className="mb-3 min-h-11 flex-row items-center gap-2 self-start">
        <Ionicons name="arrow-back-outline" size={18} color={COLORS.primary} />
        <Text className="text-sm font-semibold text-blue-600">Back to dispute inbox</Text>
      </Pressable>
      <View className="mb-4 rounded-2xl border border-gray-200 bg-white p-5">
        <View className="flex-row flex-wrap items-start justify-between gap-3">
          <View className="flex-1">
            <Text className="text-xs font-semibold uppercase text-gray-400">Dispute #{id}</Text>
            <Text accessibilityRole="header" className="mt-2 text-2xl font-bold text-gray-900">{dispute.device_name || `Repair #${dispute.request_id}`}</Text>
            <Text className="mt-1 text-sm text-gray-500">{[dispute.first_name, dispute.last_name].filter(Boolean).join(" ") || "Client"}</Text>
          </View>
          <DisputeStatusBadge status={dispute.status} />
        </View>
        <View className="mt-4 rounded-xl bg-blue-50 p-4">
          <Text className="text-sm leading-5 text-blue-800">
            {canPropose ? "Review the client's concern and the repair, then propose a refund or re-service. The client decides whether to accept your proposal."
              : dispute.status === "SHOP_PROPOSED" ? "Your proposal has been sent. The client can accept or decline it."
              : dispute.status === "RESOLVED" ? "The client accepted your proposal and this dispute is resolved."
              : dispute.status === "REJECTED" ? "The client declined your proposal. No further proposal is available for this dispute."
              : "Review the case information below."}
          </Text>
        </View>
        <View className="mt-4 flex-row flex-wrap gap-3">
          {canPropose ? <Button title="Propose a resolution" loading={busy} onPress={() => { setProposalError(null); setOpen(true); }} /> : null}
          <Button title={`View repair #${dispute.request_id}`} variant="outline" onPress={() => router.push(`/business/repairs/${dispute.request_id}`)} />
        </View>
      </View>

      <View className={isDesktop ? "flex-row items-start gap-4" : ""}>
      <View style={isDesktop ? { flex: 1, minWidth: 0 } : undefined}>
      <Section title="Dispute">
        <Row label="Status" value={dispute.status} />
        <Row
          label="Client"
          value={[dispute.first_name, dispute.last_name].filter(Boolean).join(" ")}
        />
        <Row label="Request" value={dispute.request_id ? `#${dispute.request_id}` : null} />
        <Row label="Filed" value={formatDisputeDate(dispute.created_at)} />
        <Row label="Closed" value={dispute.resolved_at ? formatDisputeDate(dispute.resolved_at) : "Not closed"} />
      </Section>
      </View>

      <View style={isDesktop ? { flex: 2, minWidth: 0 } : undefined}>
      <Section title="Client's complaint">
        <Text selectable className="text-base leading-6 text-gray-700">
          {dispute.client_message?.content || "No message provided."}
        </Text>
        {dispute.issue_description ? <View className="mt-4 border-t border-gray-100 pt-4"><Text className="mb-2 text-xs font-semibold uppercase text-gray-400">Original repair issue</Text><Text className="text-sm leading-5 text-gray-500">{dispute.issue_description}</Text></View> : null}
      </Section>
      </View>
      </View>

      {dispute.proposed_resolution ? (
        <Section title="Your proposal">
          <Row label="Resolution" value={resolutionLabel(dispute.proposed_resolution)} />
          {dispute.shop_response ? (
            <Text className="mt-2 text-sm text-gray-700">{dispute.shop_response}</Text>
          ) : null}
        </Section>
      ) : null}

      <Section title="Response history">
        {dispute.history?.length ? dispute.history.map((entry) => (
          <View key={entry.id} className={`mb-3 rounded-xl border p-4 ${entry.edited_by === "BUSINESS" ? "border-blue-100 bg-blue-50" : "border-gray-100 bg-gray-50"}`}>
            <View className="mb-2 flex-row flex-wrap justify-between gap-2">
              <Text className="text-sm font-semibold text-gray-800">{entry.edited_by === "BUSINESS" ? "Your shop" : "Client"}</Text>
              <Text className="text-xs text-gray-500">{formatDisputeDate(entry.created_at)}</Text>
            </View>
            <Text selectable className="text-sm leading-6 text-gray-700">{entry.content || "No written message."}</Text>
          </View>
        )) : <Text className="text-sm text-gray-500">No response history recorded yet.</Text>}
      </Section>

      <View className="h-8" />

      <Modal
        visible={open}
        onClose={() => { if (!busy) setOpen(false); }}
        title="Propose a resolution"
        footer={<Button title="Send proposal" loading={busy} onPress={propose} />}
      >
        <Text className="mb-4 text-sm leading-5 text-gray-500">Choose the resolution you are offering. The client will review this proposal.</Text>
        {proposalError ? <Text accessibilityRole="alert" className="mb-3 rounded-lg bg-red-50 p-3 text-sm text-red-700">{proposalError}</Text> : null}
        {RESOLUTIONS.map((r) => (
          <Pressable
            key={r.key}
            onPress={() => setResolution(r.key)}
            disabled={busy}
            accessibilityRole="radio"
            accessibilityState={{ checked: resolution === r.key, disabled: busy }}
            className={`mb-3 rounded-lg border p-3.5 ${
              resolution === r.key ? "border-blue-600 bg-blue-50" : "border-gray-200 bg-white"
            }`}
          >
            <Text
              className={`text-sm font-semibold ${
                resolution === r.key ? "text-blue-700" : "text-gray-900"
              }`}
            >
              {r.label}
            </Text>
            <Text className="mt-0.5 text-xs text-gray-500">{r.hint}</Text>
          </Pressable>
        ))}

        <TextField
          label="Message to the client (optional)"
          value={response}
          onChangeText={setResponse}
          placeholder="Explain your proposed resolution"
          multiline
          editable={!busy}
          style={{ minHeight: 120, paddingTop: 12, textAlignVertical: "top" }}
        />
      </Modal>
    </ScrollView>
  );
}
