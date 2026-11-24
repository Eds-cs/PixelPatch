// Admin · Users: find accounts, see their activity, suspend or reactivate.
//
// GET  /api/admin/users?filter=ALL|CLIENT|BUSINESS|ADMIN|SUSPENDED&q=&limit=&offset=
// GET  /api/admin/users/:id
// POST /api/admin/users/:id/suspend { reason }
// POST /api/admin/users/:id/reactivate
//
// A suspended account can't sign in and its sessions stop working
// (server/utils/accountStatus.js). Roles aren't changed here: business
// accounts come from approving a shop, and admins are made deliberately.
import { useState } from "react";
import { ActivityIndicator, FlatList, Text, View } from "react-native";

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
import api from "../../lib/api";
import { formatPhone } from "../../lib/phone";
import { useFetch } from "../../lib/useFetch";
import { usePagedFetch, useDebouncedValue } from "../../lib/usePagedFetch";
import { useResponsive } from "../../lib/useResponsive";
import { repairStage } from "../../lib/repairStage";
import { COLORS } from "../../constants/theme";

const TABS = [
  { key: "ALL", label: "All" },
  { key: "CLIENT", label: "Clients" },
  { key: "BUSINESS", label: "Businesses" },
  { key: "ADMIN", label: "Admins" },
  { key: "SUSPENDED", label: "Suspended" },
];
const ROLE = { 1: ["Client", "gray"], 2: ["Admin", "blue"], 3: ["Business", "teal"] };
const fullName = (u) => [u?.first_name, u?.last_name].filter(Boolean).join(" ") || "—";

function UserRow({ user, onPress }) {
  const [role, tone] = ROLE[user.role_id] ?? ["Unknown", "gray"];
  return (
    <AdminCard onPress={onPress} accessibilityLabel={`${fullName(user)}, ${role}${user.suspended_at ? ", suspended" : ""}`}>
      <View className="flex-row flex-wrap items-center gap-2">
        <Text className="text-base font-bold text-gray-900">{fullName(user)}</Text>
        <AdminPill label={role} tone={tone} />
        {user.suspended_at ? <AdminPill label="Suspended" tone="red" /> : null}
      </View>
      <Text className="mt-1 text-sm text-gray-600" numberOfLines={1}>
        {user.email}
        {user.phone ? ` · ${formatPhone(user.phone)}` : ""}
      </Text>
      <Text className="mt-1 text-xs text-gray-500">
        Joined {adminDate(user.created_at, { time: false })}
        {user.shop_name ? ` · Shop: ${user.shop_name}${Number(user.shop_verified) ? "" : " (pending)"}` : ""}
        {Number(user.repair_count) ? ` · ${user.repair_count} repair${Number(user.repair_count) === 1 ? "" : "s"} requested` : ""}
      </Text>
    </AdminCard>
  );
}

function UserDetail({ userId, onChanged, onClose }) {
  const { data, error, loading, refresh } = useFetch(userId ? `/admin/users/${userId}` : null);
  const [mode, setMode] = useState(null); // null | "suspend"
  const [reason, setReason] = useState("");
  const [busy, setBusy] = useState(false);
  const [actionError, setActionError] = useState(null);

  const user = data?.user;
  const isAdminAccount = Number(user?.role_id) === 2;
  const [roleLabel, roleTone] = ROLE[user?.role_id] ?? ["Unknown", "gray"];

  const act = async (kind) => {
    if (kind === "suspend" && reason.trim().length < 5) {
      setActionError("Write why this account is being suspended.");
      return;
    }
    setBusy(true);
    setActionError(null);
    try {
      if (kind === "suspend") await api.post(`/admin/users/${userId}/suspend`, { reason: reason.trim() });
      else await api.post(`/admin/users/${userId}/reactivate`);
      setMode(null);
      setReason("");
      await refresh();
      onChanged(kind === "suspend" ? `${fullName(user)} is suspended.` : `${fullName(user)} is active again.`);
    } catch (e) {
      setActionError(e.message || "Something went wrong.");
    } finally {
      setBusy(false);
    }
  };

  let footer = null;
  if (user && !isAdminAccount) {
    if (user.suspended_at) {
      footer = <Button title="Reactivate account" loading={busy} onPress={() => act("reactivate")} />;
    } else if (mode === "suspend") {
      footer = (
        <View className="gap-2">
          <Button title="Suspend account" loading={busy} onPress={() => act("suspend")} />
          <Button title="Cancel" variant="outline" disabled={busy} onPress={() => { setMode(null); setActionError(null); }} />
        </View>
      );
    } else {
      footer = <Button title="Suspend account…" variant="outline" onPress={() => setMode("suspend")} />;
    }
  }

  return (
    <Modal visible={Boolean(userId)} onClose={busy ? () => {} : onClose} title={user ? fullName(user) : "Account"} footer={footer}>
      {loading ? (
        <ActivityIndicator color={COLORS.primary} />
      ) : error ? (
        <Text className="text-sm text-red-600">{error}</Text>
      ) : user ? (
        <View>
          <View className="mb-4 flex-row flex-wrap gap-2">
            <AdminPill label={roleLabel} tone={roleTone} />
            {user.suspended_at ? <AdminPill label="Suspended" tone="red" /> : <AdminPill label="Active" tone="green" />}
          </View>

          {user.suspended_at ? (
            <View className="mb-4 rounded-lg border border-red-200 bg-red-50 p-3">
              <Text className="text-sm font-semibold text-red-800">
                Suspended {adminDate(user.suspended_at)}
                {user.suspended_by_name ? ` by ${user.suspended_by_name}` : ""}
              </Text>
              {user.suspended_reason ? <Text className="mt-1 text-sm text-red-800">{user.suspended_reason}</Text> : null}
              <Text className="mt-1 text-xs text-red-700">They can&apos;t sign in, and their shop (if any) can&apos;t take new requests.</Text>
            </View>
          ) : null}

          <AdminDetail icon="mail-outline" label="Email">{user.email}</AdminDetail>
          <AdminDetail icon="call-outline" label="Phone">{user.phone ? formatPhone(user.phone) : "Not given"}</AdminDetail>
          <AdminDetail icon="calendar-outline" label="Joined">{adminDate(user.created_at)}</AdminDetail>
          <AdminDetail icon="stats-chart-outline" label="Activity">
            {user.repair_count} repair request{Number(user.repair_count) === 1 ? "" : "s"} · {user.dispute_count} dispute
            {Number(user.dispute_count) === 1 ? "" : "s"} · {user.review_count} review{Number(user.review_count) === 1 ? "" : "s"} ·{" "}
            {user.device_count} device{Number(user.device_count) === 1 ? "" : "s"} · {user.address_count} address
            {Number(user.address_count) === 1 ? "" : "es"}
          </AdminDetail>

          {data.shops?.length ? (
            <View className="mb-3">
              <Text className="mb-2 text-xs font-semibold uppercase text-gray-400">Shop{data.shops.length > 1 ? "s" : ""}</Text>
              {data.shops.map((shop) => (
                <View key={shop.id} className="mb-1.5 flex-row flex-wrap items-center justify-between gap-2 rounded-lg bg-gray-50 px-3 py-2">
                  <Text className="flex-1 text-sm font-semibold text-gray-800" style={{ minWidth: 140 }}>{shop.name}</Text>
                  <AdminPill label={Number(shop.is_verified) ? "Verified" : "Pending"} tone={Number(shop.is_verified) ? "green" : "amber"} />
                  <Text className="text-xs text-gray-500">
                    {shop.repair_count} repairs · {shop.dispute_count} disputes
                  </Text>
                </View>
              ))}
            </View>
          ) : null}

          {data.repairs?.length ? (
            <View className="mb-3">
              <Text className="mb-2 text-xs font-semibold uppercase text-gray-400">Recent repair requests</Text>
              {data.repairs.map((repair) => {
                const stage = repairStage(repair);
                return (
                  <View key={repair.id} className="mb-1.5 flex-row flex-wrap items-center justify-between gap-2 rounded-lg bg-gray-50 px-3 py-2">
                    <Text className="flex-1 text-sm text-gray-800" style={{ minWidth: 140 }}>
                      #{repair.id} · {repair.shop_name}
                    </Text>
                    <AdminPill label={stage.label} tone={stage.tone} />
                  </View>
                );
              })}
            </View>
          ) : null}

          {isAdminAccount ? (
            <Text className="rounded-lg bg-gray-50 p-3 text-xs leading-5 text-gray-600">
              Admin accounts can&apos;t be suspended here.
            </Text>
          ) : null}

          {mode === "suspend" ? (
            <View className="mt-2">
              <TextField
                label="Reason (seen by admins only)"
                value={reason}
                onChangeText={(v) => { setReason(v); setActionError(null); }}
                error={actionError}
                placeholder="e.g. Repeated fake repair requests reported by 3 shops."
                multiline
                numberOfLines={3}
                maxLength={500}
                style={{ minHeight: 80, textAlignVertical: "top" }}
                editable={!busy}
              />
              <Text className="-mt-2 text-xs leading-5 text-gray-500">
                They&apos;ll be signed out everywhere and can&apos;t sign in until reactivated. Nothing is deleted.
                {data.shops?.length ? " Their shop will stop taking new repair requests." : ""}
              </Text>
            </View>
          ) : actionError ? (
            <Text accessibilityRole="alert" className="mt-2 rounded-lg bg-red-50 p-3 text-sm text-red-700">{actionError}</Text>
          ) : null}
        </View>
      ) : null}
    </Modal>
  );
}

export default function AdminUsers() {
  const { horizontalPadding } = useResponsive();
  const [filter, setFilter] = useState("ALL");
  const [query, setQuery] = useState("");
  const q = useDebouncedValue(query.trim());
  const [version, setVersion] = useState(0);
  const list = usePagedFetch("/admin/users", { filter, q }, { listKey: "users", pageSize: 30, version });
  const [selected, setSelected] = useState(null);
  const [message, setMessage] = useState(null);

  const header = (
    <View>
      <AdminPageHeader
        title="Users"
        description="Every client, business and admin account. Open one to see its activity, or to suspend it."
      />
      <AdminTabs tabs={TABS} value={filter} onChange={setFilter} counts={list.extra?.counts ?? {}} />
      <TextField
        label="Search"
        value={query}
        onChangeText={setQuery}
        placeholder="Name, email, phone or shop"
        autoCapitalize="none"
      />
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
        renderItem={({ item }) => <UserRow user={item} onPress={() => setSelected(item.id)} />}
        ListEmptyComponent={
          list.loading ? <ActivityIndicator color={COLORS.primary} /> : <AdminEmpty icon="people-outline" text="No accounts match." />
        }
        onEndReached={list.loadMore}
        onEndReachedThreshold={0.4}
        ListFooterComponent={list.loadingMore ? <ActivityIndicator color={COLORS.primary} /> : null}
      />
      {selected ? (
        // Keyed so each account opens fresh, never showing the previous one.
        <UserDetail
          key={selected}
          userId={selected}
          onClose={() => setSelected(null)}
          onChanged={(text) => {
            setMessage(text);
            setVersion((v) => v + 1);
          }}
        />
      ) : null}
    </View>
  );
}
