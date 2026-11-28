// server/utils/warranty.js
// Warranty terms (AGENTS.md section 20, business rule 9). Optional: the shop
// decides. One length per job, what it covers, and what it doesn't. It starts
// when the repair is completed and ends that length later. Keep the rules in
// sync with lib/warranty.js.
import { LIMITS } from "./inputLimits.js";

export const WARRANTY_UNITS = ["DAY", "WEEK", "MONTH", "YEAR"];
export const WARRANTY_COVERAGE = ["BOTH", "PARTS", "LABOUR"];
// Longest warranty per unit (3 years).
export const MAX_WARRANTY = { DAY: 1095, WEEK: 156, MONTH: 36, YEAR: 3 };

const truthy = (value) => value === true || value === "true" || value === 1 || value === "1";

/**
 * Checks a warranty from a form: null/undefined or not covered = no warranty.
 * Shape: { isWarrantyCovered, warrantyValue, warrantyUnit, coverage, exclusions }.
 * Returns { warranty: null | { value, unit, coverage, exclusions } } or { error, field }.
 */
export function validateWarranty(input) {
  if (input === null || input === undefined || input === false) return { warranty: null };
  if (typeof input !== "object" || Array.isArray(input)) return { error: "Invalid warranty.", field: "warranty" };
  if (!truthy(input.isWarrantyCovered ?? true)) return { warranty: null };

  const unit = String(input.warrantyUnit ?? "").toUpperCase();
  if (!WARRANTY_UNITS.includes(unit)) return { error: "Choose days, weeks, months or years for the warranty.", field: "warranty.unit" };

  const text = String(input.warrantyValue ?? "").trim();
  const value = /^\d{1,4}$/.test(text) ? Number(text) : NaN;
  if (!Number.isInteger(value) || value < 1 || value > MAX_WARRANTY[unit]) {
    return { error: `Enter a warranty length from 1 to ${MAX_WARRANTY[unit]} ${unit.toLowerCase()}s.`, field: "warranty.value" };
  }

  const coverage = String(input.coverage ?? "BOTH").toUpperCase();
  if (!WARRANTY_COVERAGE.includes(coverage)) return { error: "Choose what the warranty covers.", field: "warranty.coverage" };

  if (input.exclusions !== undefined && input.exclusions !== null && typeof input.exclusions !== "string") {
    return { error: "Invalid exclusions.", field: "warranty.exclusions" };
  }
  const exclusions = String(input.exclusions ?? "").trim();
  if (exclusions.length > LIMITS.warrantyExclusions) {
    return { error: `What's not covered can be up to ${LIMITS.warrantyExclusions} characters.`, field: "warranty.exclusions" };
  }

  return { warranty: { value, unit, coverage, exclusions: exclusions || null } };
}

/** The end of a warranty that started at `start` (a Date or date string), or null. */
export function warrantyEndDate(start, value, unit) {
  if (!start || !value || !unit) return null;
  const end = new Date(start);
  if (Number.isNaN(end.getTime())) return null;
  const n = Number(value);
  switch (String(unit).toUpperCase()) {
    case "DAY": end.setDate(end.getDate() + n); break;
    case "WEEK": end.setDate(end.getDate() + 7 * n); break;
    case "MONTH": {
      // Keep the day of the month, or the month's last day (Jan 31 + 1 month = Feb 28/29).
      const day = end.getDate();
      end.setDate(1);
      end.setMonth(end.getMonth() + n);
      end.setDate(Math.min(day, new Date(end.getFullYear(), end.getMonth() + 1, 0).getDate()));
      break;
    }
    case "YEAR": {
      const day = end.getDate();
      const month = end.getMonth();
      end.setDate(1);
      end.setFullYear(end.getFullYear() + n);
      end.setDate(Math.min(day, new Date(end.getFullYear(), month + 1, 0).getDate()));
      break;
    }
    default: return null;
  }
  return end;
}

/**
 * A repair's warranty for display and claims, from its quotation's warranty
 * row and the request. null when the quotation has no warranty.
 *   { value, unit, coverage, exclusions, starts_at, ends_at, active, days_left }
 * starts_at/ends_at are null until the repair is completed.
 */
export function warrantyInfo(row, request, now = new Date()) {
  if (!row || Number(row.is_warranty_covered) !== 1) return null;
  const startsAt = request?.status === "COMPLETED" && request?.completed_at ? new Date(request.completed_at) : null;
  const endsAt = startsAt ? warrantyEndDate(startsAt, row.warranty_value, row.warranty_unit) : null;
  const active = Boolean(endsAt && endsAt > now);
  return {
    value: Number(row.warranty_value),
    unit: row.warranty_unit,
    coverage: row.coverage ?? "BOTH",
    exclusions: row.exclusions ?? null,
    starts_at: startsAt,
    ends_at: endsAt,
    active,
    days_left: active ? Math.ceil((endsAt - now) / 86400000) : 0,
  };
}
