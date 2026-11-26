// server/utils/ai/labels.js
// Device labels for shop cards. Mirrors categoryLabel in lib/serviceCategories.js.
const LABELS = {
  SMARTPHONE: "Smartphone",
  TABLET: "Tablet",
  LAPTOP: "Laptop",
  DESKTOP: "PC",
  OTHER: "Others",
  CONTROLLER: "Controller",
  SMARTWATCH: "Smartwatch",
};

export function categoryLabelOf(category, customCategory) {
  const key = String(category ?? "").toUpperCase();
  if (key === "OTHER" && String(customCategory ?? "").trim()) return String(customCategory).trim();
  return LABELS[key] ?? "";
}
