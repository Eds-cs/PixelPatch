// app/(tabs)/chat.jsx — GET /api/chat (returns the rows array directly)
import { useEffect } from "react";
import { Pressable, Text, View } from "react-native";
import { useRouter } from "expo-router";

import AsyncList from "../../components/AsyncList";
import { useFetch } from "../../lib/useFetch";
import { useAuth } from "../../lib/auth";
import { useSocket } from "../../lib/socket";

export default function ChatList() {
  const router = useRouter();
  const { user } = useAuth();
  const socket = useSocket();
  const { data, error, loading, refreshing, refresh } = useFetch("/chat");

  // Re-pull the conversation list when a new message lands, so ordering and
  // last_message_at stay correct without a manual pull-to-refresh.
  useEffect(() => {
    if (!socket) return;
    const onMessage = () => refresh();
    socket.on("new_message", onMessage);
    return () => socket.off("new_message", onMessage);
  }, [socket, refresh]);

  return (
    <AsyncList
      loading={loading}
      error={error}
      refreshing={refreshing}
      onRefresh={refresh}
      data={data}
      keyExtractor={(item) => String(item.id)}
      emptyText="No conversations yet."
      renderItem={({ item }) => {
        // A shop owner sees the client's name; a client sees the shop's name.
        const viewerIsShop = item.shop_owner_id === user?.id;
        const title = viewerIsShop
          ? [item.client_first, item.client_last].filter(Boolean).join(" ")
          : item.shop_name;

        return (
          <Pressable
            onPress={() => router.push(`/chat/${item.id}`)}
            className="mb-3 flex-row items-center rounded-xl border border-gray-200 bg-white p-4 active:bg-gray-50"
          >
            <View className="mr-3 h-11 w-11 items-center justify-center rounded-full bg-blue-100">
              <Text className="text-base font-bold text-blue-700">
                {(title || "?").charAt(0).toUpperCase()}
              </Text>
            </View>
            <View className="flex-1">
              <Text className="text-base font-semibold text-gray-900">{title || "Conversation"}</Text>
              <Text className="mt-0.5 text-xs text-gray-500">
                {item.last_message_at ?? "No messages yet"}
              </Text>
            </View>
          </Pressable>
        );
      }}
    />
  );
}
