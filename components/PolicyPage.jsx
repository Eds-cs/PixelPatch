// components/PolicyPage.jsx — layout shared by the Terms and Privacy pages.
import { ScrollView, Text, View } from "react-native";
import { Stack } from "expo-router";

export default function PolicyPage({ title, updated, intro, sections }) {
  return (
    <ScrollView
      className="flex-1 bg-gray-50"
      contentContainerStyle={{ padding: 16, paddingBottom: 40, maxWidth: 760, width: "100%", alignSelf: "center" }}
    >
      <Stack.Screen options={{ title, headerShown: true }} />

      <View className="mb-4 rounded-xl border border-gray-200 bg-white p-5">
        <Text className="text-2xl font-extrabold text-gray-900">{title}</Text>
        <Text className="mt-1 text-sm text-gray-500">Last updated {updated}</Text>
        <Text className="mt-4 text-base leading-6 text-gray-700">{intro}</Text>
      </View>

      {sections.map((section, i) => (
        <View key={section.heading} className="mb-4 rounded-xl border border-gray-200 bg-white p-5">
          <Text className="text-base font-bold text-gray-900">
            {i + 1}. {section.heading}
          </Text>
          {section.body.map((paragraph) => (
            <Text key={paragraph} className="mt-2 text-sm leading-6 text-gray-700">
              {paragraph}
            </Text>
          ))}
        </View>
      ))}
    </ScrollView>
  );
}
