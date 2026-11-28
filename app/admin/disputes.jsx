// Admin · Disputes: decide disputes the client and shop couldn't settle
// (AGENTS.md business rule 7).
//
// GET  /api/admin/disputes?view=NEEDS_ADMIN|IN_PROGRESS|RESOLVED|ALL&q=&limit=&offset=
// GET  /api/admin/disputes/:id
// POST /api/admin/disputes/:id/decide { outcome: REFUND|RESERVICE|DECLINE, note }
//
// An admin is needed when the client declined the shop's offer, or the shop
// didn't reply within 2 days. A decision records the outcome; it doesn't move
// money (refunds through the payment provider aren't built yet).
import { useState } from "react";
import { LIMITS } from "../../lib/inputLimits";
import { ActivityIndicator, FlatList, Pressable, Text, View } from "react-native";

import Button from "../../components/Button";
import TextField from "../../components/TextField";
import Modal from "../../components/Modal";
import {
  AdminCard,
  AdminDetail,
  AdminEmpty,
  AdminNotice,
  AdminPageHeader,
  AdminPill,
  AdminTabs,
  adminDate,
  adminMoney,
} from "../../components/AdminUI";
import api from "../../lib/api";
import { useFetch } from "../../lib/useFetch";
import { usePagedFetch, useDebouncedValue } from "../../lib/usePagedFetch";
import { useResponsive } from "../../lib/useResponsive";
import { formatPhone } from "../../lib/phone";
import { waitingFor } from "../../lib/adminSummary";
import { quotationTermsText } from "../../lib/paymentTerms";
import { COLORS } from "../../constants/theme";

const TABS = [
  { key: "NEEDS_ADMIN", label: "Needs decision" },
  { key: "IN_PROGRESS", label: "Shop and client settling" },
  { key: "RESOLVED", label: "Resolved" },
  { key: "ALL", label: "All" },
];
const STATUS = {
  OPEN: ["Waiting for the shop", "amber"],
  SHOP_PROPOSED: ["Shop made an offer", "blue"],
  REJECTED: ["Client declined the offer", "red"],
  RESOLVED: ["Resolved", "green"],
};
const REASON = {
  DECLINED: "The client declined the shop's offer.",
  NO_REPLY: "The shop didn't reply within 2 days.",
};
const RESOLUTION = { REFUND: "Refund", RESERVICE: "Re-service" };
const AUTHOR = { CLIENT: "Client", BUSINESS: "Shop", ADMIN: "PixelPatch" };
const OUTCOMES = [
  { key: "REFUND", label: "Refund", hint: "The client gets their money back." },
  { key: "RESERVICE", label: "Re-service", hint: "The shop repairs the device again at no cost." },
  { key: "DECLINE", label: "Decline complaint", hint: "No action: the repair was done as agreed." },
];

function DisputeRow({ dispute, onPress }) {
  const [label, tone] = STATUS[dispute.status] ?? [dispute.status, "gray"];
  const needs = Boolean(dispute.needs_admin_reason);
  return (
    <AdminCard onPress={onPress} highlight={needs} accessibilityLabel={`Dispute ${dispute.id}, ${dispute.shop_name}, ${label}`}>
      <View className="flex-row flex-wrap items-center gap-2">
        <Text className="text-base font-bold text-gray-900">Dispute #{dispute.id}</Text>
        <AdminPill label={label} tone={tone} />
        {dispute.status === "RESOLVED" ? (
          <AdminPill label={RESOLUTION[dispute.proposed_resolution] ?? "Complaint declined"} tone="gray" />
        ) : null}
      </View>
      <Text className="mt-1 text-sm text-gray-700" numberOfLines={1}>
        {dispute.shop_name} · {dispute.client_name} · Repair #{dispute.request_id}
      </Text>
      {dispute.complaint ? (
        <Text className="mt-1 text-sm italic text-gray-600" numberOfLines={2}>&ldquo;{dispute.complaint}&rdquo;</Text>
      ) : null}
      <Text className="mt-1 text-xs text-gray-500">
        Opened {adminDate(dispute.created_at, { time: false })} ({waitingFor(dispute.created_at)} ago)
        {needs ? ` · ${REASON[dispute.needs_admin_reason]}` : ""}
      </Text>
    </AdminCard>
  );
}

function DisputeDetail({ disputeId, onDecided, onClose }) {
  const { data, error, loading } = useFetch(`/admin/disputes/${disputeId}`);
  const [outcome, setOutcome] = useState(null);
  const [note, setNote] = useState("");
  const [errors, setErrors] = useState({});
  const [busy, setBusy] = useState(false);

  const d = data?.dispute;
  const canDecide = Boolean(d?.needs_admin_reason);
  // Online money is held by PixelPatch and can be refunded through it; cash
  // went straight to the shop (AGENTS.md "Payment terms").
  const paid = (data?.payments ?? []).filter((p) => p.status === "PAID");
  const paidOnline = paid.filter((p) => p.gateway !== "CASH").reduce((sum, p) => sum + Number(p.amount || 0), 0);
  const paidCash = paid.filter((p) => p.gateway === "CASH").reduce((sum, p) => sum + Number(p.amount || 0), 0);

  const decide = async () => {
    const e = {};
    if (!outcome) e.outcome = "Choose a decision.";
    if (note.trim().length < 10) e.note = "Explain the decision to the client and shop (at least 10 characters).";
    setErrors(e);
    if (Object.keys(e).length) return;
    setBusy(true);
    try {
      await api.post(`/admin/disputes/${disputeId}/decide`, { outcome, note: note.trim() });
      onDecided(`Dispute #${disputeId} is resolved: ${OUTCOMES.find((o) => o.key === outcome).label.toLowerCase()}.`);
    } catch (err) {
      const field = err.response?.data?.field;
      setErrors(field ? { [field]: err.message } : { form: err.message || "Couldn't save the decision." });
    } finally {
      setBusy(false);
    }
  };

  return (
    <Modal
      visible
      onClose={busy ? () => {} : onClose}
      title={`Dispute #${disputeId}`}
      footer={
        canDecide ? (
          <Button title="Save decision" loading={busy} onPress={decide} />
        ) : (
          <Button title="Close" variant="outline" onPress={onClose} />
        )
      }
    >
      {loading ? (
        <ActivityIndicator color={COLORS.primary} />
      ) : error ? (
        <Text className="text-sm text-red-600">{error}</Text>
      ) : d ? (
        <View>
          <View className="mb-3 flex-row flex-wrap gap-2">
            <AdminPill label={(STATUS[d.status] ?? [d.status])[0]} tone={(STATUS[d.status] ?? [null, "gray"])[1]} />
            {d.status === "RESOLVED" ? (
              <AdminPill label={RESOLUTION[d.proposed_resolution] ?? "Complaint declined"} tone="gray" />
            ) : null}
          </View>
          {canDecide ? (
            <Text className="mb-4 rounded-lg bg-amber-50 p-3 text-sm text-amber-900">{REASON[d.needs_admin_reason]}</Text>
          ) : null}

          <AdminDetail icon="person-outline" label="Client">
            {d.client_name} · {d.client_email}
            {d.client_phone ? ` · ${formatPhone(d.client_phone)}` : ""}
          </AdminDetail>
          <AdminDetail icon="storefront-outline" label="Shop">
            {d.shop_name} · {formatPhone(d.shop_phone)} · {d.shop_email}
          </AdminDetail>
          <AdminDetail icon="construct-outline" label={`Repair #${d.request_id}`}>
            {[d.device_brand, d.device_model].filter(Boolean).join(" ") || d.device_name || "Device"} · {d.issue_description}
            {d.completed_at ? `\nCompleted ${adminDate(d.completed_at)}` : ""}
          </AdminDetail>
          <AdminDetail icon="card-outline" label="Money">
            {d.estimated_cost !== null && d.estimated_cost !== undefined ? `Quoted ${adminMoney(d.estimated_cost)}. ` : ""}
            {paidOnline > 0 ? `Paid online ${adminMoney(paidOnline)}.` : "Nothing paid online."}
            {paidCash > 0 ? ` Paid in cash to the shop ${adminMoney(paidCash)}.` : ""}
            {d.estimated_cost !== null && d.estimated_cost !== undefined ? `\n${quotationTermsText(d)}` : ""}
          </AdminDetail>

          <Text className="mb-2 mt-1 text-xs font-semibold uppercase text-gray-400">History</Text>
          {data.history.length ? (
            data.history.map((entry) => (
              <View
                key={entry.id}
                className={`mb-2 rounded-xl border p-3 ${
                  entry.edited_by === "ADMIN" ? "border-sky-200 bg-sky-50" : entry.edited_by === "BUSINESS" ? "border-teal-100 bg-teal-50" : "border-gray-100 bg-gray-50"
                }`}
              >
                <Text className="text-xs font-semibold text-gray-700">
                  {AUTHOR[entry.edited_by] ?? entry.edited_by} · {adminDate(entry.created_at)}
                </Text>
                <Text className="mt-1 text-sm leading-5 text-gray-800">{entry.content}</Text>
              </View>
            ))
          ) : (
            <Text className="mb-3 text-sm text-gray-500">No messages recorded.</Text>
          )}
          {d.proposed_resolution && d.status !== "RESOLVED" ? (
            <Text className="mb-3 text-sm text-gray-700">Shop&apos;s offer: {RESOLUTION[d.proposed_resolution]}</Text>
          ) : null}

          {canDecide ? (
            <View className="mt-3 border-t border-gray-100 pt-4">
              <Text className="mb-2 text-sm font-semibold text-gray-900">Your decision</Text>
              {OUTCOMES.map((o) => {
                const on = outcome === o.key;
                return (
                  <Pressable
                    key={o.key}
                    onPress={() => { setOutcome(o.key); setErrors((p) => ({ ...p, outcome: undefined })); }}
                    accessibilityRole="radio"
                    accessibilityState={{ selected: on }}
                    className={`mb-2 min-h-12 rounded-lg border px-3 py-2.5 ${
                      on ? "border-primary bg-teal-50" : errors.outcome ? "border-red-500 bg-white" : "border-gray-200 bg-white"
                    }`}
                  >
                    <Text className="text-sm font-semibold text-gray-900">{o.label}</Text>
                    <Text className="text-xs text-gray-500">{o.hint}</Text>
                  </Pressable>
                );
              })}
              {errors.outcome ? <Text className="mb-2 text-sm text-red-600">{errors.outcome}</Text> : null}
              {outcome === "REFUND" ? (
                <Text className="mb-3 rounded-lg bg-gray-50 p-3 text-xs leading-5 text-gray-600">
                  This records the decision only. PixelPatch can&apos;t send refunds through the payment provider yet, so
                  arrange the refund separately{paidOnline > 0 ? "" : " (nothing was paid online, so the shop refunds the client directly)"}.
                  {paidCash > 0 ? ` The ${adminMoney(paidCash)} paid in cash can only be refunded by the shop.` : ""}
                </Text>
              ) : null}
              <TextField
                label="Explanation (the client and shop both see this)"
                value={note}
                onChangeText={(v) => { setNote(v); setErrors((p) => ({ ...p, note: undefined })); }}
                error={errors.note}
                placeholder="What you decided and why."
                multiline
                numberOfLines={4}
                maxLength={1000}
                style={{ minHeight: 96, textAlignVertical: "top" }}
                editable={!busy}
              />
              {errors.form ? <Text accessibilityRole="alert" className="rounded-lg bg-red-50 p-3 text-sm text-red-700">{errors.form}</Text> : null}
            </View>
          ) : null}
        </View>
      ) : null}
    </Modal>
  );
}

export default function AdminDisputes() {
  const { horizontalPadding } = useResponsive();
  const [view, setView] = useState("NEEDS_ADMIN");
  const [query, setQuery] = useState("");
  const q = useDebouncedValue(query.trim());
  const [version, setVersion] = useState(0);
  const list = usePagedFetch("/admin/disputes", { view, q }, { listKey: "disputes", pageSize: 30, version });
  const [selected, setSelected] = useState(null);
  const [message, setMessage] = useState(null);

  const header = (
    <View>
      <AdminPageHeader
        title="Disputes"
        description="Step in when a client and shop can't settle a dispute: the client declined the shop's offer, or the shop didn't reply within 2 days."
      />
      <AdminTabs tabs={TABS} value={view} onChange={setView} counts={list.extra?.counts ?? {}} />
      <TextField label="Search" maxLength={LIMITS.search} value={query} onChangeText={setQuery} placeholder="Dispute #, repair #, shop or client" autoCapitalize="none" />
      <AdminNotice message={message} onDismiss={() => setMessage(null)} />
      {list.error ? <Text className="mb-4 text-sm text-red-600">{list.error}</Text> : null}
    </View>
  );

  return (
    <View className="flex-1 bg-gray-50">
      <FlatList
        data={list.items}
        keyExtractor={(item) => String(item.id)}
        contentContainerStyle={{ padding: horizontalPadding, paddingBottom: 40, maxWidth: 1000, width: "100%", alignSelf: "center" }}
        ListHeaderComponent={header}
        renderItem={({ item }) => <DisputeRow dispute={item} onPress={() => setSelected(item.id)} />}
        ListEmptyComponent={
          list.loading ? (
            <ActivityIndicator color={COLORS.primary} />
          ) : (
            <AdminEmpty icon="alert-circle-outline" text={view === "NEEDS_ADMIN" ? "No disputes need a decision." : "No disputes match."} />
          )
        }
        onEndReached={list.loadMore}
        onEndReachedThreshold={0.4}
        ListFooterComponent={list.loadingMore ? <ActivityIndicator color={COLORS.primary} /> : null}
      />
      {selected ? (
        <DisputeDetail
          key={selected}
          disputeId={selected}
          onClose={() => setSelected(null)}
          onDecided={(text) => {
            setSelected(null);
            setMessage(text);
            setVersion((v) => v + 1);
          }}
        />
      ) : null}
    </View>
  );
}
