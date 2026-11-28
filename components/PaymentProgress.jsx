// components/PaymentProgress.jsx
// The parts of a job's payment and where each stands, from the server's
// payment plan (server/utils/paymentPlan.js `paymentPlan`): the deposit (or
// the full amount at 100%) before work starts, then the balance before the
// repair is completed, online or in cash. Display only.
import { Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";

import { COLORS } from "../constants/theme";

const peso = (value) =>
  "₱" + Number(value || 0).toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 2 });

function shortDate(value) {
  if (!value) return null;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date.toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" });
}

/** One short status for chips and lists. */
export function paymentPlanLabel(plan) {
  if (!plan) return null;
  if (plan.paid_in_full) return { label: "Paid in full", tone: "green" };
  if (plan.deposit_paid && plan.balance > 0) {
    return { label: plan.deposit > 0 ? "Deposit paid · balance due" : "Balance due", tone: "amber" };
  }
  return { label: plan.deposit_percent === 100 ? "Waiting for payment" : "Waiting for deposit", tone: "amber" };
}

/**
 * The payment's parts as rows.
 *   viewer  "client" (you pay) or "shop" (the client pays): only the wording
 */
export default function PaymentProgress({ plan, viewer = "client" }) {
  if (!plan) return null;
  const shop = viewer === "shop";
  const parts = [];

  if (plan.deposit_percent === 100) {
    parts.push({
      key: "full",
      title: "Full payment",
      detail: plan.deposit_paid
        ? `Paid online${shortDate(plan.deposit_paid_at) ? ` on ${shortDate(plan.deposit_paid_at)}` : ""}`
        : "Online, before work starts",
      amount: plan.total,
      done: plan.deposit_paid,
    });
  } else if (plan.deposit > 0) {
    parts.push({
      key: "deposit",
      title: `${plan.deposit_percent}% deposit`,
      detail: plan.deposit_paid
        ? `Paid online${shortDate(plan.deposit_paid_at) ? ` on ${shortDate(plan.deposit_paid_at)}` : ""}`
        : "Online, before work starts",
      amount: plan.deposit,
      done: plan.deposit_paid,
    });
  }

  if (plan.balance > 0) {
    const how = plan.allow_cash ? "online or in cash" : "online";
    parts.push({
      key: "balance",
      title: plan.deposit > 0 ? "Balance" : "Payment",
      detail: plan.balance_paid
        ? `${plan.balance_method === "CASH" ? (shop ? "Paid in cash, confirmed" : "Paid in cash to the shop") : "Paid online"}${shortDate(plan.balance_paid_at) ? ` on ${shortDate(plan.balance_paid_at)}` : ""}`
        : plan.due?.kind === "BALANCE" && plan.due.ready
          ? `Due now, ${how}, before the repair is completed`
          : `When the work is done, ${how}`,
      amount: plan.balance,
      done: plan.balance_paid,
    });
  }

  return (
    <View>
      {parts.map((part, index) => (
        <View
          key={part.key}
          className={`flex-row items-start gap-3 py-3 ${index < parts.length - 1 ? "border-b border-gray-100" : ""}`}
        >
          <Ionicons
            name={part.done ? "checkmark-circle" : "time-outline"}
            size={20}
            color={part.done ? COLORS.success : COLORS.textMuted}
            style={{ marginTop: 1 }}
          />
          <View className="flex-1" style={{ minWidth: 0 }}>
            <Text className="text-sm font-semibold text-gray-900">{part.title}</Text>
            <Text className="mt-0.5 text-xs leading-5 text-gray-500">{part.detail}</Text>
          </View>
          <Text className={`text-sm font-bold ${part.done ? "text-gray-500" : "text-gray-900"}`}>{peso(part.amount)}</Text>
        </View>
      ))}
      <View className="mt-1 flex-row items-center justify-between border-t border-dashed border-gray-200 pt-3">
        <Text className="text-sm font-semibold text-gray-700">Total</Text>
        <Text className="text-base font-bold text-gray-900">{peso(plan.total)}</Text>
      </View>
    </View>
  );
}
