// app/(business)/repairs/[id].jsx
// Consolidates the legacy per-status pages (RepairPending, RepairAwaitingAssessment,
// RepairAssessmentNoQuotation, RepairInProgress, RepairDone, RepairCompleted,
// RepairRejected) into one screen that shows only the actions valid right now.
import { useCallback, useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Platform,
  Pressable,
  RefreshControl,
  ScrollView,
  Switch,
  Text,
  View,
} from "react-native";
import { Stack, useLocalSearchParams, useRouter } from "expo-router";

import Button from "../../../components/Button";
import TextField from "../../../components/TextField";
import DateField, { toDateString } from "../../../components/DateField";
import Modal from "../../../components/Modal";
import {
  AssessmentSection,
  formatRepairDate,
  isValidRepairDate,
  QuotationSection,
  RepairRow as Row,
  RepairSection as Section,
} from "../../../components/RepairSummary";
import api from "../../../lib/api";
import { generatePaymentLink } from "../../../lib/payments";
import { COLORS } from "../../../constants/theme";

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
  });

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
  const paymentStatus = String(repair.paymentStatus ?? "").toUpperCase();

  const canDecide = normalizedDecision === "PENDING";
  const canAssess = normalizedDecision === "ACCEPTED" && !assessment;
  const canQuote = normalizedDecision === "ACCEPTED" && Boolean(assessment) && !quotation;
  const canSetCompletionDate =
    normalizedDecision === "ACCEPTED" &&
    Boolean(quotation) &&
    !isValidRepairDate(quotation.estimated_completion_date) &&
    paymentStatus === "PENDING";
  const canAddServices =
    normalizedDecision === "ACCEPTED" && !quotation && paymentStatus === "PENDING";
  const canStart =
    normalizedDecision === "ACCEPTED" &&
    Boolean(quotation) &&
    paymentStatus === "PAID" &&
    Boolean(assignment) &&
    !["IN_PROGRESS", "COMPLETED"].includes(normalizedStatus);
  const canComplete = normalizedStatus === "IN_PROGRESS";
  const canManageAssignment =
    normalizedDecision === "ACCEPTED" &&
    paymentStatus === "PAID" &&
    !["IN_PROGRESS", "COMPLETED"].includes(normalizedStatus);

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
      <Stack.Screen options={{ title: `Repair #${id}` }} />

      <Section title="Request">
        <Row label="Client" value={repair.client} />
        <Row label="Device" value={repair.deviceType} />
        <Row label="Decision" value={normalizedDecision} />
        <Row label="Status" value={normalizedStatus.replace(/_/g, " ")} />
        <Row label="Delivery" value={repair.deliveryMethod} />
        <Row label="Preferred date" value={formatRepairDate(repair.preferredDate)} />
        <Row label="Pickup address" value={repair.pickupAddress} />
        <Row label="Device received" value={repair.isReceived ? "Received" : "Not yet received"} />
        {repair.isReceived ? (
          <>
            <Row label="Received via" value={repair.receivedMethod} />
            <Row label="Received at" value={formatRepairDate(repair.receivedAt)} />
          </>
        ) : null}
        <Row label="Payment" value={String(repair.paymentStatus ?? "").replace(/_/g, " ")} />
      </Section>

      {canDecide || canAssess || canQuote || canSetCompletionDate || canStart || canComplete ? (
        <Section title="Available actions">
          {canDecide ? (
            <View className="flex-row gap-3">
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
          {canAssess ? (
            <Button title="Add assessment" className="mb-2" onPress={() => setAssessOpen(true)} />
          ) : null}
          {canQuote ? (
            <Button title="Create quotation" className="mb-2" onPress={() => setQuoteOpen(true)} />
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

      <Section title="Reported issue">
        <Text className="text-sm text-gray-700">
          {repair.issueDescription || "No description provided."}
        </Text>
        {repair.services?.length ? (
          <Text className="mt-3 text-sm text-blue-600">{repair.services.join(", ")}</Text>
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
                    selected ? "border-blue-600 bg-blue-50" : "border-gray-200 bg-white"
                  }`}
                >
                  <Text className={`mr-3 text-base ${selected ? "text-blue-700" : "text-gray-400"}`}>
                    {selected ? "✓" : "□"}
                  </Text>
                  <View className="flex-1">
                    <Text className="text-sm font-semibold text-gray-900">{service.name}</Text>
                    <Text className="text-xs text-gray-500">{service.category}</Text>
                  </View>
                  <Text className="text-sm font-bold text-blue-600">
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

      {repair.rejectionReason ? (
        <Section title="Rejection reason">
          <Text className="text-sm text-red-700">{repair.rejectionReason}</Text>
        </Section>
      ) : null}

      {assessment ? (
        <AssessmentSection assessment={assessment} />
      ) : null}

      {quotation ? (
        <QuotationSection quotation={quotation} />
      ) : null}

      <Section title="Assigned technician">
          {assignment ? (
            <View className="flex-row items-center justify-between">
              <Text className="flex-1 pr-3 text-sm text-gray-900">
                {[assignment.first_name, assignment.last_name].filter(Boolean).join(" ") ||
                  `Employee #${assignment.employee_id}`}
              </Text>
              {canManageAssignment ? (
                <Pressable onPress={() => setAssignOpen(true)} accessibilityRole="button">
                  <Text className="text-sm font-semibold text-blue-600">Change</Text>
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
      </Section>

      {quotation ? (
        <Section title="Payment">
          <Row label="Status" value={String(repair.paymentStatus ?? "").replace(/_/g, " ")} />
          <Row label="Checkout link" value={repair.paymentLink ? "Generated" : "Not generated"} />

          {repair.paymentLink ? (
            <Text selectable className="mt-2 text-xs text-blue-600">
              {repair.paymentLink}
            </Text>
          ) : (
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
          label="Reason"
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
          label="Device condition"
          value={assessForm.deviceCondition}
          onChangeText={(v) => setAssessForm((f) => ({ ...f, deviceCondition: v }))}
          placeholder="e.g. Screen cracked, frame intact"
        />
        <TextField
          label="Observed issues"
          value={assessForm.observedIssues}
          onChangeText={(v) => setAssessForm((f) => ({ ...f, observedIssues: v }))}
          placeholder="What did you find?"
          multiline
        />
        <TextField
          label="Recommendation"
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
              label="Warranty duration"
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
                      ? "border-blue-600 bg-blue-50"
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
              label="Part name"
              value={quoteForm.partName}
              onChangeText={(v) => setQuoteForm((f) => ({ ...f, partName: v }))}
              placeholder="e.g. OLED panel"
            />
            <TextField
              label="Part price"
              value={quoteForm.partPrice}
              onChangeText={(v) => setQuoteForm((f) => ({ ...f, partPrice: v }))}
              placeholder="0"
              keyboardType="numeric"
              inputMode="numeric"
            />
          </View>
        ) : null}
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
              <Text className="text-xs font-semibold text-blue-700">Assigned</Text>
            ) : null}
          </Pressable>
        ))}
      </Modal>
    </ScrollView>
  );
}
