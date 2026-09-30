// app/(business)/employees.jsx
// GET  /api/business/employees  -> { employees: [{ id, first_name, last_name, role }] }
// POST /api/business/employees  <- { firstName, lastName, role, phone, email }
import { useState } from "react";
import { Text, View } from "react-native";

import AsyncList from "../../components/AsyncList";
import Button from "../../components/Button";
import TextField from "../../components/TextField";
import Modal from "../../components/Modal";
import api from "../../lib/api";
import { useFetch } from "../../lib/useFetch";

const EMPTY = { firstName: "", lastName: "", role: "", phone: "", email: "" };

export default function Employees() {
  const { data, error, loading, refreshing, refresh } = useFetch(
    "/business/employees",
    (d) => d.employees ?? []
  );

  const [open, setOpen] = useState(false);
  const [form, setForm] = useState(EMPTY);
  const [busy, setBusy] = useState(false);
  const [formError, setFormError] = useState(null);

  const setField = (key) => (value) => setForm((f) => ({ ...f, [key]: value }));

  const submit = async () => {
    if (!form.firstName.trim() || !form.lastName.trim() || !form.role.trim()) {
      setFormError("First name, last name and role are required.");
      return;
    }
    setBusy(true);
    setFormError(null);
    try {
      await api.post("/business/employees", {
        firstName: form.firstName.trim(),
        lastName: form.lastName.trim(),
        role: form.role.trim(),
        phone: form.phone.trim() || null,
        email: form.email.trim() || null,
      });
      setOpen(false);
      setForm(EMPTY);
      await refresh();
    } catch (e) {
      setFormError(e.message || "Couldn't add this employee.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <View className="flex-1 bg-gray-50">
      <AsyncList
        loading={loading}
        error={error}
        refreshing={refreshing}
        onRefresh={refresh}
        data={data}
        keyExtractor={(item) => String(item.id)}
        emptyText="No employees yet. Add your first technician."
        ListHeaderComponent={
          <Button title="Add employee" className="mb-4" onPress={() => setOpen(true)} />
        }
        renderItem={({ item }) => (
          <View className="mb-3 flex-row items-center rounded-xl border border-gray-200 bg-white p-4">
            <View className="mr-3 h-11 w-11 items-center justify-center rounded-full bg-blue-100">
              <Text className="text-base font-bold text-blue-700">
                {(item.first_name || "?").charAt(0).toUpperCase()}
              </Text>
            </View>
            <View className="flex-1">
              <Text className="text-base font-semibold text-gray-900">
                {item.first_name} {item.last_name}
              </Text>
              <Text className="mt-0.5 text-sm text-gray-500">{item.role}</Text>
            </View>
          </View>
        )}
      />

      <Modal
        visible={open}
        onClose={() => setOpen(false)}
        title="Add employee"
        footer={<Button title="Add employee" loading={busy} onPress={submit} />}
      >
        {formError ? (
          <Text className="mb-3 text-sm text-red-600">{formError}</Text>
        ) : null}

        <View className="flex-row gap-3">
          <View className="flex-1">
            <TextField
              label="First name"
              value={form.firstName}
              onChangeText={setField("firstName")}
              placeholder="Juan"
            />
          </View>
          <View className="flex-1">
            <TextField
              label="Last name"
              value={form.lastName}
              onChangeText={setField("lastName")}
              placeholder="Dela Cruz"
            />
          </View>
        </View>

        <TextField
          label="Role"
          value={form.role}
          onChangeText={setField("role")}
          placeholder="e.g. Technician"
        />
        <TextField
          label="Phone (optional)"
          value={form.phone}
          onChangeText={setField("phone")}
          placeholder="09XX XXX XXXX"
          keyboardType="phone-pad"
          inputMode="tel"
        />
        <TextField
          label="Email (optional)"
          value={form.email}
          onChangeText={setField("email")}
          placeholder="tech@example.com"
          autoCapitalize="none"
          keyboardType="email-address"
          inputMode="email"
        />
      </Modal>
    </View>
  );
}
