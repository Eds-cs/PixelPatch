// components/PaymentTermsFields.jsx
// Online deposit + cash controls, shared by business registration, the
// business profile (shop defaults) and the quotation form (one job).
// Rules: lib/paymentTerms.js.
import { Pressable, Switch, Text, TextInput, View } from "react-native";

import { COLORS } from "../constants/theme";
import { DEPOSIT_PRESETS, parseDepositPercent } from "../lib/paymentTerms";

/**
 * value:         { depositPercent: string, acceptsCash: boolean }
 * onChange:      (next) => void
 * cashAvailable: false hides the cash switch (a quotation from a shop that
 *                doesn't accept cash). Defaults to true.
 * cashLabel:     text beside the switch.
 */
export default function PaymentTermsFields({
  value,
  onChange,
  cashAvailable = true,
  cashLabel = "Accept cash for the balance",
  disabled = false,
}) {
  const pct = parseDepositPercent(value.depositPercent);
  const set = (patch) => onChange({ ...value, ...patch });
  const fullUpfront = pct === 100;

  return (
    <View>
      <Text className="mb-1.5 text-sm font-medium text-gray-700">Online deposit before work starts</Text>
      <View className="mb-2 flex-row flex-wrap items-center">
        {DEPOSIT_PRESETS.map((preset) => {
          const selected = pct === preset;
          return (
            <Pressable
              key={preset}
              disabled={disabled}
              onPress={() => set({ depositPercent: String(preset), acceptsCash: preset === 100 ? false : value.acceptsCash })}
              accessibilityRole="radio"
              accessibilityState={{ selected, disabled }}
              className={`mb-2 mr-2 min-h-11 justify-center rounded-full border px-3.5 py-2 ${
                selected ? "border-primary bg-primary" : "border-gray-300 bg-white"
              }`}
            >
              <Text className={`text-xs font-semibold ${selected ? "text-white" : "text-gray-700"}`}>
                {preset === 100 ? "Full (100%)" : preset === 0 ? "None (0%)" : `${preset}%`}
              </Text>
            </Pressable>
          );
        })}
        <View className="mb-2 min-h-11 flex-row items-center rounded-full border border-gray-300 bg-white px-3">
          <TextInput
            value={value.depositPercent}
            onChangeText={(text) => {
              const digits = text.replace(/\D/g, "").slice(0, 3);
              set({ depositPercent: digits, acceptsCash: digits === "100" ? false : value.acceptsCash });
            }}
            editable={!disabled}
            keyboardType="number-pad"
            inputMode="numeric"
            maxLength={3}
            accessibilityLabel="Custom deposit percentage"
            placeholder="Other"
            placeholderTextColor={COLORS.textMuted}
            style={{ minWidth: 44, paddingVertical: 6, color: COLORS.text }}
          />
          <Text className="text-xs font-semibold text-gray-500">%</Text>
        </View>
      </View>
      {pct === null ? (
        <Text className="mb-2 text-xs text-red-600">Enter a whole number from 0 to 100.</Text>
      ) : (
        <Text className="mb-3 text-xs leading-5 text-gray-500">
          {fullUpfront
            ? "Clients pay the whole amount online before you start."
            : pct === 0
            ? "Clients pay nothing upfront and pay the full amount when the repair is done."
            : `Clients pay ${pct}% online before you start and the rest when the repair is done.`}
        </Text>
      )}

      {cashAvailable ? (
        <View className="mb-1 flex-row items-center justify-between gap-3">
          <View className="flex-1">
            <Text className={`text-sm font-medium ${fullUpfront ? "text-gray-400" : "text-gray-700"}`}>{cashLabel}</Text>
            <Text className="text-xs leading-5 text-gray-500">
              {fullUpfront
                ? "Not available with a 100% deposit: there's no balance left to pay."
                : "Cash isn't held by PixelPatch, so it can't be refunded through a dispute."}
            </Text>
          </View>
          <Switch
            value={Boolean(value.acceptsCash) && !fullUpfront}
            onValueChange={(on) => set({ acceptsCash: on })}
            disabled={disabled || fullUpfront}
            trackColor={{ true: COLORS.primary }}
            accessibilityLabel={cashLabel}
          />
        </View>
      ) : null}
    </View>
  );
}
