// Troubleshooting UI. Starter prompts edit the draft; only Send calls the AI.
import { useEffect, useRef, useState } from "react";
import { ActivityIndicator, FlatList, KeyboardAvoidingView, Platform, Pressable, ScrollView, Text, TextInput, View } from "react-native";
import { Stack, useRouter } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";

import Button from "../components/Button";
import Modal from "../components/Modal";
import TextField from "../components/TextField";
import { ServiceRating } from "../components/ServiceSummary";
import api from "../lib/api";
import { useFetch } from "../lib/useFetch";
import { useResponsive } from "../lib/useResponsive";
import { chatDate } from "../lib/chat";
import { COLORS } from "../constants/theme";

const SUGGESTIONS = [
  { title: "Phone not charging", icon: "battery-charging-outline", text: "My phone will not charge. What should I check first?" },
  { title: "Laptop display issue", icon: "laptop-outline", text: "My laptop screen flickers. How can I narrow down the cause?" },
  { title: "Tablet got wet", icon: "tablet-portrait-outline", text: "My tablet got wet. What should I do next?" },
  { title: "Controller stick drift", icon: "game-controller-outline", text: "My controller stick moves on its own. What could be causing this?" },
];

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
    if (bullet || numbered) return <View key={index} className="my-1 flex-row items-start gap-2"><Text className="text-base leading-6 text-blue-600">{numbered ? numbered[1] : "•"}</Text><Text selectable className="flex-1 text-base leading-6 text-gray-800"><BoldText text={numbered ? numbered[2] : bullet[1]} /></Text></View>;
    return <Text key={index} selectable className={heading ? "mb-1 mt-3 text-base font-bold leading-6 text-gray-900" : "text-base leading-6 text-gray-800"}><BoldText text={heading ? heading[1] : line} /></Text>;
  });
}

function HistoryPanel({ conversations, loading, error, refreshing, onRefresh, activeId, onSelect, disabled, loadingId, query, setQuery }) {
  const needle = query.trim().toLowerCase();
  const filtered = conversations.filter((item) => String(item.title || `Conversation #${item.id}`).toLowerCase().includes(needle));
  return (
    <View>
      <TextField label="Search conversations" placeholder="Conversation title" value={query} onChangeText={setQuery} autoCapitalize="none" />
      <View className="mb-3 flex-row items-center justify-between gap-2">
        <Text className="text-xs text-gray-400">Recent saved conversations</Text>
        <Pressable onPress={onRefresh} disabled={refreshing || disabled} accessibilityRole="button" className="min-h-11 justify-center"><Text className="text-xs font-semibold text-blue-600">{refreshing ? "Refreshing…" : "Refresh"}</Text></Pressable>
      </View>
      {loading ? <ActivityIndicator color={COLORS.primary} /> : error ? <View className="rounded-xl bg-red-50 p-3"><Text accessibilityRole="alert" className="text-sm leading-5 text-red-700">{error}</Text><Button title="Try again" variant="ghost" onPress={onRefresh} loading={refreshing} /></View> : filtered.map((item) => (
        <Pressable key={item.id} onPress={() => onSelect(item.id)} disabled={disabled} accessibilityRole="button" accessibilityLabel={`Open ${item.title || "saved conversation"}`} accessibilityState={{ selected: String(activeId) === String(item.id), disabled }} className={`mb-2 min-h-12 rounded-xl border p-3 ${String(activeId) === String(item.id) ? "border-blue-200 bg-blue-50" : "border-gray-200 bg-white"} ${disabled ? "opacity-60" : ""}`}>
          <View className="flex-row items-start gap-2"><Ionicons name="chatbubble-outline" size={16} color={COLORS.primary} /><Text numberOfLines={2} className="flex-1 text-sm font-semibold text-gray-800">{item.title || `Conversation #${item.id}`}</Text>{String(loadingId) === String(item.id) ? <ActivityIndicator size="small" color={COLORS.primary} /> : null}</View>
          <Text className="mt-2 text-xs text-gray-400">{chatDate(item.updated_at)}</Text>
        </Pressable>
      ))}
      {!loading && !error && !filtered.length ? <Text className="py-4 text-sm leading-5 text-gray-500">{conversations.length ? "No saved conversations match that search." : "Your conversations will appear here after you send a message."}</Text> : null}
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
  const [shops, setShops] = useState([]);
  const [conversationId, setConversationId] = useState(null);
  const [draft, setDraft] = useState("");
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
    if (body.length < 2 || busy.current) return;
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
    try {
      const { data } = await api.post("/ai/analyze", { text: body, conversation_id: conversationId }, { signal: controller.signal });
      if (!mounted.current) return;
      if (data?.conversation_id) setConversationId(data.conversation_id);
      if (!data?.reply || typeof data.reply !== "string") throw new Error("A response could not be confirmed. Check your conversation history before sending again.");
      setMessages((current) => [...current.map((message) => message._key === key ? { ...message, pending: false } : message), { sender: "ai", text: data.reply, _key: `local-${++sequence.current}` }]);
      setShops(Array.isArray(data.shops) ? data.shops : []);
      if (!stickToBottom.current) setNewReply(true);
      history.refresh();
    } catch (e) {
      if (!mounted.current) return;
      setMessages((current) => current.map((message) => message._key === key ? { ...message, pending: false, failed: true } : message));
      setDraft((current) => current || body);
      setError(e.code === "ECONNABORTED" ? "The response timed out. Your draft has been restored; check your saved history before sending it again." : e.message || "The assistant is unavailable. Your draft has been restored.");
      history.refresh();
    } finally {
      busy.current = false;
      if (mounted.current) setSending(false);
    }
  };

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
      setMessages(rows.filter((message) => String(message.text || "").trim() !== "[SYSTEM] Recommended shops").map((message, index) => ({ ...message, _key: `saved-${id}-${index}` })));
      setConversationId(id);
      setShops([]);
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
    setMessages([]); setShops([]); setConversationId(null); setDraft(""); setError(null); setNewReply(false);
    stickToBottom.current = true;
    inputRef.current?.focus();
  };
  const openHistory = () => { if (!busy.current) { setHistoryOpen(true); history.refresh(); } };
  const fillPrompt = (text) => { if (!busy.current) { setDraft(text); inputRef.current?.focus(); } };
  const historyPanel = (
    <HistoryPanel conversations={history.data ?? []} loading={history.loading} error={history.error} refreshing={history.refreshing} onRefresh={history.refresh} activeId={conversationId} onSelect={loadConversation} disabled={disabled} loadingId={loadingId} query={historyQuery} setQuery={setHistoryQuery} />
  );
  const conversationTitle = (history.data ?? []).find((item) => String(item.id) === String(conversationId))?.title;
  const empty = messages.length === 0;

  return (
    <SafeAreaView className="flex-1 bg-gray-50" edges={["bottom", "left", "right"]}>
      <Stack.Screen options={{ title: "AI assistant", headerShown: false }} />
      <View className="border-b border-gray-200 bg-white">
        <View className="w-full self-center py-4" style={{ maxWidth: 1280, paddingHorizontal: horizontalPadding }}>
          <View className={isMobile ? "gap-3" : "flex-row items-center justify-between gap-3"}>
            <View className="flex-row items-center gap-3">
              <View className="h-11 w-11 items-center justify-center rounded-xl bg-blue-50"><Ionicons name="sparkles-outline" size={23} color={COLORS.primary} /></View>
              <View style={{ flexShrink: 1 }}><Text accessibilityRole="header" className="text-xl font-bold text-gray-900">PixelPatch assistant</Text><Text className="mt-1 text-xs text-gray-500">Troubleshoot your device, one step at a time.</Text></View>
            </View>
            <View className="flex-row flex-wrap gap-2">
              <Button title="New chat" variant="outline" disabled={disabled} onPress={startNew} />
              {!isDesktop ? <Button title="History" variant="ghost" disabled={disabled} onPress={openHistory} /> : null}
            </View>
          </View>
        </View>
      </View>

      <View className="w-full flex-1 self-center" style={{ maxWidth: 1280, flexDirection: "row" }}>
        {isDesktop ? (
          <View style={{ width: 280 }} className="border-r border-gray-200 bg-white">
            <ScrollView contentContainerStyle={{ padding: 20 }} keyboardShouldPersistTaps="handled">
              <Text className="mb-4 text-base font-bold text-gray-900">Past conversations</Text>
              {historyPanel}
            </ScrollView>
          </View>
        ) : null}

        <KeyboardAvoidingView className="flex-1" style={{ minWidth: 0 }} behavior={Platform.OS === "ios" ? "padding" : undefined} keyboardVerticalOffset={90}>
          {conversationId ? <View className="px-4 pt-3"><Text numberOfLines={2} className="text-center text-xs font-medium text-gray-500">{conversationTitle || "Saved conversation"}</Text></View> : null}
          {loadingId !== null ? <View className="flex-1 items-center justify-center"><ActivityIndicator color={COLORS.primary} /><Text className="mt-3 text-sm text-gray-500">Loading conversation…</Text></View> : (
            <FlatList
              ref={listRef} className="flex-1" data={messages} keyExtractor={(message) => message._key}
              keyboardShouldPersistTaps="handled" keyboardDismissMode="on-drag"
              contentContainerStyle={{ paddingVertical: 24, paddingHorizontal: horizontalPadding, flexGrow: 1, maxWidth: 960, width: "100%", alignSelf: "center" }}
              onScroll={({ nativeEvent }) => {
                stickToBottom.current = nativeEvent.contentSize.height - nativeEvent.layoutMeasurement.height - nativeEvent.contentOffset.y < 80;
                if (stickToBottom.current) setNewReply(false);
              }}
              scrollEventThrottle={100}
              onContentSizeChange={() => { if (stickToBottom.current) listRef.current?.scrollToEnd({ animated: false }); }}
              ListEmptyComponent={
                <View className="flex-1 justify-center py-3">
                  <View className="mb-5 h-16 w-16 items-center justify-center self-center rounded-2xl bg-blue-50"><Ionicons name="sparkles" size={30} color={COLORS.primary} /></View>
                  <Text className="text-center text-2xl font-bold text-gray-900">What is happening with your device?</Text>
                  <Text className="mb-6 mt-3 text-center text-sm leading-6 text-gray-500">Share the symptoms, device model, and what you have tried. Start with a prompt below or write your own question.</Text>
                  <View className="flex-row flex-wrap justify-between gap-y-3">
                    {SUGGESTIONS.map((suggestion) => (
                      <Pressable key={suggestion.title} onPress={() => fillPrompt(suggestion.text)} accessibilityRole="button" accessibilityLabel={`Use prompt: ${suggestion.title}`} disabled={disabled} style={{ width: isMobile ? "100%" : "48.5%" }} className="rounded-xl border border-gray-200 bg-white p-4 active:bg-blue-50">
                        <View className="flex-row items-center gap-3"><Ionicons name={suggestion.icon} size={22} color={COLORS.primary} /><Text className="flex-1 text-sm font-bold text-gray-800">{suggestion.title}</Text><Ionicons name="add-outline" size={18} color={COLORS.textMuted} /></View>
                        <Text className="mt-2 text-xs leading-5 text-gray-500">{suggestion.text}</Text>
                      </Pressable>
                    ))}
                  </View>
                  <Text className="mt-4 text-center text-xs text-gray-400">A prompt fills the message box. Review it, then press Send.</Text>
                </View>
              }
              renderItem={({ item }) => {
                const mine = item.sender === "user";
                return (
                  <View className={`mb-5 ${mine ? "self-end" : "self-start"}`} style={{ maxWidth: mine ? isMobile ? "90%" : "80%" : "100%", width: mine ? undefined : "100%" }}>
                    <Text className={`mb-2 text-xs font-semibold text-gray-400 ${mine ? "text-right" : ""}`}>{mine ? "You" : "PixelPatch assistant"}</Text>
                    <View className={`rounded-2xl p-4 ${mine ? "bg-blue-600" : "border border-gray-200 bg-white"}`}>
                      {mine ? <Text selectable className="text-base leading-6 text-white">{item.text}</Text> : <ReplyText text={item.text} />}
                    </View>
                    {item.pending || item.failed ? <Text className="mt-2 text-right text-xs text-gray-500">{item.pending ? "Waiting for response…" : "Response not confirmed"}</Text> : null}
                  </View>
                );
              }}
              ListFooterComponent={
                <View>
                  {sending ? <View accessibilityRole="progressbar" accessibilityLabel="Assistant is preparing a reply" className="mb-4 flex-row items-center gap-3 self-start rounded-xl border border-gray-200 bg-white p-4"><ActivityIndicator color={COLORS.primary} /><Text className="text-sm text-gray-500">Working through your question…</Text></View> : null}
                  {shops.length ? (
                    <View className="mt-3">
                      <Text className="text-lg font-bold text-gray-900">Explore repair options</Text>
                      <Text className="mb-4 mt-1 text-sm leading-5 text-gray-500">Open a suggested shop to review its services and details.</Text>
                      <View className="flex-row flex-wrap justify-between gap-y-3">
                        {shops.map((shop) => (
                          <Pressable key={shop.id} onPress={() => router.push(`/shop/${shop.id}`)} accessibilityRole="button" accessibilityLabel={`View suggested shop ${shop.name}`} style={{ width: isMobile ? "100%" : "48.5%" }} className="rounded-xl border border-gray-200 bg-white p-4 active:bg-blue-50">
                            <Ionicons name="storefront-outline" size={22} color={COLORS.primary} />
                            <Text className="mb-2 mt-3 text-base font-bold text-gray-900">{shop.name}</Text>
                            <ServiceRating rating={shop.rating_average} />
                            {shop.address ? <Text className="mt-3 text-xs leading-5 text-gray-500">{shop.address}</Text> : null}
                            <Text className="mt-4 text-sm font-semibold text-blue-600">View shop →</Text>
                          </Pressable>
                        ))}
                      </View>
                    </View>
                  ) : null}
                </View>
              }
            />
          )}

          {newReply ? <Pressable onPress={() => { stickToBottom.current = true; setNewReply(false); listRef.current?.scrollToEnd({ animated: true }); }} accessibilityRole="button" className="mb-3 min-h-11 justify-center self-center rounded-full border border-blue-200 bg-blue-50 px-4 py-2"><Text className="text-sm font-semibold text-blue-700">Jump to latest reply ↓</Text></Pressable> : null}
          {error ? <View className="w-full self-center px-4 pb-3" style={{ maxWidth: 960 }}><Text accessibilityRole="alert" className="rounded-xl bg-red-50 p-3 text-sm leading-5 text-red-700">{error}</Text></View> : null}
          <View className="border-t border-gray-200 bg-white">
            <View className="w-full self-center py-3" style={{ maxWidth: 960, paddingHorizontal: horizontalPadding }}>
              <View className="flex-row items-end gap-3">
                <TextInput ref={inputRef} value={draft} onChangeText={setDraft} multiline editable={!disabled} accessibilityLabel="Message the assistant" placeholder={empty ? "Describe your device problem…" : "Ask a follow-up…"} placeholderTextColor="#9ca3af" className="max-h-32 min-h-12 flex-1 rounded-2xl border border-gray-200 bg-gray-50 px-4 py-3 text-base text-gray-900" />
                <Pressable onPress={send} disabled={draft.trim().length < 2 || disabled} accessibilityRole="button" accessibilityLabel="Send question" accessibilityState={{ disabled: draft.trim().length < 2 || disabled, busy: sending }} className={`h-12 w-12 items-center justify-center rounded-xl ${draft.trim().length >= 2 && !disabled ? "bg-blue-600" : "bg-gray-200"}`}><Ionicons name="send" size={20} color={draft.trim().length >= 2 && !disabled ? "#fff" : COLORS.textMuted} /></Pressable>
              </View>
              <Text className="mt-2 text-xs leading-4 text-gray-400">Include your device model, symptoms, and any steps you have already tried.</Text>
            </View>
          </View>
        </KeyboardAvoidingView>
      </View>

      <Modal visible={historyOpen && !isDesktop} onClose={() => { if (!disabled) setHistoryOpen(false); }} title="Past conversations">
        {historyPanel}
      </Modal>
    </SafeAreaView>
  );
}
