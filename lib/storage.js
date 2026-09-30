// lib/storage.js
// Cross-platform key/value storage.
//
// The legacy web app kept the JWT in localStorage (Remember Me) or
// sessionStorage. Native has neither, so this shim maps the same two-tier idea
// onto SecureStore (persistent, encrypted) and an in-memory map (session-only).
import { Platform } from "react-native";
import * as SecureStore from "expo-secure-store";

const isWeb = Platform.OS === "web";

// Session-scoped fallback for native — cleared when the process dies.
const memoryStore = new Map();

export const storage = {
  async get(key) {
    try {
      if (isWeb) {
        return window.localStorage.getItem(key) ?? window.sessionStorage.getItem(key);
      }
      if (memoryStore.has(key)) return memoryStore.get(key);
      return await SecureStore.getItemAsync(key);
    } catch {
      return null;
    }
  },

  async set(key, value, { persist = true } = {}) {
    try {
      if (isWeb) {
        const store = persist ? window.localStorage : window.sessionStorage;
        const other = persist ? window.sessionStorage : window.localStorage;
        store.setItem(key, value);
        other.removeItem(key);
        return;
      }
      if (persist) {
        memoryStore.delete(key);
        await SecureStore.setItemAsync(key, value);
      } else {
        memoryStore.set(key, value);
        await SecureStore.deleteItemAsync(key).catch(() => {});
      }
    } catch {
      // Private-mode browsers and locked keychains must not crash the app.
    }
  },

  async remove(key) {
    try {
      if (isWeb) {
        window.localStorage.removeItem(key);
        window.sessionStorage.removeItem(key);
        return;
      }
      memoryStore.delete(key);
      await SecureStore.deleteItemAsync(key);
    } catch {
      // ignore
    }
  },
};

export const KEYS = {
  TOKEN: "token",
  USER: "user",
};
