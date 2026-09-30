export default function ChatList({ chats, activeChat, onSelectChat }) {
  const userRaw = localStorage.getItem("user") || sessionStorage.getItem("user");
  const user = userRaw ? JSON.parse(userRaw) : null; 
  const myUserId = user.id;

  return (
    <div className="w-80 h-full border-r bg-white overflow-y-auto p-4">
      <h2 className="text-xl font-bold mb-4">Chats</h2>

      {chats.map(chat => {
        // Determine if logged-in user is the client
        const isClient = chat.client_id === myUserId;

        // Correct field names returned by SQL
        const displayName = isClient
          ? chat.shop_name                             // Client sees shop
          : `${chat.client_first} ${chat.client_last}`; // Shop owner sees client

        // Format time as "7:12 PM"
        const lastUpdate = chat.last_message_at
          ? new Date(chat.last_message_at).toLocaleTimeString([], {
              hour: "numeric",
              minute: "2-digit",
              hour12: true
            })
          : "No messages yet";

        return (
          <div
            key={chat.id}
            onClick={() => onSelectChat(chat.id)}
            className={`p-4 rounded-lg mb-3 cursor-pointer border ${
              activeChat === chat.id
                ? "bg-blue-500 text-white"
                : "bg-gray-100 hover:bg-gray-200"
            }`}
          >
            <div className="font-semibold">{displayName}</div>
            <div className="text-sm opacity-75">Last updated: {lastUpdate}</div>
          </div>
        );
      })}
    </div>
  );
}
