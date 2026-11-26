// server/utils/ai/redact.js
// Removes personal details from text before it is sent to OpenAI (brief B8).
// The model only needs the device and the problem. The user's own message is
// still saved as typed in their chat history, which they can delete.

const EMAIL = /[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/gi;
// Card-like numbers: 13 to 19 digits, optionally grouped by spaces or dashes.
const CARD = /\b(?:\d[ -]?){12,18}\d\b/g;
// Philippine mobile numbers (09XX XXX XXXX, +63 9XX..., 639XX...) and
// landlines like (062) 991 1234, with spaces, dots or dashes between groups.
const PH_MOBILE = /(?:\+?63|0)[ .-]?9\d{2}[ .-]?\d{3}[ .-]?\d{4}\b/g;
const LANDLINE = /\(?\b0\d{1,3}\)?[ .-]?\d{3}[ .-]?\d{4}\b/g;
// Any other long run of 10+ digits (international numbers, account numbers).
const LONG_DIGITS = /\+?\d(?:[ .-]?\d){9,}/g;

export function redactPersonalInfo(text) {
  return String(text ?? "")
    .replace(EMAIL, "[email removed]")
    .replace(CARD, "[number removed]")
    .replace(PH_MOBILE, "[phone number removed]")
    .replace(LANDLINE, "[phone number removed]")
    .replace(LONG_DIGITS, "[number removed]");
}
