// app/warranty-claim/[id].jsx — ask for warranty service on a completed repair
// (AGENTS.md business rule 9).
// POST /api/client/repairs/:id/warranty-claims (multipart)
//   problem, delivery_method, pickup_address_id, preferred_date, photos[] (up to 5)
// The shop has 2 days to accept (a free warranty repair is created) or
// decline; then the client can ask PixelPatch to review.
import { useState } from "react";
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
import { calendarDate } from "../../components/RepairSummary";
import api from "../../lib/api";
import { LIMITS } from "../../lib/inputLimits";
import { isInServiceArea } from "../../constants/serviceArea";
import { useFetch } from "../../lib/useFetch";
import { appendImage, pickImages, multipartConfig } from "../../lib/upload";
import { formatAddress } from "../../lib/format";
import { COVERAGE_LABELS, lengthLabel } from "../../lib/warranty";
import { COLORS } from "../../constants/theme";

const MAX_PHOTOS = 5;
const todayString = toDateString(new Date());
const DELIVERY = [
  { key: "DROPOFF", label: "Drop-off", flag: "is_dropoff", hint: "You bring the device to the shop." },
  { key: "PICKUP", label: "Pickup", flag: "is_pickup", hint: "The shop collects the device." },
  { key: "ONSITE", label: "On-site", flag: "is_onsite", hint: "A technician visits you." },
];

function Card({ title, children, right }) {
  return (
    <View className="mb-4 rounded-xl border border-gray-200 bg-white p-4">
      <View className="mb-3 flex-row items-center justify-between gap-2">
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
      className={`mb-2 min-h-11 flex-row items-center rounded-lg border p-3 ${selected ? "border-primary bg-teal-50" : "border-gray-200 bg-white"}`}
    >
      <Ionicons name={selected ? "radio-button-on" : "radio-button-off"} size={18} color={selected ? COLORS.primary : COLORS.textMuted} />
      <View className="ml-3 flex-1">
        <Text className={`text-sm font-semibold ${selected ? "text-teal-800" : "text-gray-900"}`}>{title}</Text>
        {subtitle ? <Text className="mt-0.5 text-xs text-gray-500">{subtitle}</Text> : null}
      </View>
    </Pressable>
  );
}

export default function WarrantyClaim() {
  const { id } = useLocalSearchParams();
  const router = useRouter();
  const repairData = useFetch(`/client/repairs/${id}`, (d) => d.repair ?? null);
  const repair = repairData.data;
  const types = useFetch(repair?.shop_id ? `/shop-services/types/${repair.shop_id}` : null, (d) => d.serviceTypes ?? {});
  const addresses = useFetch("/addresses", (d) => d.addresses ?? []);
  const serviceAddresses = (addresses.data ?? []).filter(isInServiceArea);

  const [problem, setProblem] = useState("");
  const [pickedDelivery, setDelivery] = useState(null);
  const [addressId, setAddressId] = useState(null);
  const [preferredDate, setPreferredDate] = useState("");
  const [photos, setPhotos] = useState([]);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(null);
  const [errorField, setErrorField] = useState(null);

  if (repairData.loading || types.loading || addresses.loading) {
    return (
      <View className="flex-1 items-center justify-center bg-gray-50">
        <ActivityIndicator size="large" color={COLORS.primary} />
      </View>
    );
  }

  const warranty = repair?.warranty_info;
  const eligibility = repair?.warranty_claim;
  const allowed = DELIVERY.filter((d) => Number(types.data?.[d.flag]) === 1);
  // Start with how the original repair was done, when the shop still offers it.
  const original = allowed.some((d) => d.key === repair?.delivery_method) ? repair.delivery_method : null;
  const delivery = pickedDelivery ?? original ?? (allowed.length === 1 ? allowed[0].key : null);
  const needsAddress = delivery && delivery !== "DROPOFF";
  const chosenAddress = addressId ?? (needsAddress && repair?.pickup_address_id && serviceAddresses.some((a) => a.id === repair.pickup_address_id) ? repair.pickup_address_id : null);

  const addPhotos = async () => {
    setError(null);
    try {
      const picked = await pickImages({ multiple: true, limit: MAX_PHOTOS });
      setPhotos((prev) => [...prev, ...picked].slice(0, MAX_PHOTOS));
    } catch (e) {
      setError(e.message);
    }
  };

  const validate = () => {
    if (problem.trim().length < 10) return ["problem", "Describe what's wrong (at least 10 characters)."];
    if (!delivery) return ["delivery_method", "Choose how the shop gets your device."];
    if (needsAddress && !chosenAddress) return ["pickup_address_id", "Pickup and on-site service need an address."];
    if (!preferredDate || preferredDate < todayString) return ["preferred_date", "Choose today or a later date."];
    return null;
  };

  const submit = async () => {
    const problemFound = validate();
    if (problemFound) {
      setErrorField(problemFound[0]);
      setError(problemFound[1]);
      return;
    }
    setSubmitting(true);
    setError(null);
    setErrorField(null);
    try {
      const fd = new FormData();
      fd.append("problem", problem.trim());
      fd.append("delivery_method", delivery);
      fd.append("preferred_date", preferredDate);
      if (needsAddress) fd.append("pickup_address_id", String(chosenAddress));
      for (let i = 0; i < photos.length; i += 1) {
        await appendImage(fd, "photos", photos[i], i);
      }
      await api.post(`/client/repairs/${id}/warranty-claims`, fd, multipartConfig());
      router.replace(`/repair/${id}`);
    } catch (e) {
      setErrorField(e.field ?? e.response?.data?.field ?? null);
      setError(e.message || "Couldn't send your warranty claim.");
    } finally {
      setSubmitting(false);
    }
  };

  if (repairData.error || !repair || !warranty || !eligibility?.allowed) {
    return (
      <View className="flex-1 items-center justify-center bg-gray-50 p-6">
        <Stack.Screen options={{ title: "Warranty service", headerShown: true }} />
        <Text className="mb-4 text-center text-sm text-gray-600">
          {repairData.error || eligibility?.reason || "This repair has no active warranty."}
        </Text>
        <Button title="Back to the repair" variant="outline" onPress={() => router.replace(`/repair/${id}`)} />
      </View>
    );
  }

  return (
    <KeyboardAvoidingView className="flex-1 bg-gray-50" behavior={Platform.OS === "ios" ? "padding" : undefined}>
      <ScrollView
        contentContainerStyle={{ padding: 16, maxWidth: 720, width: "100%", alignSelf: "center" }}
        keyboardShouldPersistTaps="handled"
      >
        <Stack.Screen options={{ title: "Warranty service", headerShown: true }} />

        <View className="mb-4 rounded-xl border border-teal-100 bg-teal-50 p-4">
          <Text className="text-base font-bold text-teal-900">{`Repair #${repair.id} at ${repair.shop_name}`}</Text>
          <Text className="mt-1 text-sm leading-5 text-teal-900">
            {`${lengthLabel(warranty.value, warranty.unit)} warranty, ${String(COVERAGE_LABELS[warranty.coverage] ?? "").toLowerCase()}, until ${calendarDate(warranty.ends_at)}.`}
          </Text>
          {warranty.exclusions ? (
            <Text className="mt-1 text-xs leading-5 text-teal-900">{`Not covered: ${warranty.exclusions}`}</Text>
          ) : null}
          <Text className="mt-2 text-xs leading-5 text-teal-900">
            {"The shop has 2 days to accept or decline. If it accepts, it fixes the problem for free (anything the warranty doesn't cover is quoted first). If it declines or doesn't answer, you can ask PixelPatch to review."}
          </Text>
        </View>

        <Card title="What's wrong">
          <TextField
            label="Describe the problem"
            maxLength={LIMITS.warrantyClaim}
            value={problem}
            onChangeText={setProblem}
            placeholder="e.g. The screen started flickering again two weeks after the repair."
            multiline
            error={errorField === "problem" ? error : null}
          />
        </Card>

        <Card title="How the shop gets your device">
          {allowed.length === 0 ? (
            <Text className="text-sm text-gray-500">This shop has no delivery methods set up. Message the shop instead.</Text>
          ) : (
            allowed.map((d) => (
              <SelectRow key={d.key} selected={delivery === d.key} title={d.label} subtitle={d.hint} onPress={() => setDelivery(d.key)} />
            ))
          )}
          {errorField === "delivery_method" ? <Text className="text-sm text-red-600">{error}</Text> : null}
        </Card>

        {needsAddress ? (
          <Card
            title="Address"
            right={
              <Pressable onPress={() => router.push("/addresses")} accessibilityRole="button" className="min-h-11 justify-center">
                <Text className="text-xs font-semibold text-primary">Manage</Text>
              </Pressable>
            }
          >
            {serviceAddresses.length === 0 ? (
              <View>
                <Text className="mb-3 text-sm text-gray-500">No saved address in Zamboanga City. PixelPatch only serves Zamboanga City.</Text>
                <Button title="Add an address" variant="outline" onPress={() => router.push("/addresses")} />
              </View>
            ) : (
              serviceAddresses.map((a) => (
                <SelectRow key={a.id} selected={chosenAddress === a.id} title={a.label || "Address"} subtitle={formatAddress(a)} onPress={() => setAddressId(a.id)} />
              ))
            )}
            {errorField === "pickup_address_id" ? <Text className="text-sm text-red-600">{error}</Text> : null}
          </Card>
        ) : null}

        <Card title="When">
          <DateField
            label="Preferred date"
            value={preferredDate}
            onChange={setPreferredDate}
            minDate={todayString}
            placeholder="Choose a date"
          />
          {errorField === "preferred_date" ? <Text className="text-sm text-red-600">{error}</Text> : null}
        </Card>

        <Card title="Photos (optional)" right={photos.length ? <Text className="text-xs text-gray-500">{photos.length}/{MAX_PHOTOS}</Text> : null}>
          {photos.length ? (
            <View className="mb-3 flex-row flex-wrap gap-2">
              {photos.map((photo, index) => (
                <Pressable
                  key={`${photo.uri}-${index}`}
                  onPress={() => setPhotos((prev) => prev.filter((_, j) => j !== index))}
                  accessibilityRole="button"
                  accessibilityLabel={`Remove photo ${index + 1}`}
                >
                  <Image source={{ uri: photo.uri }} className="h-20 w-20 rounded-lg bg-gray-100" resizeMode="cover" />
                </Pressable>
              ))}
            </View>
          ) : null}
          {photos.length < MAX_PHOTOS ? <Button title="Add photos" variant="outline" onPress={addPhotos} /> : null}
          <Text className="mt-2 text-xs text-gray-500">Photos help the shop see the problem. Tap a photo to remove it.</Text>
        </Card>

        {error && !errorField ? <Text accessibilityRole="alert" className="mb-3 text-center text-sm text-red-600">{error}</Text> : null}
        {error && errorField ? <Text accessibilityRole="alert" className="mb-3 text-center text-sm text-red-600">Check the highlighted field above.</Text> : null}

        <Button title="Send warranty claim" loading={submitting} onPress={submit} />
        <View className="h-10" />
      </ScrollView>
    </KeyboardAvoidingView>
  );
}
