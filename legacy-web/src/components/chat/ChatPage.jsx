import React, { useEffect, useState, useRef } from "react";
import ChatList from "./ChatList";
import ChatWindow from "./ChatWindow";
import axios from "axios";
import { useSocket } from "../../context/SocketContext";
import { useLocation } from "react-router-dom";

export default function ChatPage() {
  const autoStartRef = useRef(false);
  const activeChatRef = useRef(null);

  const socket = useSocket();

  const [chats, setChats] = useState([]);
  const [activeChat, setActiveChat] = useState(null);
  const [messages, setMessages] = useState([]);

  const token = localStorage.getItem("token");
  const location = useLocation();
  const shopFromLink = location.state?.shop || null;

  /* --------------------------------------------
     1. LISTEN FOR SOCKET MESSAGES
  -------------------------------------------- */
  useEffect(() => {
    if (!socket) return;

    const handleNewMessage = (msg) => {
      if (String(msg.chat_id) === String(activeChatRef.current)) {
        setMessages((prev) => [...prev, msg]);
      }

      setChats((prev) => {
        const idx = prev.findIndex((c) => String(c.id) === String(msg.chat_id));
        if (idx !== -1) {
          const updated = [...prev];
          const chat = { ...updated[idx] };
          chat.last_message_at = msg.timestamp;

          updated.splice(idx, 1);
          return [chat, ...updated];
        }
        return prev;
      });
    };

    socket.on("new_message", handleNewMessage);

    return () => {
      socket.off("new_message", handleNewMessage);
    };
  }, [socket]);

  /* --------------------------------------------
     2. TRACK ACTIVE CHAT
  -------------------------------------------- */
  useEffect(() => {
    activeChatRef.current = activeChat;

    if (socket && activeChat) {
      socket.emit("join", activeChat);
    }
  }, [activeChat, socket]);

  /* --------------------------------------------
     3. LOAD ALL CHATS
  -------------------------------------------- */
  useEffect(() => {
    if (!token) return;

    axios
      .get(`${import.meta.env.VITE_API_URL}/api/chat`, {
        headers: { Authorization: `Bearer ${token}` },
      })
      .then((res) => setChats(res.data))
      .catch((err) => console.error("CHAT LIST ERROR:", err));
  }, [token]);

  /* --------------------------------------------
     4. AUTO-START CHAT FROM SHOP LINK
  -------------------------------------------- */
  useEffect(() => {
    if (!shopFromLink) return;
    if (autoStartRef.current) return;

    const shopId = shopFromLink.id;
    if (!shopId) return;

    autoStartRef.current = true;

    const existingChat = chats.find((c) => c.shop_id === shopId);

    if (existingChat) {
      setActiveChat(existingChat.id);
      return;
    }

    axios
      .post(
        `${import.meta.env.VITE_API_URL}/api/chat/start`,
        { shop_id: shopId },
        { headers: { Authorization: `Bearer ${token}` } }
      )
      .then((res) => {
        const newChat = res.data.chat;
        setChats((prev) => [newChat, ...prev]);
        setActiveChat(newChat.id);
      })
      .catch((err) => console.error("CREATE CHAT ERROR:", err));
  }, [shopFromLink, chats, token]);

  /* --------------------------------------------
     5. AUTO-OPEN MOST RECENT CHAT
  -------------------------------------------- */
  useEffect(() => {
    if (!activeChat && chats.length > 0) {
      setActiveChat(chats[0].id);
    }
  }, [chats]);

  /* --------------------------------------------
     6. LOAD MESSAGES FOR ACTIVE CHAT
  -------------------------------------------- */
  useEffect(() => {
    if (!activeChat || !token) return;

    axios
      .get(`${import.meta.env.VITE_API_URL}/api/chat/${activeChat}/messages`, {
        headers: { Authorization: `Bearer ${token}` },
      })
      .then((res) => setMessages(res.data))
      .catch((err) => console.error("CHAT MSG ERROR:", err));

    return () => {
      socket?.emit("leave", activeChat);
    };
  }, [activeChat, token, socket]);

  /* --------------------------------------------
     7. MANUAL REFRESH (FALLBACK)
  -------------------------------------------- */
  const refreshMessages = () => {
    if (!activeChat) return;

    return axios
      .get(`${import.meta.env.VITE_API_URL}/api/chat/${activeChat}/messages`, {
        headers: { Authorization: `Bearer ${token}` },
      })
      .then((res) => setMessages(res.data))
      .catch((err) => console.error("REFRESH ERROR:", err));
  };

  /* --------------------------------------------
     UI
  -------------------------------------------- */
  return (
    <div className="h-screen flex bg-gray-100">
      <ChatList
        chats={chats}
        activeChat={activeChat}
        onSelectChat={setActiveChat}
      />

      <div className="flex-1 h-full">
        <ChatWindow
          chatId={activeChat}
          messages={messages}
          refreshMessages={refreshMessages}
          socket={socket}
          chats={chats}
        />
      </div>
    </div>
  );
}
