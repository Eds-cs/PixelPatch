// lib/payments.js
//
// Xendit checkout. The invoice's success/failure redirect URLs are configured
// server-side (XENDIT_SUCCESS_URL / XENDIT_FAILURE_URL), and payment is only
// ever confirmed by the server-to-server webhook — the redirect itself is
// cosmetic. So rather than trusting where the browser lands, we reopen the
// checkout, wait for the browser to close, then poll the repair until the
// server reports a terminal payment state.
import { Platform } from "react-native";
import * as WebBrowser from "expo-web-browser";
import * as Linking from "expo-linking";
import api from "./api";
import { COLORS } from "../constants/theme";

const POLL_ATTEMPTS = 6;
const POLL_INTERVAL_MS = 2500;

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

const isTerminal = (status) => {
  const s = String(status ?? "").toUpperCase();
  return s === "PAID" || s === "SETTLED" || s === "EXPIRED" || s === "FAILED";
};

/**
 * Opens the Xendit invoice.
 *
 * Web: same-tab navigation, so Xendit's redirect lands back on our own
 * /payment-success or /payment-failed route.
 *
 * Native: an in-app browser. If XENDIT_SUCCESS_URL is pointed at the app's
 * scheme (pixelpatch://payment-success) the auth session resolves as soon as
 * the redirect fires; otherwise it resolves when the user closes the browser.
 * Either way we fall through to polling.
 */
export async function openCheckout(paymentLink) {
  if (!paymentLink) throw new Error("No payment link is available yet.");

  if (Platform.OS === "web") {
    window.location.assign(paymentLink);
    return { type: "redirected" };
  }

  const returnUrl = Linking.createURL("/payment-success");

  const result = await WebBrowser.openAuthSessionAsync(paymentLink, returnUrl, {
    // Matches the app's header treatment on iOS.
    toolbarColor: COLORS.surface,
    controlsColor: COLORS.primary,
    showTitle: true,
    enableBarCollapsing: true,
  });

  return result;
}

/**
 * Polls GET /api/client/repairs/:id until the payment reaches a terminal state.
 * Returns the last known status, or null if it never settled — the caller
 * should treat that as "still processing", not as failure.
 */
export async function pollPaymentStatus(repairId, { attempts = POLL_ATTEMPTS } = {}) {
  let last = null;

  for (let i = 0; i < attempts; i += 1) {
    try {
      const { data } = await api.get(`/client/repairs/${repairId}`);
      const status = data?.repair?.payment?.status ?? data?.repair?.payment_status ?? null;
      last = status;
      if (isTerminal(status)) return status;
    } catch {
      // Transient failures shouldn't abort the poll.
    }
    if (i < attempts - 1) await sleep(POLL_INTERVAL_MS);
  }

  return last;
}

/** Business side: POST /api/business/repairs/:id/payments/generate-link */
export async function generatePaymentLink(requestId) {
  const { data } = await api.post(`/business/repairs/${requestId}/payments/generate-link`);
  return data?.payment_link ?? null;
}

export { isTerminal };
