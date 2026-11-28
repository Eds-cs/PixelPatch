// lib/warranty.js
// Warranty terms in the app (AGENTS.md section 20, business rule 9). Keep the
// rules in sync with server/utils/warranty.js.
import { LIMITS } from "./inputLimits";

export const WARRANTY_UNITS = ["DAY", "WEEK", "MONTH", "YEAR"];
export const UNIT_LABELS = { DAY: "Days", WEEK: "Weeks", MONTH: "Months", YEAR: "Years" };
export const MAX_WARRANTY = { DAY: 1095, WEEK: 156, MONTH: 36, YEAR: 3 };
export const COVERAGE_OPTIONS = [
  { key: "BOTH", label: "Parts and labour" },
  { key: "PARTS", label: "Parts only" },
  { key: "LABOUR", label: "Labour only" },
];
export const COVERAGE_LABELS = Object.fromEntries(COVERAGE_OPTIONS.map((o) => [o.key, o.label]));

/** An empty warranty form. */
export const NO_WARRANTY = { covered: false, value: "", unit: "MONTH", coverage: "BOTH", exclusions: "" };

/** The form for a shop's default warranty (shops.default_warranty_*). */
export function formFromShop(shop) {
  if (!shop?.default_warranty_value) return { ...NO_WARRANTY };
  return {
    covered: true,
    value: String(shop.default_warranty_value),
    unit: shop.default_warranty_unit || "MONTH",
    coverage: shop.default_warranty_coverage || "BOTH",
    exclusions: shop.default_warranty_exclusions || "",
  };
}

/** A problem with the form, or null. Mirrors validateWarranty. */
export function warrantyProblem(form) {
  if (!form?.covered) return null;
  const n = /^\d{1,4}$/.test(String(form.value).trim()) ? Number(form.value) : NaN;
  const max = MAX_WARRANTY[form.unit] ?? 0;
  if (!Number.isInteger(n) || n < 1 || n > max) {
    return `Enter a warranty length from 1 to ${max} ${String(form.unit).toLowerCase()}s.`;
  }
  if (String(form.exclusions ?? "").length > LIMITS.warrantyExclusions) {
    return `What's not covered can be up to ${LIMITS.warrantyExclusions} characters.`;
  }
  return null;
}

/** The request body's `warranty` (null = no warranty). */
export function warrantyPayload(form) {
  if (!form?.covered) return null;
  return {
    isWarrantyCovered: true,
    warrantyValue: Number(form.value),
    warrantyUnit: form.unit,
    coverage: form.coverage,
    exclusions: String(form.exclusions ?? "").trim() || null,
  };
}

/** "3 months", from a value and unit. */
export function lengthLabel(value, unit) {
  const n = Number(value);
  const word = { DAY: "day", WEEK: "week", MONTH: "month", YEAR: "year" }[String(unit ?? "").toUpperCase()];
  if (!Number.isFinite(n) || n < 1 || !word) return null;
  return `${n} ${word}${n === 1 ? "" : "s"}`;
}

/** The shop's usual warranty for its page, e.g. "3 months, parts and labour", or null. */
export function shopWarrantyLabel(shop) {
  const length = lengthLabel(shop?.default_warranty_value, shop?.default_warranty_unit);
  if (!length) return null;
  return `${length}, ${String(COVERAGE_LABELS[shop.default_warranty_coverage || "BOTH"]).toLowerCase()}`;
}
