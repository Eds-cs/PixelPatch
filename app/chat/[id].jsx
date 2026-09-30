// app/chat/[id].jsx — live conversation.
// History: GET /api/chat/:id/messages
// Sending: socket "send_message" { chat_id, message_text } (server replies "new_message")
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
import { Stack, useLocalSearchParams } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";

import api from "../../lib/api";
import { useAuth } from "../../lib/auth";
import { useSocket } from "../../lib/socket";
import { COLORS } from "../../constants/theme";

export default function ChatRoom() {
  const { id } = useLocalSearchParams();
  const chatId = Number(id);
  const { user } = useAuth();
  const socket = useSocket();
  const listRef = useRef(null);

  const [messages, setMessages] = useState([]);
  const [draft, setDraft] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [sending, setSending] = useState(false);

  // Load history.
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const { data } = await api.get(`/chat/${chatId}/messages`);
        if (!cancelled) setMessages(Array.isArray(data) ? data : []);
      } catch (e) {
        if (!cancelled) setError(e.message || "Couldn't load messages.");
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [chatId]);

  // Join the room and listen for broadcasts.
  useEffect(() => {
    if (!socket || !chatId) return;

    socket.emit("join", chatId);

    const onNew = (row) => {
      if (Number(row?.chat_id) !== chatId) return;
      // The sender also receives its own broadcast — de-dupe on id.
      setMessages((prev) => (prev.some((m) => m.id === row.id) ? prev : [...prev, row]));
    };

    socket.on("new_message", onNew);
    return () => {
      socket.off("new_message", onNew);
      socket.emit("leave", chatId);
    };
  }, [socket, chatId]);

  const send = useCallback(() => {
    const text = draft.trim();
    if (!text || !socket || sending) return;

    setSending(true);
    socket.emit("send_message", { chat_id: chatId, message_text: text }, (ack) => {
      setSending(false);
      if (ack?.success) {
        setDraft("");
      } else {
        setError(ack?.error || "Message failed to send.");
      }
    });
  }, [draft, socket, chatId, sending]);

  if (loading) {
    return (
      <View className="flex-1 items-center justify-center bg-gray-50">
        <ActivityIndicator size="large" color={COLORS.primary} />
      </View>
    );
  }

  return (
    <SafeAreaView className="flex-1 bg-gray-50" edges={["bottom", "left", "right"]}>
      <Stack.Screen options={{ title: "Conversation", headerShown: true }} />
      <KeyboardAvoidingView
        className="flex-1"
        behavior={Platform.OS === "ios" ? "padding" : undefined}
        keyboardVerticalOffset={90}
      >
        <FlatList
          ref={listRef}
          data={messages}
          keyExtractor={(m) => String(m.id)}
          contentContainerStyle={{ padding: 16, maxWidth: 720, width: "100%", alignSelf: "center" }}
          onContentSizeChange={() => listRef.current?.scrollToEnd({ animated: false })}
          ListEmptyComponent={
            <Text className="mt-16 text-center text-sm text-gray-500">
              No messages yet. Say hello.
            </Text>
          }
          renderItem={({ item }) => {
            const mine = item.sender_id === user?.id;
            return (
              <View className={`mb-2 max-w-[80%] ${mine ? "self-end" : "self-start"}`}>
                {!mine ? (
                  <Text className="mb-0.5 ml-1 text-xs text-gray-500">{item.first_name}</Text>
                ) : null}
                <View
                  className={`rounded-2xl px-4 py-2.5 ${
                    mine ? "bg-blue-600" : "border border-gray-200 bg-white"
                  }`}
                >
                  <Text className={mine ? "text-white" : "text-gray-900"}>{item.message_text}</Text>
                </View>
              </View>
            );
          }}
        />

        {error ? (
          <Text className="px-4 pb-1 text-center text-xs text-red-600">{error}</Text>
        ) : null}

        <View className="flex-row items-end border-t border-gray-200 bg-white px-3 py-2">
          <TextInput
            className="mr-2 max-h-28 min-h-11 flex-1 rounded-2xl border border-gray-300 bg-gray-50 px-4 py-2.5 text-base text-gray-900"
            placeholder="Type a message…"
            placeholderTextColor="#9ca3af"
            value={draft}
            onChangeText={setDraft}
            multiline
            accessibilityLabel="Message"
          />
          <Pressable
            onPress={send}
            disabled={!draft.trim() || sending}
            accessibilityRole="button"
            accessibilityLabel="Send message"
            className={`h-11 w-11 items-center justify-center rounded-full ${
              draft.trim() && !sending ? "bg-blue-600" : "bg-gray-300"
            }`}
          >
            <Ionicons name="send" size={18} color="#fff" />
          </Pressable>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
