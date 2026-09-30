// lib/shop.jsx
// GET /api/my-shop returns { success, shopId } — resolved once for the whole
// business portal instead of per screen.
import { createContext, useCallback, useContext, useEffect, useRef, useState } from "react";
import api from "./api";

const ShopContext = createContext(null);

const INITIAL = { shopId: null, error: null, loading: true };

export function ShopProvider({ children }) {
  const [state, setState] = useState(INITIAL);
  const requestId = useRef(0);

  // State is written only from the async continuation so nothing is set
  // synchronously inside the effect body.
  const load = useCallback(async () => {
    const id = requestId.current + 1;
    requestId.current = id;

    try {
      const { data } = await api.get("/my-shop");
      if (requestId.current !== id) return;

      if (data?.success) {
        setState({ shopId: data.shopId, error: null, loading: false });
      } else {
        setState({
          shopId: null,
          error: data?.message || "This account does not own a shop.",
          loading: false,
        });
      }
    } catch (e) {
      if (requestId.current !== id) return;
      setState({ shopId: null, error: e.message || "Couldn't load your shop.", loading: false });
    }
  }, []);

  useEffect(() => {
    load();
    return () => {
      requestId.current += 1;
    };
  }, [load]);

  return (
    <ShopContext.Provider value={{ ...state, reload: load }}>{children}</ShopContext.Provider>
  );
}

export function useShop() {
  const ctx = useContext(ShopContext);
  if (!ctx) throw new Error("useShop must be used inside <ShopProvider>");
  return ctx;
}
