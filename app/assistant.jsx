// app/assistant.jsx
// POST /api/ai/analyze { text, conversation_id } -> { conversation_id, reply, shops[] }
// GET  /api/ai/conversations
// GET  /api/ai/conversations/:id/messages -> [{ sender, text, timestamp }]
import { useCallback, useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  Text,
  TextInput,
  View,
} from "react-native";
import { Stack, useRouter } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";

import Modal from "../components/Modal";
import api from "../lib/api";
import { COLORS } from "../constants/theme";

const SUGGESTIONS = [
  "My phone won't charge",
  "Laptop screen flickers",
  "Water damaged my tablet",
];

export default function Assistant() {
  const router = useRouter();
  const listRef = useRef(null);

  const [messages, setMessages] = useState([]);
  const [shops, setShops] = useState([]);
  const [conversationId, setConversationId] = useState(null);
  const [draft, setDraft] = useState("");
  const [sending, setSending] = useState(false);
  const [error, setError] = useState(null);

  const [historyOpen, setHistoryOpen] = useState(false);
  const [conversations, setConversations] = useState([]);
  const [historyLoading, setHistoryLoading] = useState(false);

  const send = useCallback(
    async (text) => {
      const body = (text ?? draft).trim();
      if (!body || sending) return;

      setDraft("");
      setError(null);
      setSending(true);
      // Optimistic echo — the server persists both sides.
      setMessages((prev) => [...prev, { sender: "user", text: body, _local: Date.now() }]);

      try {
        const { data } = await api.post("/ai/analyze", {
          text: body,
          conversation_id: conversationId,
        });
        if (data?.conversation_id) setConversationId(data.conversation_id);
        if (data?.reply) {
          setMessages((prev) => [...prev, { sender: "ai", text: data.reply, _local: Date.now() }]);
        }
        setShops(Array.isArray(data?.shops) ? data.shops : []);
      } catch (e) {
        setError(e.message || "The assistant is unavailable right now.");
      } finally {
        setSending(false);
      }
    },
    [draft, sending, conversationId]
  );

  const openHistory = async () => {
    setHistoryOpen(true);
    setHistoryLoading(true);
    try {
      const { data } = await api.get("/ai/conversations");
      setConversations(Array.isArray(data) ? data : []);
    } catch {
      setConversations([]);
    } finally {
      setHistoryLoading(false);
    }
  };

  const loadConversation = async (id) => {
    setHistoryOpen(false);
    setError(null);
    try {
      const { data } = await api.get(`/ai/conversations/${id}/messages`);
      setMessages(Array.isArray(data) ? data : []);
      setConversationId(id);
      setShops([]);
    } catch (e) {
      setError(e.message || "Couldn't load that conversation.");
    }
  };

  const startNew = () => {
    setMessages([]);
    setShops([]);
    setConversationId(null);
    setError(null);
  };

  useEffect(() => {
    listRef.current?.scrollToEnd?.({ animated: true });
  }, [messages.length]);

  const empty = messages.length === 0;

  return (
    <SafeAreaView className="flex-1 bg-gray-50" edges={["bottom", "left", "right"]}>
      <Stack.Screen
        options={{
          title: "AI assistant",
          headerShown: true,
          headerRight: () => (
            <View className="mr-3 flex-row">
              <Pressable
                onPress={startNew}
                accessibilityLabel="New conversation"
                className="mr-1 h-9 w-9 items-center justify-center rounded-full active:bg-gray-100"
              >
                <Ionicons name="create-outline" size={19} color={COLORS.primary} />
              </Pressable>
              <Pressable
                onPress={openHistory}
                accessibilityLabel="Conversation history"
                className="h-9 w-9 items-center justify-center rounded-full active:bg-gray-100"
              >
                <Ionicons name="time-outline" size={19} color={COLORS.primary} />
              </Pressable>
            </View>
          ),
        }}
      />

      <KeyboardAvoidingView
        className="flex-1"
        behavior={Platform.OS === "ios" ? "padding" : undefined}
        keyboardVerticalOffset={90}
      >
        <FlatList
          ref={listRef}
          data={messages}
          keyExtractor={(m, i) => String(m.id ?? m._local ?? i)}
          contentContainerStyle={{
            padding: 16,
            flexGrow: 1,
            maxWidth: 720,
            width: "100%",
            alignSelf: "center",
          }}
          ListEmptyComponent={
            <View className="flex-1 items-center justify-center px-6">
              <View className="mb-4 h-16 w-16 items-center justify-center rounded-full bg-blue-100">
                <Ionicons name="sparkles" size={30} color={COLORS.primary} />
              </View>
              <Text className="mb-1 text-lg font-bold text-gray-900">
                Describe what&apos;s wrong
              </Text>
              <Text className="mb-6 text-center text-sm text-gray-500">
                I&apos;ll help you troubleshoot and point you to shops that can fix it.
              </Text>
              {SUGGESTIONS.map((s) => (
                <Pressable
                  key={s}
                  onPress={() => send(s)}
                  className="mb-2 w-full rounded-full border border-gray-200 bg-white px-4 py-2.5 active:bg-gray-50"
                >
                  <Text className="text-center text-sm text-gray-700">{s}</Text>
                </Pressable>
              ))}
            </View>
          }
          renderItem={({ item }) => {
            const mine = item.sender === "user";
            return (
              <View className={`mb-2 max-w-[85%] ${mine ? "self-end" : "self-start"}`}>
                <View
                  className={`rounded-2xl px-4 py-2.5 ${
                    mine ? "bg-blue-600" : "border border-gray-200 bg-white"
                  }`}
                >
                  <Text className={mine ? "text-white" : "text-gray-900"}>{item.text}</Text>
                </View>
              </View>
            );
          }}
          ListFooterComponent={
            <View>
              {sending ? (
                <View className="mb-2 self-start rounded-2xl border border-gray-200 bg-white px-4 py-3">
                  <ActivityIndicator size="small" color={COLORS.primary} />
                </View>
              ) : null}

              {shops.length > 0 ? (
                <View className="mt-4">
                  <Text className="mb-2 text-sm font-bold text-gray-900">
                    Shops that can help
                  </Text>
                  {shops.map((s) => (
                    <Pressable
                      key={s.id}
                      onPress={() => router.push(`/shop/${s.id}`)}
                      className="mb-2 rounded-xl border border-gray-200 bg-white p-3.5 active:bg-gray-50"
                    >
                      <View className="flex-row items-center justify-between">
                        <Text className="flex-1 pr-2 text-sm font-semibold text-gray-900">
                          {s.name}
                        </Text>
                        <View className="flex-row items-center">
                          <Ionicons name="star" size={12} color="#f59e0b" />
                          <Text className="ml-1 text-xs text-gray-600">
                            {Number(s.rating_average ?? 0).toFixed(1)}
                          </Text>
                        </View>
                      </View>
                      {s.address ? (
                        <Text className="mt-1 text-xs text-gray-500">{s.address}</Text>
                      ) : null}
                    </Pressable>
                  ))}
                </View>
              ) : null}
            </View>
          }
        />

        {error ? (
          <Text className="px-4 pb-1 text-center text-xs text-red-600">{error}</Text>
        ) : null}

        <View className="flex-row items-end border-t border-gray-200 bg-white px-3 py-2">
          <TextInput
            className="mr-2 max-h-28 min-h-11 flex-1 rounded-2xl border border-gray-300 bg-gray-50 px-4 py-2.5 text-base text-gray-900"
            placeholder={empty ? "Describe the problem…" : "Ask a follow-up…"}
            placeholderTextColor="#9ca3af"
            value={draft}
            onChangeText={setDraft}
            multiline
            accessibilityLabel="Message the assistant"
          />
          <Pressable
            onPress={() => send()}
            disabled={!draft.trim() || sending}
            accessibilityRole="button"
            accessibilityLabel="Send"
            className={`h-11 w-11 items-center justify-center rounded-full ${
              draft.trim() && !sending ? "bg-blue-600" : "bg-gray-300"
            }`}
          >
            <Ionicons name="send" size={18} color="#fff" />
          </Pressable>
        </View>
      </KeyboardAvoidingView>

      <Modal
        visible={historyOpen}
        onClose={() => setHistoryOpen(false)}
        title="Past conversations"
      >
        {historyLoading ? (
          <ActivityIndicator color={COLORS.primary} />
        ) : conversations.length === 0 ? (
          <Text className="text-sm text-gray-500">No saved conversations yet.</Text>
        ) : (
          conversations.map((c) => (
            <Pressable
              key={c.id}
              onPress={() => loadConversation(c.id)}
              className="mb-2 rounded-lg border border-gray-200 p-3 active:bg-gray-50"
            >
              <Text className="text-sm font-semibold text-gray-900">
                {c.title || `Conversation #${c.id}`}
              </Text>
              <Text className="mt-0.5 text-xs text-gray-400">{c.updated_at}</Text>
            </Pressable>
          ))
        )}
      </Modal>
    </SafeAreaView>
  );
}
