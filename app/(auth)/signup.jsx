// app/(auth)/signup.jsx — ported from legacy-web/src/components/SignUp.jsx
// Two steps, so no account exists until its contact details are proven:
//   1. POST /api/auth/signup/start sends a code to the email (and the phone,
//      once SMS is set up on the server).
//   2. POST /api/auth/register with the form and the code(s) creates it.
import { useState } from "react";
import { KeyboardAvoidingView, Platform, Pressable, ScrollView, Text, View } from "react-native";
import { Link, useLocalSearchParams } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";

import Button from "../../components/Button";
import TextField from "../../components/TextField";
import PasswordField from "../../components/PasswordField";
import DateField, { toDateString } from "../../components/DateField";
import BarangayPicker from "../../components/BarangayPicker";
import { useAuth } from "../../lib/auth";
import api from "../../lib/api";
import { COLORS } from "../../constants/theme";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
// The server accepts birthdays from 1900 up to today.
const EARLIEST_BIRTHDAY = "1900-01-01";

// Keep in sync with server/utils/phone.js.
function normalizePhone(value) {
  let digits = String(value ?? "").replace(/[\s\-().]/g, "");
  if (digits.startsWith("+63")) digits = `0${digits.slice(3)}`;
  else if (digits.startsWith("63") && digits.length === 12) digits = `0${digits.slice(2)}`;
  return /^09\d{9}$/.test(digits) ? digits : null;
}

const onlyDigits = (value) => value.replace(/\D/g, "").slice(0, 6);

export default function SignUp() {
  const { signup, login } = useAuth();
  // Keeps "where to go after signing in" when switching to sign-in.
  const { redirect } = useLocalSearchParams();
  const loginHref = redirect ? { pathname: "/login", params: { redirect } } : "/login";

  const [form, setForm] = useState({
    first_name: "",
    middle_name: "",
    last_name: "",
    birthdate: "",
    barangay: "",
    street: "",
    email: "",
    phone: "",
    password: "",
    confirmPassword: "",
  });
  const [errors, setErrors] = useState({});
  // Set when the person says they aren't in Zamboanga City.
  const [outsideArea, setOutsideArea] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  // "form" while filling in details, "verify" while entering the code(s).
  const [step, setStep] = useState("form");
  const [codes, setCodes] = useState({ email: "", phone: "" });
  const [phoneVerification, setPhoneVerification] = useState(false);
  const [notice, setNotice] = useState("");
  const [resending, setResending] = useState(false);

  const setField = (key) => (value) => setForm((f) => ({ ...f, [key]: value }));
  const email = form.email.trim().toLowerCase();

  const validate = () => {
    const next = {};
    if (!form.first_name.trim()) next.first_name = "First name is required.";
    if (!form.last_name.trim()) next.last_name = "Last name is required.";
    if (!form.birthdate) next.birthdate = "Birthday is required.";
    if (!form.barangay) {
      next.barangay = "Choose the barangay in Zamboanga City where you live or are staying.";
    }
    if (!EMAIL_RE.test(email)) next.email = "Please enter a valid email address.";
    if (!normalizePhone(form.phone)) {
      next.phone = "Enter a valid Philippine mobile number (09XX XXX XXXX).";
    }
    if (form.password.length < 8) next.password = "Password must be at least 8 characters.";
    if (form.password !== form.confirmPassword) next.confirmPassword = "Passwords do not match.";
    setErrors(next);
    return Object.keys(next).length === 0;
  };

  // Puts a server message next to the field it is about.
  const showServerError = (message) => {
    const lower = message.toLowerCase();
    if (lower.includes("already exists")) setErrors({ email: "An account with this email already exists." });
    else if (lower.includes("birthday")) setErrors({ birthdate: message });
    else if (message.includes("Zamboanga")) setErrors({ barangay: message });
    else if (lower.includes("mobile number") || lower.includes("text your phone")) setErrors({ phone: message });
    else setErrors({ form: message || "Sign up failed. Please try again." });
  };

  const requestCodes = async () => {
    const { data } = await api.post("/auth/signup/start", {
      email,
      phone: normalizePhone(form.phone),
    });
    setPhoneVerification(Boolean(data?.phone_verification));
    setNotice(data?.message || "We sent a 6-digit code to your email.");
  };

  // Step 1: check the form, then send the code(s).
  const onSubmit = async () => {
    if (!validate()) return;
    setSubmitting(true);
    try {
      await requestCodes();
      setCodes({ email: "", phone: "" });
      setStep("verify");
    } catch (error) {
      showServerError(error.message || "");
    } finally {
      setSubmitting(false);
    }
  };

  const resend = async () => {
    setResending(true);
    setErrors({});
    try {
      await requestCodes();
    } catch (error) {
      setErrors({ form: error.message || "Couldn't send a new code. Try again." });
    } finally {
      setResending(false);
    }
  };

  // Step 2: create the account with the code(s).
  const onVerify = async () => {
    const next = {};
    if (codes.email.length !== 6) next.email_code = "Enter the 6-digit code from the email.";
    if (phoneVerification && codes.phone.length !== 6) {
      next.phone_code = "Enter the 6-digit code from the text message.";
    }
    setErrors(next);
    if (Object.keys(next).length) return;

    setSubmitting(true);
    try {
      await signup({
        role_id: 1, // client account
        first_name: form.first_name.trim(),
        middle_name: form.middle_name.trim() || null,
        last_name: form.last_name.trim(),
        birthdate: form.birthdate,
        barangay: form.barangay,
        street: form.street.trim() || null,
        email,
        phone: normalizePhone(form.phone),
        password: form.password,
        email_code: codes.email,
        phone_code: phoneVerification ? codes.phone : undefined,
      });
      // Register does not return a token, so sign in straight away.
      await login(email, form.password, true);
    } catch (error) {
      const message = error.message || "";
      const field = error.response?.data?.field;
      if (field === "email_code" || field === "phone_code") {
        setErrors({ [field]: message });
      } else {
        // Something in the form itself: go back so it can be fixed.
        setStep("form");
        showServerError(message);
      }
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <SafeAreaView className="flex-1 bg-white">
      <KeyboardAvoidingView
        className="flex-1"
        behavior={Platform.OS === "ios" ? "padding" : undefined}
      >
        <ScrollView
          contentContainerStyle={{ flexGrow: 1, justifyContent: "center", padding: 24 }}
          keyboardShouldPersistTaps="handled"
        >
          <View className="w-full max-w-md self-center">
            {step === "verify" ? (
              <>
                <Text className="mb-2 text-3xl font-extrabold text-gray-900">
                  {phoneVerification ? "Verify your details" : "Verify your email"}
                </Text>
                <Text className="mb-6 text-base leading-6 text-gray-500">
                  Enter the code sent to <Text className="font-semibold text-gray-800">{email}</Text>
                  {phoneVerification ? (
                    <>
                      {" "}and the one texted to{" "}
                      <Text className="font-semibold text-gray-800">{normalizePhone(form.phone)}</Text>
                    </>
                  ) : null}
                  . Codes expire in 10 minutes.
                </Text>

                {notice ? (
                  <Text className="mb-6 rounded-lg bg-teal-50 p-3 text-sm text-primary-soft-foreground">{notice}</Text>
                ) : null}
                {errors.form ? (
                  <Text accessibilityRole="alert" className="mb-6 rounded-lg bg-red-50 p-3 text-sm text-red-700">
                    {errors.form}
                  </Text>
                ) : null}

                <TextField
                  label="Email code"
                  value={codes.email}
                  onChangeText={(v) => setCodes((c) => ({ ...c, email: onlyDigits(v) }))}
                  error={errors.email_code}
                  placeholder="123456"
                  keyboardType="number-pad"
                  inputMode="numeric"
                  autoComplete="one-time-code"
                  textContentType="oneTimeCode"
                  maxLength={6}
                  onSubmitEditing={phoneVerification ? undefined : onVerify}
                />
                {phoneVerification ? (
                  <TextField
                    label="Phone code"
                    value={codes.phone}
                    onChangeText={(v) => setCodes((c) => ({ ...c, phone: onlyDigits(v) }))}
                    error={errors.phone_code}
                    placeholder="123456"
                    keyboardType="number-pad"
                    inputMode="numeric"
                    autoComplete="one-time-code"
                    textContentType="oneTimeCode"
                    maxLength={6}
                    onSubmitEditing={onVerify}
                  />
                ) : null}

                <Button title="Verify and create account" onPress={onVerify} loading={submitting} />

                <View className="mt-4 flex-row flex-wrap items-center justify-between gap-2">
                  <Pressable
                    accessibilityRole="button"
                    onPress={resend}
                    disabled={resending}
                    className={resending ? "opacity-50" : ""}
                  >
                    <Text className="text-sm font-medium text-primary">
                      {resending ? "Sending…" : "Resend code"}
                    </Text>
                  </Pressable>
                  <Pressable
                    accessibilityRole="button"
                    onPress={() => {
                      setStep("form");
                      setErrors({});
                    }}
                  >
                    <Text className="text-sm font-medium text-gray-600">Change my details</Text>
                  </Pressable>
                </View>
              </>
            ) : (
              <>
                <Text className="mb-2 text-3xl font-extrabold text-gray-900">Create account</Text>
                <Text className="mb-3 text-base text-gray-500">
                  Join PixelPatch to get your devices repaired.
                </Text>
                <View className="mb-8 flex-row items-center gap-2 self-start rounded-full bg-teal-50 px-3 py-1.5">
                  <Ionicons name="location-outline" size={14} color={COLORS.primary} />
                  <Text className="text-xs text-primary-soft-foreground">Available in Zamboanga City only</Text>
                </View>

                {errors.form ? (
                  <Text accessibilityRole="alert" className="mb-6 rounded-lg bg-red-50 p-3 text-sm text-red-700">
                    {errors.form}
                  </Text>
                ) : null}

                <View className="flex-row gap-3">
                  <View className="flex-1">
                    <TextField
                      label="First name"
                      value={form.first_name}
                      onChangeText={setField("first_name")}
                      error={errors.first_name}
                      placeholder="Juan"
                    />
                  </View>
                  <View className="flex-1">
                    <TextField
                      label="Last name"
                      value={form.last_name}
                      onChangeText={setField("last_name")}
                      error={errors.last_name}
                      placeholder="Dela Cruz"
                    />
                  </View>
                </View>

                <TextField
                  label="Middle name (optional)"
                  value={form.middle_name}
                  onChangeText={setField("middle_name")}
                  error={errors.middle_name}
                  placeholder="Santos"
                  autoComplete="name-middle"
                />

                <DateField
                  label="Birthday"
                  value={form.birthdate}
                  onChange={setField("birthdate")}
                  error={errors.birthdate}
                  placeholder="Select your birthday"
                  minDate={EARLIEST_BIRTHDAY}
                  maxDate={toDateString(new Date())}
                  defaultDate="2000-01-01"
                />

                <BarangayPicker
                  label="Where you live or are staying"
                  value={form.barangay}
                  onChange={(name) => {
                    setOutsideArea(false);
                    setField("barangay")(name);
                  }}
                  onOutsideArea={() => {
                    setOutsideArea(true);
                    setField("barangay")("");
                  }}
                  error={outsideArea ? null : errors.barangay}
                  placeholder="Select your barangay in Zamboanga City"
                />

                {outsideArea ? (
                  <View className="-mt-2 mb-4 rounded-lg bg-amber-50 p-3">
                    <Text className="text-sm font-semibold text-amber-900">
                      Sorry, PixelPatch isn&apos;t available in your area yet
                    </Text>
                    <Text className="mt-1 text-sm leading-5 text-amber-900">
                      We only serve Zamboanga City for now. If you&apos;re staying in the city, even for a
                      few days, choose the barangay you&apos;re staying in.
                    </Text>
                  </View>
                ) : null}

                <TextField
                  label="Street, house no. (optional)"
                  value={form.street}
                  onChangeText={setField("street")}
                  placeholder="123 Rizal St."
                  autoComplete="street-address"
                />

                <TextField
                  label="Email"
                  value={form.email}
                  onChangeText={setField("email")}
                  error={errors.email}
                  placeholder="you@example.com"
                  autoCapitalize="none"
                  autoComplete="email"
                  keyboardType="email-address"
                  inputMode="email"
                />

                <TextField
                  label="Mobile number"
                  value={form.phone}
                  onChangeText={setField("phone")}
                  error={errors.phone}
                  placeholder="09XX XXX XXXX"
                  keyboardType="phone-pad"
                  inputMode="tel"
                  autoComplete="tel"
                />

                <PasswordField
                  label="Password"
                  value={form.password}
                  onChangeText={setField("password")}
                  error={errors.password}
                  placeholder="At least 8 characters"
                  autoComplete="new-password"
                  textContentType="newPassword"
                />

                <PasswordField
                  label="Confirm password"
                  value={form.confirmPassword}
                  onChangeText={setField("confirmPassword")}
                  error={errors.confirmPassword}
                  placeholder="Re-enter your password"
                  autoComplete="new-password"
                  textContentType="newPassword"
                  onSubmitEditing={onSubmit}
                  returnKeyType="go"
                />

                <Button
                  title="Continue"
                  onPress={onSubmit}
                  loading={submitting}
                  disabled={outsideArea}
                />
                <Text className="mt-3 text-center text-xs text-gray-500">
                  We&apos;ll email you a code to confirm it&apos;s really you.
                </Text>

                <View className="mt-6 flex-row justify-center">
                  <Text className="text-sm text-gray-600">Already have an account? </Text>
                  <Link href={loginHref}>
                <Text className="text-sm font-semibold text-primary">Sign in</Text>
              </Link>
                </View>
                <View className="mt-4 flex-row justify-center">
                  <Link href="/">
                <Text className="text-sm font-medium text-gray-500">Browse without an account</Text>
              </Link>
                </View>
              </>
            )}
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
