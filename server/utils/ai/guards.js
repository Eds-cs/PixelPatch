// server/utils/ai/guards.js
// Checks on the user's message and the model's reply that don't rely on the
// model following its prompt (gpt-4o-mini doesn't always):
//   * needsShops: hazards (brief B2) and requests for a person (B5) must end
//     with shop cards. If the model didn't call find_shops, the server adds them.
//   * looksSpanish: Chavacano messages must not get a Spanish reply (B6).

const DEVICE = "(phone|laptop|tablet|pc|computer|desktop|cellphone|cp|device|ipad|iphone|macbook|charger)";
const NEAR = "\\s+(?:[\\w'-]+\\s+){0,3}"; // up to 3 words in between

// Hazard or hand-off wording, English and Tagalog/Taglish.
const NEEDS_SHOPS = [
  // battery hazards
  /\b(swollen|swelling|bloated|bulging|puffy|lumobo|namamaga)\b/i,
  new RegExp(`\\bbatter(y|ies)\\b${NEAR}(leak|leaking|hiss|hissing|smoking|smells?|burning|sparks?)\\b`, "i"),
  new RegExp(`\\b(remove|replace|take out|open|palitan|tanggalin)\\b${NEAR}batter(y|ies)\\b`, "i"),
  // opening the device, replacing parts, soldering
  // "open my laptop", "buksan ang laptop" (the device is the object, so
  // "apps won't open on my phone" doesn't count)
  new RegExp(`\\b(open|opening|disassemble|take apart|taking apart|unscrew|pry|buksan|baklasin)\\s+(?:up\\s+)?(?:my|the|a|your|this|ang|yung|ng)\\s+(?:[\\w'-]+\\s+){0,2}${DEVICE}\\b`, "i"),
  new RegExp(`\\b(open|disassemble|take apart|unscrew|buksan)\\s+(it|ito)\\b`, "i"),
  new RegExp(`\\b(replace|replacing|upgrade|upgrading|swap|palitan)\\b${NEAR}(ram|ssd|hdd|hard drive|screen|lcd|motherboard|charging port|keyboard|parts?)\\b`, "i"),
  /\bsolder\w*\b/i,
  // water or liquid damage
  /\b(water|liquid|wet|spilled|spill|submerged|toilet|nabasa|nalubog|natapunan|naulanan|binaha)\b/i,
  // mains power, chargers' insides
  /\b(power supply|psu|inside (of )?(the |my )?charger|open (the |my )?charger|mains|kuryente)\b/i,
  // wants a person
  /\b(real person|human|talk to (a |someone|somebody|technician)|technician|call me|tawagan|makausap)\b/i,
];

/** True when this message must end with shop recommendations. */
export function needsShops(text) {
  const value = String(text ?? "");
  return NEEDS_SHOPS.some((pattern) => pattern.test(value));
}

// Common short words that show a message isn't plain English.
const TAGALOG_MARKERS = ["ng", "ang", "ko", "mo", "po", "ba", "yung", "ayaw", "hindi", "sa", "naman", "lang", "paano", "bakit", "kasi", "siya", "nag", "mag", "pag", "ano", "anong", "ito", "yan", "wala", "meron", "pero", "talaga", "sira", "nasira", "pwede", "puwede"];
const CHAVACANO_MARKERS = ["ta", "el", "mio", "kame", "conele", "aqui", "ya", "no hay", "de mio", "de tuyo", "cosa", "porque", "esta", "kosa"];

const countMarkers = (text, markers) => {
  const words = ` ${String(text ?? "").toLowerCase().replace(/[^a-zñ\s'-]+/g, " ").replace(/\s+/g, " ")} `;
  return markers.filter((marker) => words.includes(` ${marker} `)).length;
};

/**
 * A system note about the language of the user's latest message (no user
 * text is copied into it), because gpt-4o-mini sometimes answers English in
 * Tagalog or Chavacano in Spanish.
 */
export function languageHint(text) {
  const chavacano = countMarkers(text, CHAVACANO_MARKERS);
  const tagalog = countMarkers(text, TAGALOG_MARKERS);
  if (chavacano >= 2 && chavacano > tagalog) return "The user's latest message looks like Chavacano. Reply in simple Tagalog, not Spanish.";
  if (tagalog >= 1) return "The user's latest message is in Tagalog or Taglish. Reply the same way.";
  return "The user's latest message is in English. Reply in English (message_to_user too).";
}

// Words in Spanish replies that Tagalog and English don't use. (Tagalog
// borrows "problema", "modelo", "segundo"..., so those aren't listed.)
// Chavacano shares Spanish vocabulary, but the assistant is told to answer
// Chavacano in Tagalog, so a reply full of these is in the wrong language.
const SPANISH_WORDS = [
  "intenta", "intentaste", "dispositivo", "celular", "cargador", "cargarlo", "mantén", "manten",
  "presionado", "botón", "reinicio", "también", "ayudar", "funcionen", "encendido", "batería",
  "técnico", "tienda", "necesitas", "dime", "pantalla", "agua", "llévalo", "revisar",
];

/** True when a reply looks like Spanish. */
export function looksSpanish(reply) {
  const text = ` ${String(reply ?? "").toLowerCase()} `;
  if (/[¿¡]/.test(text)) return true;
  const hits = SPANISH_WORDS.filter((word) => new RegExp(`[^a-záéíóúñ]${word}[^a-záéíóúñ]`).test(text)).length;
  return hits >= 3;
}
