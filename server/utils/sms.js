// utils/sms.js
//
// Text messages through Semaphore (https://semaphore.co), a Philippine SMS
// provider. Off until SEMAPHORE_API_KEY is set in server/.env: while it is
// off, phone numbers are collected but not verified.
//
// NOT YET TESTED against Semaphore: no account exists yet. Check the request
// below against Semaphore's current API documentation, and send one test
// message, before relying on it.

/** True when an SMS provider is configured. */
export const smsEnabled = () => Boolean(process.env.SEMAPHORE_API_KEY);

/** Sends `message` to a Philippine mobile number ("09XXXXXXXXX"). Throws on failure. */
export async function sendSms(number, message) {
  if (!smsEnabled()) throw new Error("SMS is not configured");

  const body = new URLSearchParams({
    apikey: process.env.SEMAPHORE_API_KEY,
    number,
    message,
  });
  if (process.env.SEMAPHORE_SENDER_NAME) body.set("sendername", process.env.SEMAPHORE_SENDER_NAME);

  const res = await fetch("https://api.semaphore.co/api/v4/messages", {
    method: "POST",
    body,
    signal: AbortSignal.timeout(15000),
  });
  if (!res.ok) throw new Error(`SMS provider replied with status ${res.status}`);
}
