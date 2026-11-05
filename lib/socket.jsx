// lib/socket.jsx
// Ported from legacy-web/src/context/SocketContext.jsx.
import { createContext, useCallback, useContext, useEffect, useState, useSyncExternalStore } from "react";
import { io } from "socket.io-client";
import { API_URL } from "./api";
import { useAuth } from "./auth";

const SocketContext = createContext(null);

export const useSocket = () => useContext(SocketContext);

// This describes our transport connection, not the other person's presence.
export function useSocketConnected(socket) {
  const subscribe = useCallback((listener) => {
    if (!socket) return () => {};
    socket.on("connect", listener);
    socket.on("disconnect", listener);
    socket.on("connect_error", listener);
    return () => {
      socket.off("connect", listener);
      socket.off("disconnect", listener);
      socket.off("connect_error", listener);
    };
  }, [socket]);
  const snapshot = useCallback(() => Boolean(socket?.connected), [socket]);
  return useSyncExternalStore(subscribe, snapshot, () => false);
}

export function SocketProvider({ children }) {
  const { token } = useAuth();
  const [socket, setSocket] = useState(null);

  useEffect(() => {
    // No token: nothing to connect. The cleanup below already clears any
    // previous socket, so no synchronous state write is needed here.
    if (!token) return undefined;

    const s = io(API_URL, {
      path: "/socket.io",
      auth: { token },
      // React Native has no XHR long-polling fallback worth relying on, and the
      // legacy web client already forced websocket-only.
      transports: ["websocket"],
      reconnection: true,
    });

    s.on("connect_error", (err) => {
      console.warn("socket connect_error:", err.message);
    });

    setSocket(s);

    return () => {
      s.removeAllListeners();
      s.disconnect();
      setSocket(null);
    };
  }, [token]);

  return <SocketContext.Provider value={socket}>{children}</SocketContext.Provider>;
}
