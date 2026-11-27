// lib/useMessageShop.js
// "Message shop" from any screen: opens (or creates) the signed-in client's
// conversation with a shop. POST /api/chat/start { shop_id, request_id? }.
// Visitors sign in first and come back to the shop page, which opens the
// chat (app/shop/[id].jsx, ?message=1).
// Passing a requestId ties the conversation to that repair (update brief B3).
import { useCallback, useState } from "react";
import { useRouter } from "expo-router";

import api from "./api";
import { useAuth } from "./auth";

export function useMessageShop() {
  const router = useRouter();
  const { isLoggedIn } = useAuth();
  const [busyShopId, setBusyShopId] = useState(null);
  const [error, setError] = useState(null); // { shopId, text }

  const messageShop = useCallback(async (shopId, { requestId } = {}) => {
    if (!isLoggedIn) {
      router.push({ pathname: "/login", params: { redirect: `/shop/${shopId}?message=1` } });
      return;
    }
    if (busyShopId) return;
    setBusyShopId(shopId);
    setError(null);
    try {
      const { data } = await api.post("/chat/start", { shop_id: shopId, ...(requestId ? { request_id: requestId } : {}) });
      if (!data?.chat?.id) throw new Error("The conversation could not be opened.");
      router.push(`/chat/${data.chat.id}`);
    } catch (e) {
      setError({ shopId, text: e.message || "The conversation could not be opened." });
    } finally {
      setBusyShopId(null);
    }
  }, [isLoggedIn, busyShopId, router]);

  return { messageShop, busyShopId, error };
}
