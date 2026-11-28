// Admin · Warranty claims: decide claims a client asked PixelPatch to review
// (AGENTS.md business rule 9).
//
// GET  /api/admin/warranty-claims?view=NEEDS_ADMIN|WITH_SHOP|SETTLED|ALL&q=&limit=&offset=
// GET  /api/admin/warranty-claims/:id
// POST /api/admin/warranty-claims/:id/decide { outcome: REPAIR|DECLINE, note }
//
// A client escalates after the shop declines, or after 2 days without an
// answer. Ordering the repair creates the warranty repair, as if the shop had
// accepted; declining closes the claim.
import { useState } from "react";
import { ActivityIndicator, FlatList, Image, Pressable, Text, View } from "react-native";

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
} from "../../components/AdminUI";
import api, { mediaUrl } from "../../lib/api";
import { LIMITS } from "../../lib/inputLimits";
import { useFetch } from "../../lib/useFetch";
import { usePagedFetch, useDebouncedValue } from "../../lib/usePagedFetch";
import { useResponsive } from "../../lib/useResponsive";
import { waitingFor } from "../../lib/adminSummary";
import { COVERAGE_LABELS, lengthLabel } from "../../lib/warranty";
import { COLORS } from "../../constants/theme";

const TABS = [
  { key: "NEEDS_ADMIN", label: "Needs decision" },
  { key: "WITH_SHOP", label: "With the shop" },
  { key: "SETTLED", label: "Settled" },
  { key: "ALL", label: "All" },
];
const STATUS = {
  OPEN: ["Waiting for the shop", "amber"],
  DECLINED: ["Shop declined", "red"],
  ESCALATED: ["Client asked PixelPatch", "blue"],
  ACCEPTED: ["Warranty repair created", "green"],
  CLOSED: ["Declined by PixelPatch", "gray"],
};
const DELIVERY = { PICKUP: "Pickup", DROPOFF: "Drop-off", ONSITE: "On-site" };
const OUTCOMES = [
  { key: "REPAIR", label: "Order the warranty repair", hint: "A warranty repair is created for the shop, as if it had accepted. Covered work is free." },
  { key: "DECLINE", label: "Decline the claim", hint: "The warranty doesn't cover this. The claim is closed." },
];

function ClaimRow({ claim, onPress }) {
  const [label, tone] = STATUS[claim.status] ?? [claim.status, "gray"];
  const needs = claim.status === "ESCALATED";
  return (
    <AdminCard onPress={onPress} highlight={needs} accessibilityLabel={`Warranty claim ${claim.id}, ${claim.shop_name}, ${label}`}>
      <View className="flex-row flex-wrap items-center gap-2">
        <Text className="text-base font-bold text-gray-900">Warranty claim #{claim.id}</Text>
        <AdminPill label={label} tone={tone} />
      </View>
      <Text className="mt-1 text-sm text-gray-700" numberOfLines={1}>
        {claim.shop_name} · {claim.client_name} · Repair #{claim.request_id}
      </Text>
      <Text className="mt-1 text-sm italic text-gray-600" numberOfLines={2}>&ldquo;{claim.problem}&rdquo;</Text>
      <Text className="mt-1 text-xs text-gray-500">
        {needs && claim.escalated_at
          ? `Sent to PixelPatch ${adminDate(claim.escalated_at, { time: false })} (${waitingFor(claim.escalated_at)} ago)`
          : `Opened ${adminDate(claim.created_at, { time: false })}`}
      </Text>
    </AdminCard>
  );
}

function ClaimDetail({ claimId, onDecided, onClose }) {
  const { data, error, loading } = useFetch(`/admin/warranty-claims/${claimId}`);
  const [outcome, setOutcome] = useState(null);
  const [note, setNote] = useState("");
  const [errors, setErrors] = useState({});
  const [busy, setBusy] = useState(false);

  const c = data?.claim;
  const canDecide = c?.status === "ESCALATED";

  const decide = async () => {
    const e = {};
    if (!outcome) e.outcome = "Choose a decision.";
    if (note.trim().length < 10) e.note = "Explain the decision to the client and shop (at least 10 characters).";
    setErrors(e);
    if (Object.keys(e).length) return;
    setBusy(true);
    try {
      const { data: result } = await api.post(`/admin/warranty-claims/${claimId}/decide`, { outcome, note: note.trim() });
      onDecided(
        outcome === "REPAIR"
          ? `Claim #${claimId}: warranty repair #${result?.linked_request_id} created for the shop.`
          : `Claim #${claimId} declined.`
      );
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
      title={`Warranty claim #${claimId}`}
      footer={canDecide ? <Button title="Save decision" loading={busy} onPress={decide} /> : <Button title="Close" variant="outline" onPress={onClose} />}
    >
      {loading ? (
        <ActivityIndicator color={COLORS.primary} />
      ) : error ? (
        <Text className="text-sm text-red-600">{error}</Text>
      ) : c ? (
        <View>
          <View className="mb-3 flex-row flex-wrap gap-2">
            <AdminPill label={(STATUS[c.status] ?? [c.status])[0]} tone={(STATUS[c.status] ?? [null, "gray"])[1]} />
          </View>

          <AdminDetail icon="person-outline" label="Client">{c.client_name}</AdminDetail>
          <AdminDetail icon="storefront-outline" label="Shop">{c.shop_name}</AdminDetail>
          <AdminDetail icon="construct-outline" label={`Original repair #${c.request_id}`}>
            {[c.device_brand, c.device_model].filter(Boolean).join(" ") || c.device_name || "Device"} · {c.issue_description}
            {c.completed_at ? `\nCompleted ${adminDate(c.completed_at)}` : ""}
          </AdminDetail>
          <AdminDetail icon="shield-checkmark-outline" label="Warranty">
            {c.warranty_value
              ? `${lengthLabel(c.warranty_value, c.warranty_unit)}, ${String(COVERAGE_LABELS[c.coverage || "BOTH"]).toLowerCase()}${c.exclusions ? `\nNot covered: ${c.exclusions}` : ""}`
              : "No warranty on file"}
          </AdminDetail>
          <AdminDetail icon="alert-circle-outline" label="The client's problem">
            {c.problem}
            {`\n${DELIVERY[c.delivery_method] ?? c.delivery_method} · preferred ${adminDate(c.preferred_date, { time: false })} · sent ${adminDate(c.created_at)}`}
          </AdminDetail>
          {data.photos?.length ? (
            <View className="mb-3 flex-row flex-wrap gap-2">
              {data.photos.map((photo) => (
                <Image key={photo} source={{ uri: mediaUrl(photo) }} className="h-24 w-24 rounded-lg bg-gray-100" resizeMode="cover" accessibilityLabel="Client's photo" />
              ))}
            </View>
          ) : null}
          <AdminDetail icon="chatbox-outline" label="The shop's answer">
            {c.shop_response || (c.responded_at ? "No reason recorded." : "The shop didn't answer.")}
          </AdminDetail>
          {c.admin_note ? <AdminDetail icon="ribbon-outline" label="PixelPatch decision">{c.admin_note}</AdminDetail> : null}
          {c.linked_request_id ? <AdminDetail icon="git-branch-outline" label="Warranty repair">{`Repair #${c.linked_request_id}`}</AdminDetail> : null}

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
                    className={`mb-2 min-h-12 rounded-lg border px-3 py-2.5 ${on ? "border-primary bg-teal-50" : errors.outcome ? "border-red-500 bg-white" : "border-gray-200 bg-white"}`}
                  >
                    <Text className="text-sm font-semibold text-gray-900">{o.label}</Text>
                    <Text className="text-xs text-gray-500">{o.hint}</Text>
                  </Pressable>
                );
              })}
              {errors.outcome ? <Text className="mb-2 text-sm text-red-600">{errors.outcome}</Text> : null}
              <TextField
                label="Explanation (the client and shop both see this)"
                value={note}
                onChangeText={(v) => { setNote(v); setErrors((p) => ({ ...p, note: undefined })); }}
                error={errors.note}
                placeholder="What you decided and why."
                multiline
                maxLength={LIMITS.warrantyClaim}
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

export default function AdminWarrantyClaims() {
  const { horizontalPadding } = useResponsive();
  const [view, setView] = useState("NEEDS_ADMIN");
  const [query, setQuery] = useState("");
  const q = useDebouncedValue(query.trim());
  const [version, setVersion] = useState(0);
  const list = usePagedFetch("/admin/warranty-claims", { view, q }, { listKey: "claims", pageSize: 30, version });
  const [selected, setSelected] = useState(null);
  const [message, setMessage] = useState(null);

  const header = (
    <View>
      <AdminPageHeader
        title="Warranty claims"
        description="Decide warranty claims a client asked PixelPatch to review: the shop declined, or didn't answer within 2 days."
      />
      <AdminTabs tabs={TABS} value={view} onChange={setView} counts={list.extra?.counts ?? {}} />
      <TextField label="Search" maxLength={LIMITS.search} value={query} onChangeText={setQuery} placeholder="Claim #, repair #, shop or client" autoCapitalize="none" />
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
        renderItem={({ item }) => <ClaimRow claim={item} onPress={() => setSelected(item.id)} />}
        ListEmptyComponent={
          list.loading ? (
            <ActivityIndicator color={COLORS.primary} />
          ) : (
            <AdminEmpty icon="shield-checkmark-outline" text={view === "NEEDS_ADMIN" ? "No warranty claims need a decision." : "No warranty claims match."} />
          )
        }
        onEndReached={list.loadMore}
        onEndReachedThreshold={0.4}
        ListFooterComponent={list.loadingMore ? <ActivityIndicator color={COLORS.primary} /> : null}
      />
      {selected ? (
        <ClaimDetail
          key={selected}
          claimId={selected}
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
