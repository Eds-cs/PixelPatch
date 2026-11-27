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
import { SEND_KEY_PROPS, sendOnEnterKey, sendOnSubmit } from "../../lib/enterToSend";
import { COLORS } from "../../constants/theme";

import { SHOW_BACK_BUTTONS } from "../../lib/navigation";
// Longest draft taken from the link (the assistant's summary is up to 400).
const DRAFT_PARAM_MAX = 1000;

// Web textareas default to two rows; the chat box starts at one.
const WEB_ONE_ROW = Platform.OS === "web" ? { rows: 1 } : {};

const INBOX = { CLIENT: "/chat", OWNER: "/business/messages", STAFF: "/staff/messages" };

// Small round icon button in the chat's top bar; shows its label on wider screens.
function HeaderAction({ icon, label, onPress, compact }) {
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={label}
      className={`h-10 flex-row items-center gap-1.5 rounded-full border border-gray-200 bg-white active:bg-gray-50 ${compact ? "w-10 justify-center" : "px-3"}`}
    >
      <Ionicons name={icon} size={18} color={COLORS.primary} />
      {compact ? null : <Text className="text-sm font-semibold text-gray-700">{label}</Text>}
    </Pressable>
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
  // Enter / the keyboard's Send key: same checks as the send button.
  const sendIfReady = () => { if (canSend) send(); };
  const unavailable = !chatState.loading && Boolean(chatState.error);
  const readOnly = Boolean(chat) && !chat.can_send;
  const repairHref = chat?.repair
    ? as === "OWNER" ? `/business/repairs/${chat.repair.id}` : as === "STAFF" ? `/staff/repairs/${chat.repair.id}` : `/repair/${chat.repair.id}`
    : null;

  // One line under the name: which chat, and who's answering it.
  const answeredBy = !chat
    ? null
    : as === "CLIENT"
      ? chat.handler?.label || chat.owner_label
      : as === "STAFF"
        ? `You're answering as ${chat.handler?.label || "staff"}`
        : chat.handler
          ? `Handed to ${chat.handler.label}`
          : `You're answering as ${chat.owner_label}`;
  const subtitle = [thread, answeredBy].filter(Boolean).join(" · ");
  const bubbleMax = isMobile ? "86%" : isDesktop ? "64%" : "76%";

  return (
    <SafeAreaView className="flex-1 bg-gray-50" edges={["bottom", "left", "right"]}>
      <Stack.Screen options={{ title, headerShown: false }} />

      {/* Top bar */}
      <View className="border-b border-gray-200 bg-white">
        <View className="w-full flex-row items-center gap-3 self-center py-2.5" style={{ maxWidth: 960, paddingHorizontal: horizontalPadding }}>
          {SHOW_BACK_BUTTONS ? (
            <Pressable onPress={() => router.push(INBOX[as] || "/chat")} accessibilityRole="button" accessibilityLabel="Back to messages" className="-ml-2 h-10 w-10 items-center justify-center rounded-full active:bg-gray-100">
              <Ionicons name="chevron-back" size={24} color={COLORS.text} />
            </Pressable>
          ) : null}
          <View>
            <View className="h-10 w-10 items-center justify-center rounded-full bg-teal-100">
              <Text className="text-base font-bold text-teal-800">{title.charAt(0).toUpperCase()}</Text>
            </View>
            {/* Live connection: a small green dot on the avatar. */}
            {connected ? <View className="absolute bottom-0 right-0 h-3 w-3 rounded-full border-2 border-white bg-emerald-500" /> : null}
          </View>
          <View className="flex-1" style={{ minWidth: 0 }}>
            <Text accessibilityRole="header" numberOfLines={1} className="text-base font-bold text-gray-900">{title}</Text>
            {subtitle ? <Text numberOfLines={1} className="text-xs text-gray-500">{subtitle}</Text> : null}
          </View>
          <View className="flex-row items-center gap-2">
            {as === "CLIENT" && chat?.shop_id ? <HeaderAction compact={isMobile} icon="storefront-outline" label="View shop" onPress={() => router.push(`/shop/${chat.shop_id}`)} /> : null}
            {repairHref ? (
              <HeaderAction compact={isMobile} icon="construct-outline" label={`Repair #${chat.repair.id}`} onPress={() => router.push(repairHref)} />
            ) : chat && as !== "STAFF" ? (
              <HeaderAction compact={isMobile} icon="construct-outline" label={as === "OWNER" ? "Repairs" : "My repairs"} onPress={() => router.push(as === "OWNER" ? "/business/repairs" : "/repairs")} />
            ) : null}
          </View>
        </View>

        {/* Owner: hand the repair's chat to the assigned employee, or take it back. */}
        {as === "OWNER" && (chat?.handler || chat?.transfer) ? (
          <View className="border-t border-gray-100 bg-teal-50">
            <View className="w-full flex-row flex-wrap items-center gap-x-3 gap-y-2 self-center py-2" style={{ maxWidth: 960, paddingHorizontal: horizontalPadding }}>
              <Ionicons name="people-outline" size={16} color={COLORS.primary} />
              <Text className="flex-1 text-xs leading-5 text-teal-900" style={{ minWidth: 160 }}>
                {chat.handler
                  ? `${chat.handler.label} is answering this chat. You can read it.`
                  : `${chat.transfer.label} is assigned to this repair. Hand them the chat so they can answer the customer.`}
              </Text>
              <Pressable
                onPress={() => changeHandler(chat.handler ? "take-back" : "transfer")}
                disabled={Boolean(handover)}
                accessibilityRole="button"
                accessibilityState={{ busy: Boolean(handover), disabled: Boolean(handover) }}
                className="h-9 flex-row items-center justify-center rounded-full bg-primary px-4 active:bg-teal-800"
              >
                {handover ? <ActivityIndicator size="small" color="#fff" /> : <Text className="text-sm font-semibold text-white">{chat.handler ? "Take back" : `Hand to ${chat.transfer.label.split(" · ")[0]}`}</Text>}
              </Pressable>
            </View>
          </View>
        ) : null}
        {handoverError ? <Text accessibilityRole="alert" className="w-full self-center pb-2 text-xs text-red-700" style={{ maxWidth: 960, paddingHorizontal: horizontalPadding }}>{handoverError}</Text> : null}
        {!connected ? (
          <View className="flex-row items-center justify-center gap-2 bg-amber-50 py-1.5">
            <Ionicons name="cloud-offline-outline" size={14} color="#92400E" />
            <Text className="text-xs text-amber-900">Reconnecting… your draft stays here.</Text>
          </View>
        ) : null}
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
            contentContainerStyle={{ paddingTop: 16, paddingBottom: 12, paddingHorizontal: horizontalPadding, maxWidth: 960, width: "100%", alignSelf: "center", flexGrow: 1 }}
            onScroll={({ nativeEvent }) => {
              const remaining = nativeEvent.contentSize.height - nativeEvent.layoutMeasurement.height - nativeEvent.contentOffset.y;
              stickToBottom.current = remaining < 80;
              if (stickToBottom.current) setHasNewMessages(false);
            }}
            scrollEventThrottle={100}
            onContentSizeChange={() => { if (stickToBottom.current) listRef.current?.scrollToEnd({ animated: false }); }}
            ListHeaderComponent={
              // Said once, at the top of every conversation.
              <View className="mb-4 flex-row items-center gap-2 self-center rounded-full bg-white px-3 py-1.5" style={{ maxWidth: "100%" }}>
                <Ionicons name="shield-checkmark-outline" size={14} color={COLORS.primary} />
                <Text className="text-xs text-gray-500" style={{ flexShrink: 1 }}>Phone numbers, emails and links are hidden to keep you protected.</Text>
              </View>
            }
            ListEmptyComponent={
              <View className="flex-1 items-center justify-center px-5 py-10">
                <View className="h-16 w-16 items-center justify-center rounded-full bg-teal-50"><Ionicons name="chatbubbles-outline" size={30} color={COLORS.primary} /></View>
                <Text className="mt-4 text-lg font-bold text-gray-900">{unavailable ? "Conversation unavailable" : history.error ? "Messages could not load" : "Start the conversation"}</Text>
                <Text className="mt-2 text-center text-sm leading-6 text-gray-500">{unavailable ? "Return to your inbox and select one of your conversations." : history.error ? "Use refresh below to try loading the history again." : chat?.repair ? "Ask about this repair, its progress or its quotation." : "Say hello, ask about your device, or discuss a repair."}</Text>
              </View>
            }
            renderItem={({ item, index }) => {
              const previous = messages[index - 1];
              const next = messages[index + 1];
              const newDay = !previous || chatDay(previous.timestamp) !== chatDay(item.timestamp);
              const dayLine = newDay ? (
                <View className="mb-4 mt-2 items-center">
                  <Text className="rounded-full bg-gray-200/70 px-3 py-1 text-xs font-medium text-gray-600">{chatDate(item.timestamp)}</Text>
                </View>
              ) : null;
              // "TechFix Pro handed this chat to Juan (Technician)."
              if (item.sender_kind === "SYSTEM") {
                return (
                  <View>
                    {dayLine}
                    <View className="my-3 flex-row items-center justify-center gap-1.5 px-6">
                      <Ionicons name="swap-horizontal" size={13} color={COLORS.textMuted} />
                      <Text className="text-center text-xs leading-5 text-gray-500" style={{ flexShrink: 1 }}>{item.message_text}</Text>
                    </View>
                  </View>
                );
              }
              const mine = String(item.sender_id) === String(user?.id);
              const sameAs = (other) => other && other.sender_kind !== "SYSTEM" && String(other.sender_id) === String(item.sender_id) && chatDay(other.timestamp) === chatDay(item.timestamp);
              const firstOfGroup = newDay || !sameAs(previous);
              const lastOfGroup = !sameAs(next);
              const shopSide = item.sender_kind === "OWNER" || item.sender_kind === "STAFF";
              const name = shopSide ? item.sender_label || chat?.shop_name : [item.first_name, item.last_name].filter(Boolean).join(" ") || "Client";
              // The corner nearest the sender is squarer on the last bubble of a group.
              const corner = mine ? (lastOfGroup ? "rounded-br-md" : "") : (lastOfGroup ? "rounded-bl-md" : "");
              return (
                <View>
                  {dayLine}
                  <View className={`${lastOfGroup ? "mb-3" : "mb-1"} ${mine ? "self-end items-end" : "self-start items-start"}`} style={{ maxWidth: bubbleMax }}>
                    {!mine && firstOfGroup ? (
                      <View className="mb-1 ml-1 flex-row items-center gap-1.5">
                        <Text className="text-xs font-semibold text-gray-600">{name}</Text>
                        {shopSide ? <Ionicons name="checkmark-circle" size={12} color={COLORS.primary} /> : null}
                      </View>
                    ) : null}
                    <View className={`rounded-2xl px-3.5 py-2.5 ${corner} ${mine ? "bg-primary" : "bg-white"}`} style={mine ? undefined : { shadowColor: "#000", shadowOpacity: 0.05, shadowRadius: 3, shadowOffset: { width: 0, height: 1 }, elevation: 1 }}>
                      <Text selectable className={`text-[15px] leading-6 ${mine ? "text-white" : "text-gray-900"}`}>{item.message_text}</Text>
                    </View>
                    {lastOfGroup ? <Text className={`mt-1 text-[11px] text-gray-400 ${mine ? "mr-1" : "ml-1"}`}>{chatDate(item.timestamp, true)}</Text> : null}
                  </View>
                </View>
              );
            }}
          />
        )}

        {hasNewMessages ? <Pressable onPress={jumpToLatest} accessibilityRole="button" className="mb-2 min-h-10 flex-row items-center gap-2 self-center rounded-full bg-primary px-4 py-2"><Text className="text-sm font-semibold text-white">New messages</Text><Ionicons name="arrow-down" size={16} color="#fff" /></Pressable> : null}

        {history.error || chatState.error || sendError ? (
          <View className="w-full self-center px-4 pb-2" style={{ maxWidth: 960 }}>
            <Text accessibilityRole="alert" className="text-center text-xs leading-5 text-red-700">{sendError || history.error || (unavailable ? "This conversation is not available to you." : chatState.error)}</Text>
            {(history.error || chatState.error) ? <Button title="Refresh conversation" variant="ghost" onPress={refreshConversation} loading={history.refreshing || chatState.refreshing} /> : null}
          </View>
        ) : null}

        {/* Composer */}
        <View className="border-t border-gray-200 bg-white">
          <View className="w-full self-center py-2.5" style={{ maxWidth: 960, paddingHorizontal: horizontalPadding }}>
            {readOnly ? (
              // The owner, while an employee has this chat.
              <View className="flex-row items-center gap-2 py-1.5">
                <Ionicons name="eye-outline" size={18} color={COLORS.textMuted} />
                <Text className="flex-1 text-sm leading-5 text-gray-600">
                  {chat.handler ? `${chat.handler.label} is answering. Take the chat back to reply.` : "You can't reply in this chat."}
                </Text>
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
                    <Text className="flex-1 text-xs leading-5 text-teal-900">The assistant wrote this summary of your problem. Check and edit it, then send.</Text>
                  </View>
                ) : null}
                <View className="flex-row items-end gap-2 rounded-3xl border border-gray-200 bg-gray-50 py-1 pl-4 pr-1">
                  <TextInput
                    className="max-h-32 min-h-10 flex-1 py-2 text-base text-gray-900"
                    placeholder="Write a message…" maxLength={LIMITS.chatMessage}
                    placeholderTextColor="#8A9B98"
                    value={draft} onChangeText={setDraft} multiline accessibilityLabel="Message"
                    // Web: start one line tall (a textarea defaults to two).
                    {...WEB_ONE_ROW}
                    {...SEND_KEY_PROPS} onKeyPress={(event) => sendOnEnterKey(event, sendIfReady)} onSubmitEditing={() => sendOnSubmit(sendIfReady)}
                  />
                  <Pressable onPress={send} disabled={!canSend} accessibilityRole="button" accessibilityLabel="Send message" accessibilityState={{ disabled: !canSend, busy: sending }} className={`mb-0.5 h-10 w-10 items-center justify-center rounded-full ${canSend ? "bg-primary" : "bg-gray-200"}`}>
                    {sending ? <ActivityIndicator size="small" color={canSend ? "#fff" : COLORS.primary} /> : <Ionicons name="arrow-up" size={20} color={canSend ? "#fff" : COLORS.textMuted} />}
                  </Pressable>
                </View>
                {isDesktop ? <Text className="mt-1.5 text-right text-[11px] text-gray-400">Enter to send · Shift + Enter for a new line</Text> : null}
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
