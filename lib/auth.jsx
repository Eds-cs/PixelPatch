// lib/auth.jsx
import { createContext, useContext, useEffect, useMemo, useRef, useState, useCallback } from "react";
import api, { setUnauthorizedHandler } from "./api";
import { storage, KEYS } from "./storage";

const AuthContext = createContext(null);

// role_id comes straight from the users table. Signup defaults to 1 (user);
// administrators are 2 and business accounts are 3.
export const ROLE = { CLIENT: 1, ADMIN: 2, BUSINESS: 3 };

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(null);
  // Distinguishes "still reading storage" from "definitely signed out", so the
  // route guard does not bounce a logged-in user to /login on cold start.
  const [loading, setLoading] = useState(true);
  // Shown once on the login screen after an automatic sign-out.
  const [sessionNotice, setSessionNotice] = useState(null);

  useEffect(() => {
    (async () => {
      const [storedToken, storedUser] = await Promise.all([
        storage.get(KEYS.TOKEN),
        storage.get(KEYS.USER),
      ]);
      if (storedToken) setToken(storedToken);
      if (storedUser) {
        try {
          setUser(JSON.parse(storedUser));
        } catch {
          await storage.remove(KEYS.USER);
        }
      }
      setLoading(false);
    })();
  }, []);

  const persist = useCallback(async (nextToken, nextUser, remember) => {
    setSessionNotice(null);
    setToken(nextToken);
    setUser(nextUser);
    await Promise.all([
      storage.set(KEYS.TOKEN, nextToken, { persist: remember }),
      storage.set(KEYS.USER, JSON.stringify(nextUser), { persist: remember }),
    ]);
  }, []);

  const login = useCallback(
    async (email, password, remember = true) => {
      const { data } = await api.post("/auth/login", { email, password });
      await persist(data.token, data.user, remember);
      return data.user;
    },
    [persist]
  );

  const loginWithGoogle = useCallback(
    async (idToken, remember = true) => {
      // googleLogin reads req.body.credential, not `token`.
      const { data } = await api.post("/auth/google-login", { credential: idToken });
      await persist(data.token, data.user, remember);
      return data.user;
    },
    [persist]
  );

  const setSession = useCallback(
    async (nextToken, nextUser, remember = true) => {
      await persist(nextToken, nextUser, remember);
    },
    [persist]
  );

  const signup = useCallback(async (payload) => {
    const { data } = await api.post("/auth/register", payload);
    return data;
  }, []);

  const logout = useCallback(async () => {
    setToken(null);
    setUser(null);
    await Promise.all([storage.remove(KEYS.TOKEN), storage.remove(KEYS.USER)]);
  }, []);

  // A 401 on an authenticated request means the stored token expired or was
  // revoked: clear it so the route guard returns the user to /login.
  // Several in-flight requests can fail together, so sign out only once.
  const signingOut = useRef(false);
  const tokenRef = useRef(token);
  useEffect(() => {
    tokenRef.current = token;
  }, [token]);
  useEffect(() => {
    setUnauthorizedHandler((failedToken) => {
      if (signingOut.current || !tokenRef.current || failedToken !== tokenRef.current) return;
      signingOut.current = true;
      setSessionNotice("Your session has expired. Please sign in again.");
      logout().finally(() => {
        signingOut.current = false;
      });
    });
    return () => setUnauthorizedHandler(null);
  }, [logout]);

  const value = useMemo(
    () => ({
      user,
      token,
      loading,
      isLoggedIn: Boolean(token),
      isBusiness: user?.role_id === ROLE.BUSINESS,
      // Admins get their own portal (/admin). The server re-checks the role
      // against the database on every admin request; this only drives routing.
      isAdmin: user?.role_id === ROLE.ADMIN,
      sessionNotice,
      login,
      loginWithGoogle,
      setSession,
      signup,
      logout,
    }),
    [user, token, loading, sessionNotice, login, loginWithGoogle, setSession, signup, logout]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used inside <AuthProvider>");
  return ctx;
}
