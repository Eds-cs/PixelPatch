// utils/emailChecks.js
// Stricter email checks for business registration: a real-looking address,
// not a throwaway inbox, on a domain that can receive mail. The one-time code
// (utils/businessEmailVerification.js) then proves the applicant reads it.
import dns from "dns";

const EMAIL_RE = /^[a-z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?(?:\.[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?)+$/;

// Common disposable / temporary inbox services. Not exhaustive: the code is
// what really proves the inbox; this only refuses the obvious ones early.
const DISPOSABLE_DOMAINS = new Set([
  "mailinator.com", "mailinator.net", "mailinator.org", "guerrillamail.com", "guerrillamail.net",
  "guerrillamail.org", "guerrillamail.biz", "guerrillamailblock.com", "sharklasers.com", "grr.la",
  "pokemail.net", "spam4.me", "10minutemail.com", "10minutemail.net", "10minemail.com",
  "temp-mail.org", "temp-mail.io", "tempmail.com", "tempmail.net", "tempmailo.com", "tempmail.plus",
  "tempr.email", "tmpmail.org", "tmpmail.net", "tmail.ws", "throwawaymail.com", "trashmail.com",
  "trashmail.net", "trashmail.de", "yopmail.com", "yopmail.net", "yopmail.fr", "cool.fr.nf",
  "jetable.fr.nf", "nospam.ze.tc", "nomail.xl.cx", "mega.zik.dj", "speed.1s.fr", "courriel.fr.nf",
  "moncourrier.fr.nf", "monemail.fr.nf", "monmail.fr.nf", "getnada.com", "nada.email", "dispostable.com",
  "maildrop.cc", "mailnesia.com", "mintemail.com", "mohmal.com", "mailcatch.com", "fakeinbox.com",
  "fakemail.net", "emailondeck.com", "33mail.com", "spamgourmet.com", "mytemp.email", "burnermail.io",
  "inboxkitten.com", "mailpoof.com", "dropmail.me", "emailfake.com", "email-fake.com", "fakemailgenerator.com",
  "luxusmail.org", "minuteinbox.com", "moakt.com", "tempinbox.com", "discard.email", "spambox.us",
  "mailsac.com", "harakirimail.com", "byom.de", "trbvm.com", "1secmail.com", "1secmail.net", "1secmail.org",
  "esiix.com", "wwjmp.com", "xojxe.com", "yoggm.com", "vjuum.com", "laafd.com", "txcct.com",
  "rteet.com", "dpptd.com", "kzccv.com", "qiott.com", "wuuvo.com", "icznn.com", "ezztt.com",
  "example.com", "example.net", "example.org", "test.com", "invalid", "localhost",
]);

export const normalizeEmail = (value) => String(value ?? "").trim().toLowerCase();

const domainOf = (email) => email.slice(email.lastIndexOf("@") + 1);

function isDisposable(domain) {
  const parts = domain.split(".");
  // Match the domain and its parents (a.b.mailinator.com -> mailinator.com).
  for (let i = 0; i < parts.length - 1; i += 1) {
    if (DISPOSABLE_DOMAINS.has(parts.slice(i).join("."))) return true;
  }
  return DISPOSABLE_DOMAINS.has(parts[parts.length - 1]);
}

// Does the domain accept mail? true / false, or null if DNS couldn't answer
// (then we don't block: the code will still have to arrive).
async function domainReceivesMail(domain) {
  const lookup = (fn) =>
    Promise.race([fn(domain), new Promise((_, reject) => setTimeout(() => reject(Object.assign(new Error("timeout"), { code: "ETIMEOUT" })), 5000))]);
  try {
    const mx = await lookup(dns.promises.resolveMx);
    if (mx.some((record) => record.exchange && record.exchange !== ".")) return true;
  } catch (err) {
    if (!["ENOTFOUND", "ENODATA", "ENOTIMP"].includes(err.code)) return null;
  }
  // No MX record: mail falls back to the domain's own address.
  try {
    const a = await lookup(dns.promises.resolve4);
    return a.length > 0;
  } catch (err) {
    return ["ENOTFOUND", "ENODATA"].includes(err.code) ? false : null;
  }
}

/** null when the address is acceptable, otherwise the reason to show. */
export async function businessEmailProblem(value) {
  const email = normalizeEmail(value);
  if (!email) return "Enter the business email address.";
  if (email.length > 100 || !EMAIL_RE.test(email)) return "Enter a valid email address, like shop@gmail.com.";
  const domain = domainOf(email);
  if (isDisposable(domain)) return "Temporary or disposable email addresses can't be used. Use an email your shop checks.";
  if ((await domainReceivesMail(domain)) === false) {
    return `"${domain}" can't receive email. Check the spelling of the address.`;
  }
  return null;
}
