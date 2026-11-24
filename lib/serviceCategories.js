// lib/serviceCategories.js
// Device categories for shop services. Keep in sync with
// server/utils/serviceCategories.js. "Others" needs the device typed in
// (custom_category). CONTROLLER and SMARTWATCH are no longer offered but
// older services may still use them.

export const OFFERED_CATEGORIES = ["SMARTPHONE", "TABLET", "LAPTOP", "DESKTOP", "OTHER"];
export const CUSTOM_CATEGORY_MAX = 60;

const LABELS = {
  SMARTPHONE: "Smartphone",
  TABLET: "Tablet",
  LAPTOP: "Laptop",
  DESKTOP: "PC",
  OTHER: "Others",
  CONTROLLER: "Controller",
  SMARTWATCH: "Smartwatch",
};

/** "PC", "Tablet"… or, for Others, the typed device ("Game console"). */
export function categoryLabel(category, customCategory) {
  const key = String(category ?? "").toUpperCase();
  if (key === "OTHER" && String(customCategory ?? "").trim()) return String(customCategory).trim();
  return LABELS[key] ?? (key ? key.charAt(0) + key.slice(1).toLowerCase() : "");
}

/** Problem with a category choice, or null. Mirrors validateCategory on the server. */
export function categoryProblem(category, customCategory) {
  if (!OFFERED_CATEGORIES.includes(category)) return "Choose a device category.";
  if (category === "OTHER") {
    const typed = String(customCategory ?? "").trim();
    if (typed.length < 2 || typed.length > CUSTOM_CATEGORY_MAX) return "Type the device this service is for.";
  }
  return null;
}
