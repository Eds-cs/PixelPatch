// lib/google.js
//
// Google Sign-In via expo-auth-session. We request an **ID token**, because
// server/controllers/authController.js#googleLogin verifies it with
// google-auth-library and reads req.body.credential.
//
// Client IDs come from env and are optional — when none are set the sign-in
// button is hidden rather than failing at tap time.
//
// IMPORTANT: Google issues each platform its own client ID, and the `aud`
// claim of the returned token is whichever ID requested it. The server checks
// that claim against GOOGLE_CLIENT_ID, so every ID listed here must also be
// accepted server-side (GOOGLE_CLIENT_IDS — see README).
import { Platform } from "react-native";
import * as Google from "expo-auth-session/providers/google";

export const GOOGLE_CLIENT_IDS = {
  web: process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID || undefined,
  ios: process.env.EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID || undefined,
  android: process.env.EXPO_PUBLIC_GOOGLE_ANDROID_CLIENT_ID || undefined,
};

/** True when this platform has a client ID configured. */
export const isGoogleConfigured = () => {
  const forPlatform = Platform.select({
    web: GOOGLE_CLIENT_IDS.web,
    ios: GOOGLE_CLIENT_IDS.ios ?? GOOGLE_CLIENT_IDS.web,
    android: GOOGLE_CLIENT_IDS.android ?? GOOGLE_CLIENT_IDS.web,
    default: GOOGLE_CLIENT_IDS.web,
  });
  return Boolean(forPlatform);
};

/**
 * Wraps Google.useIdTokenAuthRequest.
 * Returns [request, response, promptAsync]; `request` is null until the
 * discovery document loads, which is what gates the button's disabled state.
 */
export function useGoogleAuth() {
  return Google.useIdTokenAuthRequest({
    clientId: GOOGLE_CLIENT_IDS.web,
    iosClientId: GOOGLE_CLIENT_IDS.ios,
    androidClientId: GOOGLE_CLIENT_IDS.android,
    webClientId: GOOGLE_CLIENT_IDS.web,
  });
}

/** Pulls the ID token out of an auth-session response, or null. */
export function idTokenFrom(response) {
  if (response?.type !== "success") return null;
  return response.params?.id_token ?? response.authentication?.idToken ?? null;
}
