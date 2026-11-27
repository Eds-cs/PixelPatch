// server/scripts/contactFilterTest.js
// Checks utils/contactFilter.js: contact details in client-shop chats are
// hidden, and normal repair talk (prices, dates, models, IMEI) is left alone.
// Calls nothing external.
//
//   npm --prefix server run chat:filter-test
import { maskContactInfo, CONTACT_HIDDEN } from "../utils/contactFilter.js";

// [message, text that must NOT survive]
const HIDE = [
  ["Text me 09171234567", "09171234567"],
  ["call 0917 123 4567 po", "123 4567"],
  ["+63 917-123-4567", "123-4567"],
  ["639171234567", "639171234567"],
  ["0917.123.4567", "123.4567"],
  ["(0917) 123-4567", "123-4567"],
  ["0 9 1 7 1 2 3 4 5 6 7", "4 5 6 7"],
  ["O9I7-l23-4S67", "4S67"],
  ["zero nine one seven one two three four five six seven", "four five six"],
  ["sero siyam isa pito isa dalawa tatlo apat lima anim pito", "apat lima"],
  ["landline 991 1234", "991 1234"],
  ["gcash 09171234567 juan d", "09171234567"],
  ["bank account 001234567890", "001234567890"],
  ["email me juan.dc@gmail.com", "juan.dc"],
  ["juan dot cruz at gmail dot com", "gmail"],
  ["juan @ gmail . com", "gmail"],
  ["check www.juanrepairs.com", "juanrepairs"],
  ["https://m.me/juanrepairs", "juanrepairs"],
  ["fb.com/juan.delacruz", "juan.delacruz"],
  ["wa.me/639171234567", "639171234567"],
  ["IG @juan_fixes", "juan_fixes"],
  ["my fb is Juan Dela Cruz", "Dela Cruz"],
  ["FB ko: Juan Repairs ZC", "Juan Repairs"],
  ["viber: 0917 123 4567", "4567"],
  ["add me on facebook Juan Cruz", "Juan Cruz"],
  ["message mo ako sa messenger", "messenger"],
  ["i-add mo ako sa FB, Maria Santos", "Maria Santos"],
  ["search us on facebook: Juan's Phone Repair", "Phone Repair"],
  ["gcash name: Pedro S.", "Pedro"],
  ["my contact number is zero nine one seven one two three four five six seven", "five six"],
  ["telegram @juanfix", "juanfix"],
  ["add me on FB, Maria Santos", "Maria Santos"],
];

// Messages that must come through unchanged.
const KEEP = [
  "Hi po, my name is Juan. My phone won't charge.",
  "The quotation is ₱1,500 for the screen",
  "P1500 for battery, PHP 2,350.00 with tempered glass",
  "Total is 12,500 pesos",
  "Can I drop it off on 11/27/2026 at 10:30 am?",
  "Pickup on 2026-11-28, 2:00 pm",
  "We're near the Tetuan church, beside the 7-Eleven",
  "Samsung Galaxy A54 SM-A546E, 128GB",
  "IMEI 356938035643809",
  "serial no: C02XK0ABJGH5",
  "model number A2643",
  "Error code 0x80070005 after the update",
  "Windows 10 build 10.0.19045.3803",
  "Repair #1234 is ready",
  "It takes 3-5 days",
  "I already tried restarting it 5 times",
  "Ayaw mag-on ng cellphone ko since kahapon",
  "Can I pay the balance in cash?",
  "Is your shop open on Sunday?",
  "My Facebook app keeps crashing",
  "Thanks! See you at 9:00",
  "iPhone 13 Pro Max A2643",
  "Battery health 78%, 1124 cycles",
  "I'll pay through GCash on the app",
  "my fb is down today",
  "fb ko is hacked, can you check my phone?",
];

let failed = 0;
for (const [input, secret] of HIDE) {
  const { text, masked } = maskContactInfo(input);
  const ok = masked && !text.includes(secret) && text.includes(CONTACT_HIDDEN);
  if (!ok) failed += 1;
  console.log(`${ok ? "PASS" : "FAIL"}  hide  ${JSON.stringify(input)} -> ${JSON.stringify(text)}`);
}
for (const input of KEEP) {
  const { text, masked } = maskContactInfo(input);
  const ok = !masked && text === input;
  if (!ok) failed += 1;
  console.log(`${ok ? "PASS" : "FAIL"}  keep  ${JSON.stringify(input)}${ok ? "" : ` -> ${JSON.stringify(text)}`}`);
}
// Already-hidden text stays as it is (messages are filtered again on read).
const once = maskContactInfo("call 09171234567").text;
const twice = maskContactInfo(once);
if (twice.masked || twice.text !== once) { failed += 1; console.log(`FAIL  idempotent  ${JSON.stringify(once)} -> ${JSON.stringify(twice.text)}`); }
else console.log("PASS  idempotent");

console.log(failed ? `\n${failed} failed` : "\nAll passed");
process.exit(failed ? 1 : 0);
