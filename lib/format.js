// lib/format.js — small display helpers shared across screens.

export function formatAddress(a) {
  return [a?.street, a?.barangay, a?.city, a?.province].filter(Boolean).join(", ");
}
