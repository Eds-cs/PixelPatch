// server/utils/ai/findShops.js
// Shop recommendations for the AI assistant. The model asks for shops through
// the find_shops tool; this file is the only place that decides which shops
// it may name. Every shop returned:
//   * is verified (shops.is_verified = 1) and its owner isn't suspended,
//   * is in Zamboanga City,
//   * offers an APPROVED service for the device,
//   * isn't the caller's own shop (a business can't request its own shop).
// Shops with a service matching the problem, by rating; only when none has
// one, shops that repair the device.
//
// SUBSCRIPTIONS: business rule 2 (AGENTS.md section 20) says only shops with
// an active subscription are listed. Subscriptions aren't built yet, so there
// is no check. When they are, add it in SHOP_FILTERS below.
//
// Paid placement: none. If a subscription perk ever buys a higher spot, the
// card must be labelled "Featured".
import db from "../../config/db.js";
import { canonicalBarangay } from "../serviceArea.js";
import { categoryLabelOf } from "./labels.js";

export const MAX_SHOPS = 3;

// Device type (from the tool) -> shop_services.category values.
const DEVICE_CATEGORIES = {
  SMARTPHONE: ["SMARTPHONE"],
  TABLET: ["TABLET"],
  LAPTOP: ["LAPTOP"],
  DESKTOP: ["DESKTOP"],
  // Older services may still use the retired CONTROLLER/SMARTWATCH categories.
  OTHER: ["OTHER", "CONTROLLER", "SMARTWATCH"],
};

// Words that show a service is meant for a problem (matched against the
// service's name and description).
const ISSUE_WORDS = {
  SCREEN: ["screen", "lcd", "display", "oled", "touch", "glass", "digitizer", "cracked"],
  BATTERY: ["battery", "batteries", "swollen", "drain"],
  CHARGING: ["charging", "charge", "charger", "port", "usb", "type c", "lightning"],
  WATER_DAMAGE: ["water", "liquid", "wet", "moisture", "submerged"],
  NO_POWER: ["power", "boot", "dead", "motherboard", "board", "turn on", "diagnostic"],
  SLOW_PERFORMANCE: ["slow", "performance", "cleanup", "tune", "upgrade", "ssd", "ram", "reformat", "format"],
  SOFTWARE: ["software", "os", "reformat", "format", "flash", "update", "virus", "windows", "android", "ios", "reset"],
  AUDIO: ["speaker", "audio", "sound", "mic", "microphone", "earpiece", "headphone"],
  CAMERA: ["camera", "lens"],
  BUTTONS: ["button", "buttons", "power button", "volume"],
  KEYBOARD: ["keyboard", "keys", "trackpad", "touchpad"],
  CONNECTIVITY: ["wifi", "wi fi", "bluetooth", "signal", "network", "antenna", "sim"],
  STORAGE: ["storage", "hdd", "ssd", "hard drive", "data", "recovery", "memory"],
  OVERHEATING: ["overheat", "overheating", "heat", "fan", "thermal", "cleaning"],
  // OTHER (problem unknown): no service is singled out; cards show "<Device> repairs".
  OTHER: [],
};

const norm = (value) =>
  ` ${String(value ?? "").toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/[^a-z0-9]+/g, " ").trim()} `;

const hasWord = (haystack, word) => haystack.includes(` ${norm(word).trim()} `);

// Older shops left the city blank; a Zamboanga barangay with a blank city counts.
function inZamboanga(row) {
  if (!canonicalBarangay(row.barangay)) return false;
  const city = norm(row.city).trim();
  return !city || city === "zamboanga city" || city === "zamboanga";
}

function serviceScore(service, issueCategory) {
  const words = ISSUE_WORDS[issueCategory] ?? [];
  const name = norm(service.service_name);
  const description = norm(service.description);
  let score = 0;
  for (const word of words) {
    if (hasWord(name, word)) score += 2;
    else if (hasWord(description, word)) score += 1;
  }
  return score;
}

/**
 * Shops for a device and problem, best first.
 * shopIds: only these shops, kept in the given order (rebuilding saved cards).
 */
export async function findShops({ deviceType, issueCategory, userId = null, shopIds = null, limit = MAX_SHOPS }) {
  const categories = DEVICE_CATEGORIES[deviceType] ?? null;
  const where = ["s.is_verified = 1", "owner.suspended_at IS NULL", "ss.review_status = 'APPROVED'"];
  const params = [];
  // SHOP_FILTERS: add the active-subscription check here once subscriptions exist.
  if (categories) { where.push("ss.category IN (?)"); params.push(categories); }
  // Never the caller's own shop, or the shop they work at.
  if (userId) {
    where.push("s.user_id <> ?", "s.id NOT IN (SELECT se.shop_id FROM shop_employees se WHERE se.user_id = ? AND se.is_active = 1)");
    params.push(userId, userId);
  }
  if (shopIds) {
    if (!shopIds.length) return [];
    where.push("s.id IN (?)");
    params.push(shopIds);
  }

  const [rows] = await db.promise().query(
    `SELECT s.id AS shop_id, s.name AS shop_name, a.barangay, a.city,
            ss.id AS service_id, ss.name AS service_name, ss.description, ss.category,
            ss.custom_category, ss.base_price, ss.estimated_timeframe,
            COALESCE(rv.review_count, 0) AS review_count, rv.rating
       FROM shops s
       JOIN users owner ON owner.id = s.user_id
       JOIN addresses a ON a.id = s.address_id
       JOIN shop_services ss ON ss.shop_id = s.id
       LEFT JOIN (SELECT shop_id, COUNT(rating) AS review_count, AVG(rating) AS rating
                    FROM reviews WHERE rating IS NOT NULL GROUP BY shop_id) rv ON rv.shop_id = s.id
      WHERE ${where.join(" AND ")}`,
    params
  );

  // Best service per shop: the one matching the problem best, then the cheapest.
  const byShop = new Map();
  for (const row of rows) {
    if (!inZamboanga(row)) continue;
    const score = serviceScore(row, issueCategory);
    const current = byShop.get(row.shop_id);
    const price = Number(row.base_price);
    if (!current || score > current.score || (score === current.score && price < current.price)) {
      byShop.set(row.shop_id, { row, score, price });
    }
  }

  let shops = [...byShop.values()].map(({ row, score, price }) => {
    const device = categoryLabelOf(row.category, row.custom_category);
    // No service names the problem: show the device ("Smartphone repairs")
    // with the shop's lowest price, rather than an unrelated service's name.
    const exact = score > 0;
    return {
      id: row.shop_id,
      name: row.shop_name,
      verified: true,
      rating: row.rating === null ? null : Math.round(Number(row.rating) * 10) / 10,
      review_count: Number(row.review_count) || 0,
      barangay: canonicalBarangay(row.barangay),
      match: exact ? "ISSUE" : "DEVICE",
      service: {
        id: exact ? row.service_id : null,
        name: exact ? row.service_name : `${categories && device ? device : "Device"} repairs`,
        device,
        price,
        timeframe: exact ? row.estimated_timeframe : null,
      },
      _score: score,
    };
  });

  // Shops with a service for the problem come first; shops that only do the
  // device are shown only when no shop has a matching service.
  if (!shopIds && shops.some((shop) => shop._score > 0)) shops = shops.filter((shop) => shop._score > 0);

  if (shopIds) {
    const order = new Map(shopIds.map((id, index) => [Number(id), index]));
    shops.sort((a, b) => (order.get(a.id) ?? 99) - (order.get(b.id) ?? 99));
  } else {
    shops.sort((a, b) =>
      b._score - a._score ||
      (b.rating ?? 0) - (a.rating ?? 0) ||
      b.review_count - a.review_count ||
      a.name.localeCompare(b.name)
    );
  }
  shops = shops.slice(0, limit);
  shops.forEach((shop) => delete shop._score);
  return shops;
}

/* ------------------------------------------------------------------
   Guessing the device and problem from the conversation, without the
   model. Used when OpenAI isn't called: the daily-limit pop-up and the
   "Talk to a shop" button. English, Tagalog and Taglish words.
------------------------------------------------------------------ */
const DEVICE_GUESS = [
  ["LAPTOP", ["laptop", "notebook", "macbook", "chromebook", "lappy"]],
  ["TABLET", ["tablet", "ipad", "galaxy tab", "tab"]],
  ["DESKTOP", ["desktop", "pc", "computer", "kompyuter", "cpu", "system unit", "monitor"]],
  ["SMARTPHONE", ["phone", "cellphone", "cp", "selpon", "cellfone", "iphone", "android", "smartphone", "mobile", "samsung", "oppo", "vivo", "xiaomi", "realme", "infinix", "tecno", "redmi", "huawei"]],
];

const ISSUE_GUESS = [
  ["WATER_DAMAGE", ["water", "wet", "liquid", "nabasa", "basa", "nalubog", "tubig", "naulanan"]],
  ["BATTERY", ["battery", "baterya", "swollen", "bloated", "lobo", "drain"]],
  ["CHARGING", ["charge", "charging", "charger", "mag charge", "nagcha charge", "port"]],
  ["SCREEN", ["screen", "display", "lcd", "cracked", "basag", "touch", "flicker", "flickers", "lines", "black screen"]],
  ["NO_POWER", ["turn on", "won t turn on", "wont turn on", "dead", "mag on", "patay", "no power", "boot"]],
  ["OVERHEATING", ["hot", "overheat", "overheating", "init", "mainit", "fan"]],
  ["SLOW_PERFORMANCE", ["slow", "lag", "lags", "hang", "mabagal", "nag hang", "freeze"]],
  ["AUDIO", ["sound", "speaker", "audio", "mic", "tunog", "walang tunog"]],
  ["CAMERA", ["camera", "kamera"]],
  ["KEYBOARD", ["keyboard", "keys", "touchpad", "trackpad"]],
  ["CONNECTIVITY", ["wifi", "wi fi", "bluetooth", "signal", "sim", "data"]],
  ["STORAGE", ["storage", "full", "memory", "space"]],
  ["SOFTWARE", ["app", "apps", "update", "virus", "software", "crash", "crashes", "error"]],
];

function guess(table, text) {
  const haystack = norm(text);
  for (const [key, words] of table) {
    if (words.some((word) => hasWord(haystack, word))) return key;
  }
  return null;
}

/** { deviceType, issueCategory } guessed from the user's messages (either may be null). */
export function guessFromText(text) {
  return { deviceType: guess(DEVICE_GUESS, text), issueCategory: guess(ISSUE_GUESS, text) ?? "OTHER" };
}
