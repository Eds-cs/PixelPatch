// app/repair/[id].jsx — GET /api/client/repairs/:id
// Also exposes PATCH .../approve and .../cancel.
import { useState } from "react";
import { LIMITS } from "../../lib/inputLimits";
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
  calendarDate,
  getRepairLocation,
  isClientCancelled,
  isValidRepairDate,
  QuotationSection,
  RepairCancelledNotice,
  RepairRejectionNotice,
  RepairStatusBadge,
} from "../../components/RepairSummary";
import api from "../../lib/api";
import { useFetch } from "../../lib/useFetch";
import { useMessageShop } from "../../lib/useMessageShop";
import { openCheckout, pollPaymentStatus, isTerminal } from "../../lib/payments";
import { COLORS } from "../../constants/theme";
import { useResponsive } from "../../lib/useResponsive";
import { quotationDueNow } from "../../lib/paymentTerms";
import { typeIcon } from "../../lib/deviceSpecs";

import { SHOW_BACK_BUTTONS } from "../../lib/navigation";
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

// ---------- Layout pieces ----------

// A white section card with an icon and a title.
function Card({ icon, title, right, children, tone = "default" }) {
  return (
    <View className={`mb-4 rounded-2xl border bg-white p-5 ${tone === "accent" ? "border-teal-200" : "border-gray-200"}`}>
      {title ? (
        <View className="mb-4 flex-row items-center gap-2">
          {icon ? <Ionicons name={icon} size={18} color={COLORS.primary} /> : null}
          <Text className="flex-1 text-sm font-bold uppercase tracking-wide text-gray-700">{title}</Text>
          {right}
        </View>
      ) : null}
      {children}
    </View>
  );
}

// One detail with an icon: label above, value below (reads well in narrow columns).
function Detail({ icon, label, value, note }) {
  return (
    <View className="flex-row items-start gap-3 py-2.5">
      <View className="h-9 w-9 items-center justify-center rounded-full bg-gray-50">
        <Ionicons name={icon} size={17} color={COLORS.primary} />
      </View>
      <View className="flex-1" style={{ minWidth: 0 }}>
        <Text className="text-xs text-gray-500">{label}</Text>
        <Text className="mt-0.5 text-sm font-semibold text-gray-900">{value || "—"}</Text>
        {note ? <Text className="mt-0.5 text-xs text-gray-500">{note}</Text> : null}
      </View>
    </View>
  );
}

function Chip({ label, tone }) {
  const tones = {
    green: ["bg-emerald-50", "text-emerald-800"],
    amber: ["bg-amber-50", "text-amber-800"],
    red: ["bg-red-50", "text-red-700"],
    gray: ["bg-gray-100", "text-gray-600"],
  };
  const [bg, fg] = tones[tone] ?? tones.gray;
  return <View className={`rounded-full px-2.5 py-1 ${bg}`}><Text className={`text-xs font-semibold ${fg}`}>{label}</Text></View>;
}

// Where the repair is, as steps. Mobile: a bar with the current step; wider: every step.
const STEPS = ["Requested", "Accepted", "Quoted", "Approved", "Paid", "Repairing", "Done"];

function Progress({ done, compact }) {
  const current = Math.min(done, STEPS.length - 1);
  if (compact) {
    const finished = done >= STEPS.length;
    return (
      <View>
        <View className="h-2 overflow-hidden rounded-full bg-gray-100">
          <View className="h-2 rounded-full bg-primary" style={{ width: `${Math.round((Math.max(done, 1) / STEPS.length) * 100)}%` }} />
        </View>
        <Text className="mt-2 text-xs font-semibold text-gray-600">
          {finished ? "All steps done" : `Step ${current + 1} of ${STEPS.length}: ${STEPS[current]}`}
        </Text>
      </View>
    );
  }
  return (
    <View className="flex-row">
      {STEPS.map((label, index) => {
        const complete = index < done;
        const active = index === done;
        return (
          <View key={label} className="flex-1 items-center">
            <View className="w-full flex-row items-center">
              <View className={`h-0.5 flex-1 ${index === 0 ? "bg-transparent" : index <= done ? "bg-primary" : "bg-gray-200"}`} />
              <View className={`h-7 w-7 items-center justify-center rounded-full ${complete ? "bg-primary" : active ? "border-2 border-primary bg-white" : "border-2 border-gray-200 bg-white"}`}>
                {complete ? <Ionicons name="checkmark" size={15} color="#fff" /> : <Text className={`text-xs font-bold ${active ? "text-primary" : "text-gray-400"}`}>{index + 1}</Text>}
              </View>
              <View className={`h-0.5 flex-1 ${index === STEPS.length - 1 ? "bg-transparent" : index < done ? "bg-primary" : "bg-gray-200"}`} />
            </View>
            <Text className={`mt-1.5 text-center text-xs ${complete ? "font-semibold text-gray-700" : active ? "font-bold text-primary" : "text-gray-400"}`}>{label}</Text>
          </View>
        );
      })}
    </View>
  );
}

// "Oct 27, 2026": a date without a meaningless midnight time.
const dateOnly = (value) => calendarDate(value);

// "Gov. Ramos Ave., Tetuan, , Zamboanga City" -> without the empty parts.
const tidyAddress = (value) => String(value ?? "").split(",").map((part) => part.trim()).filter(Boolean).join(", ") || null;

const DELIVERY = {
  DROPOFF: { label: "Drop-off at the shop", icon: "storefront-outline" },
  PICKUP: { label: "The shop picks it up", icon: "car-outline" },
  ONSITE: { label: "On-site repair", icon: "home-outline" },
};

// Icon for a device without a saved type, from its name.
function guessDeviceIcon(text) {
  const name = text.toLowerCase();
  if (/macbook|laptop|notebook|thinkpad|chromebook|vivobook|ideapad|zenbook|inspiron|pavilion/.test(name)) return "laptop-outline";
  if (/\bimac\b|desktop|\bpc\b|computer|system unit|\bcpu\b/.test(name)) return "desktop-outline";
  if (/ipad|tablet|\btab\b/.test(name)) return "tablet-portrait-outline";
  return "phone-portrait-outline";
}

const peso = (value) => `₱${Number(value || 0).toLocaleString()}`;

export default function RepairDetail() {
  const { id } = useLocalSearchParams();
  const router = useRouter();
  const { messageShop, busyShopId, error: messageError } = useMessageShop();
  const { isDesktop, isTablet, horizontalPadding } = useResponsive();
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
        <Stack.Screen options={{ title: "Repair", headerShown: false }} />
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
  // client_approved: null = undecided, 1 = approved, 0 = cancelled.
  const isCancelled = isClientCancelled(repair.client_approved);
  const isUndecided = repair.client_approved === null || repair.client_approved === undefined;
  const canApprove = !isRejected && isUndecided && quotation && hasCompletionDate;
  // Mirrors the server: cancellable until approval, while PENDING or REVIEW and unpaid.
  const canCancel =
    !isRejected &&
    isUndecided &&
    String(repair.payment_status ?? "").toUpperCase() !== "PAID" &&
    ["PENDING", "REVIEW"].includes(String(repair.status ?? "").toUpperCase());
  // The server rejects reviews unless status is exactly "COMPLETED"; compare
  // case-insensitively since other endpoints report status in lower case.
  const status = String(repair.status ?? "").toUpperCase();
  const canReview = status === "COMPLETED";
  const deviceTitle = repair.device_name || [repair.device_brand, repair.device_model].filter(Boolean).join(" ") || "Your device";
  const deviceSubtitle = [repair.device_brand, repair.device_model].filter(Boolean).join(" · ");
  // Phone, laptop or desktop icon (lib/deviceSpecs.js). Devices added before
  // device types existed have none, so guess from the name (icon only).
  const deviceIcon = repair.device_type ? typeIcon(repair.device_type) : guessDeviceIcon(`${repair.device_name ?? ""} ${repair.device_brand ?? ""}`);
  const paid = String(repair.payment_status || "").toUpperCase() === "PAID";
  const approved = repair.client_approved !== null && repair.client_approved !== undefined && Number(repair.client_approved) === 1;
  const nextUpdate = canReview
    ? repair.review ? "Your repair is complete. Thanks for leaving a review." : "Your repair is complete. Tell others how it went by leaving a review."
    : status === "IN_PROGRESS"
      ? "The shop is working on your device. Message them any time for an update."
      : String(repair.decision || "").toUpperCase() === "PENDING"
        ? "The shop will review your request and decide whether it can take the repair."
        : canApprove
          ? "Your quotation is ready. Check the price and approve it below to continue."
          : !quotation
            ? "The shop is assessing your device. Their quotation will appear here."
            : !hasCompletionDate
              ? "The shop needs to add an estimated completion date before you can approve the quotation."
              : paid
                ? repair.assigned_employee ? "Payment confirmed and a technician is assigned. Work starts soon." : "Payment confirmed. The shop will assign a technician before work starts."
                : approved
                  ? repair.payment?.payment_link ? "Quotation approved. Pay below so the shop can start." : "Quotation approved. The shop will send the payment link next."
                  : "Check the quotation and details below for the latest update.";
  // How many steps of STEPS are done.
  const stepsDone = [
    true,
    String(repair.decision || "").toUpperCase() === "ACCEPTED",
    Boolean(quotation),
    approved,
    paid,
    status === "IN_PROGRESS" || status === "COMPLETED",
    status === "COMPLETED",
  ].findIndex((done) => !done);
  const progress = stepsDone === -1 ? STEPS.length : stepsDone;
  const delivery = DELIVERY[String(repair.delivery_method ?? "").toUpperCase()];
  const paymentStatus = String(repair.payment?.status ?? "").toUpperCase();
  const technician = repair.assigned_employee
    ? [repair.assigned_employee.first_name, repair.assigned_employee.last_name].filter(Boolean).join(" ")
    : null;

  const mainHasContent = !isRejected && Boolean(
    quotation || repair.assessment || repair.payment || repair.review || canReview || canCancel
  );

  const sideColumn = (
    <View>
      <Card icon="information-circle-outline" title="Details">
        <Detail icon={deviceIcon} label="Device" value={deviceTitle} note={deviceSubtitle || null} />
        <Detail icon={delivery?.icon ?? "location-outline"} label={delivery?.label ?? repairLocation.label} value={tidyAddress(repairLocation.value)} />
        <Detail icon="calendar-outline" label="Preferred date" value={dateOnly(repair.preferred_date)} />
        <Detail icon="time-outline" label="Requested" value={dateOnly(repair.created_at)} />
        {String(repair.delivery_method ?? "").toUpperCase() !== "ONSITE" ? (
          <Detail
            icon="cube-outline"
            label="Device received by the shop"
            value={repair.is_received ? `Yes, ${dateOnly(repair.received_at) ?? ""}`.trim() : "Not yet"}
          />
        ) : null}
      </Card>
      {!isRejected && technician ? (
        <Card icon="construct-outline" title="Technician">
          <View className="flex-row items-center gap-3">
            <View className="h-11 w-11 items-center justify-center rounded-full bg-teal-100">
              <Text className="text-base font-bold text-teal-800">{technician.charAt(0).toUpperCase()}</Text>
            </View>
            <View className="flex-1">
              <Text className="text-base font-semibold text-gray-900">{technician}</Text>
              <Text className="text-xs text-gray-500">{repair.assigned_employee.role || "Working on your repair"}</Text>
            </View>
          </View>
        </Card>
      ) : null}
    </View>
  );

  const mainColumn = (
    <View>
      {!isRejected && quotation ? (
        <QuotationSection quotation={quotation} clientApproved={repair.client_approved}>
          {!isCancelled && isUndecided && !hasCompletionDate ? (
            <View className="flex-row items-start gap-2 rounded-xl bg-amber-50 p-3">
              <Ionicons name="time-outline" size={16} color="#B45309" style={{ marginTop: 1 }} />
              <Text className="flex-1 text-sm leading-5 text-amber-900">{"The shop still needs to set a completion date. You can approve once it's added."}</Text>
            </View>
          ) : null}
          {/* The decision, right under the price: approve, or cancel the request. */}
          {canApprove ? (
            <View className={isDesktop ? "flex-row gap-3" : "gap-3"}>
              <View style={isDesktop ? { flex: 2 } : undefined}>
                <Button
                  title={`Approve · ${quotationDueNow(quotation)}`}
                  loading={busy}
                  onPress={() =>
                    confirm("Approve quotation", "Approve this quotation? Payment and technician assignment are required before repair starts.", () =>
                      act("approve", "Quotation approved.")
                    )
                  }
                />
              </View>
              {canCancel ? (
                <View style={isDesktop ? { flex: 1 } : undefined}>
                  <Button
                    title="Cancel request"
                    variant="outline"
                    disabled={busy}
                    onPress={() =>
                      confirm("Cancel request", "Cancel this repair request?", () =>
                        act("cancel", "Repair request cancelled.")
                      )
                    }
                  />
                </View>
              ) : null}
            </View>
          ) : null}
        </QuotationSection>
      ) : null}

      {!isRejected && repair.assessment ? <AssessmentSection assessment={repair.assessment} /> : null}

      {repair.payment && !isRejected ? (
        <Card
          icon="card-outline"
          title="Payment"
          right={<Chip label={paymentStatus === "PAID" ? "Paid" : paymentStatus === "FAILED" ? "Failed" : "Waiting for payment"} tone={paymentStatus === "PAID" ? "green" : paymentStatus === "FAILED" ? "red" : "amber"} />}
        >
          <Text className="text-3xl font-extrabold text-gray-900">{repair.payment.amount ? peso(repair.payment.amount) : "—"}</Text>
          <Text className="mt-1 text-sm text-gray-500">
            {paymentStatus === "PAID"
              ? `Paid online${dateOnly(repair.payment.paid_at) ? ` on ${dateOnly(repair.payment.paid_at)}` : ""}. PixelPatch holds it until the repair is done.`
              : "Pay securely online through PixelPatch."}
          </Text>
          {paymentNote ? <Text className="mt-3 text-sm text-gray-600">{paymentNote}</Text> : null}
          {repair.payment.payment_link && !isTerminal(repair.payment.status) ? (
            <Button title={`Pay ${repair.payment.amount ? peso(repair.payment.amount) : "now"}`} className="mt-4" loading={paying} onPress={() => payNow(repair.payment.payment_link)} />
          ) : null}
        </Card>
      ) : null}

      {!isRejected && repair.review ? (
        <Card icon="star-outline" title="Your review" right={dateOnly(repair.review.created_at) ? <Text className="text-xs text-gray-400">{dateOnly(repair.review.created_at)}</Text> : null}>
          <View className="flex-row items-center gap-1">
            {[1, 2, 3, 4, 5].map((n) => (
              <Ionicons key={n} name={n <= Number(repair.review.rating ?? 0) ? "star" : "star-outline"} size={24} color="#f59e0b" />
            ))}
            <Text className="ml-2 text-sm font-semibold text-gray-700">{Number(repair.review.rating ?? 0)} of 5</Text>
          </View>
          {repair.review.feedback || repair.review.comment ? (
            <View className="mt-3 rounded-xl bg-gray-50 p-4">
              <Text className="text-sm italic leading-6 text-gray-700">“{repair.review.feedback || repair.review.comment}”</Text>
            </View>
          ) : null}
        </Card>
      ) : !isRejected && canReview ? (
        <Card tone="accent">
          <View className={isDesktop ? "flex-row items-center gap-4" : "gap-3"}>
            <View className="h-12 w-12 items-center justify-center rounded-full bg-amber-50">
              <Ionicons name="star" size={24} color="#f59e0b" />
            </View>
            <View className="flex-1">
              <Text className="text-base font-bold text-gray-900">How did the repair go?</Text>
              <Text className="mt-0.5 text-sm text-gray-500">Your review helps other customers choose a shop.</Text>
            </View>
            <Button title="Leave a review" onPress={() => setReviewOpen(true)} />
          </View>
        </Card>
      ) : null}

      {/* Before a quotation can be approved, cancelling lives here; after,
          it sits next to Approve in the quotation card. */}
      {canCancel && !canApprove ? (
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
    </View>
  );

  return (
    <ScrollView
      className="flex-1 bg-gray-50"
      contentContainerStyle={{ paddingVertical: 20, paddingHorizontal: horizontalPadding, maxWidth: isDesktop ? 1200 : 760, width: "100%", alignSelf: "center" }}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={refresh} tintColor={COLORS.primary} />
      }
    >
      {/* The in-page "Back to my repairs" link replaces the stack header. */}
      <Stack.Screen options={{ title: `Repair #${id}`, headerShown: false }} />

      {SHOW_BACK_BUTTONS ? (
        <Pressable onPress={() => router.push("/repairs")} accessibilityRole="button" className="mb-3 min-h-11 flex-row items-center gap-2 self-start">
          <Ionicons name="arrow-back-outline" size={18} color={COLORS.primary} />
          <Text className="text-sm font-semibold text-primary">Back to my repairs</Text>
        </Pressable>
      ) : null}

      {/* Header: what, where, and how far along */}
      <View className="mb-4 overflow-hidden rounded-2xl border border-gray-200 bg-white">
        <View className="p-5">
          <View className="flex-row flex-wrap items-start justify-between gap-3">
            <View className="flex-row items-center gap-3" style={{ flex: 1, minWidth: 220 }}>
              <View className="h-14 w-14 items-center justify-center rounded-2xl bg-teal-50">
                <Ionicons name={deviceIcon} size={26} color={COLORS.primary} />
              </View>
              <View className="flex-1" style={{ minWidth: 0 }}>
                <Text className="text-xs font-semibold uppercase tracking-wide text-gray-400">Repair #{id}</Text>
                <Text accessibilityRole="header" className="text-2xl font-bold text-gray-900">{deviceTitle}</Text>
                {deviceSubtitle ? <Text className="text-sm text-gray-500">{deviceSubtitle}</Text> : null}
              </View>
            </View>
            <RepairStatusBadge status={repair.status} decision={repair.decision} clientApproved={repair.client_approved} />
          </View>
          <Pressable
            onPress={() => repair.shop_id && router.push(`/shop/${repair.shop_id}`)}
            accessibilityRole="link"
            className="mt-4 flex-row items-center gap-2 self-start rounded-full bg-gray-50 px-3 py-1.5"
          >
            <Ionicons name="storefront-outline" size={15} color={COLORS.primary} />
            <Text className="text-sm font-semibold text-gray-700">{repair.shop_name || "Your repair shop"}</Text>
            <Ionicons name="chevron-forward" size={14} color={COLORS.textMuted} />
          </Pressable>
          {!isRejected && !isCancelled ? (
            <View className="mt-5">
              <Progress done={progress} compact={!isDesktop && !isTablet} />
            </View>
          ) : null}
        </View>

        {!isRejected && !isCancelled ? (
          <View className={`border-t border-teal-100 bg-teal-50 p-4 ${isDesktop || isTablet ? "flex-row items-center gap-4" : "gap-3"}`}>
            <View className="flex-row items-start gap-3" style={{ flex: 1 }}>
              <Ionicons name={canReview ? "checkmark-done-circle" : "arrow-forward-circle"} size={22} color={COLORS.primary} />
              <View className="flex-1">
                <Text className="text-xs font-bold uppercase text-teal-800">{"What's next"}</Text>
                <Text className="mt-0.5 text-sm leading-5 text-teal-950">{nextUpdate}</Text>
              </View>
            </View>
            {repair.shop_id ? (
              <Pressable
                onPress={() => messageShop(repair.shop_id, { requestId: id })}
                disabled={busyShopId === repair.shop_id}
                accessibilityRole="button"
                className="h-10 flex-row items-center justify-center gap-2 self-start rounded-full bg-primary px-4 active:bg-teal-800"
              >
                {busyShopId === repair.shop_id ? <ActivityIndicator size="small" color="#fff" /> : <Ionicons name="chatbubble-ellipses-outline" size={16} color="#fff" />}
                <Text className="text-sm font-semibold text-white">Message shop</Text>
              </Pressable>
            ) : (
              <Button title="My messages" variant="outline" onPress={() => router.push("/chat")} />
            )}
          </View>
        ) : null}
      </View>
      {messageError ? <Text accessibilityRole="alert" className="mb-3 text-sm text-red-600">{messageError.text}</Text> : null}

      {isRejected ? <RepairRejectionNotice reason={repair.rejection_reason} /> : null}
      {!isRejected && isCancelled ? <RepairCancelledNotice message="You cancelled this repair request." /> : null}
      {actionError ? <Text accessibilityRole="alert" className="mb-4 rounded-xl bg-red-50 p-4 text-sm text-red-700">{actionError}</Text> : null}

      {/* Two columns on desktop, unless the main column would be empty
          (e.g. a rejected request): then the details take the full width. */}
      {isDesktop && mainHasContent ? (
        <View className="flex-row items-start gap-4">
          <View style={{ flex: 2, minWidth: 0 }}>{mainColumn}</View>
          <View style={{ flex: 1, minWidth: 0 }}>{sideColumn}</View>
        </View>
      ) : (
        <View>
          {mainColumn}
          <View className="mt-0">{sideColumn}</View>
        </View>
      )}

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
          label="Feedback (optional)" maxLength={LIMITS.reviewComment}
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
