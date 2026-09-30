// app/repair/[id].jsx — GET /api/client/repairs/:id
// Also exposes PATCH .../approve and .../cancel.
import { useState } from "react";
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
import { Ionicons } from "@expo/vector-icons";

import Button from "../../components/Button";
import TextField from "../../components/TextField";
import Modal from "../../components/Modal";
import api from "../../lib/api";
import { useFetch } from "../../lib/useFetch";
import { openCheckout, pollPaymentStatus, isTerminal } from "../../lib/payments";
import { COLORS } from "../../constants/theme";

function Section({ title, children }) {
  return (
    <View className="mb-4 rounded-xl border border-gray-200 bg-white p-4">
      <Text className="mb-3 text-sm font-bold uppercase tracking-wide text-gray-500">
        {title}
      </Text>
      {children}
    </View>
  );
}

function Row({ label, value }) {
  return (
    <View className="flex-row justify-between py-1.5">
      <Text className="text-sm text-gray-500">{label}</Text>
      <Text className="flex-1 text-right text-sm font-medium text-gray-900">{value ?? "—"}</Text>
    </View>
  );
}

const confirm = (title, message, onConfirm) => {
  if (Platform.OS === "web") {
    if (window.confirm(`${title}\n\n${message}`)) onConfirm();
    return;
  }
  Alert.alert(title, message, [
    { text: "Cancel", style: "cancel" },
    { text: "Confirm", onPress: onConfirm },
  ]);
};

export default function RepairDetail() {
  const { id } = useLocalSearchParams();
  const { data, error, loading, refreshing, refresh } = useFetch(`/client/repairs/${id}`);
  const [busy, setBusy] = useState(false);
  const [actionError, setActionError] = useState(null);
  const [paying, setPaying] = useState(false);
  const [paymentNote, setPaymentNote] = useState(null);

  const [reviewOpen, setReviewOpen] = useState(false);
  const [rating, setRating] = useState(5);
  const [feedback, setFeedback] = useState("");
  const [reviewError, setReviewError] = useState(null);

  const submitReview = async () => {
    setBusy(true);
    setReviewError(null);
    try {
      await api.post("/client/reviews", {
        request_id: Number(id),
        rating,
        feedback: feedback.trim() || null,
      });
      setReviewOpen(false);
      setFeedback("");
      await refresh();
    } catch (e) {
      setReviewError(e.message || "Couldn't submit your review.");
    } finally {
      setBusy(false);
    }
  };

  const payNow = async (paymentLink) => {
    setPaying(true);
    setPaymentNote(null);
    try {
      await openCheckout(paymentLink);

      // On web the line above navigates away, so anything past here is native.
      // The webhook confirms payment, not the redirect — poll for the real state.
      setPaymentNote("Confirming your payment…");
      const status = await pollPaymentStatus(id);
      await refresh();

      if (isTerminal(status)) {
        setPaymentNote(null);
      } else {
        setPaymentNote(
          "We haven't received confirmation yet. This can take a moment — pull down to refresh."
        );
      }
    } catch (e) {
      setPaymentNote(e.message || "Couldn't open the payment page.");
    } finally {
      setPaying(false);
    }
  };

  const act = async (path, successMessage) => {
    setBusy(true);
    setActionError(null);
    try {
      await api.patch(`/client/repairs/${id}/${path}`);
      await refresh();
      if (Platform.OS === "web") window.alert(successMessage);
      else Alert.alert("Done", successMessage);
    } catch (e) {
      setActionError(e.message || "Action failed.");
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

  if (error) {
    return (
      <View className="flex-1 items-center justify-center bg-gray-50 p-6">
        <Stack.Screen options={{ title: "Repair", headerShown: true }} />
        <Text className="text-center text-sm text-gray-500">{error}</Text>
      </View>
    );
  }

  const repair = data?.repair ?? {};
  const quotation = repair.quotation;
  const canApprove = quotation && !repair.client_approved;
  const canCancel = ["pending", "accepted"].includes(repair.status);
  // The server rejects reviews unless status is exactly "COMPLETED"; compare
  // case-insensitively since other endpoints report status in lower case.
  const canReview = String(repair.status ?? "").toUpperCase() === "COMPLETED";

  return (
    <ScrollView
      className="flex-1 bg-gray-50"
      contentContainerStyle={{ padding: 16, maxWidth: 720, width: "100%", alignSelf: "center" }}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={refresh} tintColor={COLORS.primary} />
      }
    >
      <Stack.Screen options={{ title: `Repair #${id}`, headerShown: true }} />

      <Section title="Device">
        <Row label="Device" value={repair.device_name} />
        <Row label="Brand" value={repair.device_brand} />
        <Row label="Model" value={repair.device_model} />
      </Section>

      <Section title="Request">
        <Row label="Shop" value={repair.shop_name} />
        <Row label="Status" value={String(repair.status ?? "").replace(/_/g, " ")} />
        <Row label="Decision" value={repair.decision} />
        <Row label="Payment" value={String(repair.payment_status ?? "").replace(/_/g, " ")} />
        <Row label="Requested" value={repair.created_at} />
      </Section>

      {repair.assessment ? (
        <Section title="Assessment">
          <Text className="text-sm text-gray-700">
            {repair.assessment.findings || repair.assessment.notes || "No notes provided."}
          </Text>
        </Section>
      ) : null}

      {quotation ? (
        <Section title="Quotation">
          {(quotation.services ?? []).map((s, i) => (
            <Row key={`s${i}`} label={s.name ?? "Service"} value={`₱${s.price ?? s.base_price ?? "—"}`} />
          ))}
          {(quotation.parts ?? []).map((p, i) => (
            <Row key={`p${i}`} label={p.name ?? "Part"} value={`₱${p.price ?? "—"}`} />
          ))}
          <View className="mt-2 border-t border-gray-100 pt-2">
            <Row label="Total" value={quotation.total_amount ? `₱${quotation.total_amount}` : "—"} />
          </View>
        </Section>
      ) : null}

      {repair.assigned_employee ? (
        <Section title="Technician">
          <Row
            label="Assigned to"
            value={[repair.assigned_employee.first_name, repair.assigned_employee.last_name]
              .filter(Boolean)
              .join(" ")}
          />
        </Section>
      ) : null}

      {repair.payment ? (
        <Section title="Payment">
          <Row
            label="Amount"
            value={repair.payment.amount ? `₱${repair.payment.amount}` : null}
          />
          <Row label="Status" value={repair.payment.status} />
          <Row label="Paid at" value={repair.payment.paid_at} />

          {paymentNote ? (
            <Text className="mt-3 text-sm text-gray-600">{paymentNote}</Text>
          ) : null}

          {repair.payment.payment_link && !isTerminal(repair.payment.status) ? (
            <Button
              title="Pay now"
              className="mt-4"
              loading={paying}
              onPress={() => payNow(repair.payment.payment_link)}
            />
          ) : null}
        </Section>
      ) : null}

      {repair.review ? (
        <Section title="Your review">
          <View className="flex-row">
            {[1, 2, 3, 4, 5].map((n) => (
              <Ionicons
                key={n}
                name={n <= Number(repair.review.rating ?? 0) ? "star" : "star-outline"}
                size={16}
                color="#f59e0b"
              />
            ))}
          </View>
          {repair.review.feedback || repair.review.comment ? (
            <Text className="mt-2 text-sm text-gray-700">
              {repair.review.feedback || repair.review.comment}
            </Text>
          ) : null}
        </Section>
      ) : canReview ? (
        <Button title="Leave a review" className="mb-3" onPress={() => setReviewOpen(true)} />
      ) : null}

      {actionError ? (
        <Text className="mb-3 text-center text-sm text-red-600">{actionError}</Text>
      ) : null}

      {canApprove ? (
        <Button
          title="Approve quotation"
          loading={busy}
          className="mb-3"
          onPress={() =>
            confirm("Approve quotation", "Approve this quotation and let the shop proceed?", () =>
              act("approve", "Quotation approved.")
            )
          }
        />
      ) : null}

      {canCancel ? (
        <Button
          title="Cancel request"
          variant="outline"
          loading={busy}
          onPress={() =>
            confirm("Cancel request", "Cancel this repair request?", () =>
              act("cancel", "Repair request cancelled.")
            )
          }
        />
      ) : null}

      <View className="h-6" />

      <Modal
        visible={reviewOpen}
        onClose={() => setReviewOpen(false)}
        title="Rate this repair"
        footer={<Button title="Submit review" loading={busy} onPress={submitReview} />}
      >
        {reviewError ? (
          <Text className="mb-3 text-sm text-red-600">{reviewError}</Text>
        ) : null}

        <Text className="mb-2 text-sm font-medium text-gray-700">Rating</Text>
        <View className="mb-4 flex-row">
          {[1, 2, 3, 4, 5].map((n) => (
            <Pressable
              key={n}
              onPress={() => setRating(n)}
              accessibilityRole="button"
              accessibilityLabel={`${n} star${n === 1 ? "" : "s"}`}
              className="mr-1.5"
            >
              <Ionicons
                name={n <= rating ? "star" : "star-outline"}
                size={30}
                color="#f59e0b"
              />
            </Pressable>
          ))}
        </View>

        <TextField
          label="Feedback (optional)"
          value={feedback}
          onChangeText={setFeedback}
          placeholder="How did the repair go?"
          multiline
        />
      </Modal>
    </ScrollView>
  );
}
