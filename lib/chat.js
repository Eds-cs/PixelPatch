export function chatTimestamp(value) {
  return value ? new Date(String(value).replace(" ", "T")).getTime() || 0 : 0;
}

export function mergeChatMessages(current, incoming) {
  const rows = new Map();
  for (const message of [...current, ...incoming]) {
    if (message?.id !== null && message?.id !== undefined) rows.set(String(message.id), message);
  }
  return [...rows.values()].sort((a, b) => chatTimestamp(a.timestamp) - chatTimestamp(b.timestamp) || Number(a.id) - Number(b.id));
}

export function chatTitle(chat, userId) {
  return String(chat.shop_owner_id) === String(userId)
    ? [chat.client_first, chat.client_last].filter(Boolean).join(" ") || "Client"
    : chat.shop_name || "Repair shop";
}

export function chatDay(value) {
  const timestamp = chatTimestamp(value);
  if (!timestamp) return "unknown";
  const date = new Date(timestamp);
  return `${date.getFullYear()}-${date.getMonth()}-${date.getDate()}`;
}

export function chatDate(value, timeOnly = false) {
  const timestamp = chatTimestamp(value);
  if (!timestamp) return "Date unavailable";
  return new Date(timestamp).toLocaleString(undefined, timeOnly
    ? { hour: "numeric", minute: "2-digit" }
    : { month: "short", day: "numeric", year: "numeric" });
}
