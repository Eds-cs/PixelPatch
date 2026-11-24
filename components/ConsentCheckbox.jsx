// components/ConsentCheckbox.jsx
// A required "I agree to the Terms of Service and Privacy Policy" checkbox.
// Forms keep their submit button disabled until it is ticked, and the server
// checks the same flag.
import { Pressable, Text, View } from "react-native";
import { Link } from "expo-router";
import { Ionicons } from "@expo/vector-icons";

export function Checkbox({ checked, onChange, children, error, disabled = false, label }) {
  return (
    <View className="mb-3">
      <Pressable
        onPress={() => !disabled && onChange(!checked)}
        accessibilityRole="checkbox"
        accessibilityState={{ checked, disabled }}
        accessibilityLabel={label}
        hitSlop={6}
        className="min-h-11 flex-row items-start"
      >
        <View
          className={`mr-3 mt-0.5 h-6 w-6 items-center justify-center rounded-md border-2 ${
            checked ? "border-primary bg-primary" : error ? "border-red-500 bg-white" : "border-gray-400 bg-white"
          }`}
        >
          {checked ? <Ionicons name="checkmark" size={16} color="#fff" /> : null}
        </View>
        <View className="flex-1">{children}</View>
      </Pressable>
      {error ? <Text className="ml-9 mt-1 text-sm text-red-600">{error}</Text> : null}
    </View>
  );
}

// The policy pages open over the form, so nothing typed is lost.
function PolicyLink({ href, children }) {
  return (
    <Link href={href} accessibilityRole="link">
      <Text className="font-semibold text-primary underline">{children}</Text>
    </Link>
  );
}

// Opens a pop-up instead of a page (onPress given).
function PolicyButton({ onPress, children }) {
  return (
    <Text onPress={onPress} accessibilityRole="button" className="font-semibold text-primary underline">
      {children}
    </Text>
  );
}

/**
 * By default the links go to the /terms and /privacy pages. Pass
 * onOpenTerms / onOpenPrivacy (and the labels) to open pop-ups instead, as the
 * business registration does with the business policies.
 */
export default function ConsentCheckbox({
  checked,
  onChange,
  error,
  disabled,
  what = "using PixelPatch",
  termsLabel = "Terms of Service",
  privacyLabel = "Privacy Policy",
  onOpenTerms,
  onOpenPrivacy,
}) {
  const terms = onOpenTerms ? (
    <PolicyButton onPress={onOpenTerms}>{termsLabel}</PolicyButton>
  ) : (
    <PolicyLink href="/terms">{termsLabel}</PolicyLink>
  );
  const privacy = onOpenPrivacy ? (
    <PolicyButton onPress={onOpenPrivacy}>{privacyLabel}</PolicyButton>
  ) : (
    <PolicyLink href="/privacy">{privacyLabel}</PolicyLink>
  );
  return (
    <Checkbox
      checked={checked}
      onChange={onChange}
      error={error}
      disabled={disabled}
      label={`I agree to the ${termsLabel} and ${privacyLabel}`}
    >
      <Text className="text-sm leading-6 text-gray-700">
        I have read and agree to the {terms} and the {privacy} for {what}.
      </Text>
    </Checkbox>
  );
}
