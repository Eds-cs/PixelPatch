// utils/deviceSpecs.js
// Device types PixelPatch repairs and the specifications required for each.
// Keep in sync with lib/deviceSpecs.js (the app's form).
//
// brand, model, serial_number and model_number have their own devices
// columns; every other specification is stored in devices.specs (JSON).

import { LIMITS, tooLongMessage } from "./inputLimits.js";

const COLUMNS = ["brand", "model", "serial_number", "model_number"];

export const DEVICE_TYPES = {
  PHONE: {
    label: "Phone",
    required: ["brand", "model", "storage"],
    specs: ["storage", "ram", "os", "color"],
  },
  LAPTOP: {
    label: "Laptop",
    required: ["brand", "model", "processor", "ram", "storage"],
    specs: ["processor", "ram", "storage", "gpu", "screen_size", "os"],
  },
  DESKTOP: {
    label: "Desktop (CPU)",
    required: ["processor", "ram", "storage"],
    specs: ["processor", "motherboard", "ram", "storage", "gpu", "psu", "os"],
  },
};

const LABELS = {
  brand: "Brand",
  model: "Model",
  storage: "Storage",
  ram: "RAM",
  processor: "Processor",
};

// Every device detail (columns and specifications) shares one limit,
// LIMITS.deviceField in utils/inputLimits.js (the app uses it as maxLength).
const MAX_SPEC = LIMITS.deviceField;
const MAX_COLUMN = LIMITS.deviceField;
const COLUMN_LABELS = { brand: "Brand", model: "Model", serial_number: "Serial number", model_number: "Model number" };

/**
 * Checks a device form for its type. Returns { error } or
 * { device_type, columns: { brand, model, serial_number, model_number }, specs }.
 * `specs` arrives as a JSON string (multipart form) or an object.
 */
export function validateDevice(body) {
  const deviceType = String(body?.device_type ?? "").toUpperCase();
  const type = DEVICE_TYPES[deviceType];
  if (!type) return { error: "Choose the device type: phone, laptop or desktop (CPU)." };

  let rawSpecs = body?.specs ?? {};
  if (typeof rawSpecs === "string") {
    try {
      rawSpecs = rawSpecs ? JSON.parse(rawSpecs) : {};
    } catch {
      return { error: "Invalid device specifications." };
    }
  }
  if (!rawSpecs || typeof rawSpecs !== "object" || Array.isArray(rawSpecs)) {
    return { error: "Invalid device specifications." };
  }

  const text = (value) => String(value ?? "").trim();
  const columns = Object.fromEntries(COLUMNS.map((key) => [key, text(body?.[key])]));
  const longColumn = COLUMNS.find((key) => columns[key].length > MAX_COLUMN);
  if (longColumn) return { error: tooLongMessage(COLUMN_LABELS[longColumn], MAX_COLUMN) };

  // Only the specifications this type asks for are kept.
  const specs = {};
  for (const key of type.specs) {
    if (rawSpecs[key] !== null && typeof rawSpecs[key] === "object") return { error: "Invalid device specifications." };
    const value = text(rawSpecs[key]);
    if (value.length > MAX_SPEC) return { error: tooLongMessage(LABELS[key] ?? "A specification", MAX_SPEC) };
    if (value) specs[key] = value;
  }

  for (const key of type.required) {
    const value = COLUMNS.includes(key) ? columns[key] : specs[key];
    if (!value) return { error: `${LABELS[key] ?? key} is required for a ${type.label.toLowerCase()}.` };
  }

  return { device_type: deviceType, columns, specs };
}

/** A name for the device when the owner didn't give one. */
export function defaultDeviceName(deviceType, columns) {
  return [columns.brand, columns.model].filter(Boolean).join(" ") || DEVICE_TYPES[deviceType]?.label || "Device";
}
