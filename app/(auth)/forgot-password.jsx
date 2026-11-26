// app/(auth)/forgot-password.jsx — request a reset code by email, then set a new password.
import { useState } from "react";
import { LIMITS } from "../../lib/inputLimits";
import { KeyboardAvoidingView, Platform, Pressable, ScrollView, Text, View } from "react-native";
import { Link, useLocalSearchParams, useRouter } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";

import Button from "../../components/Button";
import TextField from "../../components/TextField";
import PasswordField from "../../components/PasswordField";
import api from "../../lib/api";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const NO_ERRORS = { email: "", code: "", password: "", confirmPassword: "", form: "" };

export default function ForgotPassword() {
  const router = useRouter();
  const params = useLocalSearchParams();

  // "email": ask for the address. "reset": enter the code and a new password.
  const [step, setStep] = useState("email");
  const [form, setForm] = useState({
    email: typeof params.email === "string" ? params.email : "",
    code: "",
    password: "",
    confirmPassword: "",
  });
  const [errors, setErrors] = useState(NO_ERRORS);
  const [notice, setNotice] = useState("");
  const [sending, setSending] = useState(false);
  const [resetting, setResetting] = useState(false);

  const setField = (key) => (value) => setForm((f) => ({ ...f, [key]: value }));

  const sendCode = async () => {
    const email = form.email.trim();
    if (!EMAIL_RE.test(email)) {
      setErrors({ ...NO_ERRORS, email: "Please enter a valid email address." });
      return;
    }
    setErrors(NO_ERRORS);
    setNotice("");
    setSending(true);
    try {
      const { data } = await api.post("/auth/forgot-password", { email });
      setNotice(data?.message || "Check your email for a 6-digit code.");
      setStep("reset");
    } catch (error) {
      setErrors({ ...NO_ERRORS, form: error.message || "Couldn't send the code. Try again." });
    } finally {
      setSending(false);
    }
  };

  const validateReset = () => {
    const next = { ...NO_ERRORS };
    if (!/^\d{6}$/.test(form.code.trim())) next.code = "Enter the 6-digit code from the email.";
    if (form.password.length < 8) next.password = "Password must be at least 8 characters.";
    if (form.password !== form.confirmPassword) next.confirmPassword = "Passwords do not match.";
    setErrors(next);
    return !next.code && !next.password && !next.confirmPassword;
  };

  const resetPassword = async () => {
    if (!validateReset()) return;
    setNotice("");
    setResetting(true);
    try {
      await api.post("/auth/reset-password", {
        email: form.email.trim(),
        code: form.code.trim(),
        password: form.password,
      });
      router.replace({ pathname: "/login", params: { reset: "1" } });
    } catch (error) {
      setErrors({ ...NO_ERRORS, form: error.message || "Couldn't reset the password. Try again." });
    } finally {
      setResetting(false);
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
            <Text className="mb-2 text-3xl font-extrabold text-gray-900">Reset password</Text>
            <Text className="mb-8 text-base text-gray-500">
              {step === "email"
                ? "Enter your account's email and we'll send you a 6-digit code."
                : `Enter the code sent to ${form.email.trim()} and choose a new password.`}
            </Text>

            {notice ? (
              <Text className="mb-6 rounded-lg bg-teal-50 p-3 text-sm text-primary-soft-foreground">{notice}</Text>
            ) : null}

            {errors.form ? (
              <Text
                accessibilityRole="alert"
                className="mb-6 rounded-lg bg-red-50 p-3 text-sm text-red-700"
              >
                {errors.form}
              </Text>
            ) : null}

            {step === "email" ? (
              <>
                <TextField
                  label="Email" maxLength={LIMITS.email}
                  value={form.email}
                  onChangeText={setField("email")}
                  error={errors.email}
                  placeholder="you@example.com"
                  autoCapitalize="none"
                  autoComplete="email"
                  keyboardType="email-address"
                  inputMode="email"
                  onSubmitEditing={sendCode}
                  returnKeyType="send"
                />
                <Button title="Send code" onPress={sendCode} loading={sending} />
              </>
            ) : (
              <>
                <TextField
                  label="6-digit code"
                  value={form.code}
                  onChangeText={(v) => setField("code")(v.replace(/\D/g, "").slice(0, 6))}
                  error={errors.code}
                  placeholder="123456"
                  keyboardType="number-pad"
                  inputMode="numeric"
                  autoComplete="one-time-code"
                  textContentType="oneTimeCode"
                  maxLength={6}
                />
                <PasswordField
                  label="New password"
                  value={form.password}
                  onChangeText={setField("password")}
                  error={errors.password}
                  placeholder="At least 8 characters"
                  autoComplete="new-password"
                  textContentType="newPassword"
                />
                <PasswordField
                  label="Confirm new password"
                  value={form.confirmPassword}
                  onChangeText={setField("confirmPassword")}
                  error={errors.confirmPassword}
                  placeholder="Re-enter your new password"
                  autoComplete="new-password"
                  textContentType="newPassword"
                  onSubmitEditing={resetPassword}
                  returnKeyType="go"
                />
                <Button title="Reset password" onPress={resetPassword} loading={resetting} />

                <View className="mt-4 flex-row flex-wrap items-center justify-between gap-2">
                  <Pressable
                    accessibilityRole="button"
                    onPress={sendCode}
                    disabled={sending}
                    className={sending ? "opacity-50" : ""}
                  >
                    <Text className="text-sm font-medium text-primary">
                      {sending ? "Sending…" : "Resend code"}
                    </Text>
                  </Pressable>
                  <Pressable
                    accessibilityRole="button"
                    onPress={() => {
                      setStep("email");
                      setErrors(NO_ERRORS);
                      setNotice("");
                    }}
                  >
                    <Text className="text-sm font-medium text-gray-600">Use a different email</Text>
                  </Pressable>
                </View>
              </>
            )}

            <View className="mt-8 flex-row justify-center">
              <Link href="/login">
                <Text className="text-sm font-semibold text-primary">Back to sign in</Text>
              </Link>
            </View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
