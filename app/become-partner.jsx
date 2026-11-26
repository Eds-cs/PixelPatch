// app/become-partner.jsx
// Shop registration (AGENTS.md, "Becoming a business"). Five steps; the server
// re-checks everything when the form is submitted (POST /api/business-register,
// multipart).
//
//   POST /api/business-register/email-code   { email }        sends a 6-digit code
//   POST /api/business-register/email-verify { email, code }  -> { token }
//   POST /api/business-register/check-phone  { phone }        is the number free?
//
// Every problem is shown on its own input (red outline and message). Server
// errors carry `field`, mapped to the step and input by FIELD_STEP.
import { useEffect, useRef, useState } from "react";
import { LIMITS } from "../lib/inputLimits";
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  Text,
  View,
} from "react-native";
import { Stack, useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";

import Button from "../components/Button";
import TextField from "../components/TextField";
import DateField from "../components/DateField";
import BarangayPicker from "../components/BarangayPicker";
import ConsentCheckbox from "../components/ConsentCheckbox";
import PaymentTermsFields from "../components/PaymentTermsFields";
import PolicyModal from "../components/PolicyModal";
import api from "../lib/api";
import { useFetch } from "../lib/useFetch";
import { useAuth } from "../lib/auth";
import { appendFile, multipartConfig, pickDocument } from "../lib/upload";
import { shopTermsProblem } from "../lib/paymentTerms";
import { CUSTOM_CATEGORY_MAX, OFFERED_CATEGORIES, categoryLabel } from "../lib/serviceCategories";
import { BANKS, ENABLED_PAYOUT_METHODS, PAYOUT_LABELS } from "../lib/payoutMethods";
import { BUSINESS_PRIVACY, BUSINESS_TERMS } from "../lib/policies/business";
import { COLORS } from "../constants/theme";
import {
  PHONE_MAX_LENGTH,
  PHONE_MESSAGE,
  PHONE_PLACEHOLDER,
  cleanPhoneInput,
  normalizePhone,
  phoneProblem,
} from "../lib/phone";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const STEPS = ["Business", "Location", "Services", "Payout", "Documents"];
const DAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
const TIME_UNITS = ["HOURS", "DAYS", "WEEKS"];
const WHOLE = /^\d{1,3}$/;
const TIN_RE = /^\d{9}(\d{3}|\d{5})?$/;
const tinDigits = (value) => String(value ?? "").replace(/[\s-]/g, "");
const normEmail = (value) => String(value ?? "").trim().toLowerCase();

const DELIVERY_OPTIONS = [
  { key: "dropoff", label: "Drop-off", hint: "Customers bring the device to your shop", icon: "storefront-outline" },
  { key: "pickup", label: "Pickup", hint: "You collect the device from the customer", icon: "car-outline" },
  { key: "onsite", label: "On-site", hint: "You repair at the customer's place", icon: "home-outline" },
];

// Keep in sync with DOCUMENT_TYPES in server/utils/shopDocuments.js.
const DOCUMENTS = [
  {
    key: "BUSINESS_PERMIT",
    label: "Business permit (Mayor's permit)",
    hint: "Issued by Zamboanga City Hall.",
    required: true,
  },
  { key: "DTI_SEC_REGISTRATION", label: "DTI or SEC registration", hint: "Helps us review your shop faster." },
  { key: "BIR_REGISTRATION", label: "BIR certificate of registration (Form 2303)", hint: "Helps us review your shop faster." },
];

const EMPTY_SERVICE = {
  category: "",
  custom_category: "",
  repair_service: "",
  description: "",
  price: "",
  time_from: "",
  time_to: "",
  time_unit: "DAYS",
};

// Which step each server field belongs to.
function fieldStep(field) {
  if (!field) return null;
  if (["business_name", "business_email", "email_code", "business_phone", "description"].includes(field)) return 0;
  if (["street", "barangay", "postal_code", "days", "open_time", "close_time"].includes(field)) return 1;
  if (field === "delivery" || field === "services" || field.startsWith("service.")) return 2;
  if (["payment_method", "bank_name", "account_name", "account_number", "tin", "deposit_percent"].includes(field)) return 3;
  if (field === "terms" || field.startsWith("documents")) return 4;
  return null;
}

const optional = (label) => `${label} (optional)`;

function Chip({ label, selected, onPress, invalid }) {
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="radio"
      accessibilityState={{ selected }}
      className={`mb-2 mr-2 min-h-11 justify-center rounded-full border px-3.5 py-2 ${
        selected ? "border-primary bg-primary" : invalid ? "border-red-500 bg-white" : "border-gray-300 bg-white"
      }`}
    >
      <Text className={`text-xs font-semibold ${selected ? "text-white" : "text-gray-700"}`}>{label}</Text>
    </Pressable>
  );
}

function Card({ title, children, invalid }) {
  return (
    <View className={`mb-4 rounded-xl border bg-white p-4 ${invalid ? "border-red-500" : "border-gray-200"}`}>
      {title ? <Text className="mb-3 text-sm font-bold uppercase tracking-wide text-gray-500">{title}</Text> : null}
      {children}
    </View>
  );
}

const FieldError = ({ message }) =>
  message ? <Text accessibilityRole="alert" className="mb-3 text-sm text-red-600">{message}</Text> : null;

export default function BecomePartner() {
  const router = useRouter();
  const scrollRef = useRef(null);
  const { isBusiness, refreshSession } = useAuth();
  // An existing registration: waiting for an admin, or already approved.
  const myShop = useFetch("/my-shop");
  const [checking, setChecking] = useState(false);
  const [statusNote, setStatusNote] = useState(null);

  const [step, setStep] = useState(0);
  const [errors, setErrors] = useState({});
  const [formError, setFormError] = useState(null);
  const [busy, setBusy] = useState(false);
  const [policy, setPolicy] = useState(null); // BUSINESS_TERMS | BUSINESS_PRIVACY | null

  const [biz, setBiz] = useState({ business_name: "", business_email: "", business_phone: "", description: "" });
  const [loc, setLoc] = useState({
    barangay: "",
    street: "",
    postal_code: "",
    days_from: "Mon",
    days_to: "Sat",
    open_time: "09:00",
    close_time: "18:00",
  });
  const [services, setServices] = useState([{ ...EMPTY_SERVICE }]);
  const [delivery, setDelivery] = useState({ dropoff: true, pickup: false, onsite: false });
  const [payment, setPayment] = useState({
    payment_method: ENABLED_PAYOUT_METHODS[0],
    bank_name: "",
    bank_other: "",
    account_name: "",
    account_number: "",
    tin: "",
    // Default payment terms for the shop's quotations (lib/paymentTerms.js).
    accepts_cash: false,
    deposit_percent: "100",
    terms: false,
    privacy: false,
  });
  // { [DOCUMENTS key]: document-picker asset }
  const [documents, setDocuments] = useState({});

  // ---------- business email code ----------
  const [emailCode, setEmailCode] = useState("");
  const [codeSentTo, setCodeSentTo] = useState(null);
  const [sendingCode, setSendingCode] = useState(false);
  const [verifyingCode, setVerifyingCode] = useState(false);
  const [cooldown, setCooldown] = useState(0);
  const [emailNote, setEmailNote] = useState(null);
  // { email, token } once the code is verified; only valid for that email.
  const [verified, setVerified] = useState(null);
  const emailVerified = Boolean(verified) && verified.email === normEmail(biz.business_email);

  // Counts the resend wait down one second at a time.
  useEffect(() => {
    if (cooldown <= 0) return undefined;
    const timer = setTimeout(() => setCooldown((s) => Math.max(0, s - 1)), 1000);
    return () => clearTimeout(timer);
  }, [cooldown]);

  // ---------- field helpers ----------
  const clearError = (...keys) =>
    setErrors((prev) => {
      if (!keys.some((k) => k in prev)) return prev;
      const next = { ...prev };
      keys.forEach((k) => delete next[k]);
      return next;
    });
  const setBizField = (k) => (v) => {
    setBiz((s) => ({ ...s, [k]: v }));
    clearError(k);
  };
  const setLocField = (k) => (v) => {
    setLoc((s) => ({ ...s, [k]: v }));
    clearError(k, k === "days_from" || k === "days_to" ? "days" : k);
  };
  const setPayField = (k) => (v) => {
    setPayment((s) => ({ ...s, [k]: v }));
    clearError(k, k === "bank_other" ? "bank_name" : k);
  };
  const setServiceField = (i, k) => (v) => {
    setServices((prev) => prev.map((s, j) => (j === i ? { ...s, [k]: v } : s)));
    clearError(`service.${i}.${k}`, k.startsWith("time_") ? `service.${i}.turnaround` : "", "services");
  };
  const showErrors = (errs, message = "Fix the highlighted fields to continue.") => {
    setErrors(errs);
    setFormError(message);
    scrollRef.current?.scrollTo?.({ y: 0, animated: true });
  };

  // ---------- per-step checks (mirror the server) ----------
  function validateStep(n) {
    const e = {};
    if (n === 0) {
      const name = biz.business_name.trim();
      if (name.length < 2 || name.length > 100) e.business_name = "Enter your business name (2 to 100 characters).";
      if (!EMAIL_RE.test(biz.business_email.trim())) e.business_email = "Enter a valid email address, like shop@gmail.com.";
      else if (!emailVerified) e.business_email = "Verify this email: send a code and enter it below.";
      if (!normalizePhone(biz.business_phone)) e.business_phone = PHONE_MESSAGE;
      const about = biz.description.trim().length;
      if (about < 20 || about > 1000) e.description = "Describe your shop in 20 to 1000 characters.";
    }
    if (n === 1) {
      if (!loc.street.trim()) e.street = "Enter the shop's street address.";
      if (!loc.barangay) e.barangay = "Choose your shop's barangay in Zamboanga City.";
      if (loc.postal_code.trim() && !/^\d{4}$/.test(loc.postal_code.trim())) e.postal_code = "Postal code must be 4 digits.";
      if (!loc.open_time) e.open_time = "Choose your opening time.";
      if (!loc.close_time) e.close_time = "Choose your closing time.";
      else if (loc.open_time && loc.close_time.slice(0, 5) <= loc.open_time.slice(0, 5)) {
        e.close_time = "Closing time must be after opening time.";
      }
    }
    if (n === 2) {
      if (!delivery.dropoff && !delivery.pickup && !delivery.onsite) {
        e.delivery = "Choose at least one way customers can get their device repaired.";
      }
      if (services.length === 0) e.services = "Add at least one service.";
      services.forEach((s, i) => {
        const f = (k) => `service.${i}.${k}`;
        if (!OFFERED_CATEGORIES.includes(s.category)) e[f("category")] = "Choose a device category.";
        else if (s.category === "OTHER") {
          const typed = s.custom_category.trim();
          if (typed.length < 2 || typed.length > CUSTOM_CATEGORY_MAX) e[f("custom_category")] = "Type the device, e.g. Game console.";
        }
        if (!s.repair_service.trim()) e[f("repair_service")] = "Name the repair service.";
        if (!s.description.trim()) e[f("description")] = "Describe what the service includes.";
        const price = Number(s.price);
        if (!s.price || !Number.isFinite(price) || price <= 0) e[f("price")] = "Enter a price above 0.";
        if (!WHOLE.test(s.time_from.trim()) || !WHOLE.test(s.time_to.trim()) || Number(s.time_from) < 1
          || Number(s.time_from) > Number(s.time_to)) {
          e[f("turnaround")] = "Enter a range like 1 to 3, smaller number first.";
        }
      });
    }
    if (n === 3) {
      if (payment.payment_method === "BANK") {
        const bank = payment.bank_name === "Other" ? payment.bank_other.trim() : payment.bank_name;
        if (!bank || bank.length < 2) e.bank_name = "Choose or type your bank.";
        if (!/^\d{6,20}$/.test(payment.account_number.replace(/[\s-]/g, ""))) {
          e.account_number = "Bank account number must be 6 to 20 digits.";
        }
      } else if (!normalizePhone(payment.account_number)) {
        e.account_number = PHONE_MESSAGE;
      }
      if (!payment.account_name.trim()) e.account_name = "Enter the account holder's name.";
      if (!TIN_RE.test(tinDigits(payment.tin))) e.tin = "Enter the TIN: 9 digits, or 12 to 14 with the branch code.";
      const termsProblem = shopTermsProblem({ acceptsCash: payment.accepts_cash, depositPercent: payment.deposit_percent });
      if (termsProblem) e.deposit_percent = termsProblem;
    }
    if (n === 4) {
      DOCUMENTS.forEach((d) => {
        if (d.required && !documents[d.key]) e[`documents.${d.key}`] = "This document is required.";
      });
      if (!payment.terms || !payment.privacy) e.terms = "Agree to the Business Terms and Business Privacy Policy to submit.";
    }
    return e;
  }

  // ---------- email code ----------
  const sendCode = async () => {
    const email = normEmail(biz.business_email);
    if (!EMAIL_RE.test(email)) {
      setErrors((p) => ({ ...p, business_email: "Enter a valid email address, like shop@gmail.com." }));
      return;
    }
    setSendingCode(true);
    setEmailNote(null);
    clearError("business_email", "email_code");
    try {
      const { data } = await api.post("/business-register/email-code", { email });
      setCodeSentTo(email);
      setEmailCode("");
      setCooldown(Number(data?.retry_after) || 60);
      setEmailNote(data?.message || `We sent a 6-digit code to ${email}.`);
    } catch (e) {
      const retry = Number(e.response?.data?.retry_after);
      if (retry) {
        setCooldown(retry);
        setCodeSentTo(email);
      }
      setErrors((p) => ({ ...p, business_email: e.message || "Couldn't send the code." }));
    } finally {
      setSendingCode(false);
    }
  };

  const verifyCode = async () => {
    const email = codeSentTo;
    if (!/^\d{6}$/.test(emailCode)) {
      setErrors((p) => ({ ...p, email_code: "Enter the 6-digit code from the email." }));
      return;
    }
    setVerifyingCode(true);
    clearError("email_code");
    try {
      const { data } = await api.post("/business-register/email-verify", { email, code: emailCode });
      setVerified({ email, token: data.token });
      setEmailNote(null);
      setCodeSentTo(null);
      setEmailCode("");
      clearError("business_email");
    } catch (e) {
      setErrors((p) => ({ ...p, email_code: e.message || "That code didn't work." }));
    } finally {
      setVerifyingCode(false);
    }
  };

  // ---------- navigation ----------
  const next = async () => {
    const errs = validateStep(step);
    if (Object.keys(errs).length) {
      showErrors(errs);
      return;
    }
    if (step === 0) {
      // Is the business number already used by another shop or account?
      setBusy(true);
      try {
        await api.post("/business-register/check-phone", { phone: normalizePhone(biz.business_phone) });
      } catch (e) {
        setBusy(false);
        const field = e.response?.data?.field;
        if (field) showErrors({ [field]: e.message });
        else setFormError(e.message || "Couldn't check the phone number. Try again.");
        return;
      }
      setBusy(false);
    }
    setErrors({});
    setFormError(null);
    setStep((s) => Math.min(s + 1, STEPS.length - 1));
    scrollRef.current?.scrollTo?.({ y: 0, animated: false });
  };

  const back = () => {
    setErrors({});
    setFormError(null);
    setStep((s) => Math.max(s - 1, 0));
  };

  const submit = async () => {
    // Check every step, and go to the first one with a problem.
    for (let n = 0; n < STEPS.length; n += 1) {
      const errs = validateStep(n);
      if (Object.keys(errs).length) {
        setStep(n);
        showErrors(errs);
        return;
      }
    }
    setBusy(true);
    setFormError(null);
    try {
      const fd = new FormData();
      const fields = {
        ...biz,
        business_email: normEmail(biz.business_email),
        business_email_token: verified?.token ?? "",
        business_phone: normalizePhone(biz.business_phone),
        ...loc,
      };
      Object.entries(fields).forEach(([key, value]) => fd.append(key, String(value ?? "").trim()));
      // Nested values travel as JSON text in a multipart form.
      fd.append(
        "services",
        JSON.stringify(
          services.map((s) => ({
            ...s,
            custom_category: s.category === "OTHER" ? s.custom_category.trim() : "",
            price: String(Number(s.price)),
          }))
        )
      );
      fd.append("delivery", JSON.stringify(delivery));
      const { bank_other: bankOther, ...pay } = payment;
      fd.append(
        "payment",
        JSON.stringify({ ...pay, bank_name: pay.bank_name === "Other" ? bankOther.trim() : pay.bank_name })
      );
      for (const doc of DOCUMENTS) {
        if (documents[doc.key]) await appendFile(fd, doc.key, documents[doc.key]);
      }
      await api.post("/business-register", fd, { ...multipartConfig(), timeout: 120000 });
      // The account becomes a business once an admin approves the shop.
      await myShop.refresh();
    } catch (e) {
      const field = e.response?.data?.field;
      const target = fieldStep(field?.startsWith("documents") ? "documents" : field);
      if (target !== null) {
        setStep(target);
        showErrors({ [field]: e.message }, e.message);
      } else {
        setFormError(e.message || "Registration failed. Please review your details.");
        scrollRef.current?.scrollTo?.({ y: 0, animated: true });
      }
    } finally {
      setBusy(false);
    }
  };

  // "Check status": picks up an approval without signing out and in again.
  const checkStatus = async () => {
    setChecking(true);
    setStatusNote(null);
    try {
      const current = await refreshSession();
      if (Number(current?.role_id) === 3) {
        router.replace("/business/dashboard");
        return;
      }
      await myShop.refresh();
      setStatusNote("Still under review. We'll email you as soon as an admin has checked your shop.");
    } catch (e) {
      setStatusNote(e.message || "Couldn't check right now. Try again in a moment.");
    } finally {
      setChecking(false);
    }
  };

  const chooseDocument = async (key) => {
    clearError(`documents.${key}`, "documents");
    try {
      const asset = await pickDocument();
      if (asset) setDocuments((d) => ({ ...d, [key]: asset }));
    } catch (e) {
      setErrors((p) => ({ ...p, [`documents.${key}`]: e.message || "Couldn't open that file." }));
    }
  };
  const removeDocument = (key) =>
    setDocuments((d) => {
      const rest = { ...d };
      delete rest[key];
      return rest;
    });

  const application = myShop.data?.success ? myShop.data : null;

  if (myShop.loading) {
    return (
      <View className="flex-1 items-center justify-center bg-gray-50">
        <Stack.Screen options={{ title: "Become a partner", headerShown: true }} />
        <ActivityIndicator size="large" color={COLORS.primary} />
      </View>
    );
  }

  if (isBusiness || application) {
    const approved = isBusiness || application?.isVerified;
    return (
      <ScrollView
        className="flex-1 bg-gray-50"
        contentContainerStyle={{ padding: 16, maxWidth: 720, width: "100%", alignSelf: "center" }}
      >
        <Stack.Screen options={{ title: "Become a partner", headerShown: true }} />
        <View className="items-center rounded-xl border border-gray-200 bg-white p-6">
          <View
            className={`mb-4 h-16 w-16 items-center justify-center rounded-full ${
              approved ? "bg-success-soft" : "bg-warning-soft"
            }`}
          >
            <Ionicons
              name={approved ? "checkmark-circle" : "time"}
              size={34}
              color={approved ? COLORS.success : COLORS.warning}
            />
          </View>
          <Text className="text-center text-xl font-bold text-gray-900">
            {approved ? "Your shop is approved" : "Your application is under review"}
          </Text>
          {application?.shopName ? (
            <Text className="mt-1 text-center text-base font-semibold text-primary">{application.shopName}</Text>
          ) : null}
          <Text className="mt-3 text-center text-sm leading-6 text-gray-600">
            {approved
              ? "Your business portal is ready. You can still browse PixelPatch and book repairs at other shops."
              : "A PixelPatch admin checks every new shop and its documents before it goes live. You'll get an email when it's approved; until then you can keep using PixelPatch as a customer."}
          </Text>
          {statusNote ? (
            <Text className="mt-4 rounded-lg bg-gray-50 p-3 text-center text-sm text-gray-700">{statusNote}</Text>
          ) : null}
          <View className="mt-5 w-full gap-3">
            {isBusiness ? (
              <Button title="Open business portal" onPress={() => router.replace("/business/dashboard")} />
            ) : (
              <Button title={approved ? "Open business portal" : "Check status"} loading={checking} onPress={checkStatus} />
            )}
            <Button title="Back to home" variant="outline" onPress={() => router.replace("/")} />
          </View>
        </View>
      </ScrollView>
    );
  }

  const singlePayout = ENABLED_PAYOUT_METHODS.length === 1;
  const isBank = payment.payment_method === "BANK";

  return (
    <KeyboardAvoidingView className="flex-1 bg-gray-50" behavior={Platform.OS === "ios" ? "padding" : undefined}>
      <ScrollView
        ref={scrollRef}
        contentContainerStyle={{ padding: 16, maxWidth: 720, width: "100%", alignSelf: "center" }}
        keyboardShouldPersistTaps="handled"
      >
        <Stack.Screen options={{ title: "Become a partner", headerShown: true }} />

        {/* Step indicator */}
        <View className="mb-5 flex-row items-center">
          {STEPS.map((label, i) => (
            <View key={label} className="flex-1 flex-row items-center">
              <View className={`h-8 w-8 items-center justify-center rounded-full ${i <= step ? "bg-primary" : "bg-gray-200"}`}>
                {i < step ? (
                  <Ionicons name="checkmark" size={16} color="#fff" />
                ) : (
                  <Text className={`text-xs font-bold ${i === step ? "text-white" : "text-gray-500"}`}>{i + 1}</Text>
                )}
              </View>
              {i < STEPS.length - 1 ? <View className={`h-0.5 flex-1 ${i < step ? "bg-primary" : "bg-gray-200"}`} /> : null}
            </View>
          ))}
        </View>
        <Text className="mb-4 text-lg font-bold text-gray-900">
          {step + 1}. {STEPS[step]}
        </Text>

        {formError ? (
          <View accessibilityRole="alert" className="mb-4 flex-row items-start gap-2 rounded-lg border border-red-200 bg-red-50 p-3">
            <Ionicons name="alert-circle" size={18} color="#b91c1c" />
            <Text className="flex-1 text-sm text-red-700">{formError}</Text>
          </View>
        ) : null}

        {/* ---------- 1. Business ---------- */}
        {step === 0 ? (
          <Card title="Business details">
            <TextField
              label="Business name"
              value={biz.business_name}
              onChangeText={setBizField("business_name")}
              error={errors.business_name}
              placeholder="PixelFix Repairs"
              maxLength={LIMITS.shopName}
            />

            <TextField
              label="Business email"
              value={biz.business_email}
              onChangeText={(v) => {
                setBizField("business_email")(v);
                clearError("email_code");
              }}
              error={errors.business_email}
              autoComplete="email"
              placeholder="shop@gmail.com"
              autoCapitalize="none"
              keyboardType="email-address"
              inputMode="email"
              maxLength={LIMITS.email}
              right={
                emailVerified ? (
                  <View className="mr-3 flex-row items-center">
                    <Ionicons name="checkmark-circle" size={18} color={COLORS.success} />
                    <Text className="ml-1 text-xs font-semibold text-emerald-700">Verified</Text>
                  </View>
                ) : null
              }
            />
            {!emailVerified ? (
              <View className="-mt-2 mb-4 rounded-lg bg-gray-50 p-3">
                <Text className="mb-2 text-xs leading-5 text-gray-600">
                  We send a code to this email to make sure it&apos;s real and that your shop receives our messages.
                </Text>
                <Button
                  title={
                    cooldown > 0
                      ? `Resend code in ${cooldown}s`
                      : codeSentTo === normEmail(biz.business_email)
                      ? "Resend code"
                      : "Send code"
                  }
                  variant="outline"
                  loading={sendingCode}
                  disabled={cooldown > 0 || sendingCode || !biz.business_email.trim()}
                  onPress={sendCode}
                />
                {codeSentTo && codeSentTo === normEmail(biz.business_email) ? (
                  <View className="mt-3">
                    {emailNote ? <Text className="mb-2 text-xs text-teal-800">{emailNote}</Text> : null}
                    <TextField
                      label="6-digit code"
                      value={emailCode}
                      onChangeText={(v) => {
                        setEmailCode(v.replace(/\D/g, "").slice(0, 6));
                        clearError("email_code");
                      }}
                      error={errors.email_code}
                      placeholder="123456"
                      keyboardType="number-pad"
                      inputMode="numeric"
                      autoComplete="one-time-code"
                      maxLength={6}
                    />
                    <Button title="Verify email" loading={verifyingCode} disabled={emailCode.length !== 6} onPress={verifyCode} />
                  </View>
                ) : null}
              </View>
            ) : null}

            <TextField
              label="Business phone"
              value={biz.business_phone}
              onChangeText={(value) => setBizField("business_phone")(cleanPhoneInput(value))}
              error={errors.business_phone || phoneProblem(biz.business_phone)}
              placeholder={PHONE_PLACEHOLDER}
              keyboardType="phone-pad"
              inputMode="tel"
              maxLength={PHONE_MAX_LENGTH}
            />
            <Text className="-mt-2 mb-4 text-xs text-gray-500">
              Your shop&apos;s own number. It can&apos;t be one another shop or PixelPatch account already uses.
            </Text>

            <TextField
              label="About your shop"
              value={biz.description}
              onChangeText={setBizField("description")}
              error={errors.description}
              placeholder="What you repair, your experience, brands you specialise in…"
              multiline
              numberOfLines={4}
              maxLength={LIMITS.shopDescription}
              style={{ minHeight: 96, textAlignVertical: "top" }}
            />
            <Text className="-mt-2 text-xs text-gray-500">
              Customers see this on your shop page. {biz.description.trim().length}/1000, at least 20.
            </Text>
          </Card>
        ) : null}

        {/* ---------- 2. Location ---------- */}
        {step === 1 ? (
          <View>
            <Card title="Address">
              <TextField
                label="Street"
                value={loc.street}
                onChangeText={setLocField("street")}
                error={errors.street}
                placeholder="123 Rizal St."
                maxLength={LIMITS.addressLine}
              />
              <BarangayPicker
                label="Barangay (Zamboanga City)"
                value={loc.barangay}
                onChange={setLocField("barangay")}
                error={errors.barangay}
                placeholder="Select your shop's barangay"
              />
              <Text className="-mt-2 mb-4 text-xs text-gray-500">
                PixelPatch is only available in Zamboanga City, so shops must be located there.
              </Text>
              <TextField
                label={optional("Postal code")}
                value={loc.postal_code}
                onChangeText={setLocField("postal_code")}
                error={errors.postal_code}
                placeholder="7000"
                keyboardType="number-pad"
                inputMode="numeric"
                maxLength={4}
              />
            </Card>

            <Card title="Opening hours" invalid={Boolean(errors.days)}>
              <Text className="mb-1.5 text-sm font-medium text-gray-700">Open from</Text>
              <View className="mb-3 flex-row flex-wrap">
                {DAYS.map((d) => (
                  <Chip key={`from-${d}`} label={d} selected={loc.days_from === d} onPress={() => setLocField("days_from")(d)} />
                ))}
              </View>
              <Text className="mb-1.5 text-sm font-medium text-gray-700">Open until</Text>
              <View className="mb-3 flex-row flex-wrap">
                {DAYS.map((d) => (
                  <Chip key={`to-${d}`} label={d} selected={loc.days_to === d} onPress={() => setLocField("days_to")(d)} />
                ))}
              </View>
              <FieldError message={errors.days} />
              <View className="flex-row flex-wrap gap-3">
                <View className="flex-1" style={{ minWidth: 140 }}>
                  <DateField label="Opens at" mode="time" value={loc.open_time} onChange={setLocField("open_time")} error={errors.open_time} />
                </View>
                <View className="flex-1" style={{ minWidth: 140 }}>
                  <DateField label="Closes at" mode="time" value={loc.close_time} onChange={setLocField("close_time")} error={errors.close_time} />
                </View>
              </View>
            </Card>
          </View>
        ) : null}

        {/* ---------- 3. Services ---------- */}
        {step === 2 ? (
          <View>
            <Card title="How customers reach you" invalid={Boolean(errors.delivery)}>
              <Text className="mb-3 text-sm text-gray-600">Choose every option your shop offers.</Text>
              {DELIVERY_OPTIONS.map((opt) => {
                const on = delivery[opt.key];
                return (
                  <Pressable
                    key={opt.key}
                    onPress={() => {
                      setDelivery((d) => ({ ...d, [opt.key]: !d[opt.key] }));
                      clearError("delivery");
                    }}
                    accessibilityRole="checkbox"
                    accessibilityState={{ checked: on }}
                    className={`mb-2 min-h-12 flex-row items-center rounded-lg border px-3 py-2.5 ${
                      on ? "border-primary bg-teal-50" : "border-gray-200 bg-white"
                    }`}
                  >
                    <Ionicons name={opt.icon} size={20} color={on ? COLORS.primary : COLORS.textMuted} />
                    <View className="ml-3 flex-1">
                      <Text className="text-sm font-semibold text-gray-900">{opt.label}</Text>
                      <Text className="text-xs text-gray-500">{opt.hint}</Text>
                    </View>
                    <Ionicons name={on ? "checkbox" : "square-outline"} size={22} color={on ? COLORS.primary : COLORS.textMuted} />
                  </Pressable>
                );
              })}
              <FieldError message={errors.delivery} />
            </Card>

            <FieldError message={errors.services} />
            {services.map((svc, i) => {
              const f = (k) => errors[`service.${i}.${k}`];
              return (
                <Card key={i} title={`Service ${i + 1}`}>
                  <Text className="mb-1.5 text-sm font-medium text-gray-700">Device</Text>
                  <View className="mb-1 flex-row flex-wrap">
                    {OFFERED_CATEGORIES.map((c) => (
                      <Chip
                        key={c}
                        label={categoryLabel(c)}
                        selected={svc.category === c}
                        invalid={Boolean(f("category"))}
                        onPress={() => {
                          setServiceField(i, "category")(c);
                          clearError(`service.${i}.custom_category`);
                        }}
                      />
                    ))}
                  </View>
                  <FieldError message={f("category")} />
                  {svc.category === "OTHER" ? (
                    <TextField
                      label="What device is it for?"
                      value={svc.custom_category}
                      onChangeText={setServiceField(i, "custom_category")}
                      error={f("custom_category")}
                      placeholder="e.g. Game console, Smartwatch, Printer"
                      maxLength={CUSTOM_CATEGORY_MAX}
                    />
                  ) : null}

                  <TextField
                    label="Repair service"
                    value={svc.repair_service}
                    onChangeText={setServiceField(i, "repair_service")}
                    error={f("repair_service")}
                    placeholder="e.g. Screen replacement"
                    maxLength={LIMITS.serviceName}
                  />
                  <TextField
                    label="What's included"
                    value={svc.description}
                    onChangeText={setServiceField(i, "description")}
                    error={f("description")}
                    placeholder="e.g. Original-quality screen, fitting and a 30-day check"
                    multiline
                    numberOfLines={3}
                    maxLength={LIMITS.serviceDescription}
                    style={{ minHeight: 72, textAlignVertical: "top" }}
                  />
                  <TextField
                    label="Price (₱)"
                    maxLength={12}
                    value={svc.price}
                    onChangeText={setServiceField(i, "price")}
                    error={f("price")}
                    placeholder="1500"
                    keyboardType="decimal-pad"
                    inputMode="decimal"
                  />

                  <Text className="mb-1.5 text-sm font-medium text-gray-700">Turnaround</Text>
                  <View className="flex-row gap-3">
                    <View className="flex-1">
                      <TextField
                        label="From"
                        value={svc.time_from}
                        onChangeText={setServiceField(i, "time_from")}
                        error={f("turnaround") ? " " : null}
                        placeholder="1"
                        keyboardType="number-pad"
                        inputMode="numeric"
                        maxLength={3}
                      />
                    </View>
                    <View className="flex-1">
                      <TextField
                        label="To"
                        value={svc.time_to}
                        onChangeText={setServiceField(i, "time_to")}
                        error={f("turnaround") ? " " : null}
                        placeholder="3"
                        keyboardType="number-pad"
                        inputMode="numeric"
                        maxLength={3}
                      />
                    </View>
                  </View>
                  <View className="flex-row flex-wrap">
                    {TIME_UNITS.map((u) => (
                      <Chip key={u} label={u.charAt(0) + u.slice(1).toLowerCase()} selected={svc.time_unit === u} onPress={() => setServiceField(i, "time_unit")(u)} />
                    ))}
                  </View>
                  <FieldError message={f("turnaround")} />

                  {services.length > 1 ? (
                    <Button
                      title="Remove this service"
                      variant="ghost"
                      onPress={() => {
                        setServices((prev) => prev.filter((_, j) => j !== i));
                        setErrors({});
                      }}
                    />
                  ) : null}
                </Card>
              );
            })}

            <Button
              title="Add another service"
              variant="outline"
              className="mb-4"
              onPress={() => setServices((prev) => [...prev, { ...EMPTY_SERVICE }])}
            />
          </View>
        ) : null}

        {/* ---------- 4. Payout ---------- */}
        {step === 3 ? (
          <View>
            <Card title="Payout account">
              {singlePayout ? (
                <View className="mb-4 flex-row items-start gap-2 rounded-lg bg-teal-50 p-3">
                  <Ionicons name="wallet-outline" size={18} color={COLORS.primary} />
                  <Text className="flex-1 text-sm leading-5 text-teal-900">
                    Payouts are sent to a {PAYOUT_LABELS[ENABLED_PAYOUT_METHODS[0]]} account for now.
                  </Text>
                </View>
              ) : (
                <View>
                  <Text className="mb-1.5 text-sm font-medium text-gray-700">Payout method</Text>
                  <View className="mb-3 flex-row flex-wrap">
                    {ENABLED_PAYOUT_METHODS.map((m) => (
                      <Chip
                        key={m}
                        label={PAYOUT_LABELS[m]}
                        selected={payment.payment_method === m}
                        invalid={Boolean(errors.payment_method)}
                        onPress={() => {
                          setPayField("payment_method")(m);
                          clearError("account_number", "bank_name");
                        }}
                      />
                    ))}
                  </View>
                  <FieldError message={errors.payment_method} />
                </View>
              )}

              {isBank ? (
                <View>
                  <Text className="mb-1.5 text-sm font-medium text-gray-700">Bank</Text>
                  <View className="mb-1 flex-row flex-wrap">
                    {BANKS.map((b) => (
                      <Chip key={b} label={b} selected={payment.bank_name === b} invalid={Boolean(errors.bank_name)} onPress={() => setPayField("bank_name")(b)} />
                    ))}
                  </View>
                  {payment.bank_name === "Other" ? (
                    <TextField
                      label="Bank name"
                      value={payment.bank_other}
                      onChangeText={setPayField("bank_other")}
                      error={errors.bank_name}
                      placeholder="Your bank"
                      maxLength={LIMITS.bankName}
                    />
                  ) : (
                    <FieldError message={errors.bank_name} />
                  )}
                </View>
              ) : null}

              <TextField
                label="Account holder's name"
                value={payment.account_name}
                onChangeText={setPayField("account_name")}
                error={errors.account_name}
                placeholder="Juan Dela Cruz"
                maxLength={LIMITS.personName}
              />
              <TextField
                label={isBank ? "Account number" : `${PAYOUT_LABELS[payment.payment_method]} number`}
                value={payment.account_number}
                onChangeText={(v) => setPayField("account_number")(isBank ? v : cleanPhoneInput(v))}
                error={errors.account_number}
                placeholder={isBank ? "e.g. 001234567890" : PHONE_PLACEHOLDER}
                keyboardType="number-pad"
                inputMode="numeric"
                maxLength={isBank ? 24 : PHONE_MAX_LENGTH}
              />
              <TextField
                label="Business TIN"
                value={payment.tin}
                onChangeText={setPayField("tin")}
                error={errors.tin}
                placeholder="123-456-789-00000"
                keyboardType="number-pad"
                inputMode="numeric"
                maxLength={18}
              />
              <Text className="-mt-2 text-xs leading-5 text-gray-500">
                The tax identification number on your BIR registration.
              </Text>
            </Card>

            <Card title="How clients pay you" invalid={Boolean(errors.deposit_percent)}>
              <Text className="mb-3 text-sm leading-5 text-gray-600">
                Clients can always pay online. Online payments are held by PixelPatch until 7 days after the repair,
                then released to you. These are your defaults: you can change them for any quotation, and later in
                Shop profile.
              </Text>
              <PaymentTermsFields
                value={{ depositPercent: payment.deposit_percent, acceptsCash: payment.accepts_cash }}
                onChange={(next) => {
                  setPayment((p) => ({ ...p, deposit_percent: next.depositPercent, accepts_cash: next.acceptsCash }));
                  clearError("deposit_percent");
                }}
              />
              <FieldError message={errors.deposit_percent} />
            </Card>
          </View>
        ) : null}

        {/* ---------- 5. Documents ---------- */}
        {step === 4 ? (
          <View>
            <Card title="Proof of business">
              <Text className="mb-3 text-sm leading-5 text-gray-600">
                An admin checks these before your shop goes live. Upload a clear photo or PDF, up to 10 MB each.
              </Text>
              {DOCUMENTS.map((doc) => {
                const file = documents[doc.key];
                const err = errors[`documents.${doc.key}`];
                return (
                  <View key={doc.key} className={`mb-3 rounded-lg border p-3 ${err ? "border-red-500" : "border-gray-200"}`}>
                    <View className="flex-row flex-wrap items-center gap-2">
                      <Ionicons
                        name={file ? "checkmark-circle" : "document-text-outline"}
                        size={20}
                        color={file ? COLORS.success : err ? "#b91c1c" : COLORS.textMuted}
                      />
                      <View className="flex-1" style={{ minWidth: 180 }}>
                        <Text className="text-sm font-semibold text-gray-900">
                          {doc.required ? doc.label : optional(doc.label)}
                        </Text>
                        <Text className="text-xs text-gray-500" numberOfLines={1}>
                          {file ? file.name : doc.hint}
                        </Text>
                      </View>
                      <View className="flex-row gap-2">
                        {file ? <Button title="Remove" variant="ghost" onPress={() => removeDocument(doc.key)} /> : null}
                        <Button title={file ? "Replace" : "Upload"} variant="outline" onPress={() => chooseDocument(doc.key)} />
                      </View>
                    </View>
                    {err ? <Text accessibilityRole="alert" className="mt-2 text-sm text-red-600">{err}</Text> : null}
                  </View>
                );
              })}
              <FieldError message={errors.documents} />
            </Card>

            <Card title="Agreement">
              <ConsentCheckbox
                checked={payment.terms && payment.privacy}
                onChange={(value) => {
                  setPayment((p) => ({ ...p, terms: value, privacy: value }));
                  clearError("terms");
                }}
                error={errors.terms}
                what="listing my shop on PixelPatch"
                termsLabel="Business Terms of Service"
                privacyLabel="Business Privacy Policy"
                onOpenTerms={() => setPolicy(BUSINESS_TERMS)}
                onOpenPrivacy={() => setPolicy(BUSINESS_PRIVACY)}
              />
              <Text className="text-xs leading-5 text-gray-500">
                After you submit, a PixelPatch admin reviews your shop and documents. You stay a customer account until
                it&apos;s approved.
              </Text>
            </Card>
          </View>
        ) : null}

        <View className="flex-row gap-3">
          {step > 0 ? (
            <View className="flex-1">
              <Button title="Back" variant="outline" onPress={back} disabled={busy} />
            </View>
          ) : null}
          <View className="flex-1">
            {step < STEPS.length - 1 ? (
              <Button title="Continue" loading={busy} onPress={next} />
            ) : (
              <Button title="Submit registration" loading={busy} onPress={submit} />
            )}
          </View>
        </View>

        <View className="h-10" />
      </ScrollView>

      <PolicyModal policy={policy} visible={policy !== null} onClose={() => setPolicy(null)} />
    </KeyboardAvoidingView>
  );
}
