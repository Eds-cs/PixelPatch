// server/utils/ai/redact.js
// Removes personal details from text before it is sent to OpenAI (brief B8).
// The model only needs the device and the problem. The user's own message is
// still saved as typed in their chat history, which they can delete.
//
// Every message sent to OpenAI (user and assistant, current and history) and
// every summary for a shop goes through redactPersonalInfo. The server never
// sends account data (name, email, phone, addresses) to OpenAI; this catches
// what users type themselves. When in doubt it removes: the assistant doesn't
// need any of it to troubleshoot a device. Test: npm --prefix server run ai:redact-test

// Joins regex pieces (regex literals or strings) into one RegExp.
const rx = (parts, flags) => new RegExp(parts.map((part) => (part instanceof RegExp ? part.source : part)).join(""), flags);

// "is", ":", "=", Tagalog "ay"/"ko"/"ng"/"ang", with "my"/"the" etc. between:
// "my password is", "PIN:", "ang mpin ko ay".
const JOIN = /(?:\s+(?:my|the|is|was|are|ay|ko|ng|ang|nya|niya|namin|natin|mo|yung|iyong|po|set\s+to|to)\b|\s*[:=])/;

// --- Secrets said with a keyword.
// Passwords: any value, except words that describe it ("my password is wrong").
const PASSWORD_WORD = /(pass\s?words?|passcodes?|passwd|pwd|recovery\s(?:key|codes?)|seed\sphrase|api\skey|access\stoken)/;
const NOT_A_SECRET =
  /(?!(?:not|wrong|incorrect|correct|right|forgotten|forgot|working|accepted|required|changed|blank|empty|none|same|still|also|already|too|very|hindi|mali|nakalimutan|ayaw|di|the|a|an|my|your|pattern|pin|face|fingerprint)\b)/;
const PASSWORD_VALUE = rx([/\b/, PASSWORD_WORD, JOIN, "+", /\s*/, NOT_A_SECRET, /["'“]?[^\s"'”,;]+["'”]?/], "gi");
// Codes: only when digits follow, so "the charging pin is bent" stays.
// "PIN: 1234", "otp 482913", "mpin ko ay 0000".
const CODE_WORD =
  /(pins?(?:\s?codes?)?|mpin|otp|one[- ]time\s(?:pin|code|password)|verification\scodes?|security\scodes?|auth(?:entication)?\scodes?|cvv2?|cvc|unlock\scodes?|lock\scodes?|screen\slock|passcodes?)/;
const CODE_VALUE = rx([/\b/, CODE_WORD, JOIN, "*", /\s*#?\s*\d[\d\s-]{2,}\d\b/], "gi");

// --- Identifiers given with a keyword (value has a digit, 5+ characters):
// "IMEI 356938035643809", "serial no: C02XK0ABJGH5", "TIN 123-456-789".
const ID_WORD =
  /(imei|serial(?:\snumber|\sno\.?)?|s\/n|account\s(?:number|no\.?)|acct\s(?:no\.?|number)|tin|sss|philhealth|pag-?ibig|umid|philsys|national\sid|passport(?:\snumber|\sno\.?)?|driver'?s\slicen[cs]e(?:\snumber|\sno\.?)?|licen[cs]e\s(?:number|no\.?))/;
const ID_VALUE = rx([/\b/, ID_WORD, JOIN, "*", /\s*#?\s*(?=[A-Z0-9._-]*\d)[A-Z0-9][A-Z0-9._-]{4,}\b/], "gi");
// Account names: any value, except describing words ("my Apple ID password").
// "Apple ID juandc", "username: maria_s", "gmail ko ay juandelacruz".
const ACCOUNT_WORD = /(apple\s?id|icloud(?:\saccount)?|gmail(?:\saccount)?|google\saccount|user\s?name|login\sname)/;
const NOT_AN_ACCOUNT = /(?!(?:password|passcode|account|app|is|ko|not|wrong|locked|disabled)\b)/;
const ACCOUNT_VALUE = rx([/\b/, ACCOUNT_WORD, JOIN, "*", /\s+/, NOT_A_SECRET, NOT_AN_ACCOUNT, /[A-Z0-9][\w.@+-]{2,}/], "gi");

// --- Contact details.
const EMAIL = /[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/gi;
// "juan at gmail dot com", "juan(at)yahoo(dot)com"
const EMAIL_SPELLED = /\b[\w.+-]+\s*(?:\(at\)|\[at\]|\{at\}|\s+at\s+)\s*[\w-]+\s*(?:\(dot\)|\[dot\]|\{dot\}|\s+dot\s+)\s*[a-z]{2,6}\b/gi;
const URL = /\b(?:https?:\/\/|www\.)[^\s<>"']+/gi;
// Bare profile links like "fb.com/juan.delacruz".
const SOCIAL_LINK = /\b(?:facebook|fb|m\.me|messenger|instagram|tiktok|twitter|x|t\.me|telegram|youtube|linkedin)\.(?:com|me)\/[^\s<>"']+/gi;
// "@juan_dc" (an email was already removed above).
const HANDLE = /(^|[^\w.@])@[A-Za-z0-9_][A-Za-z0-9_.]{1,29}/g;
// Device details always get through: models, model numbers, specs, error
// codes, and version numbers. A number right after "build", "version",
// "firmware" etc. is a version, not an IP address or an ID.
const NOT_A_VERSION =
  /(?<!\b(?:build|build\s+number|version|ver\.?|v|firmware|fw|bios|uefi|os|kernel|update|patch|baseband|android|ios|ipados|macos|windows|win|one\s+ui|miui|hyperos|coloros|realme\s+ui|funtouch|harmonyos|emui|kb)\s*(?:no\.?|number)?\s*[:#]?\s*)/;
const IPV4 = rx([NOT_A_VERSION, /\b(?:(?:25[0-5]|2[0-4]\d|1?\d?\d)\.){3}(?:25[0-5]|2[0-4]\d|1?\d?\d)\b/], "gi");
const MAC = /\b(?:[0-9A-F]{2}[:-]){5}[0-9A-F]{2}\b/gi;

// Card-like numbers: 13 to 19 digits, optionally grouped by spaces or dashes.
const CARD = /\b(?:\d[ -]?){12,18}\d\b/g;
// Philippine mobile numbers (09XX XXX XXXX, +63 9XX..., 639XX...) and
// landlines like (062) 991 1234, with spaces, dots or dashes between groups.
const PH_MOBILE = /(?:\+?63|0)[ .-]?9\d{2}[ .-]?\d{3}[ .-]?\d{4}\b/g;
const LANDLINE = /\(?\b0\d{1,3}\)?[ .-]?\d{3}[ .-]?\d{4}\b/g;
// Any other long run of 10+ digits (international numbers, account numbers, IDs).
// Dotted version numbers (10.0.19045.3803) aren't IDs either.
const LONG_DIGITS = rx([NOT_A_VERSION, /(?<![\d.])\+?\d(?:[ .-]?\d){9,}/], "gi");

// --- Addresses. The city or barangay alone is fine (the assistant only works
// in Zamboanga City); house numbers, streets and "I live at ..." are not.
const ADDRESS_INTRO =
  /\b(?:my\s+(?:home\s+|house\s+)?address\s+is|my\s+address\s*:|i\s+live\s+(?:at|on)|we\s+live\s+(?:at|on)|our\s+address\s+is|address\s+ko\s+(?:ay|is)?|nakatira\s+(?:ako|kami)\s+sa|bahay\s+(?:ko|namin)\s+(?:ay\s+)?sa)\b(?:[^.!?\n]|(?<=\b(?:sta|sto|st|brgy|blk|no|gen|dr|ave|rd))\.){0,120}/gi;
const HOUSE_NUMBER = /\b(?:blk|block|lot|phase|purok|unit|rm|room|house\s+no\.?|bldg|building)\s*\.?\s*#?\s*\d+[A-Z]?\b/gi;
const STREET =
  /(?:#\s*)?\b\d{1,5}[A-Z]?(?:-[A-Z0-9]+)?,?\s+(?:[\w'.-]+\s+){0,4}(?:street|st\.|road|rd\.|avenue|ave\.|drive|dr\.|lane|ln\.|extension|ext\.|highway|hwy\.?|boulevard|blvd\.?|subdivision|subd\.?|village)(?=[\s,.!?]|$)/gi;

// --- Names given outright: "my name is Juan Dela Cruz", "ako si Maria",
// "pangalan ko ay ...". Up to four words, stopping at punctuation or a joining
// word ("my name is Juan and my phone ...").
const NAME_INTRO =
  /\b(?:my\s+(?:full\s+|real\s+)?name\s+is|my\s+name'?s|name\s*:|i\s+am\s+called|ako\s+(?:po\s+)?si|(?:ang\s+)?pangalan\s+ko\s+(?:po\s+)?(?:ay|is)?|el\s+d[ei]\s+mio\s+nombre\s+(?:es)?)\s*\p{L}[\p{L}'.-]*(?:\s+(?!(?:and|at|ang|tapos|but|my|ko|from|taga|po)\b)\p{L}[\p{L}'.-]*){0,3}/giu;

// --- Birthdates given outright.
const BIRTHDATE =
  /\b(?:born\s+(?:on|in)|birth\s?(?:day|date)\s*(?:is|ko|:)?|date\s+of\s+birth\s*:?|kaarawan\s+ko\s*(?:ay)?)\s+[^.!?\n,]{2,30}(?:,\s*\d{4})?/gi;

export function redactPersonalInfo(text) {
  return String(text ?? "")
    // Secrets and identifiers first, so their keyword is removed with them.
    .replace(PASSWORD_VALUE, "[$1 removed]")
    .replace(CODE_VALUE, "[$1 removed]")
    .replace(ID_VALUE, "[$1 removed]")
    .replace(ACCOUNT_VALUE, "[$1 removed]")
    .replace(EMAIL, "[email removed]")
    .replace(EMAIL_SPELLED, "[email removed]")
    .replace(URL, "[link removed]")
    .replace(SOCIAL_LINK, "[link removed]")
    .replace(HANDLE, "$1[username removed]")
    .replace(MAC, "[number removed]")
    .replace(IPV4, "[number removed]")
    .replace(CARD, "[number removed]")
    .replace(PH_MOBILE, "[phone number removed]")
    .replace(LANDLINE, "[phone number removed]")
    .replace(LONG_DIGITS, "[number removed]")
    .replace(ADDRESS_INTRO, "[address removed]")
    .replace(STREET, "[address removed]")
    .replace(HOUSE_NUMBER, "[address removed]")
    .replace(BIRTHDATE, "[birthdate removed]")
    .replace(NAME_INTRO, "[name removed]");
}
