// lib/enterToSend.js
// Enter sends the message in a chat box (shop chats, the AI assistant).
//
//   Web and hardware keyboards: Enter sends, Shift+Enter adds a new line.
//     While an input method is composing (e.g. picking an accented letter),
//     Enter is left alone.
//   Phones and tablets (on-screen keyboard): the return key shows "Send" and
//     sends; the keyboard stays open for the next message.
//
// On a multiline <TextInput>:
//   {...SEND_KEY_PROPS}
//   onKeyPress={(event) => sendOnEnterKey(event, sendIfReady)}
//   onSubmitEditing={() => sendOnSubmit(sendIfReady)}
import { Platform } from "react-native";

const WEB = Platform.OS === "web";

/** Labels the return key "Send" and, on phones, makes it submit instead of adding a line. */
export const SEND_KEY_PROPS = WEB
  ? { enterKeyHint: "send" }
  : { returnKeyType: "send", submitBehavior: "submit" };

/** Web: Enter (without Shift) sends instead of adding a new line. */
export function sendOnEnterKey(event, onSend) {
  if (!WEB) return;
  const key = event?.nativeEvent ?? {};
  if (key.key !== "Enter" || key.shiftKey || key.isComposing || key.keyCode === 229) return;
  event.preventDefault?.();
  onSend();
}

/** Phones and tablets: the keyboard's Send key. */
export function sendOnSubmit(onSend) {
  if (!WEB) onSend();
}
