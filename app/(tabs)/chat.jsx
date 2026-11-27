// Participant-scoped conversations with server-backed last-message previews.
// The same inbox serves three sides, chosen by the address:
//   /chat               your own chats as a customer        (viewer_role CLIENT)
//   /business/messages  your shop's customer chats          (viewer_role OWNER)
//   /staff/messages     the chats your shop handed to you    (viewer_role STAFF)
// A client has a General chat with each shop plus one chat per repair; they
// are grouped under the shop (or, for shops, under the client).
import { useCallback, useRef, useState } from "react";
import { LIMITS } from "../../lib/inputLimits";
import { ActivityIndicator, Pressable, Text, View } from "react-native";
import { useFocusEffect, usePathname, useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";

import AsyncList from "../../components/AsyncList";
import Button from "../../components/Button";
import TextField from "../../components/TextField";
import Modal from "../../components/Modal";
import api from "../../lib/api";
import { useFetch } from "../../lib/useFetch";
import { useAuth } from "../../lib/auth";
import { useSocket, useSocketConnected } from "../../lib/socket";
import { chatDate, chatTimestamp, threadTitle } from "../../lib/chat";
import { useResponsive } from "../../lib/useResponsive";
import { COLORS } from "../../constants/theme";

export default function ChatList() {
  const router = useRouter();
  const { user, isBusiness } = useAuth();
  const pathname = usePathname();
  const shopMode = isBusiness && pathname.startsWith("/business");
  const staffMode = pathname.startsWith("/staff");
  const viewerRole = shopMode ? "OWNER" : staffMode ? "STAFF" : "CLIENT";
  const customerView = viewerRole === "CLIENT";
  const { isMobile, isDesktop } = useResponsive();
  const socket = useSocket();
  const connected = useSocketConnected(socket);
  const { data, error, loading, refreshing, refresh } = useFetch("/chat");
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState("all");
  const [newChatOpen, setNewChatOpen] = useState(false);
  const [starting, setStarting] = useState(null);
  const [startError, setStartError] = useState(null);
  const availableShops = useFetch(newChatOpen ? "/public/shops" : null, (d) => d.shops ?? []);
  const focusedBefore = useRef(false);
  const allConversations = Array.isArray(data) ? data : [];
  const roomIds = allConversations.map((chat) => Number(chat.id)).sort((a, b) => a - b).join(",");
  const conversations = allConversations.filter((chat) => chat.viewer_role === viewerRole);

  useFocusEffect(useCallback(() => {
    if (focusedBefore.current) refresh();
    focusedBefore.current = true;
  }, [refresh]));

  useFocusEffect(useCallback(() => {
    if (!socket || !roomIds) return;
    const ids = roomIds.split(",").map(Number);
    const joinRooms = () => { if (socket.connected) ids.forEach((id) => socket.emit("join", id)); };
    const onMessage = (message) => { if (ids.includes(Number(message?.chat_id))) refresh(); };
    socket.on("connect", joinRooms);
    socket.on("new_message", onMessage);
    joinRooms();
    return () => {
      socket.off("connect", joinRooms);
      socket.off("new_message", onMessage);
      ids.forEach((id) => socket.emit("leave", id));
    };
  }, [socket, roomIds, refresh]));

  const needle = query.trim().toLowerCase();
  const groupName = (chat) => customerView ? chat.shop_name || "Repair shop" : [chat.client_first, chat.client_last].filter(Boolean).join(" ") || "Client";
  const latest = (chat) => chatTimestamp(chat.last_message_timestamp || chat.last_message_at);
  const filtered = conversations.filter((chat) =>
    (filter === "all" || (filter === "messages" ? Boolean(chat.last_message_id) : !chat.last_message_id)) &&
    (!needle || [groupName(chat), threadTitle(chat), chat.handler_label, chat.last_message_text].join(" ").toLowerCase().includes(needle))
  ).sort((a, b) => latest(b) - latest(a) || Number(b.id) - Number(a.id));
  // One card per shop (or per client on the shop side), newest first; the
  // General chat first inside it, then repairs, newest first.
  const groups = [];
  const byKey = new Map();
  for (const chat of filtered) {
    const key = customerView ? `shop-${chat.shop_id}` : `client-${chat.client_id}`;
    if (!byKey.has(key)) { byKey.set(key, { key, name: groupName(chat), threads: [] }); groups.push(byKey.get(key)); }
    byKey.get(key).threads.push(chat);
  }
  groups.forEach((group) => group.threads.sort((a, b) => (a.request_id ? 1 : 0) - (b.request_id ? 1 : 0) || latest(b) - latest(a)));

  const startConversation = async (shop) => {
    if (starting) return;
    setStarting(shop.id);
    setStartError(null);
    try {
      const { data: result } = await api.post("/chat/start", { shop_id: shop.id });
      if (!result.chat?.id) throw new Error("The conversation could not be opened.");
      setNewChatOpen(false);
      await refresh();
      router.push(`/chat/${result.chat.id}`);
    } catch (e) {
      setStartError(e.message || "The conversation could not be opened.");
    } finally {
      setStarting(null);
    }
  };

  return (
    <View className="flex-1 bg-gray-50">
    <AsyncList
      loading={loading} error={error} refreshing={refreshing} onRefresh={refresh}
      data={groups} keyExtractor={(item) => item.key}
      emptyText={conversations.length ? "No conversations match your search or filter." : shopMode ? "No customer conversations yet." : staffMode ? "No chats have been handed to you yet. Your shop owner can hand you a repair's chat." : "No conversations yet. Choose New conversation above to contact a featured shop."}
      ListHeaderComponent={
        <View>
          <View className={isMobile ? "mb-5 gap-3" : "mb-5 flex-row flex-wrap items-center justify-between gap-3"}>
            <View className={isMobile ? "" : "flex-1"}><Text accessibilityRole="header" className="text-2xl font-bold text-gray-900">Messages</Text><Text className="mt-1 text-sm leading-5 text-gray-500">Keep your repair conversations in one place.</Text></View>
            {customerView ? <Button title="New conversation" onPress={() => { setStartError(null); setNewChatOpen(true); }} /> : <Button title="Refresh" variant="outline" onPress={refresh} loading={refreshing} />}
          </View>
          <View className="mb-5 flex-row items-start gap-3 rounded-2xl border border-primary-soft bg-teal-50 p-4">
            <Ionicons name="chatbubbles-outline" size={25} color={COLORS.primary} />
            <View className="flex-1"><Text className="text-sm font-bold text-teal-950">{shopMode ? "Your customers' questions" : staffMode ? "Chats handed to you" : "A direct line to your repair shop"}</Text><Text className="mt-1 text-sm leading-5 text-primary-soft-foreground">{shopMode ? "Each customer has a General chat for questions and one chat per repair. Hand a repair's chat to the employee assigned to it from inside the chat." : staffMode ? "Your shop owner handed you these repair chats. Customers see your first name and role on your messages." : "Each shop has a General chat for questions, and every repair gets its own chat."}</Text></View>
          </View>
          <View className="mb-4 rounded-xl border border-gray-200 bg-white p-4">
            <TextField label="Search conversations" maxLength={LIMITS.search} value={query} onChangeText={setQuery} autoCapitalize="none" autoCorrect={false} placeholder={customerView ? "Shop name, repair or latest message" : "Customer name, repair or latest message"} />
            <View className="flex-row flex-wrap gap-2">
              {[["all", "All conversations"], ["messages", "With messages"], ["empty", "No messages yet"]].map(([key, label]) => (
                <Pressable key={key} onPress={() => setFilter(key)} accessibilityRole="button" accessibilityState={{ selected: filter === key }} className={`min-h-11 justify-center rounded-lg px-3 py-2 ${filter === key ? "bg-primary" : "bg-gray-50"}`}><Text className={`text-sm font-semibold ${filter === key ? "text-white" : "text-gray-600"}`}>{label}</Text></Pressable>
              ))}
            </View>
          </View>
          <View className="mb-4 flex-row flex-wrap items-center justify-between gap-2">
            <View className="gap-1"><Text className="text-sm text-gray-500">{filtered.length} of {conversations.length} conversations</Text><Text className={`text-xs ${connected ? "text-emerald-700" : "text-gray-400"}`}>{connected ? "Live updates connected" : "Live updates disconnected"}</Text></View>
            <View className="flex-row flex-wrap gap-4">
              {query || filter !== "all" ? <Pressable onPress={() => { setQuery(""); setFilter("all"); }} accessibilityRole="button" className="min-h-11 justify-center"><Text className="text-sm font-semibold text-primary">Reset filters</Text></Pressable> : null}
              <Pressable onPress={refresh} disabled={refreshing} accessibilityRole="button" accessibilityState={{ busy: refreshing, disabled: refreshing }} className="min-h-11 justify-center"><Text className="text-sm font-semibold text-primary">{refreshing ? "Refreshing…" : "Refresh"}</Text></Pressable>
            </View>
          </View>
        </View>
      }
      renderItem={({ item: group }) => (
        <View className="mb-3 rounded-2xl border border-gray-200 bg-white p-2">
          <View className="flex-row items-center gap-3 px-2 pb-2 pt-2">
            <View className="h-10 w-10 items-center justify-center rounded-xl bg-teal-50"><Text className="text-base font-bold text-teal-800">{group.name.charAt(0).toUpperCase()}</Text></View>
            <Text className="flex-1 text-base font-bold text-gray-900">{group.name}</Text>
            {group.threads.length > 1 ? <Text className="text-xs text-gray-400">{group.threads.length} chats</Text> : null}
          </View>
          {group.threads.map((item) => {
            const title = threadTitle(item);
            const mine = String(item.last_sender_id) === String(user?.id);
            const hasMessage = Boolean(item.last_message_id);
            const systemLine = item.last_sender_kind === "SYSTEM";
            // Who answers this chat once it's handed over.
            const handler = item.handler_label ? (customerView ? item.handler_label : `Handed to ${item.handler_label}`) : null;
            return (
              <Pressable key={item.id} onPress={() => router.push(`/chat/${item.id}`)} accessibilityRole="button" accessibilityLabel={`Open ${title} with ${group.name}`} className="rounded-xl border-t border-gray-100 px-2 py-3 active:bg-teal-50">
                <View className="flex-row flex-wrap items-center justify-between gap-2">
                  <View className="flex-row flex-wrap items-center gap-2" style={{ flexShrink: 1 }}>
                    <Ionicons name={item.request_id ? "construct-outline" : "chatbubble-ellipses-outline"} size={15} color={COLORS.primary} />
                    <Text className="text-sm font-semibold text-gray-900" style={{ flexShrink: 1 }}>{title}</Text>
                    {handler ? <View className="rounded-full bg-teal-50 px-2 py-0.5"><Text className="text-xs font-semibold text-teal-800">{handler}</Text></View> : null}
                  </View>
                  {hasMessage ? <Text className="text-xs text-gray-400">{chatDate(item.last_message_timestamp)}</Text> : null}
                </View>
                <Text numberOfLines={isDesktop ? 1 : 2} className={`mt-1.5 text-sm leading-5 ${hasMessage && !systemLine ? "text-gray-600" : "text-gray-400"}`}>{hasMessage ? `${mine && !systemLine ? "You: " : ""}${item.last_message_text || "Message"}` : "No messages yet. Say hello to get started."}</Text>
              </Pressable>
            );
          })}
        </View>
      )}
    />
    <Modal visible={newChatOpen} onClose={() => { if (!starting) setNewChatOpen(false); }} title="Start a conversation">
      <Text className="mb-4 text-sm leading-5 text-gray-500">Choose a featured verified shop. An existing conversation with that shop will open if you already have one.</Text>
      {startError ? <Text accessibilityRole="alert" className="mb-3 rounded-lg bg-red-50 p-3 text-sm text-red-700">{startError}</Text> : null}
      {availableShops.loading ? <ActivityIndicator color={COLORS.primary} /> : availableShops.error ? <View><Text className="mb-3 text-sm text-gray-500">{availableShops.error}</Text><Button title="Try again" variant="outline" onPress={availableShops.refresh} loading={availableShops.refreshing} /></View> : (
        (availableShops.data ?? []).map((shop) => (
          <Pressable key={shop.id} onPress={() => startConversation(shop)} disabled={Boolean(starting)} accessibilityRole="button" accessibilityLabel={`Open conversation with ${shop.name}`} accessibilityState={{ disabled: Boolean(starting), busy: starting === shop.id }} className="mb-3 min-h-12 flex-row items-center gap-3 rounded-xl border border-gray-200 p-4 active:bg-teal-50">
            <Ionicons name="storefront-outline" size={22} color={COLORS.primary} />
            <View className="flex-1"><Text className="text-sm font-bold text-gray-900">{shop.name}</Text><Text className="mt-1 text-xs text-gray-500">{[shop.barangay, shop.province].filter(Boolean).join(", ") || "Location not listed"}</Text></View>
            {starting === shop.id ? <ActivityIndicator color={COLORS.primary} /> : <Ionicons name="arrow-forward-outline" size={18} color={COLORS.primary} />}
          </Pressable>
        ))
      )}
      {!availableShops.loading && !availableShops.error && !availableShops.data?.length ? <Text className="text-sm text-gray-500">No featured verified shops are available yet.</Text> : null}
    </Modal>
    </View>
  );
}
