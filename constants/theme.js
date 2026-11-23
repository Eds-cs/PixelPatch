// constants/theme.js
/*
  Hex values for places NativeWind classes can't reach: StatusBar,
  React Navigation themes, icon `color` props, charts, Xendit pages.
  Keep in sync with global.css and tailwind.config.js.
*/

export const palette = {
  light: {
    background: "#F8FAFA",
    surface: "#FFFFFF",
    surfaceMuted: "#F1F5F5",
    border: "#E2E8E8",
    foreground: "#0F1F1E",
    muted: "#52635F",
    primary: "#0F766E",
    primaryForeground: "#FFFFFF",
    primarySoft: "#CCFBF1",
    primarySoftForeground: "#134E4A",
    accent: "#F59E0B",
    accentForeground: "#451A03",
    price: "#B45309",
    success: "#15803D", successSoft: "#DCFCE7",
    warning: "#A16207", warningSoft: "#FEF9C3",
    danger: "#B91C1C", dangerSoft: "#FEE2E2", dangerFill: "#DC2626",
    info: "#1D4ED8", infoSoft: "#DBEAFE",
    neutral: "#475569", neutralSoft: "#F1F5F9",
  },
  // Not used yet: dark mode is switched off (see global.css).
  dark: {
    background: "#0B1514",
    surface: "#111F1E",
    surfaceMuted: "#182A28",
    border: "#243B39",
    foreground: "#E6F2F1",
    muted: "#9BB0AD",
    primary: "#2DD4BF",
    primaryForeground: "#042F2E",
    primarySoft: "#134E4A",
    primarySoftForeground: "#99F6E4",
    accent: "#FBBF24",
    accentForeground: "#451A03",
    price: "#FCD34D",
    success: "#4ADE80", successSoft: "#14532D",
    warning: "#FACC15", warningSoft: "#422006",
    danger: "#F87171", dangerSoft: "#450A0A", dangerFill: "#DC2626",
    info: "#60A5FA", infoSoft: "#172554",
    neutral: "#CBD5E1", neutralSoft: "#1E293B",
  },
};

const light = palette.light;

// The names screens already use, mapped onto the palette.
export const COLORS = {
  primary: light.primary,
  primaryDark: "#115E59", // teal-800: pressed states
  text: light.foreground,
  textMuted: light.muted,
  placeholder: "#8A9B98", // gray-400
  border: light.border,
  background: light.background,
  surface: light.surface,
  accent: light.accent,
  danger: light.danger,
  success: light.success,
  warning: light.warning,
  info: light.info,
};

/*
  Repair status → badge classes, keyed by the statuses the app shows
  (getRepairDisplayStatus in components/RepairSummary.jsx).
  Rule of thumb: info = waiting on the shop, warning = waiting on the
  client, primary = work under way, success = done, danger = something
  went wrong, neutral = closed with no further action.
*/
const toneClasses = {
  info: { bg: "bg-info-soft", text: "text-info" },
  warning: { bg: "bg-warning-soft", text: "text-warning" },
  primary: { bg: "bg-primary-soft", text: "text-primary-soft-foreground" },
  success: { bg: "bg-success-soft", text: "text-success" },
  danger: { bg: "bg-danger-soft", text: "text-danger" },
  neutral: { bg: "bg-neutral-soft", text: "text-neutral" },
};

export const repairStatusTone = {
  pending: "info",      // waiting for the shop to accept
  accepted: "info",
  review: "info",       // assessment, quotation and payment
  in_progress: "primary",
  completed: "success",
  rejected: "neutral",
  cancelled: "neutral",
};

export function statusBadgeClasses(status) {
  return toneClasses[repairStatusTone[status] ?? "neutral"];
}

// Same tones for dispute statuses (components/DisputeSummary.jsx).
export const disputeStatusTone = {
  OPEN: "danger",           // the shop needs to respond
  SHOP_PROPOSED: "warning", // waiting on the client
  RESOLVED: "success",
  REJECTED: "neutral",
};

export function toneClassesFor(tone) {
  return toneClasses[tone] ?? toneClasses.neutral;
}
