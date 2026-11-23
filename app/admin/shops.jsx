// Admin · Shops — review business registrations.
//
// A new registration keeps the applicant a client with an unverified shop.
// Approving lists the shop and makes the account a business; rejecting
// removes the application and emails the reason so they can apply again.
//
// GET  /api/admin/shops?status=PENDING|VERIFIED|ALL&q=&limit=&offset=
// POST /api/admin/shops/:id/approve { approve_services }
// POST /api/admin/shops/:id/reject  { note }
import { useState } from "react";
import { ActivityIndicator, FlatList, Pressable, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";

import Button from "../../components/Button";
import TextField from "../../components/TextField";
import Modal from "../../components/Modal";
import { Checkbox } from "../../components/ConsentCheckbox";
import api from "../../lib/api";
import { formatPhone } from "../../lib/phone";
import { usePagedFetch, useDebouncedValue } from "../../lib/usePagedFetch";
import { useResponsive } from "../../lib/useResponsive";
import { COLORS } from "../../constants/theme";

const TABS = [
  { key: "PENDING", label: "Waiting" },
  { key: "VERIFIED", label: "Approved" },
  { key: "ALL", label: "All" },
];

const money = (value) =>
  Number.isFinite(Number(value))
    ? "₱" + Number(value).toLocaleString(undefined, { maximumFractionDigits: 2 })
    : "—";

function when(value) {
  if (!value) return "—";
  const date = new Date(String(value).replace(" ", "T"));
  return Number.isNaN(date.getTime())
    ? "—"
    : date.toLocaleString(undefined, { month: "short", day: "numeric", year: "numeric", hour: "numeric", minute: "2-digit" });
}

// "09:00:00" -> "9:00 AM"
function clock(value) {
  const [h, m] = String(value ?? "").split(":").map(Number);
  if (!Number.isFinite(h)) return "—";
  return `${h % 12 || 12}:${String(m || 0).padStart(2, "0")} ${h < 12 ? "AM" : "PM"}`;
}

// Shows the last 4 digits of a payout account.
const masked = (value) => {
  const text = String(value ?? "");
  return text.length > 4 ? `•••• ${text.slice(-4)}` : text || "—";
};

function Detail({ icon, label, children }) {
  return (
    <View className="mb-3 flex-row items-start">
      <Ionicons name={icon} size={16} color={COLORS.textMuted} style={{ marginTop: 2 }} />
      <View className="ml-2 flex-1">
        <Text className="text-xs font-semibold uppercase text-gray-400">{label}</Text>
        <Text className="mt-0.5 text-sm text-gray-800">{children}</Text>
      </View>
    </View>
  );
}

function ShopCard({ shop, isMobile, onApprove, onReject }) {
  const pending = Number(shop.is_verified) === 0;
  const waitingServices = shop.services.filter((svc) => svc.review_status === "PENDING").length;
  const owner = [shop.owner_first_name, shop.owner_last_name].filter(Boolean).join(" ") || "—";
  const address = [shop.street, shop.barangay, shop.city].filter(Boolean).join(", ") || "—";

  return (
    <View className="mb-4 rounded-2xl border border-gray-200 bg-white p-4">
      <View className="mb-3 flex-row flex-wrap items-start justify-between gap-2">
        <View className="flex-1" style={{ minWidth: 200 }}>
          <Text className="text-lg font-bold text-gray-900">{shop.name}</Text>
          <Text className="mt-0.5 text-xs text-gray-500">Registered {when(shop.created_at)}</Text>
        </View>
        <View className={`rounded-full px-2.5 py-1 ${pending ? "bg-amber-100" : "bg-emerald-100"}`}>
          <Text className={`text-xs font-semibold ${pending ? "text-amber-800" : "text-emerald-800"}`}>
            {pending ? "Waiting for review" : "Approved"}
          </Text>
        </View>
      </View>

      <View className={isMobile ? "" : "flex-row gap-6"}>
        <View className={isMobile ? "" : "flex-1"}>
          <Detail icon="person-outline" label="Applicant">
            {owner} · {shop.owner_email}
            {shop.owner_phone ? ` · ${formatPhone(shop.owner_phone)}` : ""}
          </Detail>
          <Detail icon="call-outline" label="Business contact">
            {formatPhone(shop.phone_number)} · {shop.email}
          </Detail>
          <Detail icon="location-outline" label="Address">{address}</Detail>
        </View>
        <View className={isMobile ? "" : "flex-1"}>
          <Detail icon="time-outline" label="Opening hours">
            {shop.days_from}–{shop.days_to}, {clock(shop.open_time)} to {clock(shop.closing_time)}
          </Detail>
          <Detail icon="card-outline" label="Payout account">
            {shop.payout_method
              ? `${shop.payout_method} · ${shop.payout_account_name} · ${masked(shop.payout_account_number)}`
              : "None registered"}
          </Detail>
        </View>
      </View>

      <Text className="mb-2 mt-1 text-xs font-semibold uppercase text-gray-400">
        Services ({shop.services.length})
      </Text>
      {shop.services.length ? (
        shop.services.map((svc) => (
          <View key={svc.id} className="mb-1.5 flex-row flex-wrap items-center justify-between gap-2 rounded-lg bg-gray-50 px-3 py-2">
            <Text className="flex-1 text-sm text-gray-800" style={{ minWidth: 160 }}>
              {svc.name} <Text className="text-xs text-gray-500">· {String(svc.category).toLowerCase()}</Text>
            </Text>
            <Text className="text-sm font-semibold text-gray-900">{money(svc.base_price)}</Text>
            <Text className="text-xs text-gray-500">{svc.estimated_timeframe}</Text>
          </View>
        ))
      ) : (
        <Text className="text-sm text-gray-500">No services.</Text>
      )}

      {pending ? (
        <View className={`mt-4 ${isMobile ? "gap-2" : "flex-row justify-end gap-3"}`}>
          <View className={isMobile ? "" : "w-44"}>
            <Button title="Reject" variant="outline" onPress={() => onReject(shop)} />
          </View>
          <View className={isMobile ? "" : "w-44"}>
            <Button title="Approve" onPress={() => onApprove(shop, waitingServices)} />
          </View>
        </View>
      ) : null}
    </View>
  );
}

export default function AdminShops() {
  const { isMobile, horizontalPadding } = useResponsive();
  const [status, setStatus] = useState("PENDING");
  const [query, setQuery] = useState("");
  const q = useDebouncedValue(query.trim());
  const [version, setVersion] = useState(0);
  const list = usePagedFetch("/admin/shops", { status, q }, { listKey: "shops", pageSize: 20, version });
  const counts = list.extra?.counts ?? {};

  // { kind: "approve" | "reject", shop, waitingServices }
  const [action, setAction] = useState(null);
  const [note, setNote] = useState("");
  const [alsoServices, setAlsoServices] = useState(true);
  const [busy, setBusy] = useState(false);
  const [actionError, setActionError] = useState(null);
  const [message, setMessage] = useState(null);

  const open = (kind, shop, waitingServices = 0) => {
    setAction({ kind, shop, waitingServices });
    setNote("");
    setAlsoServices(true);
    setActionError(null);
  };
  const close = () => {
    if (!busy) setAction(null);
  };

  const confirm = async () => {
    if (action.kind === "reject" && !note.trim()) {
      setActionError("Write a reason so the applicant knows what to fix.");
      return;
    }
    setBusy(true);
    setActionError(null);
    try {
      const { data } =
        action.kind === "approve"
          ? await api.post(`/admin/shops/${action.shop.id}/approve`, { approve_services: alsoServices })
          : await api.post(`/admin/shops/${action.shop.id}/reject`, { note: note.trim() });
      const mailNote = data?.emailed ? " The owner has been emailed." : " The email to the owner couldn't be sent.";
      setMessage(
        action.kind === "approve"
          ? `"${action.shop.name}" is approved and listed.${mailNote}`
          : `"${action.shop.name}" was rejected and removed.${mailNote}`
      );
      setAction(null);
      setVersion((v) => v + 1);
    } catch (e) {
      setActionError(e.message || "Something went wrong.");
    } finally {
      setBusy(false);
    }
  };

  const header = (
    <View>
      <Text accessibilityRole="header" className="text-2xl font-bold text-gray-900">Shops</Text>
      <Text className="mb-4 mt-1 text-sm leading-5 text-gray-500">
        Review new business registrations. Approved shops are listed for clients and their owners get the business portal.
      </Text>

      <View className="mb-3 flex-row flex-wrap gap-2">
        {TABS.map((tab) => {
          const active = status === tab.key;
          const count = tab.key === "ALL" ? null : counts[tab.key];
          return (
            <Pressable
              key={tab.key}
              onPress={() => setStatus(tab.key)}
              accessibilityRole="button"
              accessibilityState={{ selected: active }}
              className={`min-h-11 flex-row items-center justify-center rounded-lg px-3 py-2 ${active ? "bg-primary" : "bg-white border border-gray-200"}`}
            >
              <Text className={`text-sm font-semibold ${active ? "text-white" : "text-gray-700"}`}>
                {tab.label}
                {count !== null && count !== undefined ? ` (${count})` : ""}
              </Text>
            </Pressable>
          );
        })}
      </View>

      <TextField
        label="Search"
        value={query}
        onChangeText={setQuery}
        placeholder="Shop name, shop email, or applicant"
        autoCapitalize="none"
      />

      {message ? (
        <View className="mb-4 flex-row items-start gap-2 rounded-lg bg-teal-50 p-3">
          <Ionicons name="checkmark-circle" size={18} color={COLORS.primary} />
          <Text className="flex-1 text-sm text-teal-900">{message}</Text>
          <Pressable onPress={() => setMessage(null)} accessibilityLabel="Dismiss" hitSlop={8}>
            <Ionicons name="close" size={18} color={COLORS.textMuted} />
          </Pressable>
        </View>
      ) : null}
      {list.error ? <Text className="mb-4 text-sm text-red-600">{list.error}</Text> : null}
    </View>
  );

  return (
    <View className="flex-1 bg-gray-50">
      <FlatList
        data={list.items}
        keyExtractor={(item) => String(item.id)}
        contentContainerStyle={{
          padding: horizontalPadding,
          paddingBottom: 40,
          maxWidth: 1000,
          width: "100%",
          alignSelf: "center",
        }}
        ListHeaderComponent={header}
        renderItem={({ item }) => (
          <ShopCard
            shop={item}
            isMobile={isMobile}
            onApprove={(shop, waiting) => open("approve", shop, waiting)}
            onReject={(shop) => open("reject", shop)}
          />
        )}
        ListEmptyComponent={
          list.loading ? (
            <ActivityIndicator color={COLORS.primary} />
          ) : (
            <View className="items-center rounded-2xl border border-gray-200 bg-white p-8">
              <Ionicons name="storefront-outline" size={32} color={COLORS.textMuted} />
              <Text className="mt-2 text-center text-sm text-gray-500">
                {status === "PENDING" ? "No registrations are waiting. Nice work!" : "No shops match."}
              </Text>
            </View>
          )
        }
        onEndReached={list.loadMore}
        onEndReachedThreshold={0.4}
        ListFooterComponent={list.loadingMore ? <ActivityIndicator color={COLORS.primary} /> : null}
      />

      <Modal
        visible={action !== null}
        onClose={close}
        title={action?.kind === "approve" ? "Approve shop" : "Reject registration"}
        footer={
          <Button
            title={action?.kind === "approve" ? "Approve and list shop" : "Reject and email reason"}
            loading={busy}
            onPress={confirm}
          />
        }
      >
        {action ? (
          <View>
            <Text className="mb-4 text-sm leading-6 text-gray-700">
              {action.kind === "approve"
                ? `"${action.shop.name}" will be listed for clients, and ${action.shop.owner_first_name || "the owner"}'s account becomes a business account with the business portal.`
                : `"${action.shop.name}" will be removed. ${action.shop.owner_first_name || "The applicant"} stays a customer and gets your reason by email, so they can fix it and apply again.`}
            </Text>
            {action.kind === "approve" && action.waitingServices > 0 ? (
              <Checkbox
                checked={alsoServices}
                onChange={setAlsoServices}
                label="Also approve its waiting services"
              >
                <Text className="text-sm leading-6 text-gray-700">
                  Also approve its {action.waitingServices} waiting service{action.waitingServices === 1 ? "" : "s"} so
                  clients can book them now. Leave unticked to review them under Services.
                </Text>
              </Checkbox>
            ) : null}
            {action.kind === "reject" ? (
              <TextField
                label="Reason (sent to the applicant)"
                value={note}
                onChangeText={setNote}
                placeholder="e.g. The business phone number doesn't answer. Please check it and register again."
                multiline
                numberOfLines={4}
                maxLength={1000}
                style={{ minHeight: 96, textAlignVertical: "top" }}
                editable={!busy}
              />
            ) : null}
            {actionError ? (
              <Text accessibilityRole="alert" className="mt-2 rounded-lg bg-red-50 p-3 text-sm text-red-700">
                {actionError}
              </Text>
            ) : null}
          </View>
        ) : null}
      </Modal>
    </View>
  );
}
