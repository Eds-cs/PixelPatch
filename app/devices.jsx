// app/devices.jsx
// GET  /api/user/devices
// POST /api/user/devices  (multipart: name, brand, model, serial_number,
//                          model_number, photo)
import { useState } from "react";
import { Image, Text, View } from "react-native";
import { Stack } from "expo-router";
import { Ionicons } from "@expo/vector-icons";

import AsyncList from "../components/AsyncList";
import Button from "../components/Button";
import TextField from "../components/TextField";
import Modal from "../components/Modal";
import api, { mediaUrl } from "../lib/api";
import { useFetch } from "../lib/useFetch";
import { appendImage, pickImages, multipartConfig } from "../lib/upload";
import { COLORS } from "../constants/theme";

const EMPTY = { name: "", brand: "", model: "", serial_number: "", model_number: "" };

export default function Devices() {
  const { data, error, loading, refreshing, refresh } = useFetch(
    "/user/devices",
    (d) => d.devices ?? []
  );

  const [open, setOpen] = useState(false);
  const [form, setForm] = useState(EMPTY);
  const [photo, setPhoto] = useState(null);
  const [busy, setBusy] = useState(false);
  const [formError, setFormError] = useState(null);

  const setField = (key) => (value) => setForm((f) => ({ ...f, [key]: value }));

  const choosePhoto = async () => {
    setFormError(null);
    try {
      const [asset] = await pickImages();
      if (asset) setPhoto(asset);
    } catch (e) {
      setFormError(e.message);
    }
  };

  const reset = () => {
    setForm(EMPTY);
    setPhoto(null);
    setFormError(null);
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

      await api.post("/user/devices", fd, multipartConfig());
      setOpen(false);
      reset();
      await refresh();
    } catch (e) {
      setFormError(e.message || "Couldn't save this device.");
    } finally {
      setBusy(false);
    }
  };

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
          <Button title="Add device" className="mb-4" onPress={() => setOpen(true)} />
        }
        renderItem={({ item }) => (
          <View className="mb-3 flex-row items-center rounded-xl border border-gray-200 bg-white p-4">
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
            </View>
          </View>
        )}
      />

      <Modal
        visible={open}
        onClose={() => {
          setOpen(false);
          reset();
        }}
        title="Add device"
        footer={<Button title="Save device" loading={busy} onPress={submit} />}
      >
        {formError ? <Text className="mb-3 text-sm text-red-600">{formError}</Text> : null}

        <TextField
          label="Device name"
          value={form.name}
          onChangeText={setField("name")}
          placeholder="e.g. My work laptop"
        />
        <View className="flex-row gap-3">
          <View className="flex-1">
            <TextField
              label="Brand"
              value={form.brand}
              onChangeText={setField("brand")}
              placeholder="Apple"
            />
          </View>
          <View className="flex-1">
            <TextField
              label="Model"
              value={form.model}
              onChangeText={setField("model")}
              placeholder="MacBook Pro"
            />
          </View>
        </View>
        <TextField
          label="Serial number (optional)"
          value={form.serial_number}
          onChangeText={setField("serial_number")}
          placeholder="C02..."
          autoCapitalize="characters"
        />
        <TextField
          label="Model number (optional)"
          value={form.model_number}
          onChangeText={setField("model_number")}
          placeholder="A2338"
          autoCapitalize="characters"
        />

        <Text className="mb-1.5 text-sm font-medium text-gray-700">Photo (optional)</Text>
        {photo ? (
          <View className="mb-3 flex-row items-center">
            <Image
              source={{ uri: photo.uri }}
              className="mr-3 h-16 w-16 rounded-lg bg-gray-100"
              resizeMode="cover"
            />
            <Button title="Remove" variant="ghost" onPress={() => setPhoto(null)} />
          </View>
        ) : (
          <Button title="Choose photo" variant="outline" className="mb-3" onPress={choosePhoto} />
        )}
      </Modal>
    </View>
  );
}
