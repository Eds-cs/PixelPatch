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

export default function ConsentCheckbox({ checked, onChange, error, disabled, what = "using PixelPatch" }) {
  return (
    <Checkbox
      checked={checked}
      onChange={onChange}
      error={error}
      disabled={disabled}
      label="I agree to the Terms of Service and Privacy Policy"
    >
      <Text className="text-sm leading-6 text-gray-700">
        I have read and agree to the <PolicyLink href="/terms">Terms of Service</PolicyLink> and the{" "}
        <PolicyLink href="/privacy">Privacy Policy</PolicyLink> for {what}.
      </Text>
    </Checkbox>
  );
}
