import { useState } from "react";
import { Pressable } from "react-native";
import { Ionicons } from "@expo/vector-icons";

import TextField from "./TextField";

// A TextField for passwords, with an eye button that shows or hides the text.
export default function PasswordField(props) {
  const [visible, setVisible] = useState(false);

  return (
    <TextField
      autoCapitalize="none"
      autoCorrect={false}
      {...props}
      secureTextEntry={!visible}
      right={
        <Pressable
          onPress={() => setVisible((v) => !v)}
          accessibilityRole="button"
          accessibilityLabel={visible ? "Hide password" : "Show password"}
          hitSlop={8}
          className="h-12 w-12 items-center justify-center rounded-lg active:bg-gray-100"
        >
          <Ionicons name={visible ? "eye-off-outline" : "eye-outline"} size={20} color="#5F706D" />
        </Pressable>
      }
    />
  );
}
