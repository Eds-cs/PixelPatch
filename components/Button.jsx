import { ActivityIndicator, Pressable, Text } from "react-native";

const VARIANTS = {
  primary: { box: "bg-primary active:bg-teal-800", label: "text-white" },
  outline: { box: "bg-white border border-gray-300 active:bg-gray-50", label: "text-primary" },
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
        <ActivityIndicator color={variant === "primary" ? "#fff" : "#0F766E"} />
      ) : (
        // Full width and centered: some Android phones (e.g. Honor/Huawei)
        // measure semibold text too narrow and cut off the end of the label.
        <Text className={`w-full text-center text-base font-semibold ${v.label}`}>{title}</Text>
      )}
    </Pressable>
  );
}
