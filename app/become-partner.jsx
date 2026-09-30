// app/become-partner.jsx
// POST /api/business-register  — replaces legacy BusinessSignUpPg1..Pg4.
// The server validates all four sections at once, so the wizard keeps one
// payload and only submits on the final step.
import { useMemo, useState } from "react";
import {
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  Switch,
  Text,
  View,
} from "react-native";
import { Stack, useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";

import Button from "../components/Button";
import TextField from "../components/TextField";
import DateField from "../components/DateField";
import api from "../lib/api";
import { useFetch } from "../lib/useFetch";
import { COLORS } from "../constants/theme";
import { useAuth } from "../lib/auth";

const STEPS = ["Business", "Location", "Services", "Payment"];
const DAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
const TIME_UNITS = ["HOURS", "DAYS", "WEEKS"];
const PAYMENT_METHODS = ["GCASH", "MAYA", "BANK"];

const EMPTY_SERVICE = {
  category: "",
  repair_service: "",
  price: "",
  time_from: "",
  time_to: "",
  time_unit: "DAYS",
};

function Chip({ label, selected, onPress }) {
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityState={{ selected }}
      className={`mb-2 mr-2 rounded-full border px-3.5 py-2 ${
        selected ? "border-blue-600 bg-blue-600" : "border-gray-300 bg-white"
      }`}
    >
      <Text className={`text-xs font-semibold ${selected ? "text-white" : "text-gray-700"}`}>
        {label}
      </Text>
    </Pressable>
  );
}

function Card({ title, children }) {
  return (
    <View className="mb-4 rounded-xl border border-gray-200 bg-white p-4">
      <Text className="mb-3 text-sm font-bold uppercase tracking-wide text-gray-500">{title}</Text>
      {children}
    </View>
  );
}

export default function BecomePartner() {
  const router = useRouter();
  const { user, setSession } = useAuth();
  const categories = useFetch("/shop-services/categories", (d) => d.categories ?? []);

  const [step, setStep] = useState(0);
  const [error, setError] = useState(null);
  const [submitting, setSubmitting] = useState(false);

  const [biz, setBiz] = useState({
    business_name: "",
    business_email: "",
    business_phone: "",
  });
  const [loc, setLoc] = useState({
    region: "",
    province: "",
    city: "",
    barangay: "",
    street: "",
    postal_code: "",
    days_from: "Mon",
    days_to: "Sat",
    open_time: "09:00",
    close_time: "18:00",
  });
  const [services, setServices] = useState([{ ...EMPTY_SERVICE }]);
  const [payment, setPayment] = useState({
    payment_method: "GCASH",
    account_name: "",
    account_number: "",
    terms: false,
    privacy: false,
  });

  const setBizField = (k) => (v) => setBiz((s) => ({ ...s, [k]: v }));
  const setLocField = (k) => (v) => setLoc((s) => ({ ...s, [k]: v }));
  const setPayField = (k) => (v) => setPayment((s) => ({ ...s, [k]: v }));
  const setServiceField = (i, k) => (v) =>
    setServices((prev) => prev.map((s, j) => (j === i ? { ...s, [k]: v } : s)));

  // Mirrors the server's per-step validation so users aren't bounced by a 400.
  const stepError = useMemo(() => {
    if (step === 0) {
      if (!biz.business_name.trim()) return "Business name is required.";
      if (!biz.business_email.trim()) return "Business email is required.";
      if (!biz.business_phone.trim()) return "Business phone is required.";
    }
    if (step === 1) {
      for (const k of ["region", "province", "city", "barangay", "street"]) {
        if (!loc[k].trim()) return `${k[0].toUpperCase() + k.slice(1)} is required.`;
      }
      if (!loc.open_time.trim() || !loc.close_time.trim()) return "Opening hours are required.";
    }
    if (step === 2) {
      if (services.length === 0) return "Add at least one service.";
      for (const [i, s] of services.entries()) {
        if (!s.category) return `Service ${i + 1}: choose a category.`;
        if (!s.repair_service.trim()) return `Service ${i + 1}: name the repair service.`;
        const price = parseFloat(s.price);
        if (!s.price || Number.isNaN(price) || price <= 0)
          return `Service ${i + 1}: enter a price above 0.`;
        if (!s.time_from.trim() || !s.time_to.trim())
          return `Service ${i + 1}: enter a turnaround range.`;
      }
    }
    if (step === 3) {
      if (!payment.account_name.trim()) return "Account name is required.";
      if (!payment.account_number.trim()) return "Account number is required.";
      if (!payment.terms) return "You must accept the Terms of Service.";
      if (!payment.privacy) return "You must accept the Privacy Policy.";
    }
    return null;
  }, [step, biz, loc, services, payment]);

  const next = () => {
    if (stepError) {
      setError(stepError);
      return;
    }
    setError(null);
    setStep((s) => Math.min(s + 1, STEPS.length - 1));
  };

  const back = () => {
    setError(null);
    setStep((s) => Math.max(s - 1, 0));
  };

  const submit = async () => {
    if (stepError) {
      setError(stepError);
      return;
    }
    setSubmitting(true);
    setError(null);
    try {
      const { data } = await api.post("/business-register", {
        ...biz,
        ...loc,
        services: services.map((s) => ({ ...s, price: String(parseFloat(s.price)) })),
        payment,
      });
      if (data?.token) {
        await setSession(data.token, { ...user, ...data.user, role_id: 3 }, true);
      }
      router.replace("/business/dashboard");
    } catch (e) {
      setError(e.message || "Registration failed. Please review your details.");
      setSubmitting(false);
    }
  };

  return (
    <KeyboardAvoidingView
      className="flex-1 bg-gray-50"
      behavior={Platform.OS === "ios" ? "padding" : undefined}
    >
      <ScrollView
        contentContainerStyle={{ padding: 16, maxWidth: 720, width: "100%", alignSelf: "center" }}
        keyboardShouldPersistTaps="handled"
      >
        <Stack.Screen options={{ title: "Become a partner", headerShown: true }} />

        {/* Step indicator */}
        <View className="mb-5 flex-row items-center">
          {STEPS.map((label, i) => (
            <View key={label} className="flex-1 flex-row items-center">
              <View
                className={`h-8 w-8 items-center justify-center rounded-full ${
                  i <= step ? "bg-blue-600" : "bg-gray-200"
                }`}
              >
                {i < step ? (
                  <Ionicons name="checkmark" size={16} color="#fff" />
                ) : (
                  <Text
                    className={`text-xs font-bold ${i === step ? "text-white" : "text-gray-500"}`}
                  >
                    {i + 1}
                  </Text>
                )}
              </View>
              {i < STEPS.length - 1 ? (
                <View className={`h-0.5 flex-1 ${i < step ? "bg-blue-600" : "bg-gray-200"}`} />
              ) : null}
            </View>
          ))}
        </View>
        <Text className="mb-4 text-lg font-bold text-gray-900">
          {step + 1}. {STEPS[step]}
        </Text>

        {step === 0 ? (
          <Card title="Business details">
            <TextField
              label="Business name"
              value={biz.business_name}
              onChangeText={setBizField("business_name")}
              placeholder="PixelFix Repairs"
            />
            <TextField
              label="Business email"
              value={biz.business_email}
              onChangeText={setBizField("business_email")}
              placeholder="shop@example.com"
              autoCapitalize="none"
              keyboardType="email-address"
              inputMode="email"
            />
            <TextField
              label="Business phone"
              value={biz.business_phone}
              onChangeText={setBizField("business_phone")}
              placeholder="09XX XXX XXXX"
              keyboardType="phone-pad"
              inputMode="tel"
            />
          </Card>
        ) : null}

        {step === 1 ? (
          <View>
            <Card title="Address">
              <TextField
                label="Street"
                value={loc.street}
                onChangeText={setLocField("street")}
                placeholder="123 Rizal St."
              />
              <View className="flex-row gap-3">
                <View className="flex-1">
                  <TextField
                    label="Barangay"
                    value={loc.barangay}
                    onChangeText={setLocField("barangay")}
                    placeholder="Barangay 1"
                  />
                </View>
                <View className="flex-1">
                  <TextField
                    label="City"
                    value={loc.city}
                    onChangeText={setLocField("city")}
                    placeholder="Quezon City"
                  />
                </View>
              </View>
              <View className="flex-row gap-3">
                <View className="flex-1">
                  <TextField
                    label="Province"
                    value={loc.province}
                    onChangeText={setLocField("province")}
                    placeholder="Metro Manila"
                  />
                </View>
                <View className="flex-1">
                  <TextField
                    label="Region"
                    value={loc.region}
                    onChangeText={setLocField("region")}
                    placeholder="NCR"
                  />
                </View>
              </View>
              <TextField
                label="Postal code (optional)"
                value={loc.postal_code}
                onChangeText={setLocField("postal_code")}
                placeholder="1100"
                keyboardType="number-pad"
                inputMode="numeric"
              />
            </Card>

            <Card title="Opening hours">
              <Text className="mb-1.5 text-sm font-medium text-gray-700">Open from</Text>
              <View className="mb-3 flex-row flex-wrap">
                {DAYS.map((d) => (
                  <Chip
                    key={`from-${d}`}
                    label={d}
                    selected={loc.days_from === d}
                    onPress={() => setLocField("days_from")(d)}
                  />
                ))}
              </View>

              <Text className="mb-1.5 text-sm font-medium text-gray-700">Open until</Text>
              <View className="mb-3 flex-row flex-wrap">
                {DAYS.map((d) => (
                  <Chip
                    key={`to-${d}`}
                    label={d}
                    selected={loc.days_to === d}
                    onPress={() => setLocField("days_to")(d)}
                  />
                ))}
              </View>

              <View className="flex-row gap-3">
                <View className="flex-1">
                  <DateField
                    label="Opens at"
                    mode="time"
                    value={loc.open_time}
                    onChange={setLocField("open_time")}
                  />
                </View>
                <View className="flex-1">
                  <DateField
                    label="Closes at"
                    mode="time"
                    value={loc.close_time}
                    onChange={setLocField("close_time")}
                  />
                </View>
              </View>
            </Card>
          </View>
        ) : null}

        {step === 2 ? (
          <View>
            {services.map((svc, i) => (
              <Card key={i} title={`Service ${i + 1}`}>
                <Text className="mb-1.5 text-sm font-medium text-gray-700">Category</Text>
                <View className="mb-3 flex-row flex-wrap">
                  {(categories.data ?? []).map((c) => (
                    <Chip
                      key={c}
                      label={c}
                      selected={svc.category === c}
                      onPress={() => setServiceField(i, "category")(c)}
                    />
                  ))}
                  {(categories.data ?? []).length === 0 ? (
                    <Text className="text-sm text-gray-500">
                      Couldn&apos;t load categories — check your connection.
                    </Text>
                  ) : null}
                </View>

                <TextField
                  label="Repair service"
                  value={svc.repair_service}
                  onChangeText={setServiceField(i, "repair_service")}
                  placeholder="e.g. Screen replacement"
                />
                <TextField
                  label="Price"
                  value={svc.price}
                  onChangeText={setServiceField(i, "price")}
                  placeholder="1500"
                  keyboardType="numeric"
                  inputMode="numeric"
                />

                <Text className="mb-1.5 text-sm font-medium text-gray-700">Turnaround</Text>
                <View className="flex-row gap-3">
                  <View className="flex-1">
                    <TextField
                      label="From"
                      value={svc.time_from}
                      onChangeText={setServiceField(i, "time_from")}
                      placeholder="1"
                      keyboardType="numeric"
                      inputMode="numeric"
                    />
                  </View>
                  <View className="flex-1">
                    <TextField
                      label="To"
                      value={svc.time_to}
                      onChangeText={setServiceField(i, "time_to")}
                      placeholder="3"
                      keyboardType="numeric"
                      inputMode="numeric"
                    />
                  </View>
                </View>

                <View className="flex-row flex-wrap">
                  {TIME_UNITS.map((u) => (
                    <Chip
                      key={u}
                      label={u}
                      selected={svc.time_unit === u}
                      onPress={() => setServiceField(i, "time_unit")(u)}
                    />
                  ))}
                </View>

                {services.length > 1 ? (
                  <Button
                    title="Remove this service"
                    variant="ghost"
                    onPress={() => setServices((prev) => prev.filter((_, j) => j !== i))}
                  />
                ) : null}
              </Card>
            ))}

            <Button
              title="Add another service"
              variant="outline"
              className="mb-4"
              onPress={() => setServices((prev) => [...prev, { ...EMPTY_SERVICE }])}
            />
          </View>
        ) : null}

        {step === 3 ? (
          <Card title="Payout details">
            <Text className="mb-1.5 text-sm font-medium text-gray-700">Payment method</Text>
            <View className="mb-3 flex-row flex-wrap">
              {PAYMENT_METHODS.map((m) => (
                <Chip
                  key={m}
                  label={m}
                  selected={payment.payment_method === m}
                  onPress={() => setPayField("payment_method")(m)}
                />
              ))}
            </View>

            <TextField
              label="Account name"
              value={payment.account_name}
              onChangeText={setPayField("account_name")}
              placeholder="Juan Dela Cruz"
            />
            <TextField
              label="Account number"
              value={payment.account_number}
              onChangeText={setPayField("account_number")}
              placeholder="09XXXXXXXXX"
              keyboardType="numeric"
              inputMode="numeric"
            />

            <View className="mb-3 flex-row items-center justify-between">
              <Text className="flex-1 pr-3 text-sm text-gray-700">
                I accept the Terms of Service
              </Text>
              <Switch
                value={payment.terms}
                onValueChange={setPayField("terms")}
                trackColor={{ true: COLORS.primary }}
              />
            </View>
            <View className="flex-row items-center justify-between">
              <Text className="flex-1 pr-3 text-sm text-gray-700">
                I accept the Privacy Policy
              </Text>
              <Switch
                value={payment.privacy}
                onValueChange={setPayField("privacy")}
                trackColor={{ true: COLORS.primary }}
              />
            </View>
          </Card>
        ) : null}

        {error ? (
          <Text className="mb-3 text-center text-sm text-red-600">{error}</Text>
        ) : null}

        <View className="flex-row gap-3">
          {step > 0 ? (
            <View className="flex-1">
              <Button title="Back" variant="outline" onPress={back} />
            </View>
          ) : null}
          <View className="flex-1">
            {step < STEPS.length - 1 ? (
              <Button title="Continue" onPress={next} />
            ) : (
              <Button title="Submit registration" loading={submitting} onPress={submit} />
            )}
          </View>
        </View>

        <View className="h-10" />
      </ScrollView>
    </KeyboardAvoidingView>
  );
}
