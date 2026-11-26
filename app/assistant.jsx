// Troubleshooting UI. Starter prompts edit the draft; only Send calls the AI.
import { useEffect, useRef, useState } from "react";
import { LIMITS } from "../lib/inputLimits";
import { ActivityIndicator, FlatList, KeyboardAvoidingView, Platform, Pressable, ScrollView, Text, TextInput, View } from "react-native";
import { Stack, useLocalSearchParams, useRouter } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";

import Button from "../components/Button";
import Modal from "../components/Modal";
import { AssistantShopList, useShopHandoff } from "../components/AssistantShops";
import api from "../lib/api";
import { useFetch } from "../lib/useFetch";
import { useResponsive } from "../lib/useResponsive";
import { chatDate } from "../lib/chat";
import { confirmAction } from "../lib/confirm";
import { COLORS } from "../constants/theme";

const SUGGESTIONS = [
  { title: "Phone not charging", icon: "battery-charging-outline", text: "My phone will not charge. What should I check first?" },
  { title: "Laptop screen flickers", icon: "laptop-outline", text: "My laptop screen flickers. How can I narrow down the cause?" },
  { title: "Tablet got wet", icon: "water-outline", text: "My tablet got wet. What should I do next?" },
  { title: "Phone won't turn on", icon: "power-outline", text: "My phone won't turn on. What can I try?" },
];

// Readable line length for the conversation and the message box.
const CHAT_WIDTH = 760;
// Longest message; the server checks the same limit (utils/ai/assistant.js).
const MESSAGE_MAX = 2000;
// The counter appears once a message gets this long.
const COUNTER_FROM = 1600;
// A reply can take two OpenAI calls; the server gives up after 45 seconds.
const REPLY_TIMEOUT = 60000;
const UNAVAILABLE = "The assistant isn't available right now. You can still browse shops or message one directly.";

// 👍 / 👎 under an assistant reply, saved with the message (PUT /ai/messages/:id/feedback).
function FeedbackButtons({ message, onChange }) {
  const [saving, setSaving] = useState(false);
  const [failed, setFailed] = useState(false);
  const choose = async (value) => {
    if (saving) return;
    const next = message.feedback === value ? null : value;
    setSaving(true);
    setFailed(false);
    try {
      await api.put(`/ai/messages/${message.id}/feedback`, { feedback: next });
      onChange(next);
    } catch {
      setFailed(true);
    } finally {
      setSaving(false);
    }
  };
  const button = (value, icon, label) => {
    const on = message.feedback === value;
    return (
      <Pressable
        onPress={() => choose(value)}
        disabled={saving}
        accessibilityRole="button"
        accessibilityLabel={label}
        accessibilityState={{ selected: on, disabled: saving }}
        hitSlop={4}
        className="h-9 w-9 items-center justify-center rounded-full active:bg-gray-100"
      >
        <Ionicons name={on ? icon : `${icon}-outline`} size={16} color={on ? COLORS.primary : COLORS.textMuted} />
      </Pressable>
    );
  };
  return (
    <View className="mt-1 flex-row items-center">
      {button("UP", "thumbs-up", "Helpful reply")}
      {button("DOWN", "thumbs-down", "Unhelpful reply")}
      {message.feedback ? <Text className="ml-1 text-xs text-gray-400">Thanks for the feedback</Text> : null}
      {failed ? <Text className="ml-1 text-xs text-red-600">Couldn&apos;t save</Text> : null}
    </View>
  );
}

function AssistantAvatar({ size = 32 }) {
  return (
    <View style={{ width: size, height: size }} className="items-center justify-center rounded-full bg-primary">
      <Ionicons name="sparkles" size={Math.round(size * 0.5)} color="#ffffff" />
    </View>
  );
}

function BoldText({ text }) {
  return String(text).split(/(\*\*[^*]+\*\*)/g).map((part, index) =>
    part.startsWith("**") && part.endsWith("**") ? <Text key={index} className="font-bold">{part.slice(2, -2)}</Text> : part
  );
}

// Render common troubleshooting headings/lists using native text, without HTML.
function ReplyText({ text }) {
  return String(text).split("\n").map((line, index) => {
    if (!line.trim()) return <View key={index} className="h-2" />;
    const heading = /^#{1,6}\s+(.+)/.exec(line);
    const bullet = /^\s*[-*]\s+(.+)/.exec(line);
    const numbered = /^\s*(\d+[.)])\s+(.+)/.exec(line);
    if (bullet || numbered) return <View key={index} className="my-1 flex-row items-start gap-2"><Text className="text-base leading-6 text-primary">{numbered ? numbered[1] : "•"}</Text><Text selectable className="text-base leading-6 text-gray-800" style={{ flexShrink: 1 }}><BoldText text={numbered ? numbered[2] : bullet[1]} /></Text></View>;
    return <Text key={index} selectable className={heading ? "mb-1 mt-3 text-base font-bold leading-6 text-gray-900" : "text-base leading-6 text-gray-800"}><BoldText text={heading ? heading[1] : line} /></Text>;
  });
}

// Matches the server's limit in aiHistoryController.renameConversation.
const TITLE_MAX = 50;
const titleOf = (item) => item.title || `Conversation #${item.id}`;

// Rename/delete appear on hover only where a mouse can hover. Touch screens
// (phones, tablets, touch laptops) have no hover, so there they stay visible.
const CAN_HOVER =
  Platform.OS === "web" &&
  typeof window !== "undefined" &&
  Boolean(window.matchMedia?.("(hover: hover) and (pointer: fine)").matches);

function IconAction({ icon, label, onPress, disabled, danger, onFocus, onBlur }) {
  return (
    <Pressable
      onPress={onPress}
      onFocus={onFocus}
      onBlur={onBlur}
      disabled={disabled}
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ disabled }}
      hitSlop={4}
      className={`h-9 w-9 items-center justify-center rounded-md active:bg-gray-200 ${disabled ? "opacity-40" : ""}`}
    >
      <Ionicons name={icon} size={16} color={danger ? COLORS.danger : COLORS.textMuted} />
    </Pressable>
  );
}

function NewChatButton({ onPress, disabled }) {
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      accessibilityRole="button"
      accessibilityLabel="Start a new chat"
      accessibilityState={{ disabled }}
      className={`min-h-11 flex-row items-center justify-center gap-2 rounded-xl bg-primary px-4 active:bg-teal-800 ${disabled ? "opacity-50" : ""}`}
    >
      <Ionicons name="add" size={20} color="#ffffff" />
      <Text className="text-sm font-semibold text-white">New chat</Text>
    </Pressable>
  );
}

function HeaderIcon({ icon, label, onPress, disabled }) {
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ disabled }}
      className={`h-11 w-11 items-center justify-center rounded-full active:bg-gray-100 ${disabled ? "opacity-50" : ""}`}
    >
      <Ionicons name={icon} size={22} color={COLORS.text} />
    </Pressable>
  );
}

function HistoryPanel({ conversations, loading, error, refreshing, onRefresh, activeId, onSelect, onRename, onDelete, disabled, loadingId, query, setQuery }) {
  const needle = query.trim().toLowerCase();
  const filtered = conversations.filter((item) => titleOf(item).toLowerCase().includes(needle));
  // Rename is edited in place: on phones this panel already sits inside a
  // Modal, and stacking a second Modal is unreliable on iOS.
  const [editingId, setEditingId] = useState(null);
  const [draft, setDraft] = useState("");
  const [savingId, setSavingId] = useState(null);
  const [rowError, setRowError] = useState(null);
  // Row whose actions are revealed by mouse hover or keyboard focus.
  const [revealedId, setRevealedId] = useState(null);
  const locked = disabled || savingId !== null;
  const conceal = (id) => setRevealedId((current) => (current === id ? null : current));

  const startRename = (item) => {
    setRevealedId(null);
    setRowError(null);
    setDraft(item.title || "");
    setEditingId(item.id);
  };
  const cancelRename = () => { setEditingId(null); setRowError(null); };
  const saveRename = async (item) => {
    const title = draft.trim();
    if (!title) { setRowError({ id: item.id, text: "Enter a name." }); return; }
    if (title === item.title) { cancelRename(); return; }
    setSavingId(item.id);
    setRowError(null);
    try {
      await onRename(item.id, title);
      setEditingId(null);
    } catch (e) {
      setRowError({ id: item.id, text: e.message || "Couldn't rename this conversation." });
    } finally {
      setSavingId(null);
    }
  };

  return (
    <View>
      <View className="mb-4 h-10 flex-row items-center rounded-lg border border-gray-200 bg-white px-3">
        <Ionicons name="search-outline" size={16} color={COLORS.textMuted} />
        <TextInput value={query} onChangeText={setQuery} placeholder="Search chats" maxLength={LIMITS.search} placeholderTextColor="#8A9B98" accessibilityLabel="Search conversations" autoCapitalize="none" className="h-10 flex-1 px-2 text-sm text-gray-900" />
      </View>
      <View className="mb-1 flex-row items-center justify-between gap-2 px-1">
        <Text className="text-xs font-semibold uppercase tracking-wide text-gray-400">Recent</Text>
        <Pressable onPress={onRefresh} disabled={refreshing || disabled} accessibilityRole="button" accessibilityLabel="Refresh conversations" className="h-9 w-9 items-center justify-center rounded-full active:bg-gray-200">
          {refreshing ? <ActivityIndicator size="small" color={COLORS.textMuted} /> : <Ionicons name="refresh-outline" size={16} color={COLORS.textMuted} />}
        </Pressable>
      </View>
      {!CAN_HOVER ? <Text className="mb-2 px-1 text-xs text-gray-400">Press and hold a chat to rename or delete it.</Text> : null}
      {loading ? <ActivityIndicator color={COLORS.primary} /> : error ? <View className="rounded-xl bg-red-50 p-3"><Text accessibilityRole="alert" className="text-sm leading-5 text-red-700">{error}</Text><Button title="Try again" variant="ghost" onPress={onRefresh} loading={refreshing} /></View> : filtered.map((item) => {
        const active = String(activeId) === String(item.id);
        const editing = editingId === item.id;
        const saving = savingId === item.id;
        // Mouse: revealed on hover/focus. Touch: revealed by press-and-hold.
        const showActions = revealedId === item.id;
        return (
          // Plain pointerenter/pointerleave, not Pressable's onHoverIn: on web,
          // Pressable uses "contained" hover, so entering the nested title or
          // icon buttons (which fill the row) would end the row's hover.
          <View
            key={item.id}
            onPointerEnter={CAN_HOVER ? () => setRevealedId(item.id) : undefined}
            onPointerLeave={CAN_HOVER ? () => conceal(item.id) : undefined}
            className={`mb-0.5 rounded-lg ${active ? "bg-primary-soft" : showActions ? "bg-gray-100" : ""}`}
          >
            {editing ? (
              <View className="p-2">
                <TextInput
                  value={draft}
                  onChangeText={setDraft}
                  autoFocus
                  maxLength={TITLE_MAX}
                  editable={!saving}
                  onSubmitEditing={() => saveRename(item)}
                  returnKeyType="done"
                  accessibilityLabel="Conversation name"
                  placeholder="Conversation name"
                  placeholderTextColor="#8A9B98"
                  className="h-11 rounded-lg border border-teal-300 bg-white px-3 text-sm text-gray-900"
                />
                <View className="mt-1 flex-row items-center justify-between">
                  <Text className="text-xs text-gray-400">{draft.trim().length}/{TITLE_MAX}</Text>
                  <View className="flex-row">
                    <Pressable onPress={cancelRename} disabled={saving} accessibilityRole="button" className="min-h-11 justify-center px-3"><Text className="text-sm font-semibold text-gray-600">Cancel</Text></Pressable>
                    <Pressable onPress={() => saveRename(item)} disabled={saving} accessibilityRole="button" accessibilityState={{ busy: saving }} className="min-h-11 justify-center px-3">
                      {saving ? <ActivityIndicator size="small" color={COLORS.primary} /> : <Text className="text-sm font-semibold text-primary">Save</Text>}
                    </Pressable>
                  </View>
                </View>
              </View>
            ) : (
              <View className="flex-row items-start">
                <Pressable
                  onPress={() => { setRevealedId(null); onSelect(item.id); }}
                  // Touch has no hover: press and hold toggles rename/delete.
                  onLongPress={CAN_HOVER ? undefined : () => setRevealedId((current) => (current === item.id ? null : item.id))}
                  delayLongPress={400}
                  disabled={locked}
                  accessibilityRole="button"
                  accessibilityLabel={`Open ${titleOf(item)}`}
                  accessibilityHint={CAN_HOVER ? undefined : "Press and hold for rename and delete"}
                  accessibilityState={{ selected: active, disabled: locked }}
                  // Screen readers can't easily press and hold; expose the same actions directly.
                  accessibilityActions={[{ name: "rename", label: "Rename" }, { name: "delete", label: "Delete" }]}
                  onAccessibilityAction={({ nativeEvent }) => {
                    if (locked) return;
                    if (nativeEvent.actionName === "rename") startRename(item);
                    if (nativeEvent.actionName === "delete") onDelete(item);
                  }}
                  className={`min-h-11 flex-1 justify-center px-3 py-2 ${locked ? "opacity-60" : ""}`}
                >
                  <View className="flex-row items-center gap-2"><Text numberOfLines={1} className={`flex-1 text-sm ${active ? "font-semibold text-gray-900" : "text-gray-700"}`}>{titleOf(item)}</Text>{String(loadingId) === String(item.id) ? <ActivityIndicator size="small" color={COLORS.primary} /> : null}</View>
                  <Text className="mt-0.5 text-xs text-gray-400">{chatDate(item.updated_at)}</Text>
                </Pressable>
                {/* Mouse: kept in the layout (just invisible and not clickable) so the
                    title never reflows on hover. Touch: only rendered once revealed,
                    so hidden buttons can't be tapped by accident. */}
                {CAN_HOVER || showActions ? (
                  <View className="flex-row items-center pr-1" style={{ opacity: showActions ? 1 : 0 }} pointerEvents={showActions ? "auto" : "none"}>
                    <IconAction icon="create-outline" label={`Rename ${titleOf(item)}`} disabled={locked} onPress={() => startRename(item)} onFocus={() => setRevealedId(item.id)} onBlur={CAN_HOVER ? () => conceal(item.id) : undefined} />
                    <IconAction icon="trash-outline" label={`Delete ${titleOf(item)}`} disabled={locked} danger onPress={() => { setRevealedId(null); onDelete(item); }} onFocus={() => setRevealedId(item.id)} onBlur={CAN_HOVER ? () => conceal(item.id) : undefined} />
                  </View>
                ) : null}
              </View>
            )}
            {rowError?.id === item.id ? <Text accessibilityRole="alert" className="px-3 pb-2 text-xs text-red-700">{rowError.text}</Text> : null}
          </View>
        );
      })}
      {!loading && !error && !filtered.length ? <Text className="px-1 py-4 text-sm leading-5 text-gray-500">{conversations.length ? "No chats match that search." : "Your chats will appear here after you send a message."}</Text> : null}
    </View>
  );
}

export default function Assistant() {
  const router = useRouter();
  const { isMobile, isDesktop, horizontalPadding } = useResponsive();
  const history = useFetch("/ai/conversations", (data) => Array.isArray(data) ? data : []);
  const listRef = useRef(null);
  const inputRef = useRef(null);
  const mounted = useRef(true);
  const busy = useRef(false);
  const sequence = useRef(0);
  const request = useRef(null);
  const stickToBottom = useRef(true);
  const [messages, setMessages] = useState([]);
  const [conversationId, setConversationId] = useState(null);
  // ?prompt=... (from the home page) starts the message box with that question;
  // the person still reviews it and presses Send.
  const { prompt } = useLocalSearchParams();
  const [draft, setDraft] = useState(() => (typeof prompt === "string" ? prompt.slice(0, MESSAGE_MAX) : ""));
  // Pop-ups: "Talk to a shop" and "today's free messages are used up".
  // { kind: "talk" | "limit", loading, error, shops, handoff, limit }
  const [shopSheet, setShopSheet] = useState(null);
  const handoffApi = useShopHandoff();
  const [sending, setSending] = useState(false);
  const [loadingId, setLoadingId] = useState(null);
  const [error, setError] = useState(null);
  const [historyOpen, setHistoryOpen] = useState(false);
  const [historyQuery, setHistoryQuery] = useState("");
  const [newReply, setNewReply] = useState(false);
  const disabled = sending || loadingId !== null;

  useEffect(() => {
    mounted.current = true;
    return () => { mounted.current = false; request.current?.abort(); };
  }, []);

  const send = async () => {
    const body = draft.trim();
    if (body.length < 2 || body.length > MESSAGE_MAX || busy.current) return;
    busy.current = true;
    stickToBottom.current = true;
    setNewReply(false);
    setDraft("");
    setError(null);
    setSending(true);
    const key = `local-${++sequence.current}`;
    setMessages((current) => [...current, { sender: "user", text: body, _key: key, pending: true }]);
    const controller = new AbortController();
    request.current = controller;
    const dropPending = () => setMessages((current) => current.filter((message) => message._key !== key));
    try {
      const { data } = await api.post("/ai/analyze", { text: body, conversation_id: conversationId }, { signal: controller.signal, timeout: REPLY_TIMEOUT });
      if (!mounted.current) return;
      if (data?.conversation_id) setConversationId(data.conversation_id);
      if (!data?.reply || typeof data.reply !== "string") throw new Error("A response could not be confirmed. Check your conversation history before sending again.");
      const reply = {
        sender: "ai",
        id: data.message_id,
        text: data.reply,
        feedback: null,
        // A recommendation always has an array (possibly empty: "no matching shop").
        shops: data.handoff ? (Array.isArray(data.shops) ? data.shops : []) : undefined,
        handoff: data.handoff ?? undefined,
        _key: `local-${++sequence.current}`,
      };
      setMessages((current) => [...current.map((message) => message._key === key ? { ...message, id: data.user_message_id, pending: false } : message), reply]);
      if (!stickToBottom.current) setNewReply(true);
      history.refresh();
    } catch (e) {
      if (!mounted.current) return;
      const code = e.response?.data?.code;
      // Limits: nothing was sent, so the message goes back into the box.
      if (code === "AI_DAILY_LIMIT") {
        dropPending();
        setDraft((current) => current || body);
        const data = e.response.data;
        setShopSheet({ kind: "limit", limit: data.limit, shops: Array.isArray(data.shops) ? data.shops : [], handoff: data.handoff ?? null });
        return;
      }
      if (code === "AI_RATE_LIMIT") {
        dropPending();
        setDraft((current) => current || body);
        setError(e.message);
        return;
      }
      // The server answered that it failed (nothing saved), or never answered.
      const answered = Boolean(e.response);
      setMessages((current) => current.map((message) => message._key === key ? { ...message, pending: false, failed: true, notSent: answered } : message));
      setDraft((current) => current || body);
      if (e.code === "ECONNABORTED") setError("The response timed out. Your draft has been restored; check your saved history before sending it again.");
      else if (!answered || code === "AI_UNAVAILABLE" || (e.response?.status ?? 0) >= 500) setError(UNAVAILABLE);
      else setError(e.message || UNAVAILABLE);
      history.refresh();
    } finally {
      busy.current = false;
      if (mounted.current) setSending(false);
    }
  };

  // "Talk to a shop": shops for this chat, without calling the AI.
  const openTalkToShop = async () => {
    setShopSheet({ kind: "talk", loading: true });
    try {
      const { data } = await api.post("/ai/shops", conversationId ? { conversation_id: conversationId } : {});
      if (!mounted.current) return;
      setShopSheet((current) => current?.kind === "talk" ? { kind: "talk", shops: Array.isArray(data?.shops) ? data.shops : [], handoff: data?.handoff ?? null } : current);
    } catch (e) {
      if (!mounted.current) return;
      setShopSheet((current) => current?.kind === "talk" ? { kind: "talk", error: e.message || "Couldn't load shops right now.", shops: [] } : current);
    }
  };
  const closeShopSheet = () => setShopSheet(null);
  const setFeedback = (id, feedback) => setMessages((current) => current.map((message) => message.id === id && message.sender === "ai" ? { ...message, feedback } : message));

  const loadConversation = async (id) => {
    if (busy.current) return;
    busy.current = true;
    setLoadingId(id);
    setError(null);
    const controller = new AbortController();
    request.current = controller;
    try {
      const { data } = await api.get(`/ai/conversations/${id}/messages`, { signal: controller.signal });
      if (!mounted.current) return;
      const rows = Array.isArray(data) ? data : [];
      setMessages(rows.filter((message) => String(message.text || "").trim() !== "[SYSTEM] Recommended shops").map((message, index) => ({ ...message, _key: `saved-${id}-${message.id ?? index}` })));
      setConversationId(id);
      setDraft("");
      setHistoryOpen(false);
      setNewReply(false);
      stickToBottom.current = true;
    } catch (e) {
      if (mounted.current) setError(e.message || "Could not load that conversation. Your current conversation is still here.");
    } finally {
      busy.current = false;
      if (mounted.current) setLoadingId(null);
    }
  };

  const startNew = () => {
    if (busy.current) return;
    setMessages([]); setConversationId(null); setDraft(""); setError(null); setNewReply(false);
    stickToBottom.current = true;
    inputRef.current?.focus();
  };
  const startNewFromSidebar = () => {
    if (busy.current) return;
    setHistoryOpen(false);
    startNew();
  };
  const openHistory = () => { if (!busy.current) { setHistoryOpen(true); history.refresh(); } };
  const fillPrompt = (text) => { if (!busy.current) { setDraft(text); inputRef.current?.focus(); } };
  const tooLong = draft.trim().length > MESSAGE_MAX;
  const canSend = draft.trim().length >= 2 && !tooLong && !disabled;

  // PUT /api/ai/conversations/:id/rename { newTitle } — owner-only on the server.
  // Throws so the history row can show the error next to the name.
  const renameConversation = async (id, title) => {
    await api.put(`/ai/conversations/${id}/rename`, { newTitle: title });
    await history.refresh();
  };

  // DELETE /api/ai/conversations/:id — removes the conversation and its messages.
  const deleteConversation = (item) => {
    if (busy.current) return;
    confirmAction(
      "Delete conversation",
      `Delete "${item.title || `Conversation #${item.id}`}"? Its messages will be removed for good.`,
      async () => {
        setError(null);
        try {
          await api.delete(`/ai/conversations/${item.id}`);
          // Deleting the open conversation clears the chat back to a new one.
          if (String(item.id) === String(conversationId)) {
            setMessages([]); setConversationId(null); setNewReply(false);
            stickToBottom.current = true;
          }
          await history.refresh();
        } catch (e) {
          setError(e.message || "Couldn't delete that conversation.");
        }
      },
      { confirmLabel: "Delete", destructive: true }
    );
  };

  const historyPanel = (
    <HistoryPanel conversations={history.data ?? []} loading={history.loading} error={history.error} refreshing={history.refreshing} onRefresh={history.refresh} activeId={conversationId} onSelect={loadConversation} onRename={renameConversation} onDelete={deleteConversation} disabled={disabled} loadingId={loadingId} query={historyQuery} setQuery={setHistoryQuery} />
  );
  const conversationTitle = (history.data ?? []).find((item) => String(item.id) === String(conversationId))?.title;
  const empty = messages.length === 0;

  return (
    <SafeAreaView className="flex-1 bg-white" edges={["bottom", "left", "right"]}>
      <Stack.Screen options={{ title: "AI assistant", headerShown: false }} />
      {/* Phones and tablets have no sidebar, so a slim bar carries the title and
          the history / new-chat icons. On desktop all of this lives in the sidebar. */}
      {!isDesktop ? (
        <View className="border-b border-gray-200 bg-white">
          <View className="w-full flex-row items-center justify-between gap-3 self-center py-2.5" style={{ maxWidth: 1280, paddingHorizontal: horizontalPadding }}>
            <View className="flex-1 flex-row items-center gap-2.5">
              <AssistantAvatar size={34} />
              <View className="flex-shrink">
                <Text accessibilityRole="header" numberOfLines={1} className="text-base font-bold text-gray-900">PixelPatch AI</Text>
                <Text numberOfLines={1} className="text-xs text-gray-500">{conversationId ? conversationTitle || "Saved conversation" : "Repair assistant"}</Text>
              </View>
            </View>
            <View className="flex-row gap-1">
              <HeaderIcon icon="list-outline" label="Open past conversations" disabled={disabled} onPress={openHistory} />
              <HeaderIcon icon="create-outline" label="Start a new chat" disabled={disabled} onPress={startNew} />
            </View>
          </View>
        </View>
      ) : null}

      {/* Desktop: full width so the sidebar sits against the left edge; the
          message list and composer keep their own 960px cap. */}
      <View className="w-full flex-1 self-center" style={{ maxWidth: isDesktop ? undefined : 1280, flexDirection: "row" }}>
        {isDesktop ? (
          <View style={{ width: 280 }} className="border-r border-gray-200 bg-gray-50">
            <View className="p-4">
              <View className="mb-4 flex-row items-center gap-3 px-1">
                <AssistantAvatar size={36} />
                <View style={{ flexShrink: 1 }}>
                  <Text accessibilityRole="header" className="text-base font-bold text-gray-900">PixelPatch AI</Text>
                  <Text className="text-xs text-gray-500">Your repair assistant</Text>
                </View>
              </View>
              <NewChatButton onPress={startNew} disabled={disabled} />
            </View>
            <ScrollView contentContainerStyle={{ paddingHorizontal: 12, paddingBottom: 20 }} keyboardShouldPersistTaps="handled">
              {historyPanel}
            </ScrollView>
          </View>
        ) : null}

        <KeyboardAvoidingView className="flex-1" style={{ minWidth: 0 }} behavior={Platform.OS === "ios" ? "padding" : undefined} keyboardVerticalOffset={90}>
          {conversationId && isDesktop ? (
            <View className="border-b border-gray-100 px-6 py-3">
              <Text numberOfLines={1} className="text-center text-sm font-semibold text-gray-700">{conversationTitle || "Saved conversation"}</Text>
            </View>
          ) : null}
          {loadingId !== null ? <View className="flex-1 items-center justify-center"><ActivityIndicator color={COLORS.primary} /><Text className="mt-3 text-sm text-gray-500">Loading conversation…</Text></View> : (
            <FlatList
              ref={listRef} className="flex-1" data={messages} keyExtractor={(message) => message._key}
              keyboardShouldPersistTaps="handled" keyboardDismissMode="on-drag"
              contentContainerStyle={{ paddingVertical: 28, paddingHorizontal: horizontalPadding, flexGrow: 1, maxWidth: CHAT_WIDTH + horizontalPadding * 2, width: "100%", alignSelf: "center" }}
              onScroll={({ nativeEvent }) => {
                stickToBottom.current = nativeEvent.contentSize.height - nativeEvent.layoutMeasurement.height - nativeEvent.contentOffset.y < 80;
                if (stickToBottom.current) setNewReply(false);
              }}
              scrollEventThrottle={100}
              onContentSizeChange={() => { if (stickToBottom.current) listRef.current?.scrollToEnd({ animated: false }); }}
              ListEmptyComponent={
                <View className="flex-1 justify-center py-3">
                  <View className="mb-5 self-center"><AssistantAvatar size={56} /></View>
                  <Text className={`text-center font-bold text-gray-900 ${isMobile ? "text-2xl" : "text-3xl"}`}>Hi! What&apos;s wrong with your device?</Text>
                  <Text className="mx-auto mb-8 mt-3 max-w-md text-center text-base leading-6 text-gray-500">Describe the problem and I&apos;ll help you fix it yourself, or point you to a shop that can.</Text>
                  <View className="flex-row flex-wrap justify-between gap-y-3">
                    {SUGGESTIONS.map((suggestion) => (
                      <Pressable key={suggestion.title} onPress={() => fillPrompt(suggestion.text)} accessibilityRole="button" accessibilityLabel={`Use prompt: ${suggestion.title}`} disabled={disabled} style={{ width: isMobile ? "100%" : "48.5%" }} className="flex-row items-center gap-3 rounded-2xl border border-gray-200 bg-white p-4 active:bg-gray-50">
                        <View className="h-10 w-10 items-center justify-center rounded-xl bg-teal-50"><Ionicons name={suggestion.icon} size={20} color={COLORS.primary} /></View>
                        <View className="flex-1">
                          <Text className="text-sm font-semibold text-gray-900">{suggestion.title}</Text>
                          <Text numberOfLines={1} className="mt-0.5 text-xs text-gray-500">{suggestion.text}</Text>
                        </View>
                      </Pressable>
                    ))}
                  </View>
                  <Text className="mt-5 text-center text-xs text-gray-400">Tapping a suggestion fills the message box. Review it, then press send.</Text>
                </View>
              }
              renderItem={({ item }) => {
                const mine = item.sender === "user";
                const status = item.pending ? "Sending…" : item.failed ? (item.notSent ? "Not sent" : "Response not confirmed") : null;
                if (mine) {
                  return (
                    <View className="mb-6 self-end" style={{ maxWidth: isMobile ? "88%" : "75%" }}>
                      <View className="rounded-3xl rounded-br-lg bg-primary px-4 py-3">
                        <Text selectable className="text-base leading-6 text-white">{item.text}</Text>
                      </View>
                      {status ? <Text className={`mt-1.5 text-right text-xs ${item.failed ? "text-red-600" : "text-gray-400"}`}>{status}</Text> : null}
                    </View>
                  );
                }
                // Assistant replies read like a document: avatar, name, plain text,
                // then any recommended shops and the thumbs up/down.
                return (
                  <View className="mb-7 flex-row items-start gap-3">
                    <AssistantAvatar size={30} />
                    <View className="flex-1" style={{ minWidth: 0 }}>
                      <Text className="mb-1 text-sm font-semibold text-gray-900">PixelPatch AI</Text>
                      <ReplyText text={item.text} />
                      {Array.isArray(item.shops) ? (
                        <View className="mt-4">
                          <AssistantShopList shops={item.shops} handoff={item.handoff} handoffApi={handoffApi} />
                        </View>
                      ) : null}
                      {item.id ? <FeedbackButtons message={item} onChange={(value) => setFeedback(item.id, value)} /> : null}
                    </View>
                  </View>
                );
              }}
              ListFooterComponent={
                <View>
                  {sending ? (
                    <View accessibilityRole="progressbar" accessibilityLabel="Assistant is preparing a reply" className="mb-6 flex-row items-center gap-3">
                      <AssistantAvatar size={30} />
                      <View className="flex-row items-center gap-2 rounded-full bg-gray-100 px-4 py-2.5">
                        <ActivityIndicator size="small" color={COLORS.textMuted} />
                        <Text className="text-sm text-gray-500">Thinking…</Text>
                      </View>
                    </View>
                  ) : null}
                </View>
              }
            />
          )}

          {newReply ? <Pressable onPress={() => { stickToBottom.current = true; setNewReply(false); listRef.current?.scrollToEnd({ animated: true }); }} accessibilityRole="button" className="mb-3 min-h-10 flex-row items-center justify-center gap-1.5 self-center rounded-full bg-primary px-4 py-2"><Ionicons name="arrow-down" size={14} color="#ffffff" /><Text className="text-sm font-semibold text-white">New reply</Text></Pressable> : null}
          {error ? <View className="w-full self-center pb-3" style={{ maxWidth: CHAT_WIDTH + horizontalPadding * 2, paddingHorizontal: horizontalPadding }}><Text accessibilityRole="alert" className="rounded-xl bg-red-50 p-3 text-sm leading-5 text-red-700">{error}</Text></View> : null}
          <View className="bg-white">
            <View className="w-full self-center pb-3 pt-2" style={{ maxWidth: CHAT_WIDTH + horizontalPadding * 2, paddingHorizontal: horizontalPadding }}>
              {/* The assistant is a first check; a real shop is always one tap away. */}
              <View className="mb-2 flex-row flex-wrap items-center justify-between gap-x-3 gap-y-1">
                <View className="flex-row items-center gap-1.5" style={{ flexShrink: 1 }}>
                  <Ionicons name="information-circle-outline" size={14} color={COLORS.textMuted} />
                  <Text className="text-xs leading-4 text-gray-500" style={{ flexShrink: 1 }}>{isMobile ? "Suggestions only, not a guarantee." : "Suggestions only, not a guarantee. A technician has the final say."}</Text>
                </View>
                <Pressable
                  onPress={openTalkToShop}
                  disabled={sending}
                  accessibilityRole="button"
                  accessibilityLabel="Talk to a shop instead"
                  className="min-h-9 flex-row items-center gap-1.5 rounded-full border border-teal-200 bg-teal-50 px-3 active:bg-teal-100"
                >
                  <Ionicons name="storefront-outline" size={15} color={COLORS.primary} />
                  <Text className="text-xs font-semibold text-teal-800">Talk to a shop instead</Text>
                </Pressable>
              </View>
              <View className={`flex-row items-end gap-2 rounded-3xl border bg-white py-1.5 pl-4 pr-1.5 ${tooLong ? "border-red-400" : "border-gray-300"}`} style={{ shadowColor: "#000", shadowOpacity: 0.06, shadowRadius: 12, shadowOffset: { width: 0, height: 4 } }}>
                <TextInput ref={inputRef} value={draft} onChangeText={setDraft} multiline maxLength={MESSAGE_MAX} editable={!disabled} accessibilityLabel="Message the assistant" placeholder={empty ? "Describe your device problem…" : "Ask a follow-up…"} placeholderTextColor="#8A9B98" className="max-h-32 min-h-11 flex-1 py-2.5 text-base text-gray-900" />
                <Pressable onPress={send} disabled={!canSend} accessibilityRole="button" accessibilityLabel="Send question" accessibilityState={{ disabled: !canSend, busy: sending }} className={`h-10 w-10 items-center justify-center rounded-full ${canSend ? "bg-primary" : "bg-gray-200"}`}>
                  {sending ? <ActivityIndicator size="small" color={COLORS.textMuted} /> : <Ionicons name="arrow-up" size={20} color={canSend ? "#fff" : COLORS.textMuted} />}
                </Pressable>
              </View>
              <View className="mt-2 flex-row flex-wrap items-start justify-center gap-x-3">
                <Text className="text-center text-xs leading-4 text-gray-400" style={{ flexShrink: 1 }}>{isMobile ? "Chats are saved. You can delete them any time." : "Chats are saved to your account. Delete one any time from your chat history."}</Text>
                {draft.length >= COUNTER_FROM ? <Text accessibilityLiveRegion="polite" className={`text-xs ${tooLong ? "text-red-600" : "text-gray-500"}`}>{draft.trim().length}/{MESSAGE_MAX}</Text> : null}
              </View>
            </View>
          </View>
        </KeyboardAvoidingView>
      </View>

      <Modal visible={historyOpen && !isDesktop} onClose={() => { if (!disabled) setHistoryOpen(false); }} title="Past conversations">
        <View className="mb-4">
          <NewChatButton onPress={startNewFromSidebar} disabled={disabled} />
        </View>
        {historyPanel}
      </Modal>

      {/* "Talk to a shop" and "free messages used up": shops for this chat
          (found by the server, no AI), with Message shop / Request repair. */}
      <Modal
        visible={Boolean(shopSheet)}
        onClose={closeShopSheet}
        title={shopSheet?.kind === "limit" ? "Today's free messages are used up" : "Talk to a shop"}
        footer={shopSheet?.kind === "limit" ? (
          <View className="flex-row flex-wrap gap-2">
            <View className="flex-1" style={{ minWidth: 140 }}><Button title="Go to Home" onPress={() => { closeShopSheet(); router.replace("/"); }} /></View>
            <View className="flex-1" style={{ minWidth: 140 }}><Button title="Browse services" variant="outline" onPress={() => { closeShopSheet(); router.push("/services"); }} /></View>
          </View>
        ) : null}
      >
        {shopSheet?.kind === "limit" ? (
          <View className="mb-4 flex-row items-start gap-3 rounded-xl bg-amber-50 p-3">
            <Ionicons name="time-outline" size={20} color="#b45309" />
            <Text className="flex-1 text-sm leading-5 text-amber-900">
              You&apos;ve used all {shopSheet.limit || 100} free assistant messages for today. You can chat with the assistant again tomorrow. Your message is still in the box.{"\n\n"}Meanwhile, a real technician can help:{shopSheet.shops?.length ? " these shops match your chat." : ""}
            </Text>
          </View>
        ) : (
          <Text className="mb-4 text-sm leading-5 text-gray-600">
            Message a verified shop or send a repair request. A real technician will reply.{shopSheet?.handoff?.summary ? " We'll fill in what you told the assistant, and you can edit it before sending." : ""}
          </Text>
        )}
        {shopSheet?.loading ? (
          <View className="items-center py-6"><ActivityIndicator color={COLORS.primary} /></View>
        ) : shopSheet?.error ? (
          <Text accessibilityRole="alert" className="rounded-xl bg-red-50 p-3 text-sm text-red-700">{shopSheet.error}</Text>
        ) : shopSheet ? (
          <AssistantShopList shops={shopSheet.shops} handoff={shopSheet.handoff} handoffApi={handoffApi} onLeave={closeShopSheet} title={null} />
        ) : null}
      </Modal>
    </SafeAreaView>
  );
}
