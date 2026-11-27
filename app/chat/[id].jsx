// Conversation UI: REST history + Socket.IO delivery, merged by persisted message ID.
//
// GET /api/chat/:id says who you are in this chat (CLIENT, OWNER or STAFF),
// whether you can send, and who has it. A repair's chat can be handed by the
// owner to the employee assigned to that repair; the owner then only reads
// it until they take it back. Shop messages carry a badge ("Juan · Technician",
// "Maria · Owner"), and handovers show as grey SYSTEM lines.
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { LIMITS } from "../../lib/inputLimits";
import { ActivityIndicator, FlatList, KeyboardAvoidingView, Platform, Pressable, Text, TextInput, View } from "react-native";
import { Stack, useFocusEffect, useLocalSearchParams, useRouter } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";

import Button from "../../components/Button";
import api from "../../lib/api";
import { useAuth } from "../../lib/auth";
import { confirmAction } from "../../lib/confirm";
import { useSocket, useSocketConnected } from "../../lib/socket";
import { useFetch } from "../../lib/useFetch";
import { useResponsive } from "../../lib/useResponsive";
import { chatDate, chatDay, mergeChatMessages } from "../../lib/chat";
import { COLORS } from "../../constants/theme";

import { SHOW_BACK_BUTTONS } from "../../lib/navigation";
// Longest draft taken from the link (the assistant's summary is up to 400).
const DRAFT_PARAM_MAX = 1000;

const INBOX = { CLIENT: "/chat", OWNER: "/business/messages", STAFF: "/staff/messages" };

function Badge({ label, tone = "teal" }) {
  if (!label) return null;
  return (
    <View className={`self-start rounded-full px-2 py-0.5 ${tone === "teal" ? "bg-teal-50" : "bg-gray-100"}`}>
      <Text className={`text-xs font-semibold ${tone === "teal" ? "text-teal-800" : "text-gray-600"}`}>{label}</Text>
    </View>
  );
}

function Conversation({ chatId, initialDraft = "", fromAssistant = false }) {
  const router = useRouter();
  const { user } = useAuth();
  const socket = useSocket();
  const connected = useSocketConnected(socket);
  const { isMobile, isDesktop, horizontalPadding } = useResponsive();
  const history = useFetch(`/chat/${chatId}/messages`, (data) => Array.isArray(data) ? data : []);
  const refreshHistory = history.refresh;
  const chatState = useFetch(`/chat/${chatId}`);
  const refreshState = chatState.refresh;
  const chat = chatState.data;
  const as = chat?.as;
  const title = !chat ? "Conversation" : as === "CLIENT" ? chat.shop_name || "Repair shop" : chat.client_name || "Client";
  const thread = !chat ? "" : chat.repair ? [`Repair #${chat.repair.id}`, chat.repair.device_name].filter(Boolean).join(" · ") : "General";
  const [liveMessages, setLiveMessages] = useState([]);
  const messages = useMemo(() => mergeChatMessages(history.data || [], liveMessages), [history.data, liveMessages]);
  // From the AI assistant: its summary of the problem, for the person to
  // review and edit. Nothing is sent until they press Send.
  const [draft, setDraft] = useState(initialDraft);
  const [showDraftNote, setShowDraftNote] = useState(Boolean(fromAssistant && initialDraft));
  const [sending, setSending] = useState(false);
  const [sendError, setSendError] = useState(null);
  // Set when the server hid contact details in the message just sent
  // (server/utils/contactFilter.js). Cleared on the next send.
  const [hiddenNotice, setHiddenNotice] = useState(null);
  const [handover, setHandover] = useState(null); // "transfer" | "take-back" while busy
  const [handoverError, setHandoverError] = useState(null);
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
    // Handed over or taken back: who can send has changed.
    const onUpdated = (event) => { if (Number(event?.chat_id) === chatId) refreshState(); };
    socket.on("connect", join);
    socket.on("new_message", onNew);
    socket.on("chat_updated", onUpdated);
    join();
    return () => {
      socket.off("connect", join);
      socket.off("new_message", onNew);
      socket.off("chat_updated", onUpdated);
      socket.emit("leave", chatId);
    };
  }, [socket, chatId, refreshHistory, refreshState, user?.id, setHasNewMessages, setLiveMessages]));

  const jumpToLatest = () => {
    stickToBottom.current = true;
    setHasNewMessages(false);
    listRef.current?.scrollToEnd({ animated: true });
  };
  const refreshConversation = () => { history.refresh(); chatState.refresh(); };
  const send = () => {
    const text = draft.trim();
    if (!text || !socket?.connected || !chat?.can_send || sendPending.current) return;
    sendPending.current = true;
    setSending(true);
    setSendError(null);
    setHiddenNotice(null);
    socket.timeout(10000).emit("send_message", { chat_id: chatId, message_text: text }, (timeoutError, ack) => {
      sendPending.current = false;
      if (!mounted.current) return;
      setSending(false);
      if (!timeoutError && ack?.success) {
        stickToBottom.current = true;
        setHasNewMessages(false);
        setShowDraftNote(false);
        if (ack.masked) setHiddenNotice(ack.notice || "We hid contact details in your message.");
        if (ack.message) setLiveMessages((current) => mergeChatMessages(current, [ack.message]));
        setDraft((current) => current.trim() === text ? "" : current);
      } else {
        setSendError(timeoutError ? "Delivery was not confirmed. Check the conversation before trying again." : ack?.error || "The message could not be sent. Your draft is still here.");
        if (ack?.code === "CHAT_HANDED_OVER") refreshState();
        history.refresh();
      }
    });
  };

  // Owner: hand the repair's chat to the assigned employee, or take it back.
  const changeHandler = (action) => {
    const run = async () => {
      setHandover(action);
      setHandoverError(null);
      try {
        await api.post(`/business/chats/${chatId}/${action}`);
        await Promise.all([refreshState(), refreshHistory()]);
      } catch (e) {
        setHandoverError(e.message || "Couldn't change who handles this chat.");
      } finally {
        setHandover(null);
      }
    };
    if (action === "take-back") { void run(); return; }
    confirmAction(
      `Hand this chat to ${chat.transfer.label}?`,
      `${chat.transfer.label} will answer ${chat.client_name} here. You can still read the chat, but you can't reply until you take it back. The customer sees a note that the chat was handed over.`,
      run,
      { confirmLabel: "Hand over" }
    );
  };

  const canSend = Boolean(draft.trim() && connected && chat?.can_send && !sending);
  const unavailable = !chatState.loading && Boolean(chatState.error);
  const readOnly = Boolean(chat) && !chat.can_send;
  const repairHref = chat?.repair
    ? as === "OWNER" ? `/business/repairs/${chat.repair.id}` : as === "STAFF" ? `/staff/repairs/${chat.repair.id}` : `/repair/${chat.repair.id}`
    : null;

  // Who the person is talking with, in one line under the title.
  const talkingWith = !chat
    ? null
    : as === "CLIENT"
      ? `You're talking with ${chat.handler?.label || chat.owner_label} at ${chat.shop_name}`
      : as === "STAFF"
        ? `You're answering for ${chat.shop_name}. The customer sees your first name and role.`
        : chat.handler
          ? `Handed to ${chat.handler.label}. You can read this chat.`
          : `You're answering as ${chat.owner_label}.`;

  return (
    <SafeAreaView className="flex-1 bg-gray-50" edges={["bottom", "left", "right"]}>
      <Stack.Screen options={{ title, headerShown: false }} />
      <View className="border-b border-gray-200 bg-white">
        <View className="w-full self-center py-3" style={{ maxWidth: 960, paddingHorizontal: horizontalPadding }}>
          <View className="flex-row items-center gap-3">
            {SHOW_BACK_BUTTONS ? (
              <Pressable onPress={() => router.push(INBOX[as] || "/chat")} accessibilityRole="button" accessibilityLabel="Back to messages" className="h-11 w-11 items-center justify-center rounded-xl bg-gray-50"><Ionicons name="arrow-back-outline" size={21} color={COLORS.primary} /></Pressable>
            ) : null}
            <View className="h-11 w-11 items-center justify-center rounded-xl bg-teal-50"><Text className="text-lg font-bold text-teal-800">{title.charAt(0).toUpperCase()}</Text></View>
            <View className="flex-1">
              <Text accessibilityRole="header" className="text-base font-bold text-gray-900">{title}</Text>
              {thread ? <Text className="mt-0.5 text-xs font-semibold text-gray-500">{thread}</Text> : null}
              <Text className={`mt-1 text-xs ${connected ? "text-emerald-700" : "text-gray-500"}`}>{connected ? "Live connection available" : "Live connection unavailable"}</Text>
            </View>
          </View>
          {talkingWith ? (
            <View className="mt-3 flex-row items-start gap-2 rounded-xl bg-gray-50 px-3 py-2">
              <Ionicons name={chat.handler ? "people-outline" : "person-circle-outline"} size={16} color={COLORS.primary} style={{ marginTop: 1 }} />
              <Text className="flex-1 text-xs leading-5 text-gray-700">{talkingWith}</Text>
            </View>
          ) : null}
          {handoverError ? <Text accessibilityRole="alert" className="mt-2 text-xs text-red-700">{handoverError}</Text> : null}
          <View className="mt-3 flex-row flex-wrap gap-2">
            {as === "CLIENT" && chat?.shop_id ? <Button title="View shop" variant="ghost" onPress={() => router.push(`/shop/${chat.shop_id}`)} /> : null}
            {repairHref ? (
              <Button title={`Repair #${chat.repair.id}`} variant="ghost" onPress={() => router.push(repairHref)} />
            ) : as === "STAFF" ? null : (
              <Button title={as === "OWNER" ? "Repair workspace" : "My repairs"} variant="ghost" onPress={() => router.push(as === "OWNER" ? "/business/repairs" : "/repairs")} />
            )}
            {as === "OWNER" && chat?.transfer && !chat.handler ? (
              <Button title={`Hand to ${chat.transfer.label}`} variant="outline" loading={handover === "transfer"} disabled={Boolean(handover)} onPress={() => changeHandler("transfer")} />
            ) : null}
            {as === "OWNER" && chat?.handler ? (
              <Button title="Take back" variant="outline" loading={handover === "take-back"} disabled={Boolean(handover)} onPress={() => changeHandler("take-back")} />
            ) : null}
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
                <View className="h-16 w-16 items-center justify-center rounded-2xl bg-teal-50"><Ionicons name="chatbubbles-outline" size={30} color={COLORS.primary} /></View>
                <Text className="mt-4 text-lg font-bold text-gray-900">{unavailable ? "Conversation unavailable" : history.error ? "Messages could not load" : "Start the conversation"}</Text>
                <Text className="mt-2 text-center text-sm leading-6 text-gray-500">{unavailable ? "Return to your inbox and select one of your conversations." : history.error ? "Use refresh below to try loading the history again." : chat?.repair ? "Ask about this repair, its progress or its quotation." : "Say hello, ask about your device, or discuss a repair."}</Text>
              </View>
            }
            renderItem={({ item, index }) => {
              const previous = messages[index - 1];
              const newDay = !previous || chatDay(previous.timestamp) !== chatDay(item.timestamp);
              const dayLine = newDay ? <View className="mb-5 mt-2 items-center"><Text className="rounded-full border border-gray-200 bg-white px-3 py-1.5 text-xs text-gray-500">{chatDate(item.timestamp)}</Text></View> : null;
              // "TechFix Pro handed this chat to Juan (Technician)."
              if (item.sender_kind === "SYSTEM") {
                return (
                  <View>
                    {dayLine}
                    <View className="mb-3 flex-row items-center justify-center gap-2 px-4">
                      <Ionicons name="swap-horizontal-outline" size={14} color={COLORS.textMuted} />
                      <Text className="text-center text-xs leading-5 text-gray-500" style={{ flexShrink: 1 }}>{item.message_text} · {chatDate(item.timestamp, true)}</Text>
                    </View>
                  </View>
                );
              }
              const mine = String(item.sender_id) === String(user?.id);
              const shopSide = item.sender_kind === "OWNER" || item.sender_kind === "STAFF";
              const previousSameSender = previous && previous.sender_kind !== "SYSTEM" && String(previous.sender_id) === String(item.sender_id);
              const showName = !mine && (newDay || !previousSameSender);
              const clientName = [item.first_name, item.last_name].filter(Boolean).join(" ") || "Client";
              return (
                <View>
                  {dayLine}
                  <View className={`mb-3 ${mine ? "self-end" : "self-start"}`} style={{ maxWidth: isMobile ? "88%" : isDesktop ? "68%" : "78%" }}>
                    {showName ? (
                      <View className="mb-1 ml-1">
                        {shopSide ? <Badge label={item.sender_label || chat?.shop_name} /> : <Text className="text-xs font-semibold text-gray-500">{clientName}</Text>}
                      </View>
                    ) : null}
                    <View className={`rounded-2xl px-4 py-3 ${mine ? "bg-primary" : "border border-gray-200 bg-white"}`}>
                      <Text selectable className={`text-base leading-6 ${mine ? "text-white" : "text-gray-900"}`}>{item.message_text}</Text>
                      <Text className={`mt-2 text-right text-xs ${mine ? "text-primary-soft" : "text-gray-400"}`}>{chatDate(item.timestamp, true)}</Text>
                    </View>
                  </View>
                </View>
              );
            }}
          />
        )}

        {hasNewMessages ? <Pressable onPress={jumpToLatest} accessibilityRole="button" className="mb-3 min-h-11 flex-row items-center gap-2 self-center rounded-full border border-teal-200 bg-teal-50 px-4 py-2"><Text className="text-sm font-semibold text-teal-800">New messages</Text><Ionicons name="arrow-down-outline" size={16} color={COLORS.primary} /></Pressable> : null}

        {history.error || chatState.error || sendError || !connected ? (
          <View className="w-full self-center px-4 pb-3" style={{ maxWidth: 960 }}>
            <Text accessibilityRole="alert" className="text-center text-xs leading-5 text-gray-600">{sendError || history.error || (unavailable ? "This conversation is not available to you." : chatState.error) || "Your connection is unavailable. Your draft stays here while you reconnect."}</Text>
            {(history.error || chatState.error) ? <Button title="Refresh conversation" variant="ghost" onPress={refreshConversation} loading={history.refreshing || chatState.refreshing} /> : null}
          </View>
        ) : null}

        <View className="border-t border-gray-200 bg-white">
          <View className="w-full self-center py-3" style={{ maxWidth: 960, paddingHorizontal: horizontalPadding }}>
            {readOnly ? (
              // The owner, while an employee has this chat.
              <View className="flex-row flex-wrap items-center gap-3 rounded-xl bg-gray-50 px-3 py-3">
                <Ionicons name="eye-outline" size={18} color={COLORS.textMuted} />
                <Text className="flex-1 text-sm leading-5 text-gray-700" style={{ minWidth: 180 }}>
                  {chat.handler ? `${chat.handler.label} is handling this chat. Take it back to reply.` : "You can't reply in this chat."}
                </Text>
                {chat.handler && as === "OWNER" ? (
                  <View style={{ minWidth: 140 }}><Button title="Take back" loading={handover === "take-back"} disabled={Boolean(handover)} onPress={() => changeHandler("take-back")} /></View>
                ) : null}
              </View>
            ) : (
              <>
                {hiddenNotice ? (
                  <View accessibilityRole="alert" className="mb-2 flex-row items-start gap-2 rounded-xl bg-amber-50 px-3 py-2">
                    <Ionicons name="shield-checkmark-outline" size={15} color="#92400E" />
                    <Text className="flex-1 text-xs leading-5 text-amber-900">{hiddenNotice}</Text>
                    <Pressable onPress={() => setHiddenNotice(null)} accessibilityRole="button" accessibilityLabel="Dismiss" hitSlop={10}>
                      <Ionicons name="close" size={16} color="#92400E" />
                    </Pressable>
                  </View>
                ) : null}
                {showDraftNote ? (
                  <View className="mb-2 flex-row items-start gap-2 rounded-xl bg-teal-50 px-3 py-2">
                    <Ionicons name="sparkles-outline" size={15} color={COLORS.primary} />
                    <Text className="flex-1 text-xs leading-5 text-teal-900">The assistant wrote this summary of your problem. Check and edit it, then press Send.</Text>
                  </View>
                ) : null}
                <View className="flex-row items-end gap-3">
                  <TextInput
                    className="max-h-32 min-h-12 flex-1 rounded-2xl border border-gray-200 bg-gray-50 px-4 py-3 text-base text-gray-900"
                    placeholder="Write a message…" maxLength={LIMITS.chatMessage}
                    placeholderTextColor="#8A9B98"
                    value={draft} onChangeText={setDraft} multiline accessibilityLabel="Message"
                  />
                  <Pressable onPress={send} disabled={!canSend} accessibilityRole="button" accessibilityLabel="Send message" accessibilityState={{ disabled: !canSend, busy: sending }} className={`h-12 w-12 items-center justify-center rounded-xl ${canSend ? "bg-primary" : "bg-gray-200"}`}>
                    {sending ? <ActivityIndicator color={COLORS.primary} /> : <Ionicons name="send" size={20} color={canSend ? "#fff" : COLORS.textMuted} />}
                  </Pressable>
                </View>
                <Text className="mt-2 text-xs leading-5 text-gray-400">Discuss your repair here. For your protection, phone numbers, emails and social media links are hidden in chat.</Text>
              </>
            )}
          </View>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

export default function ChatRoom() {
  const { id, draft, from } = useLocalSearchParams();
  const chatId = Number(id);
  if (!Number.isInteger(chatId) || chatId <= 0) {
    return <View className="flex-1 items-center justify-center bg-gray-50 p-6"><Text className="text-sm text-gray-500">Invalid conversation.</Text></View>;
  }
  const initialDraft = typeof draft === "string" ? draft.slice(0, DRAFT_PARAM_MAX) : "";
  return <Conversation key={chatId} chatId={chatId} initialDraft={initialDraft} fromAssistant={from === "assistant"} />;
}
