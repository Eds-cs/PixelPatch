// app/devices.jsx
// GET    /api/user/devices       (includes request_count)
// POST   /api/user/devices       (multipart: device_type, name, brand, model, serial_number,
//                                 model_number, specs (JSON), photo)
// PUT    /api/user/devices/:id   (same fields; photo optional)
// Device types and their specification fields: lib/deviceSpecs.js.
// DELETE /api/user/devices/:id   (refused while a repair request uses the device)
import { useState } from "react";
import { LIMITS } from "../lib/inputLimits";
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
import {
  DEVICE_TYPES,
  DEVICE_TYPE_KEYS,
  parseSpecs,
  specSummary,
  typeIcon,
  typeLabel,
} from "../lib/deviceSpecs";

const EMPTY = { device_type: "", name: "", brand: "", model: "", serial_number: "", model_number: "", specs: {} };
const usedCount = (device) => Number(device?.request_count) || 0;

function OptionChips({ options, value, onChange, disabled }) {
  return (
    <View className="flex-row flex-wrap">
      {options.map((option) => {
        const selected = value === option;
        return (
          <Pressable
            key={option}
            onPress={() => onChange(selected ? "" : option)}
            disabled={disabled}
            accessibilityRole="radio"
            accessibilityState={{ selected, disabled }}
            className={`mb-2 mr-2 min-h-10 justify-center rounded-full border px-3.5 py-2 ${
              selected ? "border-primary bg-primary" : "border-gray-300 bg-white"
            }`}
          >
            <Text className={`text-sm ${selected ? "font-semibold text-white" : "text-gray-700"}`}>{option}</Text>
          </Pressable>
        );
      })}
    </View>
  );
}

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
  const type = DEVICE_TYPES[form.device_type];
  // Brand/model/serial/model number have their own columns; the rest live in specs.
  const fieldValue = (field) => (field.column ? form[field.key] : form.specs[field.key]) ?? "";
  const setFieldValue = (field) => (value) =>
    setForm((f) =>
      field.column ? { ...f, [field.key]: value } : { ...f, specs: { ...f.specs, [field.key]: value } }
    );

  const openNew = () => {
    setForm(EMPTY);
    setPhoto(null);
    setFormError(null);
    setEditing("new");
  };

  const openEdit = (device) => {
    setForm({
      device_type: device.device_type ?? "",
      name: device.name ?? "",
      brand: device.brand ?? "",
      model: device.model ?? "",
      serial_number: device.serial_number ?? "",
      model_number: device.model_number ?? "",
      specs: parseSpecs(device.specs),
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
    if (!type) {
      setFormError("Choose what kind of device this is.");
      return;
    }
    const missing = type.fields.find((field) => field.required && !String(fieldValue(field)).trim());
    if (missing) {
      setFormError(`${missing.label} is required for a ${type.label.toLowerCase()}.`);
      return;
    }
    setBusy(true);
    setFormError(null);
    try {
      // Only this type's specifications are sent.
      const specs = Object.fromEntries(
        type.fields
          .filter((field) => !field.column)
          .map((field) => [field.key, String(form.specs[field.key] ?? "").trim()])
          .filter(([, value]) => value)
      );
      const fd = new FormData();
      ["device_type", "name", "brand", "model", "serial_number", "model_number"].forEach((key) =>
        fd.append(key, String(form[key] ?? "").trim())
      );
      fd.append("specs", JSON.stringify(specs));
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
            className="mb-3 flex-row items-center rounded-xl border border-gray-200 bg-white p-4 active:bg-teal-50"
          >
            {item.photo_url ? (
              <Image
                source={{ uri: mediaUrl(item.photo_url) }}
                className="mr-3 h-14 w-14 rounded-lg bg-gray-100"
                resizeMode="cover"
              />
            ) : (
              <View className="mr-3 h-14 w-14 items-center justify-center rounded-lg bg-primary-soft">
                <Ionicons name={typeIcon(item.device_type)} size={24} color={COLORS.primary} />
              </View>
            )}

            <View className="flex-1">
              <Text className="text-base font-semibold text-gray-900">{item.name}</Text>
              <Text className="mt-0.5 text-sm text-gray-500">
                {[typeLabel(item.device_type), [item.brand, item.model].filter(Boolean).join(" ")]
                  .filter(Boolean)
                  .join(" · ")}
              </Text>
              {specSummary(item) ? (
                <Text className="mt-0.5 text-xs text-gray-500">{specSummary(item)}</Text>
              ) : null}
              {!item.device_type ? (
                <Text className="mt-1 text-xs font-semibold text-amber-700">
                  Tap to add its type and specifications
                </Text>
              ) : null}
              {item.serial_number ? (
                <Text className="mt-0.5 text-xs text-gray-400">SN: {item.serial_number}</Text>
              ) : null}
              {usedCount(item) ? (
                <Text className="mt-1 text-xs text-teal-800">
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
          <Text className="mb-4 rounded-lg bg-teal-50 p-3 text-xs leading-5 text-primary-soft-foreground">
            This device is part of a repair request, so it can&apos;t be deleted. You can still update its details.
          </Text>
        ) : null}

        <Text className="mb-1.5 text-sm font-medium text-gray-700">What kind of device is it?</Text>
        <View className={`mb-2 ${isMobile ? "gap-2" : "flex-row gap-3"}`}>
          {DEVICE_TYPE_KEYS.map((key) => {
            const selected = form.device_type === key;
            return (
              <Pressable
                key={key}
                onPress={() => setField("device_type")(key)}
                disabled={busy}
                accessibilityRole="radio"
                accessibilityState={{ selected, disabled: busy }}
                className={`min-h-12 flex-row items-center rounded-xl border-2 px-3 py-3 ${isMobile ? "" : "flex-1"} ${
                  selected ? "border-primary bg-teal-50" : "border-gray-200 bg-white"
                }`}
              >
                <Ionicons name={DEVICE_TYPES[key].icon} size={22} color={selected ? COLORS.primary : COLORS.textMuted} />
                <Text className={`ml-2 text-sm font-semibold ${selected ? "text-teal-900" : "text-gray-700"}`}>
                  {DEVICE_TYPES[key].label}
                </Text>
              </Pressable>
            );
          })}
        </View>
        <Text className="mb-4 text-xs leading-5 text-gray-500">
          {type ? type.hint : "PixelPatch repairs phones, laptops and desktop computers (CPU)."}
        </Text>

        {type ? (
          <>
            <TextField
              label="Nickname (optional)"
              value={form.name}
              onChangeText={setField("name")}
              placeholder={`e.g. ${type.example}`}
              editable={!busy}
              maxLength={LIMITS.deviceField}
            />
            <Text className="mb-3 text-sm font-bold text-gray-900">{type.label} specifications</Text>
            <View className={isMobile ? "" : "flex-row flex-wrap"} style={isMobile ? undefined : { marginHorizontal: -6 }}>
              {type.fields.map((field) => {
                const label = `${field.label}${field.required ? "" : " (optional)"}`;
                return (
                  <View
                    key={field.key}
                    style={isMobile ? undefined : { width: field.options ? "100%" : "50%", paddingHorizontal: 6 }}
                  >
                    {field.options ? (
                      <View className="mb-3">
                        <Text className="mb-1.5 text-sm font-medium text-gray-700">{label}</Text>
                        <OptionChips
                          options={field.options}
                          value={fieldValue(field)}
                          onChange={setFieldValue(field)}
                          disabled={busy}
                        />
                      </View>
                    ) : (
                      <TextField
                        label={label}
                        value={fieldValue(field)}
                        onChangeText={setFieldValue(field)}
                        placeholder={field.placeholder}
                        autoCapitalize={field.caps ? "characters" : "sentences"}
                        editable={!busy}
                        maxLength={LIMITS.deviceField}
                      />
                    )}
                  </View>
                );
              })}
            </View>
          </>
        ) : null}

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
