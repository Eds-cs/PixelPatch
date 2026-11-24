// components/PolicyModal.jsx
// A policy ({ title, updated, intro, sections }, as in lib/policies/) in a
// pop-up, so a form can show it without leaving the page.
import { Text, View } from "react-native";

import Modal from "./Modal";
import Button from "./Button";

export default function PolicyModal({ policy, visible, onClose }) {
  if (!policy) return null;
  return (
    <Modal
      visible={visible}
      onClose={onClose}
      title={policy.title}
      footer={<Button title="Close" variant="outline" onPress={onClose} />}
    >
      <Text className="text-xs text-gray-500">Last updated {policy.updated}</Text>
      <Text className="mt-3 text-sm leading-6 text-gray-700">{policy.intro}</Text>
      {policy.sections.map((section, i) => (
        <View key={section.heading} className="mt-5">
          <Text accessibilityRole="header" className="text-base font-bold text-gray-900">
            {i + 1}. {section.heading}
          </Text>
          {section.body.map((paragraph) => (
            <Text key={paragraph} className="mt-2 text-sm leading-6 text-gray-700">
              {paragraph}
            </Text>
          ))}
        </View>
      ))}
    </Modal>
  );
}
