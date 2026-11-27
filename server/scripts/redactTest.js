// server/scripts/redactTest.js
// Checks utils/ai/redact.js: personal details are removed before a message is
// sent to OpenAI, and ordinary troubleshooting text is left alone.
// Calls nothing external.
//
//   npm --prefix server run ai:redact-test
import { redactPersonalInfo } from "../utils/ai/redact.js";

// [input, text that must NOT survive]
const REMOVE = [
  ["Email me at juan.delacruz@gmail.com", "juan.delacruz"],
  ["my email is juan at gmail dot com", "juan at gmail"],
  ["Call me 0917 123 4567", "123 4567"],
  ["+63 917-123-4567 po", "123-4567"],
  ["landline (062) 991 1234", "991 1234"],
  ["card 4111 1111 1111 1111 exp 12/27", "4111"],
  ["My password is Sunshine2024!", "Sunshine2024"],
  ["ang password ko ay juan1990", "juan1990"],
  ["passcode: 482913", "482913"],
  ["my PIN is 1234 and it won't unlock", "1234"],
  ["otp 739201 ayaw gumana", "739201"],
  ["mpin ko ay 0000", "0000"],
  ["Apple ID juan.dc1990", "juan.dc1990"],
  ["my apple id is juandelacruz", "juandelacruz"],
  ["username: maria_s", "maria_s"],
  ["gmail ko ay pedrosantos", "pedrosantos"],
  ["IMEI 356938035643809", "356938035643809"],
  ["serial no: C02XK0ABJGH5", "C02XK0ABJGH5"],
  ["TIN 123-456-789-000", "123-456-789"],
  ["My name is Juan Dela Cruz and my phone is broken", "Juan"],
  ["ako si Maria, sira ang laptop ko", "Maria"],
  ["pangalan ko ay pedro santos", "pedro"],
  ["I live at 123 Rizal Street, Tetuan", "Rizal"],
  ["nakatira ako sa Purok 5 Sta. Maria", "Purok 5"],
  ["Blk 12 Lot 4 Camella", "Lot 4"],
  ["add me on fb.com/juan.delacruz", "juan.delacruz"],
  ["message me @juan_dc", "juan_dc"],
  ["see https://example.com/reset?token=abc123", "token=abc123"],
  ["my router is 192.168.1.1", "192.168.1.1"],
  ["my birthday is March 3, 1995", "March 3"],
];

// Text that must come through unchanged.
const KEEP = [
  "My phone won't charge",
  "The charging pin is bent",
  "I forgot my password and the phone is locked",
  "my password is wrong even though I typed it right",
  "Ayaw mag-on ng cellphone ko",
  "Laptop is very slow after the Windows 11 update",
  "I have an iPhone 13 Pro Max with 128GB",
  "Dropped it in water 2 days ago",
  "Battery health is 78%",
  "I'm from Tetuan, Zamboanga City",
  "Samsung Galaxy A54 screen has green lines",
  "It restarts every 5 minutes",
  "Error code 0x80070005 when updating",
  "I can't log in to my Apple ID",
  "My Gmail app keeps crashing",
  "I forgot my Apple ID password",
  // Device details: the assistant needs exact models, specs and versions.
  "Samsung Galaxy A54 5G SM-A546E",
  "iPhone 13 Pro Max A2643 256GB",
  "MacBook Pro 2019 A1990 16-inch",
  "model number: SM-G991B/DS",
  "model no. A2338",
  "Lenovo IdeaPad 3 15ITL6 82H8",
  "ASUS ROG Strix G15 G513QM-HN064T",
  "HP Pavilion 15-eg0050TX",
  "Dell Inspiron 5502 i5-1135G7 8GB RAM 512GB SSD",
  "Windows 10 build 10.0.19045.3803",
  "Android 14, One UI 6.1, build UP1A.231005.007",
  "iOS 17.4.1",
  "Xiaomi Redmi Note 12 Pro 23013RK75C",
  "Ryzen 5 5600X, RTX 3060 12GB, B550M motherboard",
  "Realme C55 RMX3710",
  "OPPO A78 CPH2565",
  "Battery cycle count 1124",
  "BIOS version F.42, error 0x0000007B",
  "Huawei Nova 9 NAM-LX9",
  "vivo Y36 V2247",
  "Infinix Hot 30 X6831",
  "firmware 2.1.0.1 on my router",
  "version 10.0.22631.4602",
  "Pixel 7 GVU6C",
  "iPad Air 5th gen MM9C3LL/A",
  "CPU temp 95C, fan 4500 rpm",
  "Asus X515EA 15.6 inch 1920x1080",
];

let failed = 0;
for (const [input, secret] of REMOVE) {
  const out = redactPersonalInfo(input);
  const ok = !out.includes(secret);
  if (!ok) failed += 1;
  console.log(`${ok ? "PASS" : "FAIL"}  remove  ${JSON.stringify(input)} -> ${JSON.stringify(out)}`);
}
for (const input of KEEP) {
  const out = redactPersonalInfo(input);
  const ok = out === input;
  if (!ok) failed += 1;
  console.log(`${ok ? "PASS" : "FAIL"}  keep    ${JSON.stringify(input)}${ok ? "" : ` -> ${JSON.stringify(out)}`}`);
}
console.log(failed ? `\n${failed} failed` : "\nAll passed");
process.exit(failed ? 1 : 0);
