import React, { useState, useEffect, useRef } from "react";
import axios from "axios";
import { Link } from "react-router-dom";

export default function ClientMessages() {
  /* ======================================================
     CORE CHAT STATE
  ====================================================== */
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [conversations, setConversations] = useState([]);
  const [sidebarLoading, setSidebarLoading] = useState(false);
  const [activeConversationId, setActiveConversationId] = useState(null);



  // Conversation control
  const [conversationId, setConversationId] = useState(null);

  /* ======================================================
     SHOP UI STATE (UNCHANGED INTENT)
  ====================================================== */
  const [shopsToShow, setShopsToShow] = useState([]);
  const [recommendedShops, setRecommendedShops] = useState([]);
  const [shopsHidden, setShopsHidden] = useState(false);

  // Prevent duplicate auto-send
  const initialIssueSentRef = useRef(false);

  /* ======================================================
     AUTH HEADER (REQUIRED)
  ====================================================== */
  const authHeader = () => ({
    Authorization: `Bearer ${
      localStorage.getItem("token") ||
      sessionStorage.getItem("token") ||
      ""
    }`,
  });

  const loadConversations = async () => {
    console.group("🧪 loadConversations");

    try {
      setSidebarLoading(true);

      const res = await axios.get(
        `${import.meta.env.VITE_API_URL}/api/ai/conversations`,
        { headers: authHeader() }
      );

      if (Array.isArray(res.data)) {
        res.data.forEach((c, i) => {
          console.log(`Conversation[${i}]`, c);
        });
      }

      setConversations(res.data || []);


    } catch (err) {
      console.error("❌ Failed to load conversations", err);
    } finally {
      setSidebarLoading(false);
      console.groupEnd();
    }
  };

    /* ======================================================
     AUTO-LOAD INITIAL ISSUE (UNCHANGED UX)
  ====================================================== */
  useEffect(() => {
    const pendingIssue = sessionStorage.getItem("pending_ai_issue");

    if (pendingIssue && !initialIssueSentRef.current) {
      initialIssueSentRef.current = true;

      // Start clean
      startNewChat();

      // Send message immediately
      sendMessage(pendingIssue);

      // Remove it so it doesn't resend
      sessionStorage.removeItem("pending_ai_issue");
    }
  }, []);


  // load chat history if conversationId changes
  useEffect(() => {
    loadConversations();
  }, []);

  const openConversation = async (convId) => {
    if (convId === conversationId) return;
    try {
      setLoading(true);
      setConversationId(convId);
      setActiveConversationId(convId);
      setShopsHidden(true);
      setShopsToShow([]);
      setRecommendedShops([]);
      
      const res = await axios.get(
        `http://72.62.248.151/api/ai/conversations/${convId}/messages`,
        { headers: authHeader() }
      );
      const formatted = res.data.map((m) => ({
        sender: m.sender,
        text: m.text,
      }));
      setMessages(formatted);
    } catch (err) {
      console.error("Failed to open conversation", err);
    } finally {
      setLoading(false);
    }
    
  };
  const messagesEndRef = useRef(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const startNewChat = () => {
    setConversationId(null);
    setActiveConversationId(null);
    setMessages([]);
    setShopsToShow([]);
    setShopsHidden(true);
    setInput("");
  };

  /* ======================================================
     SEND MESSAGE (FULLY REBUILT, SAME FLOW)
  ====================================================== */
  const sendMessage = async (text) => {
    if (!text.trim() || loading) return;

    // Reset shop UI safely for a new intent
    setShopsHidden(true);
    setShopsToShow([]);
    setRecommendedShops([]);

    const userMsg = { sender: "user", text };
    setMessages((prev) => [...prev, userMsg]);
    setInput("");
    setLoading(true);

    try {
      const res = await axios.post(
        "http://72.62.248.151/api/ai/analyze",
        {
          text,
          conversation_id: conversationId || null,
        },
        { headers: authHeader() }
      );

      const { reply, shops = [], conversation_id } = res.data;

      /* ----------------------------------------------
        🔑 CRITICAL: Persist conversation + refresh sidebar
      ---------------------------------------------- */
      if (!conversationId && conversation_id) {
        setConversationId(conversation_id);
        loadConversations(); // ✅ THIS WAS MISSING
      }

      // Append AI reply
      if (reply) {
        setMessages((prev) => [...prev, { sender: "ai", text: reply }]);
      }

      /* ----------------------------------------------
        SHOP HANDLING (UNCHANGED UX)
      ---------------------------------------------- */
      if (Array.isArray(shops) && shops.length > 0) {
        const formatted = shops.map((s) => ({
          id: s.id,
          name: s.name ?? "Unnamed Shop",
          rating_average:
            typeof s.rating_average === "number"
              ? s.rating_average.toFixed(1)
              : "N/A",
          address: s.address?.trim() || "Unknown",
          raw: s,
        }));

        setTimeout(() => {
          setShopsHidden(false); // reveal only AFTER AI decides
          setShopsToShow(formatted);
          setRecommendedShops(formatted.slice(0, 3));
        }, 1000);
      }

    } catch (err) {
      console.error("AI ERROR:", err);

      setMessages((prev) => [
        ...prev,
        {
          sender: "ai",
          text: "⚠️ The AI could not process your request. Please try again.",
        },
      ]);
    } finally {
      setLoading(false);
    }
  };

  
  const handleSend = () => sendMessage(input);

  // Delete conversation handler
  const handleDelete = async (convId) => {
  if (!window.confirm("Delete this conversation?")) return;

  try {
    await axios.delete(
      `http://72.62.248.151/api/ai/conversations/${convId}`,
      { headers: authHeader() }
    );

    // Remove from UI
    setConversations(prev =>
      prev.filter(c => c.id !== convId)
    );

    // If deleting currently open one
    if (convId === activeConversationId) {
      startNewChat();
    }

  } catch (err) {
    console.error("Failed to delete conversation", err);
    alert("Could not delete conversation");
  }
  };
  // Rename conversation handler
  const handleRename = async (convId) => {
    const newTitle = prompt("Enter new conversation name:");

    if (!newTitle || !newTitle.trim()) return;

    try {
      const res = await axios.put(
        `http://72.62.248.151/api/ai/conversations/${convId}/rename`,
        { newTitle },
        { headers: authHeader() }
      );

      const updatedTitle = res.data.title;

      // IMMEDIATELY update sidebar state
      setConversations(prev =>
        prev.map(c =>
          c.id === convId
            ? { ...c, title: updatedTitle }
            : c
        )
      );

    } catch (err) {
      console.error("Failed to rename conversation", err);
      alert("Could not rename conversation");
    }
  };


  
  /* ======================================================
     UI
  ====================================================== */
  return (
    <div className="bg-white flex flex-col h-full overflow-hidden text-gray-900">
      <main className="w-full flex-1 flex h-full min-h-0">

    {/* -------------------- SIDEBAR -------------------- */}
    <div className="w-full md:w-80 lg:w-96 border-r flex flex-col">

      {/* HEADER WITH NEW CHAT BUTTON */}
      <div className="p-4 border-b flex justify-between items-center">
        <h2 className="font-bold text-lg">Chats</h2>

        <button
          onClick={startNewChat}
          className="px-3 py-1 text-sm bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition"
        >
          + New Chat
        </button>
      </div>

      {/* CONVERSATION LIST */}
      <div className="flex-1 overflow-y-auto">
        {sidebarLoading ? (
          <p className="text-gray-400 text-sm p-4">Loading chats…</p>
        ) : conversations.length === 0 ? (
          <p className="text-gray-400 text-sm p-4">
            No conversations yet.
          </p>
        ) : (
          <ul className="divide-y">
            {conversations.map((conv) => (
              <li
                key={conv.id}
                className={`px-4 py-3 flex justify-between items-center cursor-pointer hover:bg-gray-100 ${
                  activeConversationId === conv.id ? "bg-gray-100" : ""
                }`}
                onClick={() => {
                  setActiveConversationId(conv.id);
                  openConversation(conv.id);
                }}
              >
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-800 truncate">
                    {conv.title || "New Chat"}
                  </p>
                  <p className="text-xs text-gray-400 mt-1">
                    {new Date(conv.updated_at).toLocaleString()}
                  </p>
                </div>

                {/* ACTION BUTTONS (only if active) */}
                {activeConversationId === conv.id && (
                  <div className="flex gap-2 ml-2">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleRename(conv.id);
                      }}
                      className="p-2 text-xs text-blue-500 bg-white hover:text-blue-700"
                    >
                      <svg
                        xmlns="http://www.w3.org/2000/svg"
                        fill="none"
                        viewBox="0 0 24 24"
                        strokeWidth="2"
                        stroke="currentColor"
                        className="h-5 w-5"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          d="M16.862 3.487a2.25 2.25 0 013.182 3.182L8.25 18.463l-4.5 1.125 1.125-4.5L16.862 3.487z"
                        />
                      </svg>
                    </button>

                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDelete(conv.id);
                      }}
                      className="p-1 text-xs text-red-500 bg-white hover:text-red-700"
                    >
                      <svg
                        xmlns="http://www.w3.org/2000/svg"
                        fill="none"
                        viewBox="0 0 24 24"
                        strokeWidth="2"
                        stroke="currentColor"
                        className="h-6 w-6"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          d="M6 7h12M9 7V4h6v3m2 0v11a2 2 0 01-2 2H9a2 2 0 01-2-2V7h10z"
                        />
                      </svg>
                    </button>
                  </div>
                )}

              </li>
            ))}
          </ul>
        )}
      </div>

    </div>


        {/* -------------------- CHAT AREA -------------------- */}
        <div className="flex-1 flex flex-col bg-gray-50 overflow-hidden min-h-0">

          {/* Messages */}
          <div className="flex-1 p-6 overflow-y-auto space-y-4 min-h-0">
            {messages.map((msg, i) => (
              <div
                key={i}
                className={`flex ${
                  msg.sender === "user" ? "justify-end" : "justify-start"
                }`}
              >
                <div
                  className={`px-4 py-2 rounded-xl max-w-md text-sm whitespace-pre-line shadow-sm ${
                    msg.sender === "user"
                      ? "bg-blue-500 text-white rounded-bl-xl"
                      : "bg-gray-200 text-gray-800 rounded-br-xl"
                  }`}
                >
                  {msg.text}
                </div>
              </div>
            ))}

            {loading && (
              <div className="text-gray-500 text-sm">
                AI is thinking…
              </div>
            )}
          </div>

          {/* ---------------- SHOP CARDS ---------------- */}
          {!shopsHidden && shopsToShow.length > 0 && (
            <div className="mt-4 px-6">

              <div className="flex justify-between items-center mb-2">
                <h2 className="text-lg font-semibold text-gray-700">
                  Recommended Repair Shops
                </h2>

                <button
                  onClick={() => setShopsHidden(true)}
                  className="text-sm text-gray-500 bg-gray-100 hover:text-gray-700"
                >
                  ✕ Close
                </button>
              </div>

              <div className="flex space-x-4 overflow-x-auto pb-3 scrollbar-thin scrollbar-thumb-gray-400">
                {shopsToShow.map((shop, i) => (
                  <div
                    key={shop.id}
                    className={`min-w-[260px] p-4 rounded-xl shadow-md border bg-white ${
                      i === 0
                        ? "border-blue-500 shadow-blue-200"
                        : "border-gray-200"
                    }`}
                  >
                    <h3 className="text-base font-bold">{shop.name}</h3>
                    <p className="text-sm text-gray-600 mt-1">
                      ⭐ {shop.rating_average}
                    </p>
                    <p className="text-xs text-gray-500 mt-1">
                      📍 {shop.address}
                    </p>

                    <Link
                      to={`/shops/${shop.id}`}
                      state={{ shop: shop.raw }}
                      className="mt-3 block w-full bg-blue-500 hover:bg-blue-600 text-white text-sm py-2 rounded-lg text-center"
                    >
                      View Shop
                    </Link>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Input */}
          <div className="p-4 bg-gray-100 border-t">
            <div className="relative">
              <input
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleSend()}
                placeholder="Explain your situation..."
                className="w-full pr-14 pl-4 py-3 rounded-lg bg-gray-200 text-sm"
                disabled={loading}
              />

              <button
                onClick={handleSend}
                disabled={loading}
                className="absolute right-3 top-1/2 -translate-y-1/2 p-2 bg-gray-200 rounded-full"
              >
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  fill="none"
                  viewBox="0 0 24 24"
                  strokeWidth="2"
                  stroke="blue"
                  className="h-5 w-5"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M3 3l18 9-18 9 5-9-5-9z"
                  />
                </svg>
              </button>
            </div>
          </div>

        </div>
      </main>
    </div>
  );
}
