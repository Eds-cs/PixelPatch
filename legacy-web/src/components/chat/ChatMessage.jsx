export default function ChatMessage({ message, chat }) {
  // Safely read current user
  let myId = null;

  try {
    const userRaw = localStorage.getItem("user");
    const user = userRaw ? JSON.parse(userRaw) : null;
    myId = user?.id || null;
  } catch (err) {
    console.error("Failed to parse user from storage:", err);
  }

  const isMe = message?.sender_id === myId;

  // Determine role
  const amClient = chat?.client_id === myId;

  // Determine sender label for OTHER person's messages
  let senderLabel = null;

  if (!isMe && chat) {
    if (amClient) {
      // I'm the client → other person is the SHOP
      senderLabel = chat.shop_name || "Shop";
    } else {
      // I'm the shop owner → other person is the CLIENT
      const first = chat.client_first || "";
      const last = chat.client_last || "";
      senderLabel = `${first} ${last}`.trim() || "Client";
    }
  }

  // Safe time formatting
  let timeFormatted = "";

  if (message?.timestamp) {
    const date = new Date(message.timestamp);

    if (!isNaN(date.getTime())) {
      timeFormatted = date.toLocaleTimeString([], {
        hour: "numeric",
        minute: "2-digit",
      });
    }
  }

  return (
    <div className={`flex ${isMe ? "justify-end" : "justify-start"}`}>
      <div
        className={`max-w-[60%] p-3 rounded-xl shadow-sm border ${
          isMe ? "bg-blue-500 text-white" : "bg-white"
        }`}
      >
        {/* Only show name for received messages */}
        {!isMe && senderLabel && (
          <div className="font-semibold text-sm mb-1">
            {senderLabel}
          </div>
        )}

        <div>{message?.message_text || ""}</div>

        {timeFormatted && (
          <div className="text-xs opacity-70 mt-1 text-right">
            {timeFormatted}
          </div>
        )}
      </div>
    </div>
  );
}
