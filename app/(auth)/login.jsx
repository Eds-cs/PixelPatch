// app/(auth)/login.jsx — ported from legacy-web/src/components/Login.jsx
import { useEffect, useState } from "react";
import { KeyboardAvoidingView, Platform, Pressable, ScrollView, Text, View } from "react-native";
import { Link, useLocalSearchParams } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";

import Button from "../../components/Button";
import TextField from "../../components/TextField";
import PasswordField from "../../components/PasswordField";
import { useAuth } from "../../lib/auth";
import { useGoogleAuth, idTokenFrom, isGoogleConfigured } from "../../lib/google";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export default function Login() {
  const { login, loginWithGoogle, sessionNotice } = useAuth();
  // Set by the forgot-password screen after a successful reset.
  const { reset } = useLocalSearchParams();

  const [form, setForm] = useState({ email: "", password: "", rememberMe: false });
  const [errors, setErrors] = useState({ email: "", password: "" });
  const [submitting, setSubmitting] = useState(false);

  const googleEnabled = isGoogleConfigured();
  const [googleRequest, googleResponse, promptGoogle] = useGoogleAuth();
  const [googlePending, setGooglePending] = useState(false);
  // Derived, not written from the effect: the button is busy from the moment it
  // is pressed until the auth session produces a response of any kind.
  const googleBusy = googlePending && !googleResponse;

  // The auth session resolves asynchronously after the browser closes, so the
  // exchange happens here rather than inline at the press handler.
  useEffect(() => {
    const idToken = idTokenFrom(googleResponse);
    if (!idToken) return;
    (async () => {
      try {
        await loginWithGoogle(idToken, true);
      } catch (e) {
        setErrors({ email: "", password: e.message || "Google sign-in failed." });
      } finally {
        setGooglePending(false);
      }
    })();
  }, [googleResponse, loginWithGoogle]);

  const setField = (key) => (value) => setForm((f) => ({ ...f, [key]: value }));

  const validate = () => {
    const next = { email: "", password: "" };
    if (!EMAIL_RE.test(form.email.trim())) {
      next.email = "Please enter a valid email address.";
    }
    if (form.password.trim().length < 8) {
      next.password = "Password must be at least 8 characters.";
    }
    setErrors(next);
    return !next.email && !next.password;
  };

  const onSubmit = async () => {
    if (!validate()) return;
    setSubmitting(true);
    try {
      await login(form.email.trim(), form.password, form.rememberMe);
      // The root layout's auth gate handles the redirect once token state flips.
    } catch (error) {
      console.error("Login failed:", error);
      // Same server-error mapping the legacy component used.
      const message = error.message || "";
      // The server deliberately doesn't say whether the email exists.
      if (message.includes("Incorrect email or password")) {
        setErrors({ email: "", password: "Incorrect email or password." });
      } else if (message.startsWith("Too many")) {
        setErrors({ email: "", password: message });
      } else {
        setErrors({ email: "", password: "Login failed. Try again." });
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
            <Text className="mb-2 text-3xl font-extrabold text-brand-600">PixelPatch</Text>
            <Text className="mb-8 text-base text-gray-500">
              Sign in to book and track your repairs.
            </Text>

            {sessionNotice ? (
              <Text
                accessibilityRole="alert"
                className="mb-6 rounded-lg bg-amber-50 p-3 text-sm text-amber-800"
              >
                {sessionNotice}
              </Text>
            ) : null}

            {reset === "1" && !sessionNotice ? (
              <Text
                accessibilityRole="alert"
                className="mb-6 rounded-lg bg-green-50 p-3 text-sm text-green-800"
              >
                Your password has been reset. Sign in with your new password.
              </Text>
            ) : null}

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

            <PasswordField
              label="Password"
              value={form.password}
              onChangeText={setField("password")}
              error={errors.password}
              placeholder="Your password"
              autoComplete="current-password"
              onSubmitEditing={onSubmit}
              returnKeyType="go"
            />

            <View className="mb-6 flex-row items-center justify-between">
              <Pressable
                accessibilityRole="checkbox"
                accessibilityState={{ checked: form.rememberMe }}
                onPress={() => setField("rememberMe")(!form.rememberMe)}
                className="flex-row items-center"
              >
                <View
                  className={`mr-2 h-5 w-5 items-center justify-center rounded border ${
                    form.rememberMe ? "border-brand-600 bg-brand-600" : "border-gray-400 bg-white"
                  }`}
                >
                  {form.rememberMe ? (
                    <Text className="text-xs font-bold text-white">✓</Text>
                  ) : null}
                </View>
                <Text className="text-sm text-gray-700">Remember me</Text>
              </Pressable>

              <Link
                href={{
                  pathname: "/forgot-password",
                  params: form.email.trim() ? { email: form.email.trim() } : {},
                }}
                className="text-sm font-medium text-brand-600"
              >
                Forgot password?
              </Link>
            </View>

            <Button title="Sign in" onPress={onSubmit} loading={submitting} />

            {googleEnabled ? (
              <View>
                <View className="my-5 flex-row items-center">
                  <View className="h-px flex-1 bg-gray-200" />
                  <Text className="mx-3 text-xs text-gray-400">or</Text>
                  <View className="h-px flex-1 bg-gray-200" />
                </View>

                <Pressable
                  onPress={() => {
                    setGooglePending(true);
                    promptGoogle();
                  }}
                  disabled={!googleRequest || googleBusy}
                  accessibilityRole="button"
                  accessibilityLabel="Continue with Google"
                  className={`h-12 flex-row items-center justify-center rounded-lg border border-gray-300 bg-white active:bg-gray-50 ${
                    !googleRequest || googleBusy ? "opacity-50" : ""
                  }`}
                >
                  <Ionicons name="logo-google" size={18} color="#4285F4" />
                  <Text className="ml-2.5 text-base font-semibold text-gray-700">
                    {googleBusy ? "Signing in…" : "Continue with Google"}
                  </Text>
                </Pressable>
              </View>
            ) : null}

            <View className="mt-6 flex-row justify-center">
              <Text className="text-sm text-gray-600">Don&apos;t have an account? </Text>
              <Link href="/signup" className="text-sm font-semibold text-brand-600">
                Sign up
              </Link>
            </View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
