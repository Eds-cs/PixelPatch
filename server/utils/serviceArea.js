// server/utils/serviceArea.js
// Keep in sync with constants/serviceArea.js (the app's copy).

// Zamboanga City's barangays, verbatim from Wikipedia's "List of barangays in
// Zamboanga City" (checked 2026-11-20). The page's text says 98 barangays but
// its table lists the 99 names below; all are accepted, since wrongly rejecting
// a real barangay is worse than accepting one extra name.
export const ZAMBOANGA_BARANGAYS = [
  "Arena Blanco",
  "Ayala",
  "Baliwasan",
  "Baluno",
  "Boalan",
  "Bolong",
  "Buenavista",
  "Bunguiao",
  "Busay (Sacol Island)",
  "Cabaluay",
  "Cabatangan",
  "Cacao",
  "Calabasa",
  "Calarian",
  "Camino Nuevo",
  "Campo Islam",
  "Canelar",
  "Capisan",
  "Cawit",
  "Culianan",
  "Curuan",
  "Dita",
  "Divisoria",
  "Dulian (Upper Bunguiao)",
  "Dulian (Upper Pasonanca)",
  "Guisao",
  "Guiwan",
  "Kasanyangan",
  "La Paz",
  "Labuan",
  "Lamisahan",
  "Landang Gua",
  "Landang Laum",
  "Lanzones",
  "Lapakan",
  "Latuan (Curuan)",
  "Licomo",
  "Limaong",
  "Limpapa",
  "Lubigan",
  "Lumayang",
  "Lumbangan",
  "Lunzuran",
  "Maasin",
  "Malagutay",
  "Mampang",
  "Manalipa",
  "Mangusu",
  "Manicahan",
  "Mariki",
  "Mercedes",
  "Muti",
  "Pamucutan",
  "Pangapuyan",
  "Panubigan",
  "Pasilmanta (Sacol Island)",
  "Pasobolong",
  "Pasonanca",
  "Patalon",
  "Putik",
  "Quiniput",
  "Recodo",
  "Rio Hondo",
  "Salaan",
  "San Jose Cawa-Cawa",
  "San Jose Gusu",
  "San Ramon",
  "San Roque",
  "Sangali",
  "Santa Barbara",
  "Santa Catalina",
  "Santa Maria",
  "Santo Niño",
  "Sibulao (Caruan)",
  "Sinubung",
  "Sinunoc",
  "Tagasilay",
  "Taguiti",
  "Talabaan",
  "Talisayan",
  "Talon-Talon",
  "Taluksangay",
  "Tetuan",
  "Tictapul",
  "Tigbalabag",
  "Tigtabon",
  "Tolosa",
  "Tugbungan",
  "Tulungatung",
  "Tumaga",
  "Tumalutab",
  "Tumitus",
  "Victoria",
  "Vitali",
  "Zambowood",
  "Zone I (Poblacion)",
  "Zone II (Poblacion)",
  "Zone III (Poblacion)",
  "Zone IV (Poblacion)",
];

// Values every address is saved with. PixelPatch only serves Zamboanga City.
export const SERVICE_AREA = {
  country: "Philippines",
  region: "Region IX",
  province: "Zamboanga del Sur",
  city: "Zamboanga City",
  postal_code: "7000",
};

export const SERVICE_AREA_MESSAGE =
  "PixelPatch is only available in Zamboanga City for now. Choose a barangay in Zamboanga City.";

// Comparison key: case, accents, punctuation and "Brgy."/"Sta."/"Sto." styles ignored.
const keyOf = (value) =>
  String(value ?? "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/^\s*(brgy\.?|barangay)\s+/, "")
    .replace(/\bsta\.?\s/g, "santa ")
    .replace(/\bsto\.?\s/g, "santo ")
    .replace(/[^a-z0-9]+/g, " ")
    .trim();

const BY_KEY = new Map(ZAMBOANGA_BARANGAYS.map((name) => [keyOf(name), name]));

/** The official spelling of a Zamboanga City barangay, or null if it isn't one. */
export function canonicalBarangay(value) {
  return BY_KEY.get(keyOf(value)) ?? null;
}

/** True when a saved address is a Zamboanga City barangay. */
export function isInServiceArea(address) {
  if (!address || !canonicalBarangay(address.barangay)) return false;
  const city = keyOf(address.city);
  // Older rows sometimes left the city blank and put the city in "province".
  return city === "zamboanga city" || city === "zamboanga" || (!city && keyOf(address.province).startsWith("zamboanga"));
}
