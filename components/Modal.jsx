import { Modal as RNModal, Pressable, ScrollView, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { COLORS } from "../constants/theme";

export default function Modal({ visible, onClose, title, children, footer }) {
  return (
    <RNModal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
      accessibilityViewIsModal
    >
      <View className="flex-1 justify-end bg-black/50 sm:items-center sm:justify-center">
        <View className="max-h-[85%] w-full rounded-t-2xl bg-white sm:max-w-lg sm:rounded-2xl">
          <View className="flex-row items-center justify-between border-b border-gray-200 px-5 py-4">
            <Text className="flex-1 text-lg font-bold text-gray-900">{title}</Text>
            <Pressable
              onPress={onClose}
              accessibilityRole="button"
              accessibilityLabel="Close"
              className="ml-3 h-8 w-8 items-center justify-center rounded-full active:bg-gray-100"
            >
              <Ionicons name="close" size={20} color={COLORS.textMuted} />
            </Pressable>
          </View>

          <ScrollView
            className="px-5 py-4"
            keyboardShouldPersistTaps="handled"
            contentContainerStyle={{ paddingBottom: 8 }}
          >
            {children}
          </ScrollView>

          {footer ? (
            <View className="border-t border-gray-200 px-5 py-4">{footer}</View>
          ) : null}
        </View>
      </View>
    </RNModal>
  );
}
