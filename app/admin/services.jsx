// Admin · Services — review shop services at scale.
//
// Built for many shops × many services:
// - Grouped by shop (most waiting first), because a shop's batch is usually
//   reviewed together. Desktop shows shops and services side by side; phones
//   and tablets drill in (shops → one shop's services → back).
// - Paged and filtered on the server (usePagedFetch).
// - Compact rows with checkboxes and bulk approve / reject; tap a row for details.
//
// GET  /api/admin/services/shops?status=&q=&limit=&offset=
// GET  /api/admin/services?status=&shop_id=&q=&limit=&offset=
// POST /api/admin/services/bulk  { ids, action: "approve" | "reject", note? }
import { useState } from "react";
import { ActivityIndicator, FlatList, Pressable, ScrollView, Text, TextInput, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";

import Button from "../../components/Button";
import TextField from "../../components/TextField";
import Modal from "../../components/Modal";
import api from "../../lib/api";
import { usePagedFetch, useDebouncedValue } from "../../lib/usePagedFetch";
import { useResponsive } from "../../lib/useResponsive";
import { COLORS } from "../../constants/theme";

const TABS = [
  { key: "PENDING", label: "Waiting" },
  { key: "REJECTED", label: "Rejected" },
  { key: "APPROVED", label: "Approved" },
  { key: "ALL", label: "All" },
];
const STATUS_STYLE = {
  PENDING: ["bg-amber-100", "text-amber-800", "Waiting"],
  APPROVED: ["bg-emerald-100", "text-emerald-800", "Approved"],
  REJECTED: ["bg-red-100", "text-red-800", "Rejected"],
};
const METHODS = [["accepts_pickup", "Pickup"], ["accepts_dropoff", "Drop-off"], ["accepts_onsite", "On-site"]];
const ALL_SHOPS = { shop_id: null, shop_name: "All shops" };

const money = (value) => Number.isFinite(Number(value))
  ? "₱" + Number(value).toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 2 })
  : "—";
const categoryLabel = (value) => value ? String(value).toLowerCase().replace(/_/g, " ").replace(/\b\w/g, (letter) => letter.toUpperCase()) : "Uncategorized";
const methodsOf = (service) => METHODS.filter(([key]) => Number(service[key]) === 1).map(([, label]) => label);
function when(value, withTime = true) {
  if (!value) return "—";
  const date = new Date(String(value).replace(" ", "T"));
  if (Number.isNaN(date.getTime())) return "—";
  return date.toLocaleString(undefined, withTime
    ? { month: "short", day: "numeric", year: "numeric", hour: "numeric", minute: "2-digit" }
    : { month: "short", day: "numeric", year: "numeric" });
}

function StatusBadge({ status }) {
  const [background, foreground, label] = STATUS_STYLE[status] ?? ["bg-gray-100", "text-gray-700", status];
  return <View className={`rounded-full px-2 py-0.5 ${background}`}><Text className={`text-xs font-semibold ${foreground}`}>{label}</Text></View>;
}

function CountChip({ value, tone, label }) {
  if (!Number(value)) return null;
  const tones = { amber: "bg-amber-100 text-amber-800", red: "bg-red-100 text-red-800", gray: "bg-gray-100 text-gray-600" };
  return <Text accessibilityLabel={`${value} ${label}`} className={`rounded-full px-2 py-0.5 text-xs font-semibold ${tones[tone]}`}>{value} {label}</Text>;
}

function Checkbox({ checked, onPress, label, disabled }) {
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      accessibilityRole="checkbox"
      accessibilityState={{ checked, disabled }}
      accessibilityLabel={label}
      hitSlop={6}
      className="h-11 w-11 items-center justify-center"
    >
      <Ionicons name={checked ? "checkbox" : "square-outline"} size={22} color={checked ? COLORS.primary : COLORS.textMuted} />
    </Pressable>
  );
}

function SearchBox({ value, onChange, placeholder }) {
  return (
    <View className="h-11 flex-row items-center rounded-lg border border-gray-300 bg-white px-3">
      <Ionicons name="search-outline" size={18} color={COLORS.textMuted} />
      <TextInput
        value={value}
        onChangeText={onChange}
        placeholder={placeholder}
        placeholderTextColor="#8A9B98"
        autoCapitalize="none"
        autoCorrect={false}
        accessibilityLabel={placeholder}
        className="ml-2 h-11 flex-1 text-base text-gray-900"
      />
      {value ? (
        <Pressable onPress={() => onChange("")} accessibilityRole="button" accessibilityLabel="Clear search" className="h-11 w-9 items-center justify-center">
          <Ionicons name="close-circle" size={18} color={COLORS.textMuted} />
        </Pressable>
      ) : null}
    </View>
  );
}

function ListFooter({ loadingMore, hasMore, onLoadMore, shown, total, noun }) {
  if (!total) return <View className="h-6" />;
  return (
    <View className="items-center px-4 py-4">
      {loadingMore ? <ActivityIndicator color={COLORS.primary} /> : hasMore ? (
        <Button title={`Load more (${shown} of ${total})`} variant="ghost" onPress={onLoadMore} />
      ) : (
        <Text className="text-xs text-gray-400">{total} {noun}{total === 1 ? "" : "s"}</Text>
      )}
    </View>
  );
}

/* ----------------------------- Shops pane ----------------------------- */
function ShopsPane({ status, version, selectedId, onSelect, compact }) {
  const [draft, setDraft] = useState("");
  const q = useDebouncedValue(draft.trim());
  const shops = usePagedFetch("/admin/services/shops", { status, q }, { listKey: "shops", pageSize: 30, version });

  return (
    <FlatList
      data={shops.items}
      keyExtractor={(item) => String(item.shop_id)}
      keyboardShouldPersistTaps="handled"
      onEndReached={shops.loadMore}
      onEndReachedThreshold={0.4}
      contentContainerStyle={{ paddingBottom: 8 }}
      ListHeaderComponent={
        <View className="gap-3 px-4 pb-2 pt-3">
          <SearchBox value={draft} onChange={setDraft} placeholder="Find a shop or owner" />
          <Pressable
            onPress={() => onSelect(ALL_SHOPS)}
            accessibilityRole="button"
            accessibilityState={{ selected: selectedId === null && !compact }}
            className={`min-h-12 flex-row items-center gap-3 rounded-lg border px-3 py-2 ${selectedId === null && !compact ? "border-teal-500 bg-teal-50" : "border-gray-200 bg-white"}`}
          >
            <Ionicons name="layers-outline" size={20} color={COLORS.primary} />
            <View className="flex-1">
              <Text className="text-sm font-semibold text-gray-900">All shops</Text>
              <Text className="text-xs text-gray-500">Search or bulk-review across every shop</Text>
            </View>
            <Ionicons name="chevron-forward" size={18} color={COLORS.textMuted} />
          </Pressable>
          {shops.error ? <Text accessibilityRole="alert" className="rounded-lg bg-red-50 p-3 text-sm text-red-700">{shops.error}</Text> : null}
          <Text className="text-xs font-semibold uppercase text-gray-400">{shops.loading ? "Loading shops…" : `${shops.total} shop${shops.total === 1 ? "" : "s"} · most waiting first`}</Text>
        </View>
      }
      ListEmptyComponent={shops.loading
        ? <ActivityIndicator className="mt-6" color={COLORS.primary} />
        : <Text className="px-4 py-8 text-center text-sm text-gray-500">{q ? "No shops match that search." : "No shops have services in this list."}</Text>}
      renderItem={({ item }) => {
        const active = !compact && selectedId === item.shop_id;
        return (
          <Pressable
            onPress={() => onSelect(item)}
            accessibilityRole="button"
            accessibilityState={{ selected: active }}
            accessibilityLabel={`${item.shop_name}: ${item.pending} waiting, ${item.rejected} rejected`}
            className={`mx-4 mb-2 min-h-14 flex-row items-center gap-3 rounded-lg border px-3 py-2.5 ${active ? "border-teal-500 bg-teal-50" : "border-gray-200 bg-white active:bg-gray-50"}`}
          >
            <View className="flex-1">
              <View className="flex-row items-center gap-1.5">
                <Text numberOfLines={1} className="flex-shrink text-sm font-semibold text-gray-900">{item.shop_name}</Text>
                {Number(item.shop_verified) === 1
                  ? <Ionicons name="checkmark-circle" size={14} color={COLORS.success} accessibilityLabel="Verified shop" />
                  : <Text className="text-xs font-medium text-amber-700">Unverified</Text>}
              </View>
              <Text numberOfLines={1} className="mt-0.5 text-xs text-gray-500">{item.owner_name || "Unknown owner"}{item.oldest_pending_at ? ` · waiting since ${when(item.oldest_pending_at, false)}` : ""}</Text>
              <View className="mt-1.5 flex-row flex-wrap gap-1.5">
                <CountChip value={item.pending} tone="amber" label="waiting" />
                <CountChip value={item.rejected} tone="red" label="rejected" />
                <CountChip value={item.approved} tone="gray" label="approved" />
              </View>
            </View>
            <Ionicons name="chevron-forward" size={18} color={COLORS.textMuted} />
          </Pressable>
        );
      }}
      ListFooterComponent={<ListFooter loadingMore={shops.loadingMore} hasMore={shops.hasMore} onLoadMore={shops.loadMore} shown={shops.items.length} total={shops.total} noun="shop" />}
    />
  );
}

/* ---------------------------- Services pane ---------------------------- */
function ServicesPane({ status, version, shop, onBack, onOpen, selection, setSelection, busy }) {
  const [draft, setDraft] = useState("");
  const q = useDebouncedValue(draft.trim());
  const services = usePagedFetch(
    "/admin/services",
    { status, q, shop_id: shop.shop_id },
    { listKey: "services", pageSize: 50, version }
  );

  const loadedIds = services.items.map((item) => item.id);
  const allSelected = loadedIds.length > 0 && loadedIds.every((id) => selection.has(id));
  const toggle = (id) => setSelection((current) => {
    const next = new Set(current);
    if (next.has(id)) next.delete(id); else next.add(id);
    return next;
  });
  const toggleAll = () => setSelection(allSelected ? new Set() : new Set(loadedIds));

  return (
    <FlatList
      data={services.items}
      keyExtractor={(item) => String(item.id)}
      keyboardShouldPersistTaps="handled"
      onEndReached={services.loadMore}
      onEndReachedThreshold={0.4}
      contentContainerStyle={{ paddingBottom: 8 }}
      ListHeaderComponent={
        <View className="gap-3 px-4 pb-2 pt-3">
          <View className="flex-row items-center gap-2">
            {onBack ? (
              <Pressable onPress={onBack} accessibilityRole="button" accessibilityLabel="Back to shops" className="h-11 w-11 items-center justify-center rounded-lg bg-gray-100">
                <Ionicons name="arrow-back" size={20} color={COLORS.primary} />
              </Pressable>
            ) : null}
            <View className="flex-1">
              <Text numberOfLines={1} className="text-base font-bold text-gray-900">{shop.shop_name}</Text>
              {shop.shop_id ? (
                <Text numberOfLines={1} className="text-xs text-gray-500">
                  {shop.owner_name || "Unknown owner"} · {Number(shop.shop_verified) === 1 ? "Verified shop" : "Unverified shop: hidden from clients even after approval"}
                </Text>
              ) : <Text className="text-xs text-gray-500">Services from every shop</Text>}
            </View>
          </View>
          <SearchBox value={draft} onChange={setDraft} placeholder={shop.shop_id ? "Search this shop's services" : "Search services or shops"} />
          {services.error ? <Text accessibilityRole="alert" className="rounded-lg bg-red-50 p-3 text-sm text-red-700">{services.error}</Text> : null}
          <View className="flex-row items-center border-b border-gray-200 pb-1">
            <Checkbox checked={allSelected} onPress={toggleAll} disabled={!loadedIds.length || busy} label="Select all loaded services" />
            <Text className="flex-1 text-xs font-semibold uppercase text-gray-400">
              {services.loading ? "Loading…" : `${services.items.length} of ${services.total} service${services.total === 1 ? "" : "s"}`}
              {services.refreshing ? " · updating" : ""}
            </Text>
          </View>
        </View>
      }
      ListEmptyComponent={services.loading
        ? <ActivityIndicator className="mt-6" color={COLORS.primary} />
        : <Text className="px-4 py-8 text-center text-sm text-gray-500">{q ? "No services match that search." : "No services in this list."}</Text>}
      renderItem={({ item }) => {
        const checked = selection.has(item.id);
        return (
          <View className={`mx-4 flex-row items-center border-b border-gray-100 ${checked ? "bg-teal-50" : ""}`}>
            <Checkbox checked={checked} onPress={() => toggle(item.id)} disabled={busy} label={`Select ${item.name}`} />
            <Pressable onPress={() => onOpen(item)} accessibilityRole="button" accessibilityLabel={`Review ${item.name}`} className="min-h-14 flex-1 flex-row items-center gap-2 py-2 pr-1 active:bg-gray-50">
              <View className="flex-1">
                <View className="flex-row flex-wrap items-center gap-x-2 gap-y-1">
                  <Text numberOfLines={1} className="flex-shrink text-sm font-semibold text-gray-900">{item.name}</Text>
                  {status === "ALL" ? <StatusBadge status={item.review_status} /> : null}
                </View>
                <Text numberOfLines={1} className="mt-0.5 text-xs text-gray-500">
                  {[shop.shop_id ? null : item.shop_name, categoryLabel(item.category), money(item.base_price), methodsOf(item).join(" / ") || "No methods"].filter(Boolean).join(" · ")}
                </Text>
                {item.review_status === "REJECTED" && item.review_note ? <Text numberOfLines={1} className="mt-0.5 text-xs text-red-700">Reason: {item.review_note}</Text> : null}
              </View>
              <Ionicons name="chevron-forward" size={16} color={COLORS.textMuted} />
            </Pressable>
          </View>
        );
      }}
      ListFooterComponent={<ListFooter loadingMore={services.loadingMore} hasMore={services.hasMore} onLoadMore={services.loadMore} shown={services.items.length} total={services.total} noun="service" />}
    />
  );
}

/* ------------------------------- Screen ------------------------------- */
export default function AdminServices() {
  const { isDesktop, horizontalPadding } = useResponsive();
  const insets = useSafeAreaInsets();
  const [status, setStatus] = useState("PENDING");
  const [shop, setShop] = useState(null); // null = shops list (phones/tablets)
  const [version, setVersion] = useState(0);
  const [selectionState, setSelectionState] = useState({ key: "", ids: new Set() });
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState(null);
  const [detail, setDetail] = useState(null);
  const [rejecting, setRejecting] = useState(null); // { ids, title, revoking }
  const [note, setNote] = useState("");
  const [noteError, setNoteError] = useState(null);

  // Desktop always shows a services pane; it starts on "All shops".
  const scope = shop ?? (isDesktop ? ALL_SHOPS : null);
  // Selection belongs to one status + shop; switching either clears it.
  const selectionKey = `${status}|${scope?.shop_id ?? "none"}`;
  const selection = selectionState.key === selectionKey ? selectionState.ids : new Set();
  const setSelection = (update) => setSelectionState((current) => {
    const base = current.key === selectionKey ? current.ids : new Set();
    return { key: selectionKey, ids: typeof update === "function" ? update(base) : update };
  });

  // Global counts come back with every list; read them from a tiny request.
  const counts = usePagedFetch("/admin/services", { status: "PENDING" }, { listKey: "services", pageSize: 1, version }).extra.counts ?? {};

  const runBulk = async (ids, action, reason) => {
    setBusy(true);
    setMessage(null);
    try {
      const { data } = await api.post("/admin/services/bulk", { ids, action, note: reason });
      const updated = Number(data?.updated ?? 0);
      setMessage({ tone: "ok", text: `${action === "approve" ? "Approved" : "Rejected"} ${updated} service${updated === 1 ? "" : "s"}.` });
      setSelection(new Set());
      setDetail(null);
      setVersion((v) => v + 1);
      return true;
    } catch (e) {
      setMessage({ tone: "error", text: e.message || "Couldn't update the selected services." });
      return false;
    } finally {
      setBusy(false);
    }
  };

  const openReject = (ids, title, revoking = false, existingNote = "") => {
    setNote(existingNote);
    setNoteError(null);
    setRejecting({ ids, title, revoking });
  };

  const confirmReject = async () => {
    if (!note.trim()) {
      setNoteError("Tell the shop why, so they can fix it and resubmit.");
      return;
    }
    const ok = await runBulk(rejecting.ids, "reject", note.trim());
    if (ok) setRejecting(null);
  };

  const selectedIds = [...selection];
  const servicesPane = scope ? (
    <ServicesPane
      key={selectionKey}
      status={status}
      version={version}
      shop={scope}
      onBack={isDesktop || !shop ? null : () => setShop(null)}
      onOpen={setDetail}
      selection={selection}
      setSelection={setSelection}
      busy={busy}
    />
  ) : null;

  return (
    <View className="flex-1 bg-gray-50">
      {/* Header: title, status tabs, last action result */}
      <View className="border-b border-gray-200 bg-white">
        <View className="w-full self-center pt-4" style={{ maxWidth: 1400, paddingHorizontal: horizontalPadding }}>
          <View className="flex-row flex-wrap items-center justify-between gap-2">
            <View className="flex-1" style={{ minWidth: 180 }}>
              <Text accessibilityRole="header" className="text-2xl font-bold text-gray-900">Services</Text>
              <Text className="mt-0.5 text-xs leading-5 text-gray-500">Clients only see approved services. Name, category and description changes come back here.</Text>
            </View>
            <Pressable onPress={() => setVersion((v) => v + 1)} accessibilityRole="button" accessibilityLabel="Refresh" className="h-11 w-11 items-center justify-center rounded-lg border border-gray-200">
              <Ionicons name="refresh" size={18} color={COLORS.primary} />
            </Pressable>
          </View>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8, paddingVertical: 12 }}>
            {TABS.map((tab) => {
              const count = counts[tab.key];
              const active = status === tab.key;
              return (
                <Pressable
                  key={tab.key}
                  onPress={() => { setStatus(tab.key); setMessage(null); }}
                  accessibilityRole="tab"
                  accessibilityState={{ selected: active }}
                  className={`min-h-11 flex-row items-center gap-2 rounded-full px-4 ${active ? "bg-primary" : "bg-gray-100"}`}
                >
                  <Text className={`text-sm font-semibold ${active ? "text-white" : "text-gray-700"}`}>{tab.label}</Text>
                  {count !== undefined ? <Text className={`text-xs font-bold ${active ? "text-primary-soft" : "text-gray-500"}`}>{count}</Text> : null}
                </Pressable>
              );
            })}
          </ScrollView>
          {message ? (
            <View className={`mb-3 flex-row items-center gap-2 rounded-lg p-3 ${message.tone === "ok" ? "bg-emerald-50" : "bg-red-50"}`}>
              <Text accessibilityRole="alert" className={`flex-1 text-sm ${message.tone === "ok" ? "text-emerald-800" : "text-red-700"}`}>{message.text}</Text>
              <Pressable onPress={() => setMessage(null)} accessibilityRole="button" accessibilityLabel="Dismiss" className="h-8 w-8 items-center justify-center"><Ionicons name="close" size={16} color={COLORS.textMuted} /></Pressable>
            </View>
          ) : null}
        </View>
      </View>

      {/* Body: split on desktop, drill-in elsewhere */}
      <View className="w-full flex-1 self-center" style={{ maxWidth: 1400 }}>
        {isDesktop ? (
          <View className="flex-1 flex-row">
            <View style={{ width: 360 }} className="border-r border-gray-200 bg-white">
              <ShopsPane status={status} version={version} selectedId={scope.shop_id} onSelect={setShop} compact={false} />
            </View>
            <View className="flex-1 bg-white">{servicesPane}</View>
          </View>
        ) : scope ? (
          <View className="flex-1 bg-white">{servicesPane}</View>
        ) : (
          <View className="flex-1">
            <ShopsPane status={status} version={version} selectedId={null} onSelect={setShop} compact />
          </View>
        )}
      </View>

      {/* Bulk action bar */}
      {selectedIds.length ? (
        <View className="border-t border-gray-200 bg-white" style={{ paddingBottom: Math.max(insets.bottom, 8) }}>
          <View className="w-full flex-row flex-wrap items-center gap-2 self-center pt-2" style={{ maxWidth: 1400, paddingHorizontal: horizontalPadding }}>
            <Text className="mr-auto text-sm font-semibold text-gray-800">{selectedIds.length} selected</Text>
            <Pressable onPress={() => setSelection(new Set())} disabled={busy} accessibilityRole="button" className="h-11 justify-center px-2"><Text className="text-sm font-semibold text-gray-600">Clear</Text></Pressable>
            <Button
              title="Reject"
              variant="outline"
              disabled={busy}
              onPress={() => openReject(selectedIds, `Reject ${selectedIds.length} service${selectedIds.length === 1 ? "" : "s"}`)}
            />
            {status !== "APPROVED" ? (
              <Button title={`Approve ${selectedIds.length}`} loading={busy} onPress={() => runBulk(selectedIds, "approve")} />
            ) : null}
          </View>
        </View>
      ) : null}

      {/* Service details */}
      <Modal
        visible={Boolean(detail)}
        onClose={() => { if (!busy) setDetail(null); }}
        title="Service details"
        footer={detail ? (
          <View className="flex-row flex-wrap gap-3">
            <View className="flex-1" style={{ minWidth: 140 }}>
              <Button
                title={detail.review_status === "APPROVED" ? "Revoke approval" : detail.review_status === "REJECTED" ? "Edit reason" : "Reject"}
                variant="outline"
                disabled={busy}
                onPress={() => openReject([detail.id], detail.name, detail.review_status === "APPROVED", detail.review_status === "REJECTED" ? detail.review_note || "" : "")}
              />
            </View>
            {detail.review_status !== "APPROVED" ? (
              <View className="flex-1" style={{ minWidth: 140 }}>
                <Button title="Approve" loading={busy} onPress={() => runBulk([detail.id], "approve")} />
              </View>
            ) : null}
          </View>
        ) : null}
      >
        {detail ? (
          <View>
            <View className="flex-row flex-wrap items-center gap-2">
              <StatusBadge status={detail.review_status} />
              <Text className="text-xs font-semibold text-primary">{categoryLabel(detail.category)}</Text>
            </View>
            <Text className="mt-2 text-lg font-bold text-gray-900">{detail.name}</Text>
            <Text selectable className={`mt-2 text-sm leading-6 ${detail.description ? "text-gray-700" : "text-gray-400"}`}>{detail.description || "No description provided."}</Text>
            <View className="mt-4 gap-1.5 rounded-lg bg-gray-50 p-3">
              <Text className="text-sm text-gray-700"><Text className="font-semibold">Base price: </Text>{money(detail.base_price)}</Text>
              <Text className="text-sm text-gray-700"><Text className="font-semibold">Turnaround: </Text>{detail.estimated_timeframe || "Not specified"}</Text>
              <Text className="text-sm text-gray-700"><Text className="font-semibold">Methods: </Text>{methodsOf(detail).join(", ") || "None"}</Text>
            </View>
            <View className="mt-3 gap-1">
              <Text className="text-sm text-gray-700"><Text className="font-semibold">Shop: </Text>{detail.shop_name}{Number(detail.shop_verified) === 1 ? "" : " (unverified)"}</Text>
              <Text className="text-xs text-gray-500">Owner: {detail.owner_name || "Unknown"}</Text>
              <Text className="text-xs text-gray-500">Last changed: {when(detail.updated_at)}</Text>
              {detail.reviewed_at ? <Text className="text-xs text-gray-500">Reviewed {when(detail.reviewed_at)}{detail.reviewer_name ? ` by ${detail.reviewer_name}` : ""}</Text> : null}
            </View>
            {detail.review_status === "REJECTED" && detail.review_note ? (
              <View className="mt-3 rounded-lg bg-red-50 p-3">
                <Text className="text-xs font-semibold text-red-800">Reason sent to the shop</Text>
                <Text selectable className="mt-1 text-sm leading-5 text-red-700">{detail.review_note}</Text>
              </View>
            ) : null}
          </View>
        ) : null}
      </Modal>

      {/* Reject / revoke reason (single or bulk) */}
      <Modal
        visible={Boolean(rejecting)}
        onClose={() => { if (!busy) setRejecting(null); }}
        title={rejecting?.revoking ? "Revoke approval" : "Reject"}
        footer={<Button title={rejecting?.revoking ? "Revoke and hide from clients" : rejecting && rejecting.ids.length > 1 ? `Reject ${rejecting.ids.length} services` : "Reject service"} loading={busy} onPress={confirmReject} />}
      >
        {rejecting ? (
          <View>
            <Text className="mb-3 text-base font-bold text-gray-900">{rejecting.title}</Text>
            {rejecting.revoking || status === "APPROVED" ? (
              <Text className="mb-3 rounded-lg bg-amber-50 p-3 text-xs leading-5 text-amber-800">Clients stop seeing approved services immediately. Repairs that already include them are not affected.</Text>
            ) : null}
            {rejecting.ids.length > 1 ? <Text className="mb-3 text-xs leading-5 text-gray-500">The same reason is sent for every selected service.</Text> : null}
            {noteError ? <Text accessibilityRole="alert" className="mb-3 rounded-lg bg-red-50 p-3 text-sm text-red-700">{noteError}</Text> : null}
            <TextField
              label="Reason (the shop sees this)"
              value={note}
              onChangeText={setNote}
              placeholder="e.g. Unlocking carrier-locked phones isn't allowed on PixelPatch."
              multiline
              maxLength={2000}
              editable={!busy}
              style={{ minHeight: 110, paddingTop: 12, textAlignVertical: "top" }}
            />
          </View>
        ) : null}
      </Modal>
    </View>
  );
}
