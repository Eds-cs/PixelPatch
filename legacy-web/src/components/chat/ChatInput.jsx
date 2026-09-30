// ChatInput.jsx
import React, { useState } from "react";
import axios from "axios";

export default function ChatInput({ chatId, onMessageSent, socket }) {
  const [text, setText] = useState("");

  const token =
    localStorage.getItem("token") || sessionStorage.getItem("token");

  const sendMessage = async () => {
    if (!text.trim()) return;

    if (!chatId) {
      console.error("❌ No chatId provided to ChatInput");
      return;
    }

    console.log("Socket instance in ChatInput:", socket);

    // PRIMARY METHOD: SOCKET
    if (socket) {
      console.log("Emitting send_message via socket:", chatId, text);

      socket.emit(
        "send_message",
        { chat_id: chatId, message_text: text },
        (ack) => {
          console.log("Socket ACK response:", ack);

          if (ack?.success) {
            setText("");

            // Optional refresh to keep things in sync
            if (typeof onMessageSent === "function") {
              onMessageSent();
            }
          } else {
            console.error("Socket send failed:", ack);
          }
        }
      );

      return;
    }

    // FALLBACK METHOD: REST API
    console.warn("Socket not available, falling back to REST");

    try {
      await axios.post(
        `${import.meta.env.VITE_API_URL}/api/chat/send`,
        { chat_id: chatId, message_text: text },
        { headers: { Authorization: `Bearer ${token}` } }
      );

      setText("");

      if (typeof onMessageSent === "function") {
        onMessageSent();
      }
    } catch (err) {
      console.error("SEND MSG ERROR:", err);
    }
  };

  return (
    <div className="flex gap-3 p-3 border-t bg-white">
      <input
        className="flex-1 p-3 border rounded-lg"
        placeholder="Type message..."
        value={text}
        onChange={(e) => setText(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Enter") {
            sendMessage();
          }
        }}
      />

      <button
        onClick={sendMessage}
        className="px-4 py-2 bg-blue-600 text-white rounded-lg"
      >
        Send
      </button>
    </div>
  );
}
