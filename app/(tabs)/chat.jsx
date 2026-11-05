// Participant-scoped conversations with server-backed last-message previews.
import { useCallback, useRef, useState } from "react";
import { ActivityIndicator, Pressable, Text, View } from "react-native";
import { useFocusEffect, useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";

import AsyncList from "../../components/AsyncList";
import Button from "../../components/Button";
import TextField from "../../components/TextField";
import Modal from "../../components/Modal";
import api from "../../lib/api";
import { useFetch } from "../../lib/useFetch";
import { useAuth } from "../../lib/auth";
import { useSocket, useSocketConnected } from "../../lib/socket";
import { chatDate, chatTimestamp, chatTitle } from "../../lib/chat";
import { useResponsive } from "../../lib/useResponsive";
import { COLORS } from "../../constants/theme";

export default function ChatList() {
  const router = useRouter();
  const { user, isBusiness } = useAuth();
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
  const conversations = Array.isArray(data) ? data : [];
  const roomIds = conversations.map((chat) => Number(chat.id)).sort((a, b) => a - b).join(",");

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
  const filtered = conversations.filter((chat) =>
    (filter === "all" || (filter === "messages" ? Boolean(chat.last_message_id) : !chat.last_message_id)) &&
    (!needle || [chatTitle(chat, user?.id), chat.last_message_text].join(" ").toLowerCase().includes(needle))
  ).sort((a, b) => chatTimestamp(b.last_message_timestamp || b.last_message_at) - chatTimestamp(a.last_message_timestamp || a.last_message_at) || Number(b.id) - Number(a.id));

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
      data={filtered} keyExtractor={(item) => String(item.id)}
      emptyText={conversations.length ? "No conversations match your search or filter." : isBusiness ? "No customer conversations yet." : "No conversations yet. Choose New conversation above to contact a featured shop."}
      ListHeaderComponent={
        <View>
          <View className={isMobile ? "mb-5 gap-3" : "mb-5 flex-row flex-wrap items-center justify-between gap-3"}>
            <View className={isMobile ? "" : "flex-1"}><Text accessibilityRole="header" className="text-2xl font-bold text-gray-900">Messages</Text><Text className="mt-1 text-sm leading-5 text-gray-500">Keep your repair conversations in one place.</Text></View>
            {isBusiness ? <Button title="Refresh" variant="outline" onPress={refresh} loading={refreshing} /> : <Button title="New conversation" onPress={() => { setStartError(null); setNewChatOpen(true); }} />}
          </View>
          <View className="mb-5 flex-row items-start gap-3 rounded-2xl border border-blue-100 bg-blue-50 p-4">
            <Ionicons name="chatbubbles-outline" size={25} color={COLORS.primary} />
            <View className="flex-1"><Text className="text-sm font-bold text-blue-900">A direct line to your repair shop</Text><Text className="mt-1 text-sm leading-5 text-blue-800">Ask about your device, clarify a quotation, or follow up on repair progress.</Text></View>
          </View>
          <View className="mb-4 rounded-xl border border-gray-200 bg-white p-4">
            <TextField label="Search conversations" value={query} onChangeText={setQuery} autoCapitalize="none" autoCorrect={false} placeholder="Shop name or latest message" />
            <View className="flex-row flex-wrap gap-2">
              {[["all", "All conversations"], ["messages", "With messages"], ["empty", "No messages yet"]].map(([key, label]) => (
                <Pressable key={key} onPress={() => setFilter(key)} accessibilityRole="button" accessibilityState={{ selected: filter === key }} className={`min-h-11 justify-center rounded-lg px-3 py-2 ${filter === key ? "bg-blue-600" : "bg-gray-50"}`}><Text className={`text-sm font-semibold ${filter === key ? "text-white" : "text-gray-600"}`}>{label}</Text></Pressable>
              ))}
            </View>
          </View>
          <View className="mb-4 flex-row flex-wrap items-center justify-between gap-2">
            <View className="gap-1"><Text className="text-sm text-gray-500">{filtered.length} of {conversations.length} conversations</Text><Text className={`text-xs ${connected ? "text-emerald-700" : "text-gray-400"}`}>{connected ? "Live updates connected" : "Live updates disconnected"}</Text></View>
            <View className="flex-row flex-wrap gap-4">
              {query || filter !== "all" ? <Pressable onPress={() => { setQuery(""); setFilter("all"); }} accessibilityRole="button" className="min-h-11 justify-center"><Text className="text-sm font-semibold text-blue-600">Reset filters</Text></Pressable> : null}
              <Pressable onPress={refresh} disabled={refreshing} accessibilityRole="button" accessibilityState={{ busy: refreshing, disabled: refreshing }} className="min-h-11 justify-center"><Text className="text-sm font-semibold text-blue-600">{refreshing ? "Refreshing…" : "Refresh"}</Text></Pressable>
            </View>
          </View>
        </View>
      }
      renderItem={({ item }) => {
        const title = chatTitle(item, user?.id);
        const mine = String(item.last_sender_id) === String(user?.id);
        const hasMessage = Boolean(item.last_message_id);
        return (
          <Pressable onPress={() => router.push(`/chat/${item.id}`)} accessibilityRole="button" accessibilityLabel={`Open conversation with ${title}`} className="mb-3 rounded-2xl border border-gray-200 bg-white p-4 active:bg-blue-50">
            <View className="flex-row items-start gap-3">
              <View className="h-12 w-12 items-center justify-center rounded-xl bg-blue-50"><Text className="text-lg font-bold text-blue-700">{title.charAt(0).toUpperCase()}</Text></View>
              <View className="flex-1">
                <View className="flex-row flex-wrap items-start justify-between gap-2">
                  <Text className="text-base font-bold text-gray-900" style={{ flexShrink: 1 }}>{title}</Text>
                  {hasMessage ? <Text className="text-xs text-gray-400">{chatDate(item.last_message_timestamp)}</Text> : null}
                </View>
                <Text numberOfLines={isDesktop ? 1 : 2} className={`mt-2 text-sm leading-5 ${hasMessage ? "text-gray-600" : "text-gray-400"}`}>{hasMessage ? `${mine ? "You: " : ""}${item.last_message_text || "Message"}` : "No messages yet. Say hello to get started."}</Text>
                <Text className="mt-3 text-xs font-semibold text-blue-600">Open conversation →</Text>
              </View>
            </View>
          </Pressable>
        );
      }}
    />
    <Modal visible={newChatOpen} onClose={() => { if (!starting) setNewChatOpen(false); }} title="Start a conversation">
      <Text className="mb-4 text-sm leading-5 text-gray-500">Choose a featured verified shop. An existing conversation with that shop will open if you already have one.</Text>
      {startError ? <Text accessibilityRole="alert" className="mb-3 rounded-lg bg-red-50 p-3 text-sm text-red-700">{startError}</Text> : null}
      {availableShops.loading ? <ActivityIndicator color={COLORS.primary} /> : availableShops.error ? <View><Text className="mb-3 text-sm text-gray-500">{availableShops.error}</Text><Button title="Try again" variant="outline" onPress={availableShops.refresh} loading={availableShops.refreshing} /></View> : (
        (availableShops.data ?? []).map((shop) => (
          <Pressable key={shop.id} onPress={() => startConversation(shop)} disabled={Boolean(starting)} accessibilityRole="button" accessibilityLabel={`Open conversation with ${shop.name}`} accessibilityState={{ disabled: Boolean(starting), busy: starting === shop.id }} className="mb-3 min-h-12 flex-row items-center gap-3 rounded-xl border border-gray-200 p-4 active:bg-blue-50">
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
