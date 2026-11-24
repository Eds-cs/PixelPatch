// utils/serviceCategories.js
// The device categories a shop can choose for a service (since 2026-11-24):
// Smartphone, Tablet, Laptop, PC and Others. "Others" needs the device typed
// in (shop_services.custom_category, e.g. "Game console").
//
// The shop_services.category enum also has CONTROLLER and SMARTWATCH. They are
// no longer offered, but services that already use them keep them.
// Keep in sync with lib/serviceCategories.js.

export const OFFERED_CATEGORIES = ["SMARTPHONE", "TABLET", "LAPTOP", "DESKTOP", "OTHER"];
export const LEGACY_CATEGORIES = ["CONTROLLER", "SMARTWATCH"];
export const CUSTOM_CATEGORY_MAX = 60;

const text = (value) => String(value ?? "").trim();

/**
 * Checks a category choice. `current` is the service's existing category when
 * editing, so a legacy category can be kept unchanged.
 * Returns { error } or { category, customCategory } (customCategory is null
 * unless the category is OTHER).
 */
export function validateCategory(categoryIn, customIn, current = null) {
  const category = text(categoryIn).toUpperCase();
  const allowed = OFFERED_CATEGORIES.includes(category) || (current && category === current && LEGACY_CATEGORIES.includes(category));
  if (!allowed) return { error: "Choose a device category: Smartphone, Tablet, Laptop, PC or Others." };
  if (category !== "OTHER") return { category, customCategory: null };
  const customCategory = text(customIn).replace(/\s+/g, " ");
  if (customCategory.length < 2 || customCategory.length > CUSTOM_CATEGORY_MAX) {
    return { error: `Type the device this service is for (2 to ${CUSTOM_CATEGORY_MAX} characters), e.g. "Game console".` };
  }
  return { category, customCategory };
}
