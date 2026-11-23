// components/BarangayPicker.jsx
//
// Searchable picker for Zamboanga City's barangays, the only area PixelPatch
// serves. The server checks the same list (server/utils/serviceArea.js).
import { useMemo, useState } from "react";
import { Pressable, Text, TextInput, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";

import Modal from "./Modal";
import { COLORS } from "../constants/theme";
import { ZAMBOANGA_BARANGAYS } from "../constants/serviceArea";

const fold = (value) =>
  String(value)
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase();

// Search text per barangay, so "sta maria", "Sta. Maria" and "santo nino" all match.
const SEARCH_TEXT = new Map(
  ZAMBOANGA_BARANGAYS.map((name) => [
    name,
    fold(`${name} ${name.replace(/^Santa /, "Sta. ").replace(/^Santo /, "Sto. ")}`),
  ])
);

export default function BarangayPicker({
  label = "Barangay",
  value,
  onChange,
  error,
  placeholder = "Select your barangay",
  disabled = false,
  // When given, the list ends with an "I'm not in Zamboanga City" option.
  onOutsideArea,
  className = "",
}) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");

  const matches = useMemo(() => {
    const q = fold(query.trim());
    return q ? ZAMBOANGA_BARANGAYS.filter((name) => SEARCH_TEXT.get(name).includes(q)) : ZAMBOANGA_BARANGAYS;
  }, [query]);

  const close = () => {
    setOpen(false);
    setQuery("");
  };

  const choose = (name) => {
    onChange(name);
    close();
  };

  return (
    <View className={`mb-4 ${className}`}>
      {label ? <Text className="mb-1.5 text-sm font-medium text-gray-700">{label}</Text> : null}

      <Pressable
        onPress={() => setOpen(true)}
        disabled={disabled}
        accessibilityRole="button"
        accessibilityLabel={`${label || "Barangay"}: ${value || "not set"}`}
        className={`h-12 flex-row items-center rounded-lg border bg-white px-4 active:bg-gray-50 ${
          error ? "border-red-500" : "border-gray-300"
        } ${disabled ? "opacity-60" : ""}`}
      >
        <Ionicons name="location-outline" size={18} color={COLORS.textMuted} />
        <Text
          numberOfLines={1}
          className={`ml-3 flex-1 text-base ${value ? "text-gray-900" : "text-gray-400"}`}
        >
          {value || placeholder}
        </Text>
        <Ionicons name="chevron-down" size={16} color={COLORS.textMuted} />
      </Pressable>

      {error ? <Text className="mt-1 text-sm text-red-600">{error}</Text> : null}

      <Modal visible={open} onClose={close} title="Choose your barangay">
        <Text className="mb-3 text-xs text-gray-500">
          PixelPatch is available in Zamboanga City&apos;s barangays only.
        </Text>
        <TextInput
          value={query}
          onChangeText={setQuery}
          placeholder="Search barangays"
          placeholderTextColor="#8A9B98"
          accessibilityLabel="Search barangays"
          autoCorrect={false}
          className="mb-3 h-11 rounded-lg border border-gray-300 bg-white px-3 text-base text-gray-900"
        />

        {matches.map((name) => {
          const selected = name === value;
          return (
            <Pressable
              key={name}
              onPress={() => choose(name)}
              accessibilityRole="button"
              accessibilityState={{ selected }}
              className={`min-h-11 flex-row items-center rounded-lg px-3 ${
                selected ? "bg-teal-50" : "active:bg-gray-100"
              }`}
            >
              <Text
                className={`flex-1 text-base ${selected ? "font-semibold text-gray-900" : "text-gray-700"}`}
              >
                {name}
              </Text>
              {selected ? <Ionicons name="checkmark" size={18} color={COLORS.primary} /> : null}
            </Pressable>
          );
        })}

        {matches.length === 0 ? (
          <Text className="py-6 text-center text-sm text-gray-500">
            No Zamboanga City barangay matches &quot;{query.trim()}&quot;.
          </Text>
        ) : null}

        {onOutsideArea ? (
          <Pressable
            onPress={() => {
              close();
              onOutsideArea();
            }}
            accessibilityRole="button"
            className="mt-3 min-h-11 justify-center border-t border-gray-100 pt-3"
          >
            <Text className="text-sm font-semibold text-primary">I&apos;m not in Zamboanga City</Text>
          </Pressable>
        ) : null}
      </Modal>
    </View>
  );
}
