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
import { Stack, useLocalSearchParams, useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";

import Button from "../../components/Button";
import TextField from "../../components/TextField";
import Modal from "../../components/Modal";
import {
  AssessmentSection,
  formatRepairDate,
  getRepairLocation,
  isValidRepairDate,
  QuotationSection,
  RepairRejectionNotice,
  RepairStatusBadge,
  RepairRow as Row,
  RepairSection as Section,
} from "../../components/RepairSummary";
import api from "../../lib/api";
import { useFetch } from "../../lib/useFetch";
import { openCheckout, pollPaymentStatus, isTerminal } from "../../lib/payments";
import { COLORS } from "../../constants/theme";
import { useResponsive } from "../../lib/useResponsive";

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
  const router = useRouter();
  const { isDesktop, horizontalPadding } = useResponsive();
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

  if (error || !data?.repair) {
    return (
      <View className="flex-1 items-center justify-center bg-gray-50 p-6">
        <Stack.Screen options={{ title: "Repair", headerShown: true }} />
        <Text className="mb-4 text-center text-sm text-gray-500">{error || "Repair not found."}</Text>
        <Button title="Try again" onPress={refresh} loading={refreshing} />
        <Button title="Back to my repairs" variant="ghost" className="mt-2" onPress={() => router.push("/repairs")} />
      </View>
    );
  }

  const repair = data?.repair ?? {};
  const quotation = repair.quotation;
  const isRejected = String(repair.decision ?? "").toUpperCase() === "REJECTED";
  const repairLocation = getRepairLocation({
    deliveryMethod: repair.delivery_method,
    serviceAddress: repair.service_address,
    shopAddress: repair.shop_address,
  });
  const hasCompletionDate = isValidRepairDate(quotation?.estimated_completion_date);
  const canApprove = !isRejected && quotation && hasCompletionDate && !repair.client_approved;
  const canCancel = !isRejected && ["pending", "accepted"].includes(String(repair.status ?? "").toLowerCase());
  // The server rejects reviews unless status is exactly "COMPLETED"; compare
  // case-insensitively since other endpoints report status in lower case.
  const canReview = String(repair.status ?? "").toUpperCase() === "COMPLETED";
  const deviceTitle = [repair.device_brand, repair.device_model].filter(Boolean).join(" ") || repair.device_name || "Your device";
  const paid = String(repair.payment_status || "").toUpperCase() === "PAID";
  const nextUpdate = canReview
    ? repair.review ? "Your repair is complete. You can review the repair information and your feedback below." : "Your repair is complete. Share your experience by leaving a review below."
    : String(repair.status || "").toUpperCase() === "IN_PROGRESS"
      ? "The shop is working on your device. Check back for progress updates or message the shop."
      : String(repair.decision || "").toUpperCase() === "PENDING"
        ? "The shop will review your request and decide whether it can accept the repair."
        : canApprove
          ? "Review the assessment, price, and estimated completion below before approving the quotation."
          : !quotation
            ? "Check back for the shop's assessment and quotation before deciding whether to continue."
            : !hasCompletionDate
              ? "The shop needs to add an estimated completion date before you can approve the quotation."
              : paid
                ? repair.assigned_employee ? "Payment is confirmed and a technician is assigned. The shop will update you when repair work starts." : "Payment is confirmed. The shop will arrange technician assignment before repair work starts."
                : Number(repair.client_approved) === 1
                  ? repair.payment?.payment_link ? "Your quotation is approved. Check the payment section below for checkout and payment status." : "Your quotation is approved. The shop needs to provide a payment link before checkout."
                  : "Review the quotation and request information below for the latest update.";

  return (
    <ScrollView
      className="flex-1 bg-gray-50"
      contentContainerStyle={{ paddingVertical: 20, paddingHorizontal: horizontalPadding, maxWidth: isDesktop ? 1200 : 960, width: "100%", alignSelf: "center" }}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={refresh} tintColor={COLORS.primary} />
      }
    >
      <Stack.Screen options={{ title: `Repair #${id}`, headerShown: true }} />

      <Pressable onPress={() => router.push("/repairs")} accessibilityRole="button" className="mb-3 min-h-11 flex-row items-center gap-2 self-start">
        <Ionicons name="arrow-back-outline" size={18} color={COLORS.primary} />
        <Text className="text-sm font-semibold text-blue-600">Back to my repairs</Text>
      </Pressable>
      <View className="mb-5 rounded-2xl border border-gray-200 bg-white p-5">
        <View className="flex-row flex-wrap items-start justify-between gap-3">
          <View className="flex-1">
            <Text className="text-xs font-semibold uppercase text-gray-400">Repair #{id}</Text>
            <Text accessibilityRole="header" className="mt-2 text-2xl font-bold text-gray-900">{deviceTitle}</Text>
            <View className="mt-2 flex-row items-center gap-2"><Ionicons name="storefront-outline" size={16} color={COLORS.textMuted} /><Text className="flex-1 text-sm text-gray-500">{repair.shop_name || "Your repair shop"}</Text></View>
          </View>
          <RepairStatusBadge status={repair.status} decision={repair.decision} />
        </View>
        {!isRejected ? <View className="mt-4 rounded-xl bg-blue-50 p-4"><Text className="text-xs font-bold uppercase text-blue-700">Your repair update</Text><Text className="mt-1 text-sm leading-6 text-blue-800">{nextUpdate}</Text></View> : null}
        <View className="mt-4 flex-row flex-wrap gap-3">
          {repair.shop_id ? <Button title="View shop" variant="outline" onPress={() => router.push(`/shop/${repair.shop_id}`)} /> : null}
          <Button title="My messages" variant="outline" onPress={() => router.push("/chat")} />
        </View>
      </View>

      {isRejected ? <RepairRejectionNotice reason={repair.rejection_reason} /> : null}
      {actionError ? <Text accessibilityRole="alert" className="mb-4 rounded-xl bg-red-50 p-4 text-sm text-red-700">{actionError}</Text> : null}

      <View className={isDesktop ? "flex-row items-start gap-4" : ""}>
      <View style={isDesktop ? { flex: 1, minWidth: 0 } : undefined}>
      <Section title="Device">
        <Row label="Device" value={repair.device_name} />
        <Row label="Brand" value={repair.device_brand} />
        <Row label="Model" value={repair.device_model} />
      </Section>
      </View>

      <View style={isDesktop ? { flex: 2, minWidth: 0 } : undefined}>
      <Section title="Request">
        <Row label="Shop" value={repair.shop_name} />
        <Row
          label="Status"
          value={isRejected ? "REJECTED" : String(repair.status ?? "").replace(/_/g, " ")}
        />
        <Row label="Decision" value={isRejected ? "REJECTED" : repair.decision} />
        <Row label={repairLocation.label} value={repairLocation.value} />
        {!isRejected ? (
          <Row label="Payment" value={String(repair.payment_status ?? "").replace(/_/g, " ")} />
        ) : null}
        <Row label="Preferred date" value={formatRepairDate(repair.preferred_date)} />
        <Row label="Requested" value={formatRepairDate(repair.created_at)} />
        <Row label="Device received" value={repair.is_received ? "Received" : "Not yet received"} />
        {repair.is_received ? (
          <>
            <Row label="Received via" value={repair.received_method} />
            <Row label="Received at" value={formatRepairDate(repair.received_at)} />
          </>
        ) : null}
      </Section>
      </View>
      </View>

      {!isRejected && repair.assessment ? (
        <AssessmentSection assessment={repair.assessment} />
      ) : null}

      {!isRejected && quotation ? (
        <QuotationSection quotation={quotation} />
      ) : null}
      {!isRejected && quotation && !hasCompletionDate ? (
        <Text className="mb-3 text-sm text-amber-700">
          The shop needs to add an estimated completion date before you can approve this quotation.
        </Text>
      ) : null}

      {canApprove ? (
        <Button
          title="Approve quotation"
          loading={busy}
          className="mb-3"
          onPress={() =>
            confirm("Approve quotation", "Approve this quotation? Payment and technician assignment are required before repair starts.", () =>
              act("approve", "Quotation approved.")
            )
          }
        />
      ) : null}

      {!isRejected && repair.assigned_employee ? (
        <Section title="Technician">
          <Row
            label="Assigned to"
            value={[repair.assigned_employee.first_name, repair.assigned_employee.last_name]
              .filter(Boolean)
              .join(" ")}
          />
        </Section>
      ) : null}

      {repair.payment && !isRejected ? (
        <Section title="Payment">
          <Row
            label="Amount"
            value={repair.payment.amount ? `₱${repair.payment.amount}` : null}
          />
          <Row label="Status" value={repair.payment.status} />
          <Row label="Paid at" value={formatRepairDate(repair.payment.paid_at)} />

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

      {!isRejected && repair.review ? (
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
          <Row label="Reviewed at" value={formatRepairDate(repair.review.created_at)} />
        </Section>
      ) : !isRejected && canReview ? (
        <Button title="Leave a review" className="mb-3" onPress={() => setReviewOpen(true)} />
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
              accessibilityState={{ selected: rating === n }}
              className="h-11 w-11 items-center justify-center"
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
          style={{ minHeight: 120, paddingTop: 12, textAlignVertical: "top" }}
        />
      </Modal>
    </ScrollView>
  );
}
