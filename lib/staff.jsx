// lib/staff.jsx
// Shop membership for the signed-in account: GET /api/staff/me returns
// { membership, invites }. A member (shop employee with their own account)
// gets the staff portal (app/staff/); an account with open invites sees a
// banner to accept or decline them (components/StaffInviteBanner.jsx).
// Admin and business accounts can't be staff, so nothing is fetched for them.
import { createContext, useCallback, useContext, useEffect, useRef, useState } from "react";
import api from "./api";
import { useAuth } from "./auth";

const StaffContext = createContext(null);
const EMPTY = { membership: null, invites: [], loading: false, error: null };

export function StaffProvider({ children }) {
  const { user, isLoggedIn, isAdmin, isBusiness, loading: authLoading } = useAuth();
  const [state, setState] = useState({ ...EMPTY, loading: true });
  const requestId = useRef(0);
  const eligible = isLoggedIn && !isAdmin && !isBusiness;

  // State is written only from the async continuation, never synchronously
  // inside the effect body.
  const load = useCallback(async () => {
    const id = requestId.current + 1;
    requestId.current = id;
    if (!eligible) {
      await Promise.resolve();
      if (requestId.current === id) setState(EMPTY);
      return;
    }
    try {
      const { data } = await api.get("/staff/me");
      if (requestId.current !== id) return;
      setState({ membership: data?.membership ?? null, invites: data?.invites ?? [], loading: false, error: null });
    } catch (e) {
      if (requestId.current !== id) return;
      setState({ ...EMPTY, error: e.message || "Couldn't check your shop membership." });
    }
  }, [eligible]);

  useEffect(() => {
    if (authLoading) return undefined;
    load();
    return () => { requestId.current += 1; };
  }, [authLoading, load, user?.id]);

  const membership = state.membership;
  const value = {
    ...state,
    loading: authLoading || state.loading,
    // May use the staff portal now (shop verified, owner active).
    isStaff: Boolean(membership?.usable),
    reload: load,
  };
  return <StaffContext.Provider value={value}>{children}</StaffContext.Provider>;
}

export function useStaff() {
  const ctx = useContext(StaffContext);
  if (!ctx) throw new Error("useStaff must be used inside <StaffProvider>");
  return ctx;
}
