import { ActivityIndicator, FlatList, RefreshControl, Text, View } from "react-native";
import { COLORS } from "../constants/theme";
import { useResponsive } from "../lib/useResponsive";

// Shared loading / error / empty handling so each screen stays about its data.
export default function AsyncList({
  loading,
  error,
  refreshing,
  onRefresh,
  data,
  renderItem,
  keyExtractor,
  emptyText = "Nothing here yet.",
  ListHeaderComponent,
}) {
  const { horizontalPadding, isDesktop, isTablet } = useResponsive();
  const maxWidth = isDesktop ? 1200 : isTablet ? 960 : 720;

  if (loading) {
    return (
      <View className="flex-1 items-center justify-center bg-gray-50">
        <ActivityIndicator size="large" color={COLORS.primary} />
      </View>
    );
  }

  if (error) {
    return (
      <View className="flex-1 items-center justify-center bg-gray-50 p-6">
        <Text className="mb-1 text-center text-base font-semibold text-gray-900">
          Couldn&apos;t load this
        </Text>
        <Text className="text-center text-sm text-gray-500">{error}</Text>
        <Text className="mt-4 text-center text-sm text-blue-600" onPress={onRefresh}>
          Tap to retry
        </Text>
      </View>
    );
  }

  return (
    <FlatList
      className="flex-1 bg-gray-50"
      contentContainerStyle={{ paddingVertical: 16, paddingHorizontal: horizontalPadding, flexGrow: 1, maxWidth, width: "100%", alignSelf: "center" }}
      data={data ?? []}
      renderItem={renderItem}
      keyExtractor={keyExtractor}
      ListHeaderComponent={ListHeaderComponent}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={COLORS.primary} />}
      ListEmptyComponent={
        <View className="flex-1 items-center justify-center py-24">
          <Text className="text-base text-gray-500">{emptyText}</Text>
        </View>
      }
    />
  );
}
