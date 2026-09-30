// lib/socket.jsx
// Ported from legacy-web/src/context/SocketContext.jsx.
import { createContext, useContext, useEffect, useState } from "react";
import { io } from "socket.io-client";
import { API_URL } from "./api";
import { useAuth } from "./auth";

const SocketContext = createContext(null);

export const useSocket = () => useContext(SocketContext);

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
