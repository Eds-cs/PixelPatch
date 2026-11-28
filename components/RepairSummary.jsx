import { Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";

import { statusBadgeClasses } from "../constants/theme";
import { quotationAmounts } from "../lib/paymentTerms";
import { useResponsive } from "../lib/useResponsive";
import { COVERAGE_LABELS } from "../lib/warranty";

const PESO = "₱";

// Badge colors come from the theme's status tones (constants/theme.js).
const REPAIR_STATUS_LABELS = {
  pending: "Pending",
  review: "In review",
  accepted: "Accepted",
  in_progress: "In progress",
  completed: "Completed",
  rejected: "Rejected",
  cancelled: "Cancelled",
};
const REPAIR_STATUS_STYLES = Object.fromEntries(
  Object.entries(REPAIR_STATUS_LABELS).map(([key, label]) => {
    const { bg, text } = statusBadgeClasses(key);
    return [key, [bg, text, label]];
  })
);

// service_requests.client_approved: null = undecided, 1 = approved, 0 = cancelled.
// Check for null first: Number(null) is 0.
export function isClientCancelled(clientApproved) {
  return clientApproved !== null && clientApproved !== undefined && Number(clientApproved) === 0;
}

export function getRepairDisplayStatus(status, decision, clientApproved) {
  const normalizedDecision = String(decision ?? "").toLowerCase();
  if (normalizedDecision === "rejected") return "rejected";
  if (isClientCancelled(clientApproved)) return "cancelled";

  const normalizedStatus = String(status ?? "").toLowerCase();
  if (normalizedStatus && normalizedStatus !== "unknown") return normalizedStatus;
  return normalizedDecision || "unknown";
}

export function RepairStatusBadge({ status, decision, clientApproved }) {
  const key = getRepairDisplayStatus(status, decision, clientApproved);
  const [background, foreground, label] = REPAIR_STATUS_STYLES[key] ?? [
    "bg-gray-200",
    "text-gray-700",
    key.replace(/_/g, " "),
  ];

  return (
    <View className={`rounded-full px-2.5 py-1 ${background}`}>
      <Text className={`text-xs font-semibold ${foreground}`}>{label}</Text>
    </View>
  );
}

export function isValidRepairDate(value) {
  if (typeof value !== "string" || !/^(\d{4})-(\d{2})-(\d{2})$/.test(value)) return false;
  const [year, month, day] = value.split("-").map(Number);
  const date = new Date(year, month - 1, day);
  return date.getFullYear() === year && date.getMonth() === month - 1 && date.getDate() === day;
}

/**
 * "Oct 27, 2026" from a date ("2026-10-27"), a date and time
 * ("2026-10-27 22:31:13", ISO) or a Date, without the time; null when it's
 * missing or a zero date. Plain dates are read as local calendar dates.
 */
export function calendarDate(value) {
  if (!value) return null;
  let date;
  if (typeof value === "string" && /^\d{4}-\d{2}-\d{2}$/.test(value)) {
    if (!isValidRepairDate(value)) return null;
    const [year, month, day] = value.split("-").map(Number);
    date = new Date(year, month - 1, day);
  } else {
    date = new Date(typeof value === "string" ? value.replace(" ", "T") : value);
  }
  if (Number.isNaN(date.getTime()) || date.getFullYear() < 1970) return null;
  return date.toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" });
}

export function formatRepairDate(value) {
  if (!value) return "—";
  const dateOnly = typeof value === "string" && /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
  if (dateOnly && !isValidRepairDate(value)) return "Not specified";
  const date = value instanceof Date
    ? value
    : dateOnly
      ? new Date(Number(dateOnly[1]), Number(dateOnly[2]) - 1, Number(dateOnly[3]))
      : new Date(value);
  if (Number.isNaN(date.getTime())) return String(value);
  return date.toLocaleString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

export function RepairSection({ title, children }) {
  return (
    <View className="mb-4 rounded-xl border border-gray-200 bg-white p-4">
      <Text className="mb-3 text-sm font-bold uppercase tracking-wide text-gray-500">{title}</Text>
      {children}
    </View>
  );
}

export function RepairRow({ label, value }) {
  const displayValue = value === null || value === undefined || value === "" ? "—" : value;
  return (
    <View className="flex-row justify-between py-1.5">
      <Text className="text-sm text-gray-500">{label}</Text>
      <Text className="ml-4 flex-1 text-right text-sm font-medium text-gray-900">
        {displayValue}
      </Text>
    </View>
  );
}

// The shop's look at the device: what it found and what it recommends.
export function AssessmentSection({ assessment }) {
  const condition = assessment.device_condition ?? assessment.deviceCondition;
  const observedIssues = assessment.observed_issues ?? assessment.observedIssues;
  const isRemote = assessment.is_remote ?? assessment.isRemote;
  const remote = isRemote === true || Number(isRemote) === 1;
  const created = assessment.created_at ?? assessment.createdAt;
  const when = calendarDate(created);
  const findings = [
    ["pulse-outline", "Condition", condition],
    ["search-outline", "What the shop found", observedIssues],
    ["bulb-outline", "Recommendation", assessment.recommendation],
  ].filter(([, , text]) => String(text ?? "").trim());

  return (
    <View className="mb-4 rounded-2xl border border-gray-200 bg-white p-5">
      <View className="mb-4 flex-row flex-wrap items-center gap-2">
        <Ionicons name="clipboard-outline" size={18} color="#0F766E" />
        <Text className="flex-1 text-sm font-bold uppercase tracking-wide text-gray-700">Assessment</Text>
        <View className="flex-row items-center gap-1 rounded-full bg-gray-100 px-2.5 py-1">
          <Ionicons name={remote ? "videocam-outline" : "hand-left-outline"} size={12} color="#4B5563" />
          <Text className="text-xs font-semibold text-gray-600">{remote ? "Remote" : "In person"}{when ? ` · ${when}` : ""}</Text>
        </View>
      </View>
      {findings.length ? findings.map(([icon, label, text], index) => (
        <View key={label} className={`flex-row gap-3 ${index ? "mt-4" : ""}`}>
          <View className="h-8 w-8 items-center justify-center rounded-full bg-teal-50">
            <Ionicons name={icon} size={15} color="#0F766E" />
          </View>
          <View className="flex-1">
            <Text className="text-xs font-semibold text-gray-500">{label}</Text>
            <Text selectable className="mt-0.5 text-sm leading-6 text-gray-900">{text}</Text>
          </View>
        </View>
      )) : <Text className="text-sm text-gray-500">No notes from the shop.</Text>}
    </View>
  );
}

function formatPeso(value) {
  if (value === null || value === undefined || value === "") return "—";
  const amount = Number(value);
  return Number.isFinite(amount) ? `${PESO}${amount.toLocaleString()}` : `${PESO}${value}`;
}

const WARRANTY_UNITS = { DAY: "day", WEEK: "week", MONTH: "month", YEAR: "year" };

// "3 months", "1 year", or null when the repair has no warranty.
function warrantyLength(warranty) {
  if (!warranty) return null;
  const covered = warranty.is_warranty_covered ?? warranty.isWarrantyCovered;
  if (!covered || Number(covered) === 0) return null;
  const value = Number(warranty.warranty_value ?? warranty.warrantyValue);
  const unit = WARRANTY_UNITS[String(warranty.warranty_unit ?? warranty.warrantyUnit ?? "").toUpperCase()] ?? "";
  if (!Number.isFinite(value) || !unit) return "Covered";
  return `${value} ${unit}${value === 1 ? "" : "s"}`;
}

// "Dec 1, 2026": the completion date without a meaningless time.
function readyBy(value) {
  return calendarDate(value);
}

// Where the quotation stands, worded for whoever is looking at it.
function quotationStage(quotation, clientApproved, viewer) {
  const status = String(quotation.status ?? "").toUpperCase();
  const decided = clientApproved !== null && clientApproved !== undefined;
  if (status === "PAID") return { label: "Paid", icon: "checkmark-circle", tone: "bg-emerald-50 text-emerald-800", color: "#047857" };
  if (status === "CANCELLED" || (decided && Number(clientApproved) === 0)) {
    return { label: "Cancelled", icon: "close-circle", tone: "bg-gray-100 text-gray-600", color: "#4B5563" };
  }
  if (decided && Number(clientApproved) === 1) {
    return { label: viewer === "shop" ? "Approved · waiting for payment" : "Approved · pay to start", icon: "card", tone: "bg-sky-50 text-sky-800", color: "#0369A1" };
  }
  return { label: viewer === "shop" ? "Waiting for the client" : "Waiting for your approval", icon: "time", tone: "bg-amber-50 text-amber-800", color: "#B45309" };
}

function LineItem({ icon, name, kind, price }) {
  return (
    <View className="flex-row items-center gap-3 py-2.5">
      <View className="h-8 w-8 items-center justify-center rounded-full bg-gray-100">
        <Ionicons name={icon} size={15} color="#0F766E" />
      </View>
      <View className="flex-1" style={{ minWidth: 0 }}>
        <Text className="text-sm font-medium text-gray-900">{name}</Text>
        <Text className="text-xs text-gray-400">{kind}</Text>
      </View>
      <Text className="text-sm font-semibold text-gray-900">{price}</Text>
    </View>
  );
}

function InfoTile({ icon, label, value, muted }) {
  return (
    <View className="flex-1 flex-row items-center gap-3 rounded-xl bg-gray-50 p-3" style={{ minWidth: 150 }}>
      <View className="h-9 w-9 items-center justify-center rounded-full bg-white">
        <Ionicons name={icon} size={17} color={muted ? "#9CA3AF" : "#0F766E"} />
      </View>
      <View className="flex-1">
        <Text className="text-xs text-gray-500">{label}</Text>
        <Text className={`text-sm font-semibold ${muted ? "text-gray-400" : "text-gray-900"}`}>{value}</Text>
      </View>
    </View>
  );
}

// One payment step: a numbered dot, when, how, and how much.
function PayStep({ step, title, detail, amount, last }) {
  return (
    <View className="flex-row gap-3">
      <View className="items-center">
        <View className="h-7 w-7 items-center justify-center rounded-full bg-primary">
          <Text className="text-xs font-bold text-white">{step}</Text>
        </View>
        {last ? null : <View className="my-1 w-0.5 flex-1 bg-teal-100" />}
      </View>
      <View className={`flex-1 flex-row items-start justify-between gap-3 ${last ? "" : "pb-4"}`}>
        <View className="flex-1">
          <Text className="text-sm font-semibold text-gray-900">{title}</Text>
          <Text className="mt-0.5 text-xs leading-5 text-gray-500">{detail}</Text>
        </View>
        <Text className="text-base font-bold text-gray-900">{amount}</Text>
      </View>
    </View>
  );
}

/**
 * The quotation as one card: where it stands, the total, what's included,
 * when it's ready and the warranty, and how it's paid.
 *   viewer         "client" (default) or "shop": wording of the status chip
 *   clientApproved service_requests.client_approved (null = undecided)
 *   children       actions shown at the bottom of the card (e.g. Approve)
 */
export function QuotationSection({ quotation, clientApproved = null, viewer = "client", children }) {
  const services = quotation.services ?? [];
  const parts = quotation.parts ?? [];
  const { total, depositPercent, deposit, balance, allowCash } = quotationAmounts(quotation);
  const stage = quotationStage(quotation, clientApproved, viewer);
  const date = readyBy(quotation.estimated_completion_date ?? quotation.estimated_completion_time);
  const warranty = warrantyLength(quotation.warranty);
  const covered = quotation.warranty ? COVERAGE_LABELS[quotation.warranty.coverage || "BOTH"] : null;
  const exclusions = warranty ? quotation.warranty?.exclusions : null;
  const you = viewer === "shop" ? "The client pays" : "You pay";
  // Desktop: items and payment side by side, so prices stay near their names.
  const { isDesktop } = useResponsive();

  return (
    <View className="mb-4 overflow-hidden rounded-2xl border border-gray-200 bg-white">
      {/* Status and total */}
      <View className="border-b border-gray-100 bg-teal-50/60 p-5">
        <View className="flex-row flex-wrap items-center justify-between gap-2">
          <View className="flex-row items-center gap-2">
            <Ionicons name="receipt-outline" size={18} color="#0F766E" />
            <Text className="text-sm font-bold uppercase tracking-wide text-teal-900">Quotation</Text>
          </View>
          <View className={`flex-row items-center gap-1.5 rounded-full px-2.5 py-1 ${stage.tone.split(" ")[0]}`}>
            <Ionicons name={stage.icon} size={13} color={stage.color} />
            <Text className={`text-xs font-semibold ${stage.tone.split(" ")[1]}`}>{stage.label}</Text>
          </View>
        </View>
        <Text className="mt-4 text-xs font-medium text-gray-500">Total</Text>
        <Text className="text-4xl font-extrabold text-gray-900">{formatPeso(total)}</Text>
        <Text className="mt-1 text-xs text-gray-500">
          {services.length + parts.length} item{services.length + parts.length === 1 ? "" : "s"}
          {warranty ? ` · ${warranty} warranty` : ""}
        </Text>
      </View>

      <View className="p-5">
        {/* Ready by and warranty */}
        <View className="flex-row flex-wrap gap-3">
          <InfoTile icon="calendar-outline" label="Ready by" value={date ?? "Date to be set"} muted={!date} />
          <InfoTile icon="shield-checkmark-outline" label="Warranty" value={warranty ? `${warranty} · ${covered}` : "No warranty"} muted={!warranty} />
        </View>
        {warranty ? (
          <Text className="mt-2 text-xs leading-5 text-gray-500">
            {`Starts when the repair is completed.${exclusions ? ` Not covered: ${exclusions}` : " It covers the shop's work and parts, not new damage."}`}
          </Text>
        ) : null}

        <View className={isDesktop ? "mt-5 flex-row items-start gap-10" : ""}>
        <View style={isDesktop ? { flex: 1, minWidth: 0 } : undefined}>
        {/* What's included */}
        <Text className={`mb-1 ${isDesktop ? "" : "mt-5"} text-xs font-semibold uppercase tracking-wide text-gray-400`}>{"What's included"}</Text>
        {services.map((service, index) => (
          <LineItem key={`service-${service.id ?? index}`} icon="construct-outline" kind="Service" name={service.name ?? "Service"} price={formatPeso(service.price ?? service.base_price)} />
        ))}
        {parts.map((part, index) => (
          <LineItem key={`part-${part.id ?? index}`} icon="hardware-chip-outline" kind="Part" name={part.name ?? "Part"} price={formatPeso(part.cost ?? part.price)} />
        ))}
        {!services.length && !parts.length ? <Text className="py-2 text-sm text-gray-500">No items listed.</Text> : null}
        <View className="mt-1 flex-row items-center justify-between border-t border-dashed border-gray-200 pt-3">
          <Text className="text-sm font-semibold text-gray-700">Total</Text>
          <Text className="text-base font-bold text-gray-900">{formatPeso(total)}</Text>
        </View>

        </View>
        <View style={isDesktop ? { flex: 1, minWidth: 0 } : undefined}>
        {/* How it's paid (lib/paymentTerms.js) */}
        <Text className={`mb-3 ${isDesktop ? "" : "mt-6"} text-xs font-semibold uppercase tracking-wide text-gray-400`}>{viewer === "shop" ? "How the client pays" : "How you'll pay"}</Text>
        {depositPercent === 100 ? (
          <PayStep step={1} last title="Pay in full online" detail={`${you} the whole amount online before work starts.`} amount={formatPeso(deposit)} />
        ) : depositPercent === 0 ? (
          <PayStep step={1} last title="Pay when it's done" detail={allowCash ? "Nothing upfront. Online or cash when the repair is done." : "Nothing upfront. Online when the repair is done."} amount={formatPeso(balance)} />
        ) : (
          <>
            <PayStep step={1} title={`${depositPercent}% deposit now`} detail="Online, before work starts." amount={formatPeso(deposit)} />
            <PayStep step={2} last title="Balance when it's done" detail={allowCash ? "Online or cash, when you get your device back." : "Online, when the repair is done."} amount={formatPeso(balance)} />
          </>
        )}
        <View className="mt-4 flex-row items-start gap-2 rounded-xl bg-gray-50 p-3">
          <Ionicons name="lock-closed-outline" size={14} color="#6B7280" style={{ marginTop: 2 }} />
          <Text className="flex-1 text-xs leading-5 text-gray-500">
            {allowCash
              ? "Online payments are held by PixelPatch and can be refunded through a dispute. Cash goes straight to the shop and can't be refunded through PixelPatch."
              : "Online payments are held by PixelPatch and can be refunded through a dispute if something goes wrong."}
          </Text>
        </View>
        </View>
        </View>

        {children ? <View className="mt-5">{children}</View> : null}
      </View>
    </View>
  );
}

export function getRepairLocation({ deliveryMethod, serviceAddress, shopAddress }) {
  const method = String(deliveryMethod ?? "").toUpperCase();
  if (method === "DROPOFF") {
    return {
      label: "Drop-off location",
      value: shopAddress || "Shop address unavailable",
    };
  }
  if (method === "ONSITE") {
    return {
      label: "Service address",
      value: serviceAddress || "Address not available",
    };
  }
  return {
    label: "Pickup address",
    value: serviceAddress || "Address not available",
  };
}

export function RepairCancelledNotice({ message }) {
  return (
    <View className="mb-4 flex-row rounded-xl border border-gray-200 bg-gray-50 p-4">
      <Ionicons name="ban-outline" size={22} color="#52635F" />
      <View className="ml-3 flex-1">
        <Text className="text-base font-bold text-gray-800">Repair request cancelled</Text>
        <Text className="mt-1 text-sm text-gray-600">
          {message || "The client cancelled this repair request."}
        </Text>
      </View>
    </View>
  );
}

export function RepairRejectionNotice({ reason }) {
  return (
    <View className="mb-4 flex-row rounded-xl border border-red-200 bg-red-50 p-4">
      <Ionicons name="close-circle" size={22} color="#b91c1c" />
      <View className="ml-3 flex-1">
        <Text className="text-base font-bold text-red-800">Repair request rejected</Text>
        <Text className="mt-1 text-sm text-red-700">
          {reason || "The shop is unable to accept this repair request."}
        </Text>
      </View>
    </View>
  );
}