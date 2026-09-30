// app/addresses.jsx
// GET  /api/addresses
// POST /api/addresses  (region, province, city, barangay are required server-side)
import { useState } from "react";
import { Text, View } from "react-native";
import { Stack } from "expo-router";
import { Ionicons } from "@expo/vector-icons";

import AsyncList from "../components/AsyncList";
import Button from "../components/Button";
import TextField from "../components/TextField";
import Modal from "../components/Modal";
import api from "../lib/api";
import { useFetch } from "../lib/useFetch";
import { formatAddress } from "../lib/format";
import { COLORS } from "../constants/theme";

const EMPTY = {
  label: "",
  street: "",
  barangay: "",
  city: "",
  province: "",
  region: "",
  postal_code: "",
  country: "Philippines",
};

export default function Addresses() {
  const { data, error, loading, refreshing, refresh } = useFetch(
    "/addresses",
    (d) => d.addresses ?? []
  );

  const [open, setOpen] = useState(false);
  const [form, setForm] = useState(EMPTY);
  const [busy, setBusy] = useState(false);
  const [formError, setFormError] = useState(null);

  const setField = (key) => (value) => setForm((f) => ({ ...f, [key]: value }));

  const submit = async () => {
    // Mirrors the server's own required-field check.
    const missing = ["region", "province", "city", "barangay"].filter((k) => !form[k].trim());
    if (missing.length) {
      setFormError(`Required: ${missing.join(", ")}.`);
      return;
    }

    setBusy(true);
    setFormError(null);
    try {
      await api.post("/addresses", {
        ...form,
        label: form.label.trim() || null,
        postal_code: form.postal_code.trim() || null,
      });
      setOpen(false);
      setForm(EMPTY);
      await refresh();
    } catch (e) {
      setFormError(e.message || "Couldn't save this address.");
    } finally {
      setBusy(false);
    }
  };

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
          <Button title="Add address" className="mb-4" onPress={() => setOpen(true)} />
        }
        renderItem={({ item }) => (
          <View className="mb-3 flex-row items-start rounded-xl border border-gray-200 bg-white p-4">
            <Ionicons name="location-outline" size={20} color={COLORS.textMuted} />
            <View className="ml-3 flex-1">
              <View className="flex-row items-center">
                <Text className="text-base font-semibold text-gray-900">
                  {item.label || "Address"}
                </Text>
                {item.is_default ? (
                  <View className="ml-2 rounded-full bg-blue-100 px-2 py-0.5">
                    <Text className="text-xs font-semibold text-blue-700">Default</Text>
                  </View>
                ) : null}
              </View>
              <Text className="mt-0.5 text-sm text-gray-600">{formatAddress(item)}</Text>
              {item.postal_code ? (
                <Text className="mt-0.5 text-xs text-gray-400">{item.postal_code}</Text>
              ) : null}
            </View>
          </View>
        )}
      />

      <Modal
        visible={open}
        onClose={() => setOpen(false)}
        title="Add address"
        footer={<Button title="Save address" loading={busy} onPress={submit} />}
      >
        {formError ? <Text className="mb-3 text-sm text-red-600">{formError}</Text> : null}

        <TextField
          label="Label (optional)"
          value={form.label}
          onChangeText={setField("label")}
          placeholder="Home, Office…"
        />
        <TextField
          label="Street"
          value={form.street}
          onChangeText={setField("street")}
          placeholder="123 Rizal St."
        />
        <View className="flex-row gap-3">
          <View className="flex-1">
            <TextField
              label="Barangay"
              value={form.barangay}
              onChangeText={setField("barangay")}
              placeholder="Barangay 1"
            />
          </View>
          <View className="flex-1">
            <TextField
              label="City"
              value={form.city}
              onChangeText={setField("city")}
              placeholder="Quezon City"
            />
          </View>
        </View>
        <View className="flex-row gap-3">
          <View className="flex-1">
            <TextField
              label="Province"
              value={form.province}
              onChangeText={setField("province")}
              placeholder="Metro Manila"
            />
          </View>
          <View className="flex-1">
            <TextField
              label="Region"
              value={form.region}
              onChangeText={setField("region")}
              placeholder="NCR"
            />
          </View>
        </View>
        <View className="flex-row gap-3">
          <View className="flex-1">
            <TextField
              label="Postal code"
              value={form.postal_code}
              onChangeText={setField("postal_code")}
              placeholder="1100"
              keyboardType="number-pad"
              inputMode="numeric"
            />
          </View>
          <View className="flex-1">
            <TextField
              label="Country"
              value={form.country}
              onChangeText={setField("country")}
              placeholder="Philippines"
            />
          </View>
        </View>
      </Modal>
    </View>
  );
}
