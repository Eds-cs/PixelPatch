// app/request/[shopId].jsx
// POST /api/service-requests  (multipart)
//   shop_id, delivery_method, device_id, issue_description,
//   pickup_address_id, preferred_date, notes, services[], attachments[]
import { useMemo, useState } from "react";
import {
  ActivityIndicator,
  Image,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  Text,
  View,
} from "react-native";
import { Stack, useLocalSearchParams, useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";

import Button from "../../components/Button";
import TextField from "../../components/TextField";
import DateField, { toDateString } from "../../components/DateField";
import api from "../../lib/api";
import { useFetch } from "../../lib/useFetch";
import { appendImage, pickImages, multipartConfig } from "../../lib/upload";
import { formatAddress } from "../../lib/format";
import { COLORS } from "../../constants/theme";

const PESO = "₱";
const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;
// A preferred date in the past is never valid, so the calendar starts at today.
const todayString = toDateString(new Date());

const DELIVERY = [
  { key: "PICKUP", label: "Pickup", flag: "is_pickup", hint: "The shop collects the device." },
  { key: "DROPOFF", label: "Drop-off", flag: "is_dropoff", hint: "You bring it to the shop." },
  { key: "ONSITE", label: "On-site", flag: "is_onsite", hint: "A technician visits you." },
];

function Card({ title, children, right }) {
  return (
    <View className="mb-4 rounded-xl border border-gray-200 bg-white p-4">
      <View className="mb-3 flex-row items-center justify-between">
        <Text className="text-sm font-bold uppercase tracking-wide text-gray-500">{title}</Text>
        {right}
      </View>
      {children}
    </View>
  );
}

function SelectRow({ selected, title, subtitle, onPress }) {
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="radio"
      accessibilityState={{ selected }}
      className={`mb-2 flex-row items-center rounded-lg border p-3 ${
        selected ? "border-blue-600 bg-blue-50" : "border-gray-200 bg-white"
      }`}
    >
      <Ionicons
        name={selected ? "radio-button-on" : "radio-button-off"}
        size={18}
        color={selected ? COLORS.primary : COLORS.textMuted}
      />
      <View className="ml-3 flex-1">
        <Text className={`text-sm font-semibold ${selected ? "text-blue-700" : "text-gray-900"}`}>
          {title}
        </Text>
        {subtitle ? <Text className="mt-0.5 text-xs text-gray-500">{subtitle}</Text> : null}
      </View>
    </Pressable>
  );
}

export default function NewRequest() {
  const { shopId } = useLocalSearchParams();
  const router = useRouter();

  const devices = useFetch("/user/devices", (d) => d.devices ?? []);
  const addresses = useFetch("/addresses", (d) => d.addresses ?? []);
  const shopServices = useFetch(`/shops/${shopId}/services`, (d) => d.services ?? []);
  const types = useFetch(`/shop-services/types/${shopId}`, (d) => d.serviceTypes ?? {});

  const [deviceId, setDeviceId] = useState(null);
  const [serviceIds, setServiceIds] = useState([]);
  const [pickedDelivery, setDelivery] = useState(null);
  const [addressId, setAddressId] = useState(null);
  const [issue, setIssue] = useState("");
  const [notes, setNotes] = useState("");
  const [preferredDate, setPreferredDate] = useState("");
  const [attachments, setAttachments] = useState([]);

  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState(null);

  // Only offer the delivery methods this shop actually enables.
  const allowedDelivery = useMemo(
    () => DELIVERY.filter((d) => Number(types.data?.[d.flag]) === 1),
    [types.data]
  );

  // When a shop offers exactly one delivery method, treat it as chosen.
  // Derived rather than written back via an effect, which would cause an
  // extra render pass and can desync if the shop data reloads.
  const delivery =
    pickedDelivery ?? (allowedDelivery.length === 1 ? allowedDelivery[0].key : null);

  const needsAddress = delivery && delivery !== "DROPOFF";

  const toggleService = (id) =>
    setServiceIds((prev) => (prev.includes(id) ? prev.filter((s) => s !== id) : [...prev, id]));

  const addAttachments = async () => {
    setFormError(null);
    try {
      const picked = await pickImages({ multiple: true, limit: 10 });
      setAttachments((prev) => [...prev, ...picked].slice(0, 10));
    } catch (e) {
      setFormError(e.message);
    }
  };

  const validate = () => {
    if (!deviceId) return "Choose the device that needs repair.";
    if (!delivery) return "Choose a delivery method.";
    if (serviceIds.length === 0) return "Choose at least one service.";
    if (needsAddress && !addressId) return "Pickup and on-site service need an address.";
    if (!issue.trim()) return "Describe the issue.";
    if (!DATE_RE.test(preferredDate.trim())) return "Choose a preferred date.";
    if (preferredDate.trim() < todayString) return "Choose today or a future date.";
    return null;
  };

  const submit = async () => {
    const problem = validate();
    if (problem) {
      setFormError(problem);
      return;
    }

    setSubmitting(true);
    setFormError(null);
    try {
      const fd = new FormData();
      fd.append("shop_id", String(shopId));
      fd.append("device_id", String(deviceId));
      fd.append("delivery_method", delivery);
      fd.append("issue_description", issue.trim());
      fd.append("preferred_date", preferredDate.trim());
      if (notes.trim()) fd.append("notes", notes.trim());
      if (needsAddress) fd.append("pickup_address_id", String(addressId));

      // The server normalises a single value into an array, so repeated
      // appends are the right shape for both one and many services.
      serviceIds.forEach((sid) => fd.append("services", String(sid)));

      for (let i = 0; i < attachments.length; i += 1) {
        await appendImage(fd, "attachments", attachments[i], i);
      }

      await api.post("/service-requests", fd, multipartConfig());
      router.replace("/repairs");
    } catch (e) {
      setFormError(e.message || "Couldn't submit this request.");
    } finally {
      setSubmitting(false);
    }
  };

  const loading = devices.loading || addresses.loading || shopServices.loading || types.loading;

  if (loading) {
    return (
      <View className="flex-1 items-center justify-center bg-gray-50">
        <ActivityIndicator size="large" color={COLORS.primary} />
      </View>
    );
  }

  return (
    <KeyboardAvoidingView
      className="flex-1 bg-gray-50"
      behavior={Platform.OS === "ios" ? "padding" : undefined}
    >
      <ScrollView
        contentContainerStyle={{ padding: 16, maxWidth: 720, width: "100%", alignSelf: "center" }}
        keyboardShouldPersistTaps="handled"
      >
        <Stack.Screen options={{ title: "Request a repair", headerShown: true }} />

        <Card
          title="Device"
          right={
            <Pressable onPress={() => router.push("/devices")} accessibilityRole="button">
              <Text className="text-xs font-semibold text-blue-600">Manage</Text>
            </Pressable>
          }
        >
          {(devices.data ?? []).length === 0 ? (
            <View>
              <Text className="mb-3 text-sm text-gray-500">
                You haven&apos;t added a device yet.
              </Text>
              <Button
                title="Add a device"
                variant="outline"
                onPress={() => router.push("/devices")}
              />
            </View>
          ) : (
            (devices.data ?? []).map((d) => (
              <SelectRow
                key={d.id}
                selected={deviceId === d.id}
                title={d.name}
                subtitle={[d.brand, d.model].filter(Boolean).join(" ")}
                onPress={() => setDeviceId(d.id)}
              />
            ))
          )}
        </Card>

        <Card title="Services">
          {(shopServices.data ?? []).length === 0 ? (
            <Text className="text-sm text-gray-500">This shop has no listed services.</Text>
          ) : (
            (shopServices.data ?? []).map((s) => {
              const on = serviceIds.includes(s.id);
              return (
                <Pressable
                  key={s.id}
                  onPress={() => toggleService(s.id)}
                  accessibilityRole="checkbox"
                  accessibilityState={{ checked: on }}
                  className={`mb-2 flex-row items-center rounded-lg border p-3 ${
                    on ? "border-blue-600 bg-blue-50" : "border-gray-200 bg-white"
                  }`}
                >
                  <Ionicons
                    name={on ? "checkbox" : "square-outline"}
                    size={18}
                    color={on ? COLORS.primary : COLORS.textMuted}
                  />
                  <Text
                    className={`ml-3 flex-1 text-sm font-semibold ${
                      on ? "text-blue-700" : "text-gray-900"
                    }`}
                  >
                    {s.name}
                  </Text>
                  <Text className="text-sm font-bold text-blue-600">
                    {PESO}
                    {s.base_price}
                  </Text>
                </Pressable>
              );
            })
          )}
        </Card>

        <Card title="Delivery method">
          {allowedDelivery.length === 0 ? (
            <Text className="text-sm text-gray-500">
              This shop hasn&apos;t configured any delivery methods, so it can&apos;t take
              requests yet.
            </Text>
          ) : (
            allowedDelivery.map((d) => (
              <SelectRow
                key={d.key}
                selected={delivery === d.key}
                title={d.label}
                subtitle={d.hint}
                onPress={() => setDelivery(d.key)}
              />
            ))
          )}
        </Card>

        {needsAddress ? (
          <Card
            title="Address"
            right={
              <Pressable onPress={() => router.push("/addresses")} accessibilityRole="button">
                <Text className="text-xs font-semibold text-blue-600">Manage</Text>
              </Pressable>
            }
          >
            {(addresses.data ?? []).length === 0 ? (
              <View>
                <Text className="mb-3 text-sm text-gray-500">No saved addresses.</Text>
                <Button
                  title="Add an address"
                  variant="outline"
                  onPress={() => router.push("/addresses")}
                />
              </View>
            ) : (
              (addresses.data ?? []).map((a) => (
                <SelectRow
                  key={a.id}
                  selected={addressId === a.id}
                  title={a.label || "Address"}
                  subtitle={formatAddress(a)}
                  onPress={() => setAddressId(a.id)}
                />
              ))
            )}
          </Card>
        ) : null}

        <Card title="Details">
          <TextField
            label="What's wrong?"
            value={issue}
            onChangeText={setIssue}
            placeholder="Describe the problem in your own words"
            multiline
          />
          <DateField
            label="Preferred date"
            value={preferredDate}
            onChange={setPreferredDate}
            minDate={todayString}
            placeholder="Choose a date"
          />
          <TextField
            label="Notes (optional)"
            value={notes}
            onChangeText={setNotes}
            placeholder="Anything else the shop should know"
            multiline
          />
        </Card>

        <Card
          title="Photos (optional)"
          right={
            attachments.length ? (
              <Text className="text-xs text-gray-500">{attachments.length}/10</Text>
            ) : null
          }
        >
          {attachments.length ? (
            <View className="mb-3 flex-row flex-wrap gap-2">
              {attachments.map((a, i) => (
                <Pressable
                  key={`${a.uri}-${i}`}
                  onPress={() => setAttachments((prev) => prev.filter((_, j) => j !== i))}
                  accessibilityRole="button"
                  accessibilityLabel={`Remove photo ${i + 1}`}
                >
                  <Image
                    source={{ uri: a.uri }}
                    className="h-20 w-20 rounded-lg bg-gray-100"
                    resizeMode="cover"
                  />
                </Pressable>
              ))}
            </View>
          ) : null}
          <Button title="Add photos" variant="outline" onPress={addAttachments} />
          {attachments.length ? (
            <Text className="mt-2 text-xs text-gray-400">Tap a photo to remove it.</Text>
          ) : null}
        </Card>

        {formError ? (
          <Text className="mb-3 text-center text-sm text-red-600">{formError}</Text>
        ) : null}

        <Button title="Submit request" loading={submitting} onPress={submit} />
        <View className="h-10" />
      </ScrollView>
    </KeyboardAvoidingView>
  );
}
