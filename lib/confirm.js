// lib/confirm.js
// Cross-platform confirmation and notice dialogs. react-native-web has no
// Alert implementation, so web uses the browser's dialogs.
import { Alert, Platform } from "react-native";

/** Asks before running `onConfirm`. `confirmLabel` names the action button. */
export function confirmAction(title, message, onConfirm, { confirmLabel = "Confirm", destructive = false } = {}) {
  if (Platform.OS === "web") {
    if (window.confirm(`${title}\n\n${message}`)) onConfirm();
    return;
  }
  Alert.alert(title, message, [
    { text: "Cancel", style: "cancel" },
    { text: confirmLabel, style: destructive ? "destructive" : "default", onPress: onConfirm },
  ]);
}

/** Shows a one-button notice. */
export function notify(title, message) {
  if (Platform.OS === "web") window.alert(`${title}\n\n${message}`);
  else Alert.alert(title, message);
}
