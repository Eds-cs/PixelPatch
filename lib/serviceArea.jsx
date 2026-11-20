// lib/serviceArea.jsx
//
// PixelPatch only serves Zamboanga City. Clients sign up with an address there,
// but accounts created before that rule, or with Google, may have none. This
// tells the root layout whether the signed-in client still needs to add one.
// Business and admin accounts are not affected.
import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";

import api from "./api";
import { useAuth } from "./auth";
import { isInServiceArea } from "../constants/serviceArea";

const ServiceAreaContext = createContext({ needsAddress: false, recheck: async () => false });

// True when the signed-in client has no saved address in Zamboanga City.
async function fetchMissing() {
  try {
    const { data } = await api.get("/addresses");
    return !(data?.addresses ?? []).some(isInServiceArea);
  } catch {
    // Don't lock anyone out over a network error; the server still refuses
    // addresses outside Zamboanga City.
    return false;
  }
}

export function ServiceAreaProvider({ children }) {
  const { isLoggedIn, isBusiness, isAdmin, user } = useAuth();
  const userId = user?.id ?? null;
  const applies = isLoggedIn && Boolean(userId) && !isBusiness && !isAdmin;
  // The last answer, tagged with the account it was for.
  const [result, setResult] = useState({ userId: null, missing: false });

  // Returns whether an address is still needed (used after saving one).
  const recheck = useCallback(async () => {
    if (!applies) return false;
    const missing = await fetchMissing();
    setResult({ userId, missing });
    return missing;
  }, [applies, userId]);

  // Check whenever a client account signs in. State is only written once the
  // reply arrives, and a reply for an account that has since changed is ignored.
  useEffect(() => {
    if (!applies) return undefined;
    let current = true;
    fetchMissing().then((missing) => {
      if (current) setResult({ userId, missing });
    });
    return () => {
      current = false;
    };
  }, [applies, userId]);

  const needsAddress = applies && result.userId === userId && result.missing;

  const value = useMemo(() => ({ needsAddress, recheck }), [needsAddress, recheck]);
  return <ServiceAreaContext.Provider value={value}>{children}</ServiceAreaContext.Provider>;
}

export function useServiceArea() {
  return useContext(ServiceAreaContext);
}
