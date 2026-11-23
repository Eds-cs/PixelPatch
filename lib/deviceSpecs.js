// lib/deviceSpecs.js
// The device types PixelPatch repairs and the specifications asked for each.
// Keep in sync with server/utils/deviceSpecs.js (the server validates the
// same types, keys and required fields).
//
// `column: true` fields are stored in their own devices column; the rest are
// stored together in devices.specs (JSON).

const SERIAL = { key: "serial_number", label: "Serial number", column: true, placeholder: "On the box, sticker or in Settings", caps: true };
const MODEL_NUMBER = { key: "model_number", label: "Model number", column: true, placeholder: "e.g. SM-G991B", caps: true };

export const DEVICE_TYPES = {
  PHONE: {
    label: "Phone",
    icon: "phone-portrait-outline",
    hint: "Smartphones of any brand.",
    example: "My phone",
    fields: [
      { key: "brand", label: "Brand", column: true, required: true, placeholder: "e.g. Samsung, Apple, Xiaomi" },
      { key: "model", label: "Model", column: true, required: true, placeholder: "e.g. Galaxy S21" },
      { key: "storage", label: "Storage", required: true, options: ["32 GB", "64 GB", "128 GB", "256 GB", "512 GB", "1 TB"] },
      { key: "ram", label: "RAM", options: ["2 GB", "3 GB", "4 GB", "6 GB", "8 GB", "12 GB", "16 GB"] },
      { key: "os", label: "Operating system", options: ["Android", "iOS", "HarmonyOS", "Other"] },
      { key: "color", label: "Color", placeholder: "e.g. Phantom Black" },
      { ...SERIAL, label: "IMEI or serial number", placeholder: "Dial *#06# to see the IMEI" },
      MODEL_NUMBER,
    ],
  },
  LAPTOP: {
    label: "Laptop",
    icon: "laptop-outline",
    hint: "Notebooks, MacBooks and 2-in-1s.",
    example: "My work laptop",
    fields: [
      { key: "brand", label: "Brand", column: true, required: true, placeholder: "e.g. Acer, Lenovo, Apple" },
      { key: "model", label: "Model", column: true, required: true, placeholder: "e.g. Aspire 5, MacBook Air M1" },
      { key: "processor", label: "Processor (CPU)", required: true, placeholder: "e.g. Intel Core i5-1135G7, Apple M1" },
      { key: "ram", label: "RAM", required: true, options: ["4 GB", "8 GB", "16 GB", "32 GB", "64 GB"] },
      { key: "storage", label: "Storage", required: true, placeholder: "e.g. 512 GB SSD" },
      { key: "gpu", label: "Graphics card", placeholder: "e.g. NVIDIA RTX 3050 (leave blank if built-in)" },
      { key: "screen_size", label: "Screen size", placeholder: "e.g. 15.6 in" },
      { key: "os", label: "Operating system", options: ["Windows", "macOS", "Linux", "ChromeOS", "Other"] },
      SERIAL,
      MODEL_NUMBER,
    ],
  },
  DESKTOP: {
    label: "Desktop (CPU)",
    icon: "desktop-outline",
    hint: "The system unit (CPU) of a desktop computer, branded or custom-built.",
    example: "Home PC",
    fields: [
      { key: "brand", label: "Brand", column: true, placeholder: "e.g. Dell, or leave blank if custom-built" },
      { key: "model", label: "Model", column: true, placeholder: "e.g. OptiPlex 7090, or \"Custom build\"" },
      { key: "processor", label: "Processor (CPU)", required: true, placeholder: "e.g. AMD Ryzen 5 5600" },
      { key: "motherboard", label: "Motherboard", placeholder: "e.g. ASUS PRIME B550M-A" },
      { key: "ram", label: "RAM", required: true, options: ["4 GB", "8 GB", "16 GB", "32 GB", "64 GB", "128 GB"] },
      { key: "storage", label: "Storage", required: true, placeholder: "e.g. 1 TB HDD + 256 GB SSD" },
      { key: "gpu", label: "Graphics card", placeholder: "e.g. GTX 1660 Super (leave blank if built-in)" },
      { key: "psu", label: "Power supply", placeholder: "e.g. 550 W" },
      { key: "os", label: "Operating system", options: ["Windows", "Linux", "Other"] },
      SERIAL,
    ],
  },
};

export const DEVICE_TYPE_KEYS = Object.keys(DEVICE_TYPES);

export const typeLabel = (type) => DEVICE_TYPES[type]?.label ?? "Type not set";
export const typeIcon = (type) => DEVICE_TYPES[type]?.icon ?? "hardware-chip-outline";

/** devices.specs arrives as a JSON string (MariaDB) or an object. */
export function parseSpecs(specs) {
  if (!specs) return {};
  if (typeof specs === "object") return specs;
  try {
    const parsed = JSON.parse(specs);
    return parsed && typeof parsed === "object" ? parsed : {};
  } catch {
    return {};
  }
}

/** [{ label, value }] for every filled-in field, in the type's order. */
export function specRows(device) {
  const type = DEVICE_TYPES[device?.device_type];
  if (!type) return [];
  const specs = parseSpecs(device.specs);
  return type.fields
    .map((field) => ({
      label: field.label,
      value: String((field.column ? device[field.key] : specs[field.key]) ?? "").trim(),
    }))
    .filter((row) => row.value);
}

/** Short line for lists: "8 GB RAM · 256 GB". */
export function specSummary(device) {
  const specs = parseSpecs(device?.specs);
  return [specs.processor, specs.ram && `${specs.ram} RAM`, specs.storage].filter(Boolean).join(" · ");
}
