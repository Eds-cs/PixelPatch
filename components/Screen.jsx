import { ScrollView, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

// Caps content width so the web build does not stretch across a desktop monitor.
export default function Screen({ children, scroll = true, className = "" }) {
  const Inner = scroll ? ScrollView : View;

  return (
    <SafeAreaView className="flex-1 bg-gray-50" edges={["top", "left", "right"]}>
      <Inner
        className="flex-1"
        contentContainerStyle={scroll ? { padding: 16, maxWidth: 720, width: "100%", alignSelf: "center" } : undefined}
        {...(scroll ? { keyboardShouldPersistTaps: "handled" } : {})}
      >
        <View className={scroll ? className : `flex-1 p-4 ${className}`}>{children}</View>
      </Inner>
    </SafeAreaView>
  );
}
