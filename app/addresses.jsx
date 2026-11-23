// app/addresses.jsx
// GET    /api/addresses              (includes request_count, is_shop_address)
// POST   /api/addresses              (barangay must be in Zamboanga City; the server
//                                     fills in city, province, region and country)
// PUT    /api/addresses/:id          (same rules; locked for a shop's address)
// POST   /api/addresses/:id/default
// DELETE /api/addresses/:id          (refused while a repair or shop uses it)
import { useState } from "react";
import { Pressable, Text, View } from "react-native";
import { Stack, useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";

import AsyncList from "../components/AsyncList";
import Button from "../components/Button";
import TextField from "../components/TextField";
import BarangayPicker from "../components/BarangayPicker";
import Modal from "../components/Modal";
import api from "../lib/api";
import { useFetch } from "../lib/useFetch";
import { formatAddress } from "../lib/format";
import { confirmAction } from "../lib/confirm";
import { useResponsive } from "../lib/useResponsive";
import { COLORS } from "../constants/theme";
import { SERVICE_AREA, canonicalBarangay, isInServiceArea } from "../constants/serviceArea";
import { useServiceArea } from "../lib/serviceArea";

const EMPTY = {
  label: "",
  street: "",
  barangay: "",
  postal_code: SERVICE_AREA.postal_code,
};

const isShopAddress = (address) => Number(address?.is_shop_address) === 1;
const usedCount = (address) => Number(address?.request_count) || 0;

export default function Addresses() {
  const { isMobile } = useResponsive();
  const router = useRouter();
  const { needsAddress, recheck } = useServiceArea();
  // Set once a client who had to add an address has added one.
  const [unlocked, setUnlocked] = useState(false);
  const { data, error, loading, refreshing, refresh } = useFetch(
    "/addresses",
    (d) => d.addresses ?? []
  );

  // null = closed, "new" = adding, otherwise the address being edited.
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState(EMPTY);
  const [busy, setBusy] = useState(false);
  const [formError, setFormError] = useState(null);
  const [listError, setListError] = useState(null);
  const [defaultingId, setDefaultingId] = useState(null);

  const isNew = editing === "new";
  const setField = (key) => (value) => setForm((f) => ({ ...f, [key]: value }));

  const openNew = () => {
    setForm(EMPTY);
    setFormError(null);
    setEditing("new");
  };

  const openEdit = (address) => {
    setForm({
      label: address.label ?? "",
      street: address.street ?? "",
      // An address outside Zamboanga City starts blank, so a barangay must be chosen.
      barangay: isInServiceArea(address) ? canonicalBarangay(address.barangay) : "",
      postal_code: address.postal_code || SERVICE_AREA.postal_code,
    });
    setFormError(null);
    setEditing(address);
  };

  const close = () => {
    if (!busy) setEditing(null);
  };

  const submit = async () => {
    // Mirrors the server's own check.
    if (!form.barangay) {
      setFormError("Choose your barangay in Zamboanga City.");
      return;
    }

    setBusy(true);
    setFormError(null);
    try {
      const payload = {
        ...form,
        label: String(form.label).trim() || null,
        postal_code: String(form.postal_code).trim() || null,
      };
      if (isNew) await api.post("/addresses", payload);
      else await api.put(`/addresses/${editing.id}`, payload);
      setEditing(null);
      await refresh();
      if (needsAddress && !(await recheck())) setUnlocked(true);
    } catch (e) {
      setFormError(e.message || "Couldn't save this address.");
    } finally {
      setBusy(false);
    }
  };

  const remove = () => {
    const address = editing;
    confirmAction(
      "Delete address",
      `Delete "${address.label || formatAddress(address) || "this address"}"? This can't be undone.`,
      async () => {
        setBusy(true);
        setFormError(null);
        try {
          await api.delete(`/addresses/${address.id}`);
          setEditing(null);
          await refresh();
        } catch (e) {
          setFormError(e.message || "Couldn't delete this address.");
        } finally {
          setBusy(false);
        }
      },
      { confirmLabel: "Delete", destructive: true }
    );
  };

  const makeDefault = async (address) => {
    if (defaultingId) return;
    setDefaultingId(address.id);
    setListError(null);
    try {
      await api.post(`/addresses/${address.id}/default`);
      await refresh();
    } catch (e) {
      setListError(e.message || "Couldn't set the default address.");
    } finally {
      setDefaultingId(null);
    }
  };

  const locked = !isNew && isShopAddress(editing);
  const canDelete = !isNew && !locked && !usedCount(editing);

  return (
    <View className="flex-1 bg-gray-50">
      <Stack.Screen options={{ title: "My addresses", headerShown: true }} />

      <AsyncList
        loading={loading}
        error={error}
        refreshing={refreshing}
        onRefresh={refresh}
        data={data}
        keyExtractor={(item) => String(item.id)}
        emptyText="No addresses saved yet."
        ListHeaderComponent={
          <View className="mb-4">
            {unlocked ? (
              <View className="mb-4 rounded-xl border border-green-200 bg-green-50 p-4">
                <Text className="text-sm font-semibold text-green-800">You&apos;re all set</Text>
                <Text className="mb-3 mt-1 text-sm text-green-800">
                  Your Zamboanga City address is saved. You can use PixelPatch now.
                </Text>
                <Button title="Continue" onPress={() => router.replace("/assistant")} />
              </View>
            ) : needsAddress ? (
              <View className="mb-4 rounded-xl border border-amber-200 bg-amber-50 p-4">
                <Text className="text-sm font-semibold text-amber-900">Add your Zamboanga City address</Text>
                <Text className="mt-1 text-sm leading-5 text-amber-900">
                  PixelPatch is only available in Zamboanga City. Add where you live or are staying in
                  the city to keep using the app.
                </Text>
              </View>
            ) : (
              <Text className="mb-3 text-xs text-gray-500">
                PixelPatch serves Zamboanga City only, so addresses must be in a Zamboanga City barangay.
              </Text>
            )}
            <Button title="Add address" onPress={openNew} />
            {data?.length ? (
              <Text className="mt-3 text-xs text-gray-500">Tap an address to edit or delete it.</Text>
            ) : null}
            {listError ? (
              <Text accessibilityRole="alert" className="mt-3 rounded-lg bg-red-50 p-3 text-sm text-red-700">
                {listError}
              </Text>
            ) : null}
          </View>
        }
        renderItem={({ item }) => (
          <View className="mb-3 rounded-xl border border-gray-200 bg-white">
            <Pressable
              onPress={() => openEdit(item)}
              accessibilityRole="button"
              accessibilityLabel={`Edit address ${item.label || formatAddress(item)}`}
              className="flex-row items-start p-4 active:bg-teal-50"
            >
              <Ionicons
                name={isShopAddress(item) ? "storefront-outline" : "location-outline"}
                size={20}
                color={COLORS.textMuted}
              />
              <View className="ml-3 flex-1">
                <View className="flex-row flex-wrap items-center gap-2">
                  <Text className="text-base font-semibold text-gray-900">
                    {item.label || (isShopAddress(item) ? "Shop address" : "Address")}
                  </Text>
                  {Number(item.is_default) ? (
                    <View className="rounded-full bg-primary-soft px-2 py-0.5">
                      <Text className="text-xs font-semibold text-teal-800">Default</Text>
                    </View>
                  ) : null}
                  {isShopAddress(item) ? (
                    <View className="rounded-full bg-gray-100 px-2 py-0.5">
                      <Text className="text-xs font-semibold text-gray-600">Your shop</Text>
                    </View>
                  ) : null}
                  {!isInServiceArea(item) ? (
                    <View className="rounded-full bg-amber-100 px-2 py-0.5">
                      <Text className="text-xs font-semibold text-amber-800">Outside Zamboanga City</Text>
                    </View>
                  ) : null}
                </View>
                <Text className="mt-0.5 text-sm text-gray-600">{formatAddress(item)}</Text>
                {item.postal_code ? (
                  <Text className="mt-0.5 text-xs text-gray-400">{item.postal_code}</Text>
                ) : null}
              </View>
              <Ionicons
                name={isShopAddress(item) ? "lock-closed-outline" : "create-outline"}
                size={18}
                color={COLORS.textMuted}
              />
            </Pressable>
            {!Number(item.is_default) ? (
              <View className="border-t border-gray-100 px-4 py-1">
                <Pressable
                  onPress={() => makeDefault(item)}
                  disabled={Boolean(defaultingId)}
                  accessibilityRole="button"
                  accessibilityState={{ busy: defaultingId === item.id, disabled: Boolean(defaultingId) }}
                  className="min-h-11 justify-center self-start"
                >
                  <Text className="text-sm font-semibold text-primary">
                    {defaultingId === item.id ? "Setting default…" : "Set as default"}
                  </Text>
                </Pressable>
              </View>
            ) : null}
          </View>
        )}
      />

      <Modal
        visible={editing !== null}
        onClose={close}
        title={isNew ? "Add address" : locked ? "Shop address" : "Edit address"}
        footer={
          locked ? null : (
            <View className={isMobile ? "gap-3" : "flex-row-reverse gap-3"}>
              <View className={isMobile ? "" : "flex-1"}>
                <Button title="Save address" loading={busy} onPress={submit} />
              </View>
              {canDelete ? (
                <View className={isMobile ? "" : "flex-1"}>
                  <Button title="Delete address" variant="outline" disabled={busy} onPress={remove} />
                </View>
              ) : null}
            </View>
          )
        }
      >
        {formError ? (
          <Text accessibilityRole="alert" className="mb-3 rounded-lg bg-red-50 p-3 text-sm text-red-700">
            {formError}
          </Text>
        ) : null}

        {locked ? (
          <Text className="mb-4 rounded-lg bg-gray-100 p-3 text-xs leading-5 text-gray-700">
            This is your shop&apos;s address, shown to customers. It can&apos;t be changed from My addresses.
          </Text>
        ) : !isNew && usedCount(editing) ? (
          <Text className="mb-4 rounded-lg bg-teal-50 p-3 text-xs leading-5 text-primary-soft-foreground">
            This address is part of a repair request, so it can&apos;t be deleted. You can still correct it.
          </Text>
        ) : null}

        <TextField
          label="Label (optional)"
          value={form.label}
          onChangeText={setField("label")}
          placeholder="Home, Office…"
          editable={!busy && !locked}
        />
        <TextField
          label="Street"
          value={form.street}
          onChangeText={setField("street")}
          placeholder="123 Rizal St."
          editable={!busy && !locked}
        />
        <BarangayPicker
          value={form.barangay}
          onChange={setField("barangay")}
          disabled={busy || locked}
        />
        <Text className="-mt-2 mb-4 text-xs text-gray-500">
          {SERVICE_AREA.city}, {SERVICE_AREA.province}, {SERVICE_AREA.country}
        </Text>
        <TextField
          label="Postal code"
          value={form.postal_code}
          onChangeText={setField("postal_code")}
          placeholder={SERVICE_AREA.postal_code}
          keyboardType="number-pad"
          inputMode="numeric"
          editable={!busy && !locked}
        />
      </Modal>
    </View>
  );
}
