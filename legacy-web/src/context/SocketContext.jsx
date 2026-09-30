import React, { createContext, useContext, useEffect, useState } from "react";
import { io } from "socket.io-client";

const SocketContext = createContext(null);

export const useSocket = () => useContext(SocketContext);

export function SocketProvider({ children }) {
  const [socket, setSocket] = useState(null);
  const token = localStorage.getItem("token");

  useEffect(() => {
    if (!token) return;

    const s = io(import.meta.env.VITE_API_URL || "http://72.62.248.151", {
      path: "/socket.io",
      auth: { token },
      transports: ["websocket"],
      reconnection: true,
    });

    s.on("connect", () => {
      console.log("GLOBAL socket connected", s.id);
    });

    setSocket(s);

    return () => {
      s.disconnect();
    };
  }, [token]);

  return (
    <SocketContext.Provider value={socket}>
      {children}
    </SocketContext.Provider>
  );
}
