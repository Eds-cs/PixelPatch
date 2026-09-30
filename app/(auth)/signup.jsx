// app/(auth)/signup.jsx — ported from legacy-web/src/components/SignUp.jsx
// Posts to POST /api/auth/register.
import { useState } from "react";
import { KeyboardAvoidingView, Platform, ScrollView, Text, View } from "react-native";
import { Link } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";

import Button from "../../components/Button";
import TextField from "../../components/TextField";
import { useAuth } from "../../lib/auth";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export default function SignUp() {
  const { signup, login } = useAuth();

  const [form, setForm] = useState({
    first_name: "",
    last_name: "",
    email: "",
    phone: "",
    password: "",
    confirmPassword: "",
  });
  const [errors, setErrors] = useState({});
  const [submitting, setSubmitting] = useState(false);

  const setField = (key) => (value) => setForm((f) => ({ ...f, [key]: value }));

  const validate = () => {
    const next = {};
    if (!form.first_name.trim()) next.first_name = "First name is required.";
    if (!form.last_name.trim()) next.last_name = "Last name is required.";
    if (!EMAIL_RE.test(form.email.trim())) next.email = "Please enter a valid email address.";
    if (form.password.length < 8) next.password = "Password must be at least 8 characters.";
    if (form.password !== form.confirmPassword) next.confirmPassword = "Passwords do not match.";
    setErrors(next);
    return Object.keys(next).length === 0;
  };

  const onSubmit = async () => {
    if (!validate()) return;
    setSubmitting(true);
    try {
      await signup({
        role_id: 1, // client account
        first_name: form.first_name.trim(),
        middle_name: null,
        last_name: form.last_name.trim(),
        birthdate: null,
        email: form.email.trim(),
        phone: form.phone.trim() || null,
        password: form.password,
      });
      // Register does not return a token, so sign in straight away.
      await login(form.email.trim(), form.password, true);
    } catch (error) {
      const message = error.message || "";
      if (message.toLowerCase().includes("duplicate") || message.toLowerCase().includes("exists")) {
        setErrors({ email: "An account with this email already exists." });
      } else {
        setErrors({ email: message || "Sign up failed. Please try again." });
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
            <Text className="mb-2 text-3xl font-extrabold text-blue-600">Create account</Text>
            <Text className="mb-8 text-base text-gray-500">
              Join PixelPatch to get your devices repaired.
            </Text>

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
              label="Phone (optional)"
              value={form.phone}
              onChangeText={setField("phone")}
              error={errors.phone}
              placeholder="09XX XXX XXXX"
              keyboardType="phone-pad"
              inputMode="tel"
            />

            <TextField
              label="Password"
              value={form.password}
              onChangeText={setField("password")}
              error={errors.password}
              placeholder="At least 8 characters"
              autoCapitalize="none"
              secureTextEntry
            />

            <TextField
              label="Confirm password"
              value={form.confirmPassword}
              onChangeText={setField("confirmPassword")}
              error={errors.confirmPassword}
              placeholder="Re-enter your password"
              autoCapitalize="none"
              secureTextEntry
              onSubmitEditing={onSubmit}
              returnKeyType="go"
            />

            <Button title="Create account" onPress={onSubmit} loading={submitting} />

            <View className="mt-6 flex-row justify-center">
              <Text className="text-sm text-gray-600">Already have an account? </Text>
              <Link href="/login" className="text-sm font-semibold text-blue-600">
                Sign in
              </Link>
            </View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
