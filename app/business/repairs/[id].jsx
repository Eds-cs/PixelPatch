// app/(business)/repairs/[id].jsx
// Consolidates the legacy per-status pages (RepairPending, RepairAwaitingAssessment,
// RepairAssessmentNoQuotation, RepairInProgress, RepairDone, RepairCompleted,
// RepairRejected) into one screen that shows only the actions valid right now.
import { useCallback, useEffect, useState } from "react";
import { LIMITS } from "../../../lib/inputLimits";
import {
  ActivityIndicator,
  Alert,
  Linking,
  Platform,
  Pressable,
  RefreshControl,
  ScrollView,
  Switch,
  Text,
  View,
} from "react-native";
import { Stack, useLocalSearchParams, useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";

import Button from "../../../components/Button";
import TextField from "../../../components/TextField";
import DateField, { toDateString } from "../../../components/DateField";
import Modal from "../../../components/Modal";
import {
  AssessmentSection,
  formatRepairDate,
  getRepairLocation,
  isClientCancelled,
  isValidRepairDate,
  QuotationSection,
  RepairCancelledNotice,
  RepairRejectionNotice,
  RepairStatusBadge,
  RepairRow as Row,
  RepairSection as Section,
} from "../../../components/RepairSummary";
import api from "../../../lib/api";
import { generatePaymentLink } from "../../../lib/payments";
import { useShop } from "../../../lib/shop";
import { useFetch } from "../../../lib/useFetch";
import { parseDepositPercent } from "../../../lib/paymentTerms";
import PaymentTermsFields from "../../../components/PaymentTermsFields";
import { COLORS } from "../../../constants/theme";
import { useResponsive } from "../../../lib/useResponsive";

import { SHOW_BACK_BUTTONS } from "../../../lib/navigation";
import { specRows, typeLabel } from "../../../lib/deviceSpecs";
import { formatPhone } from "../../../lib/phone";
const PESO = "₱";
const TODAY_DATE = toDateString(new Date());
const WARRANTY_UNITS = ["DAY", "WEEK", "MONTH", "YEAR"];

const notify = (title, message) => {
  if (Platform.OS === "web") window.alert(`${title}\n\n${message}`);
  else Alert.alert(title, message);
};

export default function BusinessRepairDetail() {
  const { id } = useLocalSearchParams();
  const router = useRouter();
  const { isMobile, isDesktop, horizontalPadding } = useResponsive();
  // The shop's default payment terms, to start each quotation from.
  const { shopId } = useShop();
  const shopInfo = useFetch(shopId ? `/shops/${shopId}` : null, (d) => d.shop ?? null);
  const shopAcceptsCash = Number(shopInfo.data?.accepts_cash) === 1;

  const [repair, setRepair] = useState(null);
  const [assessment, setAssessment] = useState(null);
  const [quotation, setQuotation] = useState(null);
  const [employees, setEmployees] = useState([]);
  const [assignment, setAssignment] = useState(null);
  const [serviceOptions, setServiceOptions] = useState([]);
  const [selectedServiceIds, setSelectedServiceIds] = useState([]);

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState(null);
  const [busy, setBusy] = useState(false);

  const [rejectOpen, setRejectOpen] = useState(false);
  const [assessOpen, setAssessOpen] = useState(false);
  const [quoteOpen, setQuoteOpen] = useState(false);
  const [assignOpen, setAssignOpen] = useState(false);
  const [completionDateOpen, setCompletionDateOpen] = useState(false);

  const [rejectReason, setRejectReason] = useState("");
  const [completionDate, setCompletionDate] = useState("");
  const [assessForm, setAssessForm] = useState({
    deviceCondition: "",
    observedIssues: "",
    recommendation: "",
    isRemote: false,
  });
  const [quoteForm, setQuoteForm] = useState({
    estimatedCompletionTime: "",
    warrantyCovered: false,
    warrantyValue: "",
    warrantyUnit: "DAY",
    isPartsNeeded: false,
    partName: "",
    partPrice: "",
    depositPercent: "100",
    allowCash: false,
  });

  const openQuote = () => {
    setQuoteForm((form) => ({
      ...form,
      depositPercent: String(shopInfo.data?.default_deposit_percent ?? 100),
      allowCash: shopAcceptsCash,
    }));
    setQuoteOpen(true);
  };

  const load = useCallback(
    async (isRefresh) => {
      if (isRefresh) setRefreshing(true);
      setError(null);
      try {
        const { data } = await api.get(`/business/repairs/details/${id}`);
        setRepair(data?.repair ?? null);

        // These legitimately 404 before they exist, so absence is not an error.
        const [a, q, emp, asg, serviceData] = await Promise.all([
          api.get(`/business/repairs/${id}/assessment`).catch(() => null),
          api.get(`/business/repairs/${id}/quotation`).catch(() => null),
          api.get("/business/employees").catch(() => null),
          api.get(`/business/repairs/${id}/assignment`).catch(() => null),
          api.get(`/business/repairs/${id}/services`).catch(() => null),
        ]);

        setAssessment(a?.data?.assessment ?? null);
        const quote = q?.data?.quotation;
        setQuotation(
          quote
            ? {
                ...quote,
                warranty: q.data.warranty ?? null,
                parts: q.data.parts ?? [],
                services: q.data.services ?? [],
              }
            : null
        );
        setEmployees(emp?.data?.employees ?? []);
        setAssignment(asg?.data?.assignment ?? null);
        setServiceOptions(serviceData?.data?.services ?? []);
      } catch (e) {
        setError(e.message || "Couldn't load this repair.");
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

  // "Message client": this repair's own chat (POST /business/repairs/:id/chat).
  // From inside it the owner can hand it to the assigned employee.
  const [openingChat, setOpeningChat] = useState(false);
  const [chatError, setChatError] = useState(null);
  const openChat = async () => {
    if (openingChat) return;
    setOpeningChat(true);
    setChatError(null);
    try {
      const { data } = await api.post(`/business/repairs/${id}/chat`);
      if (!data?.chat?.id) throw new Error("The chat could not be opened.");
      router.push(`/chat/${data.chat.id}`);
    } catch (e) {
      setChatError(e.message || "The chat could not be opened.");
    } finally {
      setOpeningChat(false);
    }
  };

  const act = async (fn, successMessage) => {
    setBusy(true);
    try {
      await fn();
      await load(true);
      notify("Done", successMessage);
    } catch (e) {
      notify("Action failed", e.message || "Please try again.");
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

  if (error || !repair) {
    return (
      <View className="flex-1 items-center justify-center bg-gray-50 p-6">
        <Stack.Screen options={{ title: `Repair #${id}` }} />
        <Text className="text-center text-sm text-gray-500">{error || "Repair not found."}</Text>
      </View>
    );
  }

  const decision = repair.decisionStatus;
  const status = repair.status;
  const normalizedDecision = String(decision ?? "").toUpperCase();
  const normalizedStatus = String(status ?? "").toUpperCase();
  const isRejected = normalizedDecision === "REJECTED";
  // clientApproved: null = undecided, 1 = approved, 0 = cancelled by the client.
  const isCancelled = !isRejected && isClientCancelled(repair.clientApproved);
  const paymentStatus = String(repair.paymentStatus ?? "").toUpperCase();
  const repairLocation = getRepairLocation({
    deliveryMethod: repair.deliveryMethod,
    serviceAddress: repair.pickupAddress,
    shopAddress: repair.shopAddress,
  });

  const canDecide = !isCancelled && normalizedDecision === "PENDING";
  const canAssess = !isCancelled && normalizedDecision === "ACCEPTED" && !assessment;
  const canQuote = !isCancelled && normalizedDecision === "ACCEPTED" && Boolean(assessment) && !quotation;
  const canSetCompletionDate =
    !isCancelled &&
    normalizedDecision === "ACCEPTED" &&
    Boolean(quotation) &&
    !isValidRepairDate(quotation.estimated_completion_date) &&
    paymentStatus === "PENDING";
  const canAddServices =
    !isCancelled &&
    normalizedDecision === "ACCEPTED" && !quotation && paymentStatus === "PENDING";
  const canStart =
    normalizedDecision === "ACCEPTED" &&
    Boolean(quotation) &&
    paymentStatus === "PAID" &&
    Boolean(assignment) &&
    !["IN_PROGRESS", "COMPLETED"].includes(normalizedStatus);
  const canComplete = normalizedStatus === "IN_PROGRESS";
  // Pickup and drop-off bring the device to the shop; on-site repairs don't.
  // Mirrors the server rule in markDeviceReceived.
  const deliveryMethod = String(repair.deliveryMethod ?? "").toUpperCase();
  const canMarkReceived =
    !isCancelled &&
    normalizedDecision === "ACCEPTED" &&
    normalizedStatus !== "COMPLETED" &&
    ["PICKUP", "DROPOFF"].includes(deliveryMethod) &&
    !repair.isReceived;
  const canManageAssignment =
    normalizedDecision === "ACCEPTED" &&
    paymentStatus === "PAID" &&
    !["IN_PROGRESS", "COMPLETED"].includes(normalizedStatus);

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
      <Stack.Screen options={{ title: `Repair #${id}` }} />

      {SHOW_BACK_BUTTONS ? (
        <Pressable onPress={() => router.push("/business/repairs")} accessibilityRole="button" className="mb-3 min-h-11 flex-row items-center gap-2 self-start">
          <Ionicons name="arrow-back-outline" size={18} color={COLORS.primary} />
          <Text className="text-sm font-semibold text-primary">All repair requests</Text>
        </Pressable>
      ) : null}

      <View className="mb-4 rounded-2xl border border-gray-200 bg-white p-5">
        <View className="flex-row flex-wrap items-start justify-between gap-3">
          <View className="flex-1">
            <Text className="text-xs font-semibold uppercase tracking-wide text-gray-400">Repair #{id}</Text>
            <Text accessibilityRole="header" className="mt-2 text-2xl font-bold text-gray-900">{repair.deviceType || "Repair details"}</Text>
            <Text className="mt-1 text-sm text-gray-500">{repair.client || "Client"}</Text>
          </View>
          <RepairStatusBadge status={status} decision={decision} clientApproved={repair.clientApproved} />
        </View>
        <View className="mt-4 flex-row flex-wrap gap-2">
          <View style={{ minWidth: 180, flexGrow: isMobile ? 1 : 0 }}>
            <Button title="Message client" variant="outline" loading={openingChat} onPress={openChat} />
          </View>
        </View>
        {chatError ? <Text accessibilityRole="alert" className="mt-2 text-sm text-red-700">{chatError}</Text> : null}
        {!isRejected && !isCancelled ? (
          <View className="mt-4 rounded-xl bg-teal-50 p-3">
            <Text className="text-xs font-bold uppercase text-teal-800">Next step</Text>
            <Text className="mt-1 text-sm leading-5 text-primary-soft-foreground">
              {canDecide ? "Review the request and choose whether to accept it."
                : normalizedStatus === "COMPLETED" ? "Repair completed. You can review the repair information below."
                : canComplete ? "Finish the repair, then mark it completed when the work is done."
                : canAssess ? "Assess the device before preparing a quotation."
                : canQuote ? "Prepare the quotation for the client to review."
                : canSetCompletionDate ? "Add an estimated completion date to the quotation."
                : canStart ? "The technician is assigned and payment is confirmed. Start the repair when ready."
                : canManageAssignment ? "Assign a technician in the section below."
                : "Check quotation approval and payment before proceeding to assignment and repair work."}
            </Text>
          </View>
        ) : null}
      </View>

      {isRejected ? <RepairRejectionNotice reason={repair.rejectionReason} /> : null}
      {isCancelled ? <RepairCancelledNotice /> : null}


      {!isRejected && (canDecide || canAssess || canQuote || canSetCompletionDate || canStart || canComplete || canMarkReceived) ? (
        <Section title="Available actions">
          {canDecide ? (
            <View className={isMobile ? "gap-3" : "flex-row gap-3"}>
              <View className="flex-1">
                <Button
                  title="Accept request"
                  loading={busy}
                  onPress={() =>
                    act(() => api.post(`/business/repairs/confirm/${id}`), "Request accepted.")
                  }
                />
              </View>
              <View className="flex-1">
                <Button title="Reject request" variant="outline" onPress={() => setRejectOpen(true)} />
              </View>
            </View>
          ) : null}
          {canMarkReceived ? (
            <Button
              title={deliveryMethod === "PICKUP" ? "Mark device collected" : "Mark device received"}
              variant="outline"
              className="mb-2"
              loading={busy}
              onPress={() =>
                act(
                  () => api.post(`/business/repairs/${id}/received`),
                  deliveryMethod === "PICKUP" ? "Device marked as collected." : "Device marked as received."
                )
              }
            />
          ) : null}
          {canAssess ? (
            <Button title="Add assessment" className="mb-2" onPress={() => setAssessOpen(true)} />
          ) : null}
          {canQuote ? (
            <Button title="Create quotation" className="mb-2" onPress={openQuote} />
          ) : null}
          {canSetCompletionDate ? (
            <Button
              title="Add estimated completion date"
              variant="outline"
              className="mb-2"
              onPress={() => setCompletionDateOpen(true)}
            />
          ) : null}
          {canStart ? (
            <Button
              title="Start repair"
              className="mb-2"
              loading={busy}
              onPress={() => act(() => api.post(`/business/repairs/${id}/start`), "Repair started.")}
            />
          ) : null}
          {canComplete ? (
            <Button
              title="Mark completed"
              loading={busy}
              onPress={() =>
                act(() => api.post(`/business/repairs/${id}/complete`), "Repair marked completed.")
              }
            />
          ) : null}
        </Section>
      ) : null}

      <Section title="Request">
        <Row label="Client" value={repair.client} />
        {/* The server sends the client's phone only for an accepted pickup or
            on-site repair, until 3 days after completion (clientPhoneFor in
            controllers/repairController.js), like a delivery app. */}
        {repair.clientPhone ? (
          <View className="my-2 rounded-xl border border-teal-100 bg-teal-50 p-3">
            <View className="flex-row flex-wrap items-center justify-between gap-2">
              <View className="flex-1" style={{ minWidth: 160 }}>
                <Text className="text-xs font-semibold text-teal-900">Client phone</Text>
                <Text selectable className="mt-0.5 text-base font-semibold text-gray-900">{formatPhone(repair.clientPhone)}</Text>
              </View>
              <Button
                title="Call client"
                variant="ghost"
                onPress={() => Linking.openURL(`tel:${String(repair.clientPhone).replace(/[^d+]/g, "")}`)}
              />
            </View>
            <Text className="mt-2 text-xs leading-5 text-teal-900">
              {`For coordinating this ${deliveryMethod === "ONSITE" ? "on-site visit" : "pickup and return"} only. It's hidden 3 days after the repair is completed.`}
            </Text>
          </View>
        ) : null}
        <Row label="Device" value={repair.deviceType} />
        {repair.device?.device_type ? <Row label="Device type" value={typeLabel(repair.device.device_type)} /> : null}
        {specRows(repair.device).map((spec) => (
          <Row key={spec.label} label={spec.label} value={spec.value} />
        ))}
        <Row label="Decision" value={normalizedDecision} />
        <Row label="Status" value={isRejected ? "REJECTED" : isCancelled ? "CANCELLED BY CLIENT" : normalizedStatus.replace(/_/g, " ")} />
        <Row label="Delivery" value={repair.deliveryMethod} />
        <Row label={repairLocation.label} value={repairLocation.value} />
        <Row label="Preferred date" value={formatRepairDate(repair.preferredDate)} />
        <Row label="Device received" value={repair.isReceived ? "Received" : "Not yet received"} />
        {repair.isReceived ? (
          <>
            <Row label="Received via" value={repair.receivedMethod} />
            <Row label="Received at" value={formatRepairDate(repair.receivedAt)} />
          </>
        ) : null}
        {!isRejected ? (
          <Row label="Payment" value={String(repair.paymentStatus ?? "").replace(/_/g, " ")} />
        ) : null}
      </Section>

      <Section title="Reported issue">
        <Text className="text-sm text-gray-700">
          {repair.issueDescription || "No description provided."}
        </Text>
        {repair.services?.length ? (
          <Text className="mt-3 text-sm text-primary">{repair.services.join(", ")}</Text>
        ) : null}
      </Section>

      {canAddServices ? (
        <Section title="Add services before quotation">
          {serviceOptions.filter((service) => !Number(service.selected)).length === 0 ? (
            <Text className="text-sm text-gray-500">All listed shop services are already included.</Text>
          ) : (
            serviceOptions.filter((service) => !Number(service.selected)).map((service) => {
              const selected = selectedServiceIds.includes(service.id);
              return (
                <Pressable
                  key={service.id}
                  onPress={() =>
                    setSelectedServiceIds((current) =>
                      selected
                        ? current.filter((serviceId) => serviceId !== service.id)
                        : [...current, service.id]
                    )
                  }
                  accessibilityRole="checkbox"
                  accessibilityState={{ checked: selected }}
                  className={`mb-2 flex-row items-center rounded-lg border p-3 ${
                    selected ? "border-primary bg-teal-50" : "border-gray-200 bg-white"
                  }`}
                >
                  <Text className={`mr-3 text-base ${selected ? "text-teal-800" : "text-gray-400"}`}>
                    {selected ? "✓" : "□"}
                  </Text>
                  <View className="flex-1">
                    <Text className="text-sm font-semibold text-gray-900">{service.name}</Text>
                    <Text className="text-xs text-gray-500">{service.category}</Text>
                  </View>
                  <Text className="text-sm font-bold text-price">
                    {PESO}{Number(service.base_price).toLocaleString()}
                  </Text>
                </Pressable>
              );
            })
          )}
          {selectedServiceIds.length > 0 ? (
            <Button
              title={`Add ${selectedServiceIds.length} service${selectedServiceIds.length === 1 ? "" : "s"}`}
              loading={busy}
              onPress={async () => {
                await act(
                  () => api.post(`/business/repairs/${id}/services`, { serviceIds: selectedServiceIds }),
                  "Services added. They will be included in the quotation."
                );
                setSelectedServiceIds([]);
              }}
            />
          ) : null}
        </Section>
      ) : null}

      {!isRejected && assessment ? (
        <AssessmentSection assessment={assessment} />
      ) : null}

      {!isRejected && quotation ? (
        <QuotationSection quotation={quotation} clientApproved={repair.clientApproved} viewer="shop" />
      ) : null}

      {!isRejected && !isCancelled ? <Section title="Assigned technician">
          {assignment ? (
            <View className="flex-row items-center justify-between">
              <Text className="flex-1 pr-3 text-sm text-gray-900">
                {[assignment.first_name, assignment.last_name].filter(Boolean).join(" ") ||
                  `Employee #${assignment.employee_id}`}
              </Text>
              {canManageAssignment ? (
                <Pressable onPress={() => setAssignOpen(true)} accessibilityRole="button">
                  <Text className="text-sm font-semibold text-primary">Change</Text>
                </Pressable>
              ) : null}
            </View>
          ) : (
            <Text className="text-sm text-gray-500">No technician assigned yet.</Text>
          )}
          {employees.length > 0 && canManageAssignment ? (
            <Button
              title={assignment ? "Reassign technician" : "Assign technician"}
              variant="outline"
              className="mt-3"
              onPress={() => setAssignOpen(true)}
            />
          ) : employees.length === 0 ? (
            <Button
              title="Add technicians"
              variant="outline"
              className="mt-3"
              onPress={() => router.push("/business/employees")}
            />
          ) : !assignment ? (
            <Text className="mt-2 text-xs text-gray-500">
              Assign a technician after the client has paid.
            </Text>
          ) : null}
      </Section> : null}

      {!isRejected && quotation ? (
        <Section title="Payment">
          <Row label="Status" value={String(repair.paymentStatus ?? "").replace(/_/g, " ")} />
          <Row label="Checkout link" value={repair.paymentLink ? "Generated" : "Not generated"} />

          {repair.paymentLink ? (
            <Text selectable className="mt-2 text-xs text-primary">
              {repair.paymentLink}
            </Text>
          ) : isCancelled ? null : (
            <Button
              title="Generate payment link"
              className="mt-4"
              loading={busy}
              onPress={() =>
                act(
                  () => generatePaymentLink(id),
                  "Payment link generated. The client can now pay."
                )
              }
            />
          )}
        </Section>
      ) : null}

      <View className="h-8" />

      {/* ---------- Reject ---------- */}
      <Modal
        visible={rejectOpen}
        onClose={() => setRejectOpen(false)}
        title="Reject request"
        footer={
          <Button
            title="Confirm rejection"
            loading={busy}
            disabled={!rejectReason.trim()}
            onPress={async () => {
              setRejectOpen(false);
              await act(
                () => api.post(`/business/repairs/reject/${id}`, { reason: rejectReason.trim() }),
                "Request rejected."
              );
              setRejectReason("");
            }}
          />
        }
      >
        <TextField
          label="Reason" maxLength={LIMITS.rejectionReason}
          value={rejectReason}
          onChangeText={setRejectReason}
          placeholder="Why are you rejecting this request?"
          multiline
        />
      </Modal>

      {/* ---------- Assessment ---------- */}
      <Modal
        visible={assessOpen}
        onClose={() => setAssessOpen(false)}
        title="Device assessment"
        footer={
          <Button
            title="Save assessment"
            loading={busy}
            disabled={!assessForm.deviceCondition.trim()}
            onPress={async () => {
              setAssessOpen(false);
              await act(
                () => api.post(`/business/repairs/${id}/assessment`, assessForm),
                "Assessment saved."
              );
            }}
          />
        }
      >
        <TextField
          label="Device condition" maxLength={LIMITS.assessmentField}
          value={assessForm.deviceCondition}
          onChangeText={(v) => setAssessForm((f) => ({ ...f, deviceCondition: v }))}
          placeholder="e.g. Screen cracked, frame intact"
        />
        <TextField
          label="Observed issues" maxLength={LIMITS.assessmentField}
          value={assessForm.observedIssues}
          onChangeText={(v) => setAssessForm((f) => ({ ...f, observedIssues: v }))}
          placeholder="What did you find?"
          multiline
        />
        <TextField
          label="Recommendation" maxLength={LIMITS.assessmentField}
          value={assessForm.recommendation}
          onChangeText={(v) => setAssessForm((f) => ({ ...f, recommendation: v }))}
          placeholder="Recommended course of action"
          multiline
        />
        <View className="mb-2 flex-row items-center justify-between">
          <Text className="text-sm font-medium text-gray-700">Remote assessment</Text>
          <Switch
            value={assessForm.isRemote}
            onValueChange={(v) => setAssessForm((f) => ({ ...f, isRemote: v }))}
            trackColor={{ true: COLORS.primary }}
          />
        </View>
      </Modal>

      {/* ---------- Quotation ---------- */}
      <Modal
        visible={quoteOpen}
        onClose={() => setQuoteOpen(false)}
        title="Create quotation"
        footer={
          <Button
            title="Send quotation"
            loading={busy}
            disabled={
              !quoteForm.estimatedCompletionTime.trim() ||
              parseDepositPercent(quoteForm.depositPercent) === null ||
              (quoteForm.warrantyCovered &&
                (!Number.isSafeInteger(Number(quoteForm.warrantyValue)) || Number(quoteForm.warrantyValue) < 1))
            }
            onPress={async () => {
              setQuoteOpen(false);
              const parts =
                quoteForm.isPartsNeeded && quoteForm.partName.trim()
                  ? [{ name: quoteForm.partName.trim(), cost: Number(quoteForm.partPrice) || 0 }]
                  : [];
              await act(
                () =>
                  api.post(`/business/repairs/${id}/quotation`, {
                    estimatedCompletionTime: quoteForm.estimatedCompletionTime.trim(),
                    isPartsNeeded: quoteForm.isPartsNeeded,
                    parts,
                    depositPercent: Number(quoteForm.depositPercent),
                    allowCash: shopAcceptsCash && quoteForm.allowCash,
                    warranty: quoteForm.warrantyCovered
                      ? {
                          isWarrantyCovered: true,
                          warrantyValue: Number(quoteForm.warrantyValue),
                          warrantyUnit: quoteForm.warrantyUnit,
                        }
                      : null,
                  }),
                "Quotation sent."
              );
            }}
          />
        }
      >
        <DateField
          label="Estimated completion date"
          value={quoteForm.estimatedCompletionTime}
          onChange={ (value) => setQuoteForm((form) => ({ ...form, estimatedCompletionTime: value })) }
          minDate={TODAY_DATE}
          placeholder="Choose a date"
        />
        <View className="mb-3 flex-row items-center justify-between">
          <Text className="text-sm font-medium text-gray-700">Include warranty</Text>
          <Switch
            value={quoteForm.warrantyCovered}
            onValueChange={(value) => setQuoteForm((form) => ({ ...form, warrantyCovered: value }))}
            trackColor={{ true: COLORS.primary }}
          />
        </View>
        {quoteForm.warrantyCovered ? (
          <View>
            <TextField
              label="Warranty duration" maxLength={4}
              value={quoteForm.warrantyValue}
              onChangeText={(value) => setQuoteForm((form) => ({ ...form, warrantyValue: value }))}
              placeholder="e.g. 30"
              keyboardType="numeric"
              inputMode="numeric"
            />
            <Text className="mb-2 text-sm font-medium text-gray-700">Duration unit</Text>
            <View className="mb-4 flex-row flex-wrap">
              {WARRANTY_UNITS.map((unit) => (
                <Pressable
                  key={unit}
                  onPress={() => setQuoteForm((form) => ({ ...form, warrantyUnit: unit }))}
                  accessibilityRole="radio"
                  accessibilityState={{ selected: quoteForm.warrantyUnit === unit }}
                  className={`mb-2 mr-2 rounded-md border px-3 py-2 ${
                    quoteForm.warrantyUnit === unit
                      ? "border-primary bg-teal-50"
                      : "border-gray-300 bg-white"
                  }`}
                >
                  <Text className="text-xs font-semibold text-gray-700">{unit}</Text>
                </Pressable>
              ))}
            </View>
          </View>
        ) : null}
        <View className="mb-4 flex-row items-center justify-between">
          <Text className="text-sm font-medium text-gray-700">Parts needed</Text>
          <Switch
            value={quoteForm.isPartsNeeded}
            onValueChange={(v) => setQuoteForm((f) => ({ ...f, isPartsNeeded: v }))}
            trackColor={{ true: COLORS.primary }}
          />
        </View>
        {quoteForm.isPartsNeeded ? (
          <View>
            <TextField
              label="Part name" maxLength={LIMITS.partName}
              value={quoteForm.partName}
              onChangeText={(v) => setQuoteForm((f) => ({ ...f, partName: v }))}
              placeholder="e.g. OLED panel"
            />
            <TextField
              label="Part price" maxLength={10}
              value={quoteForm.partPrice}
              onChangeText={(v) => setQuoteForm((f) => ({ ...f, partPrice: v }))}
              placeholder="0"
              keyboardType="numeric"
              inputMode="numeric"
            />
          </View>
        ) : null}

        <View className="mt-2 border-t border-gray-100 pt-4">
          <Text className="mb-1 text-sm font-semibold text-gray-900">Payment for this job</Text>
          <Text className="mb-3 text-xs leading-5 text-gray-500">
            Starts from your Shop profile defaults. Once the client approves, the quotation can&apos;t be changed.
          </Text>
          <PaymentTermsFields
            value={{ depositPercent: quoteForm.depositPercent, acceptsCash: quoteForm.allowCash }}
            onChange={(next) =>
              setQuoteForm((f) => ({ ...f, depositPercent: next.depositPercent, allowCash: next.acceptsCash }))
            }
            cashAvailable={shopAcceptsCash}
            cashLabel="Allow cash for the balance"
          />
          {!shopAcceptsCash ? (
            <Text className="text-xs text-gray-500">Your shop takes online payment only. Change this in Shop profile.</Text>
          ) : null}
        </View>
      </Modal>

      <Modal
        visible={completionDateOpen}
        onClose={() => setCompletionDateOpen(false)}
        title="Estimated completion date"
        footer={
          <Button
            title="Save date"
            loading={busy}
            disabled={!completionDate}
            onPress={async () => {
              await act(
                () => api.put(`/business/repairs/${id}/quotation/completion`, {
                  estimatedCompletionTime: completionDate,
                }),
                "Estimated completion date saved."
              );
              setCompletionDateOpen(false);
              setCompletionDate("");
            }}
          />
        }
      >
        <DateField
          label="Estimated completion date"
          value={completionDate}
          onChange={setCompletionDate}
          minDate={TODAY_DATE}
          placeholder="Choose a date"
        />
      </Modal>

      <Modal
        visible={assignOpen}
        onClose={() => setAssignOpen(false)}
        title={assignment ? "Change technician" : "Assign technician"}
      >
        {employees.map((emp) => (
          <Pressable
            key={emp.id}
            disabled={busy}
            onPress={() => {
              setAssignOpen(false);
              void act(
                () => api.post(`/business/repairs/${id}/assign`, { employeeId: emp.id }),
                assignment ? "Technician changed." : "Technician assigned."
              );
            }}
            className="mb-2 flex-row items-center justify-between rounded-lg border border-gray-200 px-3 py-3 active:bg-gray-50"
          >
            <View>
              <Text className="text-sm font-semibold text-gray-900">
                {emp.first_name} {emp.last_name}
              </Text>
              <Text className="text-xs text-gray-500">{emp.role}</Text>
            </View>
            {Number(assignment?.employee_id) === Number(emp.id) ? (
              <Text className="text-xs font-semibold text-teal-800">Assigned</Text>
            ) : null}
          </Pressable>
        ))}
      </Modal>
    </ScrollView>
  );
}
