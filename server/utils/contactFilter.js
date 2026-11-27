// server/utils/contactFilter.js
// Hides contact details in messages between clients and shops, so both sides
// keep the conversation (and payment) on PixelPatch, where disputes, refunds
// and reviews protect them.
//
// Hidden: phone numbers (also spaced out, written as words, or with look-alike
// letters such as "O9I7"), emails (also "at gmail dot com"), links, @handles,
// and "add me on FB" / "my Viber is ..." style invitations.
// Kept: names, prices, dates, times, addresses/landmarks, device models and
// model numbers, IMEI and serial numbers, error codes.
//
// This is a deterrent, not a wall: someone determined can still get around it
// (a photo of a business card, a number split over many messages). The rest
// is covered by the Terms.
//
// Used by the chat socket and REST chat endpoints (on send and on read) and
// for public shop descriptions. Test: npm --prefix server run chat:filter-test

export const CONTACT_HIDDEN = "[contact info hidden]";

// Separators people put between digits: "0917 123 4567", "0917-123-4567",
// "0.9.1.7", "(0917) 123", "0 9 1 7".
const SEP = "[\\s.\\-_,()*~+|]*";

// Digits written as words: English, Tagalog/Filipino, Chavacano/Spanish.
const DIGIT_WORD =
  "(?:zero|oh|one|two|three|four|five|six|seven|eight|nine|" +
  "sero|isa|dalawa|tatlo|apat|lima|anim|pito|walo|siyam|" +
  "cero|uno|dos|tres|kwatro|cuatro|kuatro|singko|cinco|seis|sais|siete|syete|ocho|otso|nueve|nuwebe)";
const DIGIT_TOKEN = `(?:\\d|\\b${DIGIT_WORD}\\b)`;
// Seven or more digit tokens in a row: a phone number (landlines have seven),
// a GCash/Maya/bank account or a card number.
const DIGIT_RUN = new RegExp(`(?:\\+${SEP})?${DIGIT_TOKEN}(?:${SEP}${DIGIT_TOKEN}){6,}`, "gi");

const EMAIL = /[A-Z0-9._%+-]+\s*@\s*[A-Z0-9.-]+\s*\.\s*[A-Z]{2,}/gi;
// "juan at gmail dot com", "juan(at)yahoo(dot)com", "juan @ gmail"
const EMAIL_SPELLED = /\b[\w.+-]+\s*(?:\(at\)|\[at\]|\{at\}|\s+at\s+|@)\s*(?:gmail|yahoo|ymail|outlook|hotmail|icloud|live|proton(?:mail)?|aol|mail)\b(?:\s*(?:\(dot\)|\[dot\]|\{dot\}|\s+dot\s+|\.)\s*[a-z]{2,6})*/gi;
const URL = /\b(?:https?:\/\/|www\.)[^\s<>"']+/gi;
// Bare domains: "juanrepairs.com", "fb.com/juan", "m.me/juan", "wa.me/63917..."
const DOMAIN = /\b(?:[a-z0-9-]+\.)+(?:com|net|org|ph|me|io|co|shop|store|site|online|page|link|ly|gg|app)\b(?:\/[^\s<>"']*)?/gi;
// "@juan_dc" (not part of an email).
const HANDLE = /(?<![\w.@])@[A-Za-z0-9_][A-Za-z0-9_.]{1,29}/g;

// Ways to reach someone outside PixelPatch.
const PLATFORM =
  "(?:fb|facebook|face\\s?book|messenger|msgr|viber|whats\\s?app|wa|telegram|tg|ig|insta|instagram|tiktok|tik\\s?tok|" +
  "wechat|line|signal|twitter|snapchat|snap|discord|skype|gmail|e-?mail|g-?cash|maya|paymaya|" +
  "contact\\s+(?:number|no\\.?|details|info)|cell\\s?(?:phone)?\\s+(?:number|no\\.?)|phone\\s+(?:number|no\\.?)|mobile\\s+(?:number|no\\.?)|cp\\s+(?:number|no\\.?)|number\\s+ko)";
// Words that end an identifier ("my fb is Juan Cruz and ...").
const STOP = "(?:and|or|but|so|then|tapos|para|kasi|po|pero|lang|na|ha|ok|okay|thanks|salamat|please|pls)";
// Words that describe the account rather than name it ("my fb is down").
const NOT_AN_ID =
  "(?!(?:is|ay|ko|was|down|not|working|broken|hacked|blocked|deactivated|disabled|banned|locked|slow|fine|ok|okay|open|closed|new|old|ready|same|also|still|the|a|an)\\b)";
// Up to four words of a name or username after the platform.
const IDENT = `${NOT_AN_ID}[^\\s,.!?;]+(?:\\s+(?!${STOP}\\b)[^\\s,.!?;]+){0,3}`;
// After "add me on FB," a capitalized name is taken too ("..., Maria Santos"),
// but not ordinary words ("..., see you tomorrow").
const NAME_AFTER_COMMA = /^\s*,\s*\p{Lu}[\p{L}'.-]*(?:\s+\p{Lu}[\p{L}'.-]*){0,3}/u;
// "my fb is Juan Dela Cruz", "viber: 0917...", "FB ko: juan.dc", "gcash name - Juan D".
const PLATFORM_ID = new RegExp(
  `\\b${PLATFORM}(?:\\s+(?:account|acct|name|page|id|handle|username|user|link|number|no\\.?|details))?` +
    `\\s*(?:\\b(?:is|ay|ko|namin|nmin|nyo|mo)\\b|[:=\\-])+\\s*${IDENT}`,
  "gi"
);
// "add me on fb", "message mo ako sa viber", "search us on facebook: Juan's Repair",
// "i-add mo ako sa FB", "chat tayo sa messenger". The following name, if any,
// goes with it.
const INVITE = new RegExp(
  `\\b(?:add|follow|message|msg|chat|text|call|ring|pm|dm|contact|reach|find|search|look\\s+for|hanapin|i-?add|i-?message|i-?pm|i-?text|tawagan|tawag|usap|kita)` +
    `(?:\\s+(?:me|us|ako|kami|mo|nyo|niyo|tayo|na|lang|po|ka))*` +
    `\\s+(?:on|sa|at|via|thru|through|in|using|ng)\\s+${PLATFORM}\\b(?:\\s*[:\\-]?\\s*${IDENT})?`,
  "gi"
);

// --- Kept on purpose (found first, so nothing above can touch them).
// Prices: "₱1,500", "P1500", "PHP 12,500.00", "1500 pesos", "12,500".
const PRICE = /(?:₱\s?|\bphp\s?|\bp(?=\d))\d{1,3}(?:,\d{3})*(?:\.\d{1,2})?(?![\d,])|(?:₱\s?|\bphp\s?|\bp(?=\d))\d{1,7}(?:\.\d{1,2})?(?![\d,])|\b\d{1,7}(?:\.\d{1,2})?\s?(?:pesos?|php)\b|\b\d{1,3}(?:,\d{3})+(?:\.\d{1,2})?\b/gi;
// Dates and times: "11/27/2026", "2026-11-27", "10:30 am".
const DATE = /\b\d{1,4}[/-]\d{1,2}[/-]\d{1,4}\b/g;
const TIME = /\b\d{1,2}:\d{2}(?::\d{2})?(?:\s?[ap]\.?m\.?)?/gi;
// Device and repair identifiers given with their name: "IMEI 356938035643809",
// "serial no: C02XK0ABJGH5", "model number SM-A546E", "error 0x80070005",
// "build 10.0.19045.3803", "Repair #123".
const DEVICE_ID =
  /\b(?:imei\s?\d?|serial(?:\s+(?:number|no\.?))?|s\/n|model(?:\s+(?:number|no\.?))?|part(?:\s+(?:number|no\.?))?|build(?:\s+number)?|version|ver\.?|firmware|bios|error(?:\s+code)?|repair|request|quotation|ticket)\b(?:\s+(?:is|ay|ko|my|the|no\.?|number))*\s*[:#=]?\s*([A-Z0-9][A-Z0-9./-]*)/gi;

const looksLikePhone = (value) => /^(?:\+?63|0)?9\d{9}$/.test(value.replace(/\D/g, "")) || value.replace(/\D/g, "").length === 7;

// Look-alike letters inside digit-heavy words ("O9I7-l23-4S67") are read as
// digits. Keycap emoji digits and full-width digits count too. The shadow text
// keeps the same length as the original, so positions match.
const LOOKALIKE = { o: "0", O: "0", l: "1", I: "1", i: "1", "|": "1", "!": "1", z: "2", Z: "2", s: "5", S: "5", B: "8" };
function shadowOf(text) {
  let shadow = text
    // Full-width digits (U+FF10..U+FF19) -> ASCII digits, one UTF-16 unit each.
    .replace(/[０-９]/g, (ch) => String.fromCharCode(ch.charCodeAt(0) - 0xff10 + 48))
    // Keycap digits "0️⃣": drop the variation selector and keycap marks.
    .replace(/[️⃣]/g, " ");
  shadow = shadow.replace(/\S+/g, (word) => {
    const digits = (word.match(/\d/g) || []).length;
    if (digits < 2 || digits < word.replace(/[^\w|!]/g, "").length / 2) return word;
    return word.replace(/[oOlIi|!zZsSB]/g, (ch) => LOOKALIKE[ch] ?? ch);
  });
  return shadow;
}

function protect(shadow) {
  const blank = (match) => "\u0001".repeat(match.length);
  return shadow
    .replace(DEVICE_ID, (match, value) => (value && looksLikePhone(value) ? match : blank(match)))
    .replace(PRICE, blank)
    .replace(DATE, blank)
    .replace(TIME, blank);
}

const MASKS = [EMAIL, EMAIL_SPELLED, URL, DOMAIN, HANDLE, PLATFORM_ID, INVITE, DIGIT_RUN];

/**
 * Returns { text, masked }: the text with contact details replaced by
 * "[contact info hidden]", and whether anything was hidden.
 */
export function maskContactInfo(input) {
  const text = String(input ?? "");
  if (!text) return { text, masked: false };
  const shadow = protect(shadowOf(text));

  const spans = [];
  for (const pattern of MASKS) {
    pattern.lastIndex = 0;
    for (const match of shadow.matchAll(pattern)) {
      // Never swallow a kept piece (a price right after "gcash ko").
      let end = match.index + match[0].length;
      const kept = match[0].indexOf("\u0001");
      if (kept === 0) continue;
      if (kept > 0) end = match.index + kept;
      if (pattern === INVITE && kept < 0) {
        const name = text.slice(end).match(NAME_AFTER_COMMA);
        if (name) end += name[0].length;
      }
      // Don't take trailing spaces or separators.
      while (end > match.index && /[\s.,\-_()*~+|]/.test(text[end - 1])) end -= 1;
      if (end > match.index) spans.push([match.index, end]);
    }
  }
  if (!spans.length) return { text, masked: false };

  // Merge overlapping spans and spans with only spaces/punctuation between.
  spans.sort((a, b) => a[0] - b[0]);
  const merged = [spans[0]];
  for (const [start, end] of spans.slice(1)) {
    const last = merged[merged.length - 1];
    if (start <= last[1] || /^[\s,;:/\-]*$/.test(text.slice(last[1], start))) last[1] = Math.max(last[1], end);
    else merged.push([start, end]);
  }

  let out = "";
  let at = 0;
  for (const [start, end] of merged) {
    out += text.slice(at, start) + CONTACT_HIDDEN;
    at = end;
  }
  out += text.slice(at);
  return { text: out, masked: true };
}

/** Just the masked text. */
export const hideContactInfo = (text) => maskContactInfo(text).text;

// Shown to the sender when part of their message was hidden.
export const CONTACT_HIDDEN_NOTICE =
  "We hid contact details in your message. Keep chats and payments on PixelPatch so you're protected by disputes and refunds.";
