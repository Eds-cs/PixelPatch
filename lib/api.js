// lib/api.js
// Single axios instance for the Express API in server/.
//
// The legacy web app hardcoded http://72.62.248.151 in some components and read
// VITE_API_URL in others. Everything now goes through EXPO_PUBLIC_API_URL.
import { create as createAxios } from "axios";
import { Platform } from "react-native";
import { storage, KEYS } from "./storage";

// Android emulators cannot reach the host machine over "localhost".
const localHost = Platform.select({
  android: "http://10.0.2.2:5000",
  default: "http://localhost:5000",
});

export const API_URL = process.env.EXPO_PUBLIC_API_URL || localHost;

// Default export only — exporting it as both named and default makes every
// `import api from` site ambiguous to the linter.
const api = createAxios({
  baseURL: `${API_URL}/api`,
  timeout: 20000,
});

api.interceptors.request.use(async (config) => {
  const token = await storage.get(KEYS.TOKEN);
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

// AuthProvider registers a handler here so an expired or invalid token signs
// the user out instead of leaving every screen stuck on "Invalid token".
// (This module cannot use React context directly.)
let unauthorizedHandler = null;
export function setUnauthorizedHandler(handler) {
  unauthorizedHandler = handler;
}

// Surface the server's { error } string as the thrown message so screens can
// keep matching on it the way the legacy components did.
api.interceptors.response.use(
  (res) => res,
  (error) => {
    const serverMessage = error.response?.data?.error || error.response?.data?.message;
    if (serverMessage) error.message = serverMessage;

    // Only a request that carried a token can prove the session is dead.
    // /auth/* calls are sign-in attempts, never a session check.
    const sentToken = String(error.config?.headers?.Authorization ?? "").replace(/^Bearer\s+/i, "");
    const isAuthCall = String(error.config?.url ?? "").startsWith("/auth/");
    if (error.response?.status === 401 && sentToken && !isAuthCall && unauthorizedHandler) {
      error.message = "Your session has expired. Please sign in again.";
      // Pass the token that failed, so a late reply from an old session cannot
      // sign out a newer one.
      unauthorizedHandler(sentToken);
    }

    return Promise.reject(error);
  }
);

// Uploads are served off the API host, not /api — resolve them separately.
export const mediaUrl = (p) => {
  if (!p) return null;
  if (p.startsWith("http")) return p;
  return `${API_URL}${p.startsWith("/") ? "" : "/"}${p}`;
};

export default api;
