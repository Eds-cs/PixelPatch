// app/devices.jsx
// GET    /api/user/devices       (includes request_count)
// POST   /api/user/devices       (multipart: name, brand, model, serial_number, model_number, photo)
// PUT    /api/user/devices/:id   (same fields; photo optional)
// DELETE /api/user/devices/:id   (refused while a repair request uses the device)
import { useState } from "react";
import { Image, Pressable, Text, View } from "react-native";
import { Stack } from "expo-router";
import { Ionicons } from "@expo/vector-icons";

import AsyncList from "../components/AsyncList";
import Button from "../components/Button";
import TextField from "../components/TextField";
import Modal from "../components/Modal";
import api, { mediaUrl } from "../lib/api";
import { useFetch } from "../lib/useFetch";
import { appendImage, pickImages, multipartConfig } from "../lib/upload";
import { confirmAction } from "../lib/confirm";
import { useResponsive } from "../lib/useResponsive";
import { COLORS } from "../constants/theme";

const EMPTY = { name: "", brand: "", model: "", serial_number: "", model_number: "" };
const usedCount = (device) => Number(device?.request_count) || 0;

export default function Devices() {
  const { isMobile } = useResponsive();
  const { data, error, loading, refreshing, refresh } = useFetch(
    "/user/devices",
    (d) => d.devices ?? []
  );

  // null = closed, "new" = adding, otherwise the device being edited.
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState(EMPTY);
  const [photo, setPhoto] = useState(null);
  const [busy, setBusy] = useState(false);
  const [formError, setFormError] = useState(null);

  const isNew = editing === "new";
  const setField = (key) => (value) => setForm((f) => ({ ...f, [key]: value }));

  const openNew = () => {
    setForm(EMPTY);
    setPhoto(null);
    setFormError(null);
    setEditing("new");
  };

  const openEdit = (device) => {
    setForm({
      name: device.name ?? "",
      brand: device.brand ?? "",
      model: device.model ?? "",
      serial_number: device.serial_number ?? "",
      model_number: device.model_number ?? "",
    });
    setPhoto(null);
    setFormError(null);
    setEditing(device);
  };

  const close = () => {
    if (!busy) setEditing(null);
  };

  const choosePhoto = async () => {
    setFormError(null);
    try {
      const [asset] = await pickImages();
      if (asset) setPhoto(asset);
    } catch (e) {
      setFormError(e.message);
    }
  };

  const submit = async () => {
    if (!form.name.trim()) {
      setFormError("Give the device a name.");
      return;
    }
    setBusy(true);
    setFormError(null);
    try {
      const fd = new FormData();
      Object.entries(form).forEach(([k, v]) => fd.append(k, v.trim()));
      if (photo) await appendImage(fd, "photo", photo);

      if (isNew) await api.post("/user/devices", fd, multipartConfig());
      else await api.put(`/user/devices/${editing.id}`, fd, multipartConfig());

      setEditing(null);
      await refresh();
    } catch (e) {
      setFormError(e.message || "Couldn't save this device.");
    } finally {
      setBusy(false);
    }
  };

  const remove = () => {
    const device = editing;
    confirmAction(
      "Delete device",
      `Delete "${device.name}"? This can't be undone.`,
      async () => {
        setBusy(true);
        setFormError(null);
        try {
          await api.delete(`/user/devices/${device.id}`);
          setEditing(null);
          await refresh();
        } catch (e) {
          setFormError(e.message || "Couldn't delete this device.");
        } finally {
          setBusy(false);
        }
      },
      { confirmLabel: "Delete", destructive: true }
    );
  };

  const existingPhoto = !isNew && editing?.photo_url ? mediaUrl(editing.photo_url) : null;
  const previewUri = photo?.uri ?? existingPhoto;

  return (
    <View className="flex-1 bg-gray-50">
      <Stack.Screen options={{ title: "My devices", headerShown: true }} />

      <AsyncList
        loading={loading}
        error={error}
        refreshing={refreshing}
        onRefresh={refresh}
        data={data}
        keyExtractor={(item) => String(item.id)}
        emptyText="No devices yet. Add the one you need repaired."
        ListHeaderComponent={
          <View className="mb-4">
            <Button title="Add device" onPress={openNew} />
            {data?.length ? (
              <Text className="mt-3 text-xs text-gray-500">Tap a device to edit or delete it.</Text>
            ) : null}
          </View>
        }
        renderItem={({ item }) => (
          <Pressable
            onPress={() => openEdit(item)}
            accessibilityRole="button"
            accessibilityLabel={`Edit device ${item.name}`}
            className="mb-3 flex-row items-center rounded-xl border border-gray-200 bg-white p-4 active:bg-blue-50"
          >
            {item.photo_url ? (
              <Image
                source={{ uri: mediaUrl(item.photo_url) }}
                className="mr-3 h-14 w-14 rounded-lg bg-gray-100"
                resizeMode="cover"
              />
            ) : (
              <View className="mr-3 h-14 w-14 items-center justify-center rounded-lg bg-blue-100">
                <Ionicons name="hardware-chip-outline" size={24} color={COLORS.primary} />
              </View>
            )}

            <View className="flex-1">
              <Text className="text-base font-semibold text-gray-900">{item.name}</Text>
              <Text className="mt-0.5 text-sm text-gray-500">
                {[item.brand, item.model].filter(Boolean).join(" ") || "No model recorded"}
              </Text>
              {item.serial_number ? (
                <Text className="mt-0.5 text-xs text-gray-400">SN: {item.serial_number}</Text>
              ) : null}
              {usedCount(item) ? (
                <Text className="mt-1 text-xs text-blue-700">
                  Used in {usedCount(item)} repair request{usedCount(item) === 1 ? "" : "s"}
                </Text>
              ) : null}
            </View>
            <Ionicons name="create-outline" size={20} color={COLORS.textMuted} />
          </Pressable>
        )}
      />

      <Modal
        visible={editing !== null}
        onClose={close}
        title={isNew ? "Add device" : "Edit device"}
        footer={
          <View className={isMobile ? "gap-3" : "flex-row-reverse gap-3"}>
            <View className={isMobile ? "" : "flex-1"}>
              <Button title="Save device" loading={busy} onPress={submit} />
            </View>
            {!isNew && !usedCount(editing) ? (
              <View className={isMobile ? "" : "flex-1"}>
                <Button title="Delete device" variant="outline" disabled={busy} onPress={remove} />
              </View>
            ) : null}
          </View>
        }
      >
        {formError ? (
          <Text accessibilityRole="alert" className="mb-3 rounded-lg bg-red-50 p-3 text-sm text-red-700">
            {formError}
          </Text>
        ) : null}

        {!isNew && usedCount(editing) ? (
          <Text className="mb-4 rounded-lg bg-blue-50 p-3 text-xs leading-5 text-blue-800">
            This device is part of a repair request, so it can&apos;t be deleted. You can still update its details.
          </Text>
        ) : null}

        <TextField
          label="Device name"
          value={form.name}
          onChangeText={setField("name")}
          placeholder="e.g. My work laptop"
          editable={!busy}
        />
        <View className={isMobile ? "" : "flex-row gap-3"}>
          <View className={isMobile ? "" : "flex-1"}>
            <TextField
              label="Brand"
              value={form.brand}
              onChangeText={setField("brand")}
              placeholder="Apple"
              editable={!busy}
            />
          </View>
          <View className={isMobile ? "" : "flex-1"}>
            <TextField
              label="Model"
              value={form.model}
              onChangeText={setField("model")}
              placeholder="MacBook Pro"
              editable={!busy}
            />
          </View>
        </View>
        <TextField
          label="Serial number (optional)"
          value={form.serial_number}
          onChangeText={setField("serial_number")}
          placeholder="C02..."
          autoCapitalize="characters"
          editable={!busy}
        />
        <TextField
          label="Model number (optional)"
          value={form.model_number}
          onChangeText={setField("model_number")}
          placeholder="A2338"
          autoCapitalize="characters"
          editable={!busy}
        />

        <Text className="mb-1.5 text-sm font-medium text-gray-700">Photo (optional)</Text>
        {previewUri ? (
          <View className="mb-3 flex-row flex-wrap items-center gap-2">
            <Image
              source={{ uri: previewUri }}
              className="mr-1 h-16 w-16 rounded-lg bg-gray-100"
              resizeMode="cover"
            />
            <Button title="Change photo" variant="ghost" disabled={busy} onPress={choosePhoto} />
            {photo ? (
              <Button title="Undo" variant="ghost" disabled={busy} onPress={() => setPhoto(null)} />
            ) : null}
          </View>
        ) : (
          <Button title="Choose photo" variant="outline" className="mb-3" disabled={busy} onPress={choosePhoto} />
        )}
      </Modal>
    </View>
  );
}
