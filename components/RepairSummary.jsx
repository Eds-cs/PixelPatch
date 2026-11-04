import { Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";

const PESO = "₱";

const REPAIR_STATUS_STYLES = {
  pending: ["bg-amber-100", "text-amber-800", "Pending"],
  review: ["bg-blue-100", "text-blue-800", "In review"],
  accepted: ["bg-blue-100", "text-blue-800", "Accepted"],
  in_progress: ["bg-indigo-100", "text-indigo-800", "In progress"],
  completed: ["bg-emerald-100", "text-emerald-800", "Completed"],
  rejected: ["bg-red-100", "text-red-800", "Rejected"],
};

export function getRepairDisplayStatus(status, decision) {
  const normalizedDecision = String(decision ?? "").toLowerCase();
  if (normalizedDecision === "rejected") return "rejected";

  const normalizedStatus = String(status ?? "").toLowerCase();
  if (normalizedStatus && normalizedStatus !== "unknown") return normalizedStatus;
  return normalizedDecision || "unknown";
}

export function RepairStatusBadge({ status, decision }) {
  const key = getRepairDisplayStatus(status, decision);
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

export function AssessmentSection({ assessment }) {
  const condition = assessment.device_condition ?? assessment.deviceCondition;
  const observedIssues = assessment.observed_issues ?? assessment.observedIssues;
  const isRemote = assessment.is_remote ?? assessment.isRemote;

  return (
    <RepairSection title="Assessment">
      <RepairRow label="Condition" value={condition} />
      <RepairRow label="Observed issues" value={observedIssues} />
      <RepairRow label="Recommendation" value={assessment.recommendation} />
      <RepairRow
        label="Assessment type"
        value={isRemote === true || Number(isRemote) === 1 ? "Remote" : "In person"}
      />
      <RepairRow label="Assessed at" value={formatRepairDate(assessment.created_at ?? assessment.createdAt)} />
    </RepairSection>
  );
}

function formatPeso(value) {
  if (value === null || value === undefined || value === "") return "—";
  const amount = Number(value);
  return Number.isFinite(amount) ? `${PESO}${amount.toLocaleString()}` : `${PESO}${value}`;
}

function formatWarranty(warranty) {
  if (!warranty) return "Not specified";
  const covered = warranty.is_warranty_covered ?? warranty.isWarrantyCovered;
  if (!covered || Number(covered) === 0) return "Not covered";
  const value = warranty.warranty_value ?? warranty.warrantyValue;
  const unit = warranty.warranty_unit ?? warranty.warrantyUnit;
  return `Covered, ${value} ${unit}`;
}

export function QuotationSection({ quotation }) {
  const services = quotation.services ?? [];
  const parts = quotation.parts ?? [];
  const total = quotation.estimated_cost ?? quotation.total_amount;

  return (
    <RepairSection title="Quotation">
      {services.map((service, index) => (
        <RepairRow
          key={`service-${service.id ?? index}`}
          label={service.name ?? "Service"}
          value={formatPeso(service.price ?? service.base_price)}
        />
      ))}
      {parts.map((part, index) => (
        <RepairRow
          key={`part-${part.id ?? index}`}
          label={part.name ?? "Part"}
          value={formatPeso(part.cost ?? part.price)}
        />
      ))}
      <RepairRow
        label="Estimated completion"
        value={formatRepairDate(quotation.estimated_completion_date ?? quotation.estimated_completion_time)}
      />
      <RepairRow label="Warranty" value={formatWarranty(quotation.warranty)} />
      <View className="mt-2 border-t border-gray-100 pt-2">
        <RepairRow label="Total" value={formatPeso(total)} />
      </View>
    </RepairSection>
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