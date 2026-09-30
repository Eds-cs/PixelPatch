import { ActivityIndicator, Pressable, Text } from "react-native";

const VARIANTS = {
  primary: { box: "bg-blue-600 active:bg-blue-700", label: "text-white" },
  outline: { box: "bg-white border border-gray-300 active:bg-gray-50", label: "text-blue-600" },
  ghost: { box: "bg-transparent active:bg-gray-100", label: "text-gray-700" },
};

export default function Button({
  title,
  onPress,
  variant = "primary",
  loading = false,
  disabled = false,
  className = "",
}) {
  const v = VARIANTS[variant] ?? VARIANTS.primary;
  const isDisabled = disabled || loading;

  return (
    <Pressable
      onPress={onPress}
      disabled={isDisabled}
      accessibilityRole="button"
      accessibilityState={{ disabled: isDisabled, busy: loading }}
      className={`h-12 flex-row items-center justify-center rounded-lg px-5 ${v.box} ${
        isDisabled ? "opacity-50" : ""
      } ${className}`}
    >
      {loading ? (
        <ActivityIndicator color={variant === "primary" ? "#fff" : "#2563eb"} />
      ) : (
        <Text className={`text-base font-semibold ${v.label}`}>{title}</Text>
      )}
    </Pressable>
  );
}
