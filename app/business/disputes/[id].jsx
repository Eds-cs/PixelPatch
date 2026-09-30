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
import { Stack, useLocalSearchParams } from "expo-router";

import Button from "../../../components/Button";
import TextField from "../../../components/TextField";
import Modal from "../../../components/Modal";
import api from "../../../lib/api";
import { COLORS } from "../../../constants/theme";

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

  const [dispute, setDispute] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState(null);
  const [busy, setBusy] = useState(false);

  const [open, setOpen] = useState(false);
  const [resolution, setResolution] = useState("REFUND");
  const [response, setResponse] = useState("");

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
    setOpen(false);
    setBusy(true);
    try {
      await api.post(`/disputes/${id}/propose`, {
        resolution,
        response: response.trim(),
      });
      await load(true);
      notify("Sent", "Your proposed resolution was sent to the client.");
      setResponse("");
    } catch (e) {
      notify("Couldn't send", e.message || "Please try again.");
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
      contentContainerStyle={{ padding: 16, maxWidth: 960, width: "100%", alignSelf: "center" }}
      refreshControl={
        <RefreshControl
          refreshing={refreshing}
          onRefresh={() => load(true)}
          tintColor={COLORS.primary}
        />
      }
    >
      <Stack.Screen options={{ title: `Dispute #${id}` }} />

      <Section title="Dispute">
        <Row label="Status" value={dispute.status} />
        <Row
          label="Client"
          value={[dispute.first_name, dispute.last_name].filter(Boolean).join(" ")}
        />
        <Row label="Request" value={dispute.request_id ? `#${dispute.request_id}` : null} />
        <Row label="Filed" value={dispute.created_at} />
        <Row label="Resolved" value={dispute.resolved_at} />
      </Section>

      <Section title="Client's complaint">
        <Text className="text-sm text-gray-700">
          {dispute.client_message?.content || "No message provided."}
        </Text>
      </Section>

      {dispute.proposed_resolution ? (
        <Section title="Your proposal">
          <Row label="Resolution" value={dispute.proposed_resolution} />
          {dispute.shop_response ? (
            <Text className="mt-2 text-sm text-gray-700">{dispute.shop_response}</Text>
          ) : null}
        </Section>
      ) : null}

      {canPropose ? (
        <Button title="Propose a resolution" onPress={() => setOpen(true)} />
      ) : (
        <View className="rounded-xl border border-gray-200 bg-white p-4">
          <Text className="text-sm text-gray-500">
            This dispute is {String(dispute.status).toLowerCase()} — no further action is available
            from your side.
          </Text>
        </View>
      )}

      <View className="h-8" />

      <Modal
        visible={open}
        onClose={() => setOpen(false)}
        title="Propose a resolution"
        footer={<Button title="Send proposal" loading={busy} onPress={propose} />}
      >
        {RESOLUTIONS.map((r) => (
          <Pressable
            key={r.key}
            onPress={() => setResolution(r.key)}
            accessibilityRole="radio"
            accessibilityState={{ selected: resolution === r.key }}
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
        />
      </Modal>
    </ScrollView>
  );
}
