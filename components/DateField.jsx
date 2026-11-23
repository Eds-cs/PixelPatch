// components/DateField.jsx
//
// Universal date / time field built on react-native-ui-datepicker (MIT).
// That library is pure JS — no native module and no config plugin — so the
// same calendar renders on web, iOS and Android and still runs in Expo Go.
// @react-native-community/datetimepicker was rejected here because it has no
// usable web target.
import { useState } from "react";
import { Pressable, Text, View } from "react-native";
import DateTimePicker, { useDefaultStyles } from "react-native-ui-datepicker";
import { Ionicons } from "@expo/vector-icons";

import Modal from "./Modal";
import Button from "./Button";
import { COLORS } from "../constants/theme";

const pad = (n) => String(n).padStart(2, "0");

/** Date -> "YYYY-MM-DD" using local time, so the day never shifts via UTC. */
export const toDateString = (d) =>
  d ? `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}` : "";

/** Date -> "HH:mm" */
export const toTimeString = (d) => (d ? `${pad(d.getHours())}:${pad(d.getMinutes())}` : "");

/** Parses "YYYY-MM-DD" / "HH:mm" back into a Date without UTC drift. */
const parseValue = (value, mode) => {
  if (!value) return new Date();

  if (value instanceof Date) return new Date(value.getTime());
  if (typeof value === "number") return new Date(value);
  if (typeof value === "object" && typeof value.toDate === "function") {
    return value.toDate();
  }

  if (mode === "time") {
    const [h, m] = String(value).split(":").map(Number);
    const d = new Date();
    if (Number.isFinite(h)) d.setHours(h, Number.isFinite(m) ? m : 0, 0, 0);
    return d;
  }

  const [y, mo, day] = String(value).split("-").map(Number);
  if (Number.isFinite(y) && Number.isFinite(mo) && Number.isFinite(day)) {
    return new Date(y, mo - 1, day);
  }
  return new Date();
};

const displayDate = (value) => {
  if (!value) return "";
  const d = parseValue(value, "date");
  return d.toLocaleDateString(undefined, { year: "numeric", month: "short", day: "numeric" });
};

// "18:30" -> "6:30 PM"
const displayTime = (value) => {
  const d = parseValue(value, "time");
  const h = d.getHours();
  return `${h % 12 || 12}:${pad(d.getMinutes())} ${h < 12 ? "AM" : "PM"}`;
};

export default function DateField({
  label,
  value,
  onChange,
  mode = "date", // "date" | "time"
  placeholder,
  error,
  minDate,
  maxDate,
  disableMonthPicker = false,
  disableYearPicker = false,
  // Where the calendar opens while no value is set (defaults to today).
  defaultDate,
  // "day" | "month" | "year": the view the calendar opens on. Use "year" for
  // dates far in the past, such as birthdays.
  initialView = "day",
  className = "",
}) {
  const isTime = mode === "time";
  const defaultStyles = useDefaultStyles("light");
  // The library's own arrows are faint grey images that are easy to miss
  // (users thought only 12 years existed), so use clear teal chevrons and the
  // app's teal for the selected day/month/year.
  const styles = {
    ...defaultStyles,
    selected: { ...defaultStyles.selected, backgroundColor: COLORS.primary },
    selected_month: {
      ...defaultStyles.selected_month,
      backgroundColor: COLORS.primary,
      borderColor: COLORS.primary,
    },
    selected_year: {
      ...defaultStyles.selected_year,
      backgroundColor: COLORS.primary,
      borderColor: COLORS.primary,
    },
  };
  const navIcon = (name) => (
    <View className="h-10 w-10 items-center justify-center rounded-full border border-gray-300 bg-white">
      <Ionicons name={name} size={20} color={COLORS.primary} />
    </View>
  );
  const pickerComponents = {
    IconPrev: navIcon("chevron-back"),
    IconNext: navIcon("chevron-forward"),
  };
  const pickerMinDate = minDate ? parseValue(minDate, mode) : undefined;
  const pickerMaxDate = maxDate ? parseValue(maxDate, mode) : undefined;

  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState(() => parseValue(value || defaultDate, mode));

  const openPicker = () => {
    setDraft(parseValue(value || defaultDate, mode));
    setOpen(true);
  };

  const confirm = () => {
    if (!isTime && pickerMinDate) {
      const selectedDay = new Date(draft.getFullYear(), draft.getMonth(), draft.getDate());
      const minimumDay = new Date(
        pickerMinDate.getFullYear(),
        pickerMinDate.getMonth(),
        pickerMinDate.getDate()
      );
      if (selectedDay < minimumDay) return;
    }
    onChange(isTime ? toTimeString(draft) : toDateString(draft));
    setOpen(false);
  };

  const shown = value ? (isTime ? displayTime(value) : displayDate(value)) : "";

  return (
    <View className={`mb-4 ${className}`}>
      {label ? (
        <Text className="mb-1.5 text-sm font-medium text-gray-700">{label}</Text>
      ) : null}

      <Pressable
        onPress={openPicker}
        accessibilityRole="button"
        accessibilityLabel={label ? `${label}: ${shown || "not set"}` : "Choose a date"}
        className={`h-12 flex-row items-center rounded-lg border bg-white px-4 active:bg-gray-50 ${
          error ? "border-red-500" : "border-gray-300"
        }`}
      >
        <Ionicons
          name={isTime ? "time-outline" : "calendar-outline"}
          size={18}
          color={COLORS.textMuted}
        />
        <Text className={`ml-3 flex-1 text-base ${shown ? "text-gray-900" : "text-gray-400"}`}>
          {shown || placeholder || (isTime ? "Select a time" : "Select a date")}
        </Text>
        <Ionicons name="chevron-down" size={16} color={COLORS.textMuted} />
      </Pressable>

      {error ? <Text className="mt-1 text-sm text-red-600">{error}</Text> : null}

      <Modal
        visible={open}
        onClose={() => setOpen(false)}
        title={label || (isTime ? "Select a time" : "Select a date")}
        footer={<Button title="Confirm" onPress={confirm} />}
      >
        <DateTimePicker
          mode="single"
          date={draft}
          onChange={({ date }) => date && setDraft(parseValue(date, mode))}
          timePicker={isTime}
          minDate={pickerMinDate}
          maxDate={pickerMaxDate}
          disableMonthPicker={disableMonthPicker}
          disableYearPicker={disableYearPicker}
          // Times (e.g. shop opening hours) show only the hour/minute wheels,
          // never a calendar.
          initialView={isTime ? "time" : initialView}
          hideHeader={isTime}
          use12Hours={isTime}
          components={pickerComponents}
          styles={styles}
        />
      </Modal>
    </View>
  );
}
