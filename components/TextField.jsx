import { Text, TextInput, View } from "react-native";

export default function TextField({ label, error, className = "", ...props }) {
  return (
    <View className={`mb-4 ${className}`}>
      {label ? (
        <Text className="mb-1.5 text-sm font-medium text-gray-700">{label}</Text>
      ) : null}
      <TextInput
        accessibilityLabel={label}
        placeholderTextColor="#9ca3af"
        className={`h-12 rounded-lg border bg-white px-4 text-base text-gray-900 ${
          error ? "border-red-500" : "border-gray-300"
        }`}
        {...props}
      />
      {error ? <Text className="mt-1 text-sm text-red-600">{error}</Text> : null}
    </View>
  );
}
