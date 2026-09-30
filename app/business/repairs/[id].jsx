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
import { Stack, useLocalSearchParams } from "expo-router";

import Button from "../../../components/Button";
import TextField from "../../../components/TextField";
import Modal from "../../../components/Modal";
import api from "../../../lib/api";
import { generatePaymentLink } from "../../../lib/payments";
import { COLORS } from "../../../constants/theme";

const PESO = "₱";

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

export default function BusinessRepairDetail() {
  const { id } = useLocalSearchParams();

  const [repair, setRepair] = useState(null);
  const [assessment, setAssessment] = useState(null);
  const [quotation, setQuotation] = useState(null);
  const [employees, setEmployees] = useState([]);
  const [assignment, setAssignment] = useState(null);

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState(null);
  const [busy, setBusy] = useState(false);

  const [rejectOpen, setRejectOpen] = useState(false);
  const [assessOpen, setAssessOpen] = useState(false);
  const [quoteOpen, setQuoteOpen] = useState(false);

  const [rejectReason, setRejectReason] = useState("");
  const [assessForm, setAssessForm] = useState({
    deviceCondition: "",
    observedIssues: "",
    recommendation: "",
    isRemote: false,
  });
  const [quoteForm, setQuoteForm] = useState({
    estimatedCompletionTime: "",
    warranty: "",
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
        const [a, q, emp, asg] = await Promise.all([
          api.get(`/business/repairs/${id}/assessment`).catch(() => null),
          api.get(`/business/repairs/${id}/quotation`).catch(() => null),
          api.get("/business/employees").catch(() => null),
          api.get(`/business/repairs/${id}/assignment`).catch(() => null),
        ]);

        setAssessment(a?.data?.assessment ?? null);
        setQuotation(q?.data?.quotation ?? null);
        setEmployees(emp?.data?.employees ?? []);
        setAssignment(asg?.data?.assignment ?? null);
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

  const canDecide = decision === "pending";
  const canAssess = decision === "accepted" && !assessment;
  const canQuote = decision === "accepted" && Boolean(assessment) && !quotation;
  const canStart =
    decision === "accepted" &&
    Boolean(quotation) &&
    !["in_progress", "done", "completed"].includes(status);
  const canComplete = status === "in_progress";

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
        <Row label="Decision" value={decision} />
        <Row label="Status" value={String(status ?? "").replace(/_/g, " ")} />
        <Row label="Delivery" value={repair.deliveryMethod} />
        <Row label="Preferred date" value={repair.preferredDate} />
        <Row label="Pickup" value={repair.pickupAddress} />
        <Row label="Payment" value={String(repair.paymentStatus ?? "").replace(/_/g, " ")} />
      </Section>

      <Section title="Reported issue">
        <Text className="text-sm text-gray-700">
          {repair.issueDescription || "No description provided."}
        </Text>
        {repair.services?.length ? (
          <Text className="mt-3 text-sm text-blue-600">{repair.services.join(", ")}</Text>
        ) : null}
      </Section>

      {repair.rejectionReason ? (
        <Section title="Rejection reason">
          <Text className="text-sm text-red-700">{repair.rejectionReason}</Text>
        </Section>
      ) : null}

      {assessment ? (
        <Section title="Assessment">
          <Row label="Condition" value={assessment.device_condition} />
          <Row label="Observed issues" value={assessment.observed_issues} />
          <Row label="Recommendation" value={assessment.recommendation} />
        </Section>
      ) : null}

      {quotation ? (
        <Section title="Quotation">
          <Row label="Completion" value={quotation.estimated_completion_time} />
          <Row label="Warranty" value={quotation.warranty} />
          <Row
            label="Total"
            value={quotation.total_amount ? `${PESO}${quotation.total_amount}` : null}
          />
        </Section>
      ) : null}

      {employees.length > 0 ? (
        <Section title="Assigned technician">
          {assignment ? (
            <Text className="text-sm text-gray-900">
              {[assignment.first_name, assignment.last_name].filter(Boolean).join(" ") ||
                `Employee #${assignment.employee_id}`}
            </Text>
          ) : (
            <View>
              <Text className="mb-3 text-sm text-gray-500">Not assigned yet.</Text>
              {employees.map((emp) => (
                <Pressable
                  key={emp.id}
                  disabled={busy}
                  onPress={() =>
                    act(
                      () => api.post(`/business/repairs/${id}/assign`, { employeeId: emp.id }),
                      "Technician assigned."
                    )
                  }
                  className="mb-2 flex-row items-center justify-between rounded-lg border border-gray-200 px-3 py-2.5 active:bg-gray-50"
                >
                  <Text className="text-sm text-gray-900">
                    {emp.first_name} {emp.last_name}
                  </Text>
                  <Text className="text-xs text-blue-600">{emp.role} - Assign</Text>
                </Pressable>
              ))}
            </View>
          )}
        </Section>
      ) : null}

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

      {canDecide ? (
        <View className="mb-3 flex-row gap-3">
          <View className="flex-1">
            <Button
              title="Accept"
              loading={busy}
              onPress={() =>
                act(() => api.post(`/business/repairs/confirm/${id}`), "Request accepted.")
              }
            />
          </View>
          <View className="flex-1">
            <Button title="Reject" variant="outline" onPress={() => setRejectOpen(true)} />
          </View>
        </View>
      ) : null}

      {canAssess ? (
        <Button title="Add assessment" className="mb-3" onPress={() => setAssessOpen(true)} />
      ) : null}

      {canQuote ? (
        <Button title="Create quotation" className="mb-3" onPress={() => setQuoteOpen(true)} />
      ) : null}

      {canStart ? (
        <Button
          title="Start repair"
          className="mb-3"
          loading={busy}
          onPress={() => act(() => api.post(`/business/repairs/${id}/start`), "Repair started.")}
        />
      ) : null}

      {canComplete ? (
        <Button
          title="Mark completed"
          className="mb-3"
          loading={busy}
          onPress={() =>
            act(() => api.post(`/business/repairs/${id}/complete`), "Repair marked completed.")
          }
        />
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
            disabled={!quoteForm.estimatedCompletionTime.trim()}
            onPress={async () => {
              setQuoteOpen(false);
              const parts =
                quoteForm.isPartsNeeded && quoteForm.partName.trim()
                  ? [{ name: quoteForm.partName.trim(), price: Number(quoteForm.partPrice) || 0 }]
                  : [];
              await act(
                () =>
                  api.post(`/business/repairs/${id}/quotation`, {
                    estimatedCompletionTime: quoteForm.estimatedCompletionTime.trim(),
                    isPartsNeeded: quoteForm.isPartsNeeded,
                    parts,
                    warranty: quoteForm.warranty.trim(),
                  }),
                "Quotation sent."
              );
            }}
          />
        }
      >
        <TextField
          label="Estimated completion"
          value={quoteForm.estimatedCompletionTime}
          onChangeText={(v) => setQuoteForm((f) => ({ ...f, estimatedCompletionTime: v }))}
          placeholder="e.g. 3 days"
        />
        <TextField
          label="Warranty"
          value={quoteForm.warranty}
          onChangeText={(v) => setQuoteForm((f) => ({ ...f, warranty: v }))}
          placeholder="e.g. 30 days"
        />
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
    </ScrollView>
  );
}
