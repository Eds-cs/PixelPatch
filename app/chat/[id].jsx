// Conversation UI: REST history + Socket.IO delivery, merged by persisted message ID.
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { ActivityIndicator, FlatList, KeyboardAvoidingView, Platform, Pressable, Text, TextInput, View } from "react-native";
import { Stack, useFocusEffect, useLocalSearchParams, useRouter } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";

import Button from "../../components/Button";
import { useAuth } from "../../lib/auth";
import { useSocket, useSocketConnected } from "../../lib/socket";
import { useFetch } from "../../lib/useFetch";
import { useResponsive } from "../../lib/useResponsive";
import { chatDate, chatDay, chatTitle, mergeChatMessages } from "../../lib/chat";
import { COLORS } from "../../constants/theme";

function Conversation({ chatId }) {
  const router = useRouter();
  const { user } = useAuth();
  const socket = useSocket();
  const connected = useSocketConnected(socket);
  const { isMobile, isDesktop, horizontalPadding } = useResponsive();
  const history = useFetch(`/chat/${chatId}/messages`, (data) => Array.isArray(data) ? data : []);
  const refreshHistory = history.refresh;
  const conversations = useFetch("/chat", (data) => Array.isArray(data) ? data : []);
  const conversation = conversations.data?.find((chat) => Number(chat.id) === chatId);
  const title = conversation ? chatTitle(conversation, user?.id) : "Conversation";
  const viewerIsShop = conversation && String(conversation.shop_owner_id) === String(user?.id);
  const [liveMessages, setLiveMessages] = useState([]);
  const messages = useMemo(() => mergeChatMessages(history.data || [], liveMessages), [history.data, liveMessages]);
  const [draft, setDraft] = useState("");
  const [sending, setSending] = useState(false);
  const [sendError, setSendError] = useState(null);
  const [hasNewMessages, setHasNewMessages] = useState(false);
  const listRef = useRef(null);
  const stickToBottom = useRef(true);
  const mounted = useRef(true);
  const sendPending = useRef(false);

  useEffect(() => {
    mounted.current = true;
    return () => { mounted.current = false; };
  }, []);

  useFocusEffect(useCallback(() => {
    if (!socket || !chatId) return;
    const join = () => {
      if (!socket.connected) return;
      socket.emit("join", chatId);
      refreshHistory();
    };
    const onNew = (message) => {
      if (Number(message?.chat_id) !== chatId) return;
      if (String(message.sender_id) === String(user?.id)) stickToBottom.current = true;
      else if (!stickToBottom.current) setHasNewMessages(true);
      setLiveMessages((current) => mergeChatMessages(current, [message]));
    };
    socket.on("connect", join);
    socket.on("new_message", onNew);
    join();
    return () => {
      socket.off("connect", join);
      socket.off("new_message", onNew);
      socket.emit("leave", chatId);
    };
  }, [socket, chatId, refreshHistory, user?.id, setHasNewMessages, setLiveMessages]));

  const jumpToLatest = () => {
    stickToBottom.current = true;
    setHasNewMessages(false);
    listRef.current?.scrollToEnd({ animated: true });
  };
  const refreshConversation = () => { history.refresh(); conversations.refresh(); };
  const send = () => {
    const text = draft.trim();
    if (!text || !socket?.connected || !conversation || sendPending.current) return;
    sendPending.current = true;
    setSending(true);
    setSendError(null);
    socket.timeout(10000).emit("send_message", { chat_id: chatId, message_text: text }, (timeoutError, ack) => {
      sendPending.current = false;
      if (!mounted.current) return;
      setSending(false);
      if (!timeoutError && ack?.success) {
        stickToBottom.current = true;
        setHasNewMessages(false);
        if (ack.message) setLiveMessages((current) => mergeChatMessages(current, [ack.message]));
        setDraft((current) => current.trim() === text ? "" : current);
      } else {
        setSendError(timeoutError ? "Delivery was not confirmed. Check the conversation before trying again." : ack?.error || "The message could not be sent. Your draft is still here.");
        history.refresh();
      }
    });
  };
  const canSend = Boolean(draft.trim() && connected && conversation && !sending);
  const unavailable = !conversations.loading && !conversations.error && !conversation;

  return (
    <SafeAreaView className="flex-1 bg-gray-50" edges={["bottom", "left", "right"]}>
      <Stack.Screen options={{ title, headerShown: false }} />
      <View className="border-b border-gray-200 bg-white">
        <View className="w-full self-center py-3" style={{ maxWidth: 960, paddingHorizontal: horizontalPadding }}>
          <View className="flex-row items-center gap-3">
            <Pressable onPress={() => router.push("/chat")} accessibilityRole="button" accessibilityLabel="Back to messages" className="h-11 w-11 items-center justify-center rounded-xl bg-gray-50"><Ionicons name="arrow-back-outline" size={21} color={COLORS.primary} /></Pressable>
            <View className="h-11 w-11 items-center justify-center rounded-xl bg-blue-50"><Text className="text-lg font-bold text-blue-700">{title.charAt(0).toUpperCase()}</Text></View>
            <View className="flex-1">
              <Text accessibilityRole="header" className="text-base font-bold text-gray-900">{title}</Text>
              <Text className={`mt-1 text-xs ${connected ? "text-emerald-700" : "text-gray-500"}`}>{connected ? "Live connection available" : "Live connection unavailable"}</Text>
            </View>
          </View>
          <View className="mt-3 flex-row flex-wrap gap-2">
            {!viewerIsShop && conversation?.shop_id ? <Button title="View shop" variant="ghost" onPress={() => router.push(`/shop/${conversation.shop_id}`)} /> : null}
            <Button title={viewerIsShop ? "Repair workspace" : "My repairs"} variant="ghost" onPress={() => router.push(viewerIsShop ? "/business/repairs" : "/repairs")} />
          </View>
        </View>
      </View>

      <KeyboardAvoidingView className="flex-1" behavior={Platform.OS === "ios" ? "padding" : undefined} keyboardVerticalOffset={90}>
        {history.loading ? <View className="flex-1 items-center justify-center"><ActivityIndicator color={COLORS.primary} /><Text className="mt-3 text-sm text-gray-500">Loading messages…</Text></View> : (
          <FlatList
            ref={listRef}
            className="flex-1"
            data={messages}
            keyExtractor={(message) => String(message.id)}
            keyboardShouldPersistTaps="handled"
            keyboardDismissMode="on-drag"
            contentContainerStyle={{ paddingVertical: 20, paddingHorizontal: horizontalPadding, maxWidth: 960, width: "100%", alignSelf: "center", flexGrow: 1 }}
            onScroll={({ nativeEvent }) => {
              const remaining = nativeEvent.contentSize.height - nativeEvent.layoutMeasurement.height - nativeEvent.contentOffset.y;
              stickToBottom.current = remaining < 80;
              if (stickToBottom.current) setHasNewMessages(false);
            }}
            scrollEventThrottle={100}
            onContentSizeChange={() => { if (stickToBottom.current) listRef.current?.scrollToEnd({ animated: false }); }}
            ListEmptyComponent={
              <View className="flex-1 items-center justify-center px-5 py-10">
                <View className="h-16 w-16 items-center justify-center rounded-2xl bg-blue-50"><Ionicons name="chatbubbles-outline" size={30} color={COLORS.primary} /></View>
                <Text className="mt-4 text-lg font-bold text-gray-900">{unavailable ? "Conversation unavailable" : history.error ? "Messages could not load" : "Start the conversation"}</Text>
                <Text className="mt-2 text-center text-sm leading-6 text-gray-500">{unavailable ? "Return to your inbox and select one of your conversations." : history.error ? "Use refresh below to try loading the history again." : "Say hello, ask about your device, or discuss the repair with your shop."}</Text>
              </View>
            }
            renderItem={({ item, index }) => {
              const mine = String(item.sender_id) === String(user?.id);
              const previous = messages[index - 1];
              const newDay = !previous || chatDay(previous.timestamp) !== chatDay(item.timestamp);
              const showName = !mine && (newDay || String(previous?.sender_id) !== String(item.sender_id));
              return (
                <View>
                  {newDay ? <View className="mb-5 mt-2 items-center"><Text className="rounded-full border border-gray-200 bg-white px-3 py-1.5 text-xs text-gray-500">{chatDate(item.timestamp)}</Text></View> : null}
                  <View className={`mb-3 ${mine ? "self-end" : "self-start"}`} style={{ maxWidth: isMobile ? "88%" : isDesktop ? "68%" : "78%" }}>
                    {showName ? <Text className="mb-1 ml-1 text-xs font-semibold text-gray-500">{[item.first_name, item.last_name].filter(Boolean).join(" ") || title}</Text> : null}
                    <View className={`rounded-2xl px-4 py-3 ${mine ? "bg-blue-600" : "border border-gray-200 bg-white"}`}>
                      <Text selectable className={`text-base leading-6 ${mine ? "text-white" : "text-gray-900"}`}>{item.message_text}</Text>
                      <Text className={`mt-2 text-right text-xs ${mine ? "text-blue-100" : "text-gray-400"}`}>{chatDate(item.timestamp, true)}</Text>
                    </View>
                  </View>
                </View>
              );
            }}
          />
        )}

        {hasNewMessages ? <Pressable onPress={jumpToLatest} accessibilityRole="button" className="mb-3 min-h-11 flex-row items-center gap-2 self-center rounded-full border border-blue-200 bg-blue-50 px-4 py-2"><Text className="text-sm font-semibold text-blue-700">New messages</Text><Ionicons name="arrow-down-outline" size={16} color={COLORS.primary} /></Pressable> : null}

        {history.error || conversations.error || unavailable || sendError || !connected ? (
          <View className="w-full self-center px-4 pb-3" style={{ maxWidth: 960 }}>
            <Text accessibilityRole="alert" className="text-center text-xs leading-5 text-gray-600">{sendError || history.error || conversations.error || (unavailable ? "This conversation is not available in your inbox." : "Your connection is unavailable. Your draft stays here while you reconnect.")}</Text>
            {(history.error || conversations.error) ? <Button title="Refresh conversation" variant="ghost" onPress={refreshConversation} loading={history.refreshing || conversations.refreshing} /> : null}
          </View>
        ) : null}

        <View className="border-t border-gray-200 bg-white">
          <View className="w-full self-center py-3" style={{ maxWidth: 960, paddingHorizontal: horizontalPadding }}>
            <View className="flex-row items-end gap-3">
              <TextInput
                className="max-h-32 min-h-12 flex-1 rounded-2xl border border-gray-200 bg-gray-50 px-4 py-3 text-base text-gray-900"
                placeholder="Write a message…"
                placeholderTextColor="#9ca3af"
                value={draft} onChangeText={setDraft} multiline accessibilityLabel="Message"
              />
              <Pressable onPress={send} disabled={!canSend} accessibilityRole="button" accessibilityLabel="Send message" accessibilityState={{ disabled: !canSend, busy: sending }} className={`h-12 w-12 items-center justify-center rounded-xl ${canSend ? "bg-blue-600" : "bg-gray-200"}`}>
                {sending ? <ActivityIndicator color={COLORS.primary} /> : <Ionicons name="send" size={20} color={canSend ? "#fff" : COLORS.textMuted} />}
              </Pressable>
            </View>
            <Text className="mt-2 text-xs text-gray-400">Discuss your repair here. Approve quotations and check payments from repair details.</Text>
          </View>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

export default function ChatRoom() {
  const { id } = useLocalSearchParams();
  const chatId = Number(id);
  if (!Number.isInteger(chatId) || chatId <= 0) {
    return <View className="flex-1 items-center justify-center bg-gray-50 p-6"><Text className="text-sm text-gray-500">Invalid conversation.</Text></View>;
  }
  return <Conversation key={chatId} chatId={chatId} />;
}
