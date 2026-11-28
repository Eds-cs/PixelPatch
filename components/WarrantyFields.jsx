// components/WarrantyFields.jsx
// Warranty controls (business rule 9), shared by the quotation form (one job)
// and the business profile (the shop's usual warranty). Rules: lib/warranty.js.
import { Pressable, Switch, Text, View } from "react-native";

import TextField from "./TextField";
import { COLORS } from "../constants/theme";
import { LIMITS } from "../lib/inputLimits";
import { COVERAGE_OPTIONS, UNIT_LABELS, WARRANTY_UNITS, warrantyProblem } from "../lib/warranty";

function Choice({ label, selected, onPress, disabled }) {
  return (
    <Pressable
      disabled={disabled}
      onPress={onPress}
      accessibilityRole="radio"
      accessibilityState={{ selected, disabled }}
      className={`mb-2 mr-2 min-h-11 justify-center rounded-full border px-3.5 py-2 ${
        selected ? "border-primary bg-primary" : "border-gray-300 bg-white"
      }`}
    >
      <Text className={`text-xs font-semibold ${selected ? "text-white" : "text-gray-700"}`}>{label}</Text>
    </Pressable>
  );
}

/**
 * value:    { covered, value, unit, coverage, exclusions } (lib/warranty.js NO_WARRANTY)
 * onChange: (next) => void
 * label:    text beside the switch
 */
export default function WarrantyFields({ value, onChange, disabled = false, label = "Offer a warranty" }) {
  const set = (patch) => onChange({ ...value, ...patch });
  const problem = warrantyProblem(value);

  return (
    <View>
      <View className="mb-3 flex-row items-center justify-between gap-3">
        <View className="flex-1">
          <Text className="text-sm font-medium text-gray-700">{label}</Text>
          <Text className="mt-0.5 text-xs leading-5 text-gray-500">
            {"Optional. It starts when the repair is completed, and covers your work and the parts you fit, never new damage."}
          </Text>
        </View>
        <Switch
          value={value.covered}
          disabled={disabled}
          onValueChange={(covered) => set({ covered })}
          trackColor={{ true: COLORS.primary }}
          accessibilityLabel={label}
        />
      </View>

      {value.covered ? (
        <View>
          <View className="flex-row flex-wrap items-start gap-3">
            <View style={{ width: 120 }}>
              <TextField
                label="Length"
                maxLength={4}
                value={value.value}
                onChangeText={(text) => set({ value: text.replace(/\D/g, "").slice(0, 4) })}
                placeholder="e.g. 3"
                keyboardType="number-pad"
                inputMode="numeric"
                editable={!disabled}
              />
            </View>
            <View className="flex-1" style={{ minWidth: 200 }}>
              <Text className="mb-1.5 text-sm font-medium text-gray-700">Unit</Text>
              <View className="flex-row flex-wrap">
                {WARRANTY_UNITS.map((unit) => (
                  <Choice key={unit} label={UNIT_LABELS[unit]} selected={value.unit === unit} disabled={disabled} onPress={() => set({ unit })} />
                ))}
              </View>
            </View>
          </View>

          <Text className="mb-1.5 text-sm font-medium text-gray-700">What it covers</Text>
          <View className="mb-2 flex-row flex-wrap">
            {COVERAGE_OPTIONS.map((option) => (
              <Choice
                key={option.key}
                label={option.label}
                selected={value.coverage === option.key}
                disabled={disabled}
                onPress={() => set({ coverage: option.key })}
              />
            ))}
          </View>

          <TextField
            label="What's not covered (optional)"
            maxLength={LIMITS.warrantyExclusions}
            value={value.exclusions}
            onChangeText={(exclusions) => set({ exclusions })}
            placeholder="e.g. Drops, water damage, or the device opened by another shop"
            multiline
            editable={!disabled}
          />
          {problem ? <Text className="mb-2 text-xs text-red-600">{problem}</Text> : null}
        </View>
      ) : null}
    </View>
  );
}
