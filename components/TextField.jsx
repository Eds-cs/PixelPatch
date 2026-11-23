import { useState } from "react";
import { Text, TextInput, View } from "react-native";

// `right` is an optional element (for example an icon button) shown inside the
// field at its right edge.
export default function TextField({ label, error, className = "", right = null, onFocus, onBlur, ...props }) {
  // Shows which field is selected with a darker border (the browser's focus
  // outline is turned off in global.css).
  const [focused, setFocused] = useState(false);
  return (
    <View className={`mb-4 ${className}`}>
      {label ? (
        <Text className="mb-1.5 text-sm font-medium text-gray-700">{label}</Text>
      ) : null}
      <View className="justify-center">
        <TextInput
          accessibilityLabel={label}
          placeholderTextColor="#8A9B98"
          className={`h-12 rounded-lg border bg-white px-4 text-base text-gray-900 ${
            error ? "border-red-500" : focused ? "border-primary" : "border-gray-300"
          } ${right ? "pr-12" : ""}`}
          onFocus={(event) => { setFocused(true); onFocus?.(event); }}
          onBlur={(event) => { setFocused(false); onBlur?.(event); }}
          {...props}
        />
        {right ? <View className="absolute bottom-0 right-0 top-0 justify-center">{right}</View> : null}
      </View>
      {error ? <Text className="mt-1 text-sm text-red-600">{error}</Text> : null}
    </View>
  );
}
