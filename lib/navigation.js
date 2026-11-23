// lib/navigation.js
import { Platform } from "react-native";

// Websites already have the browser's back button, so in-app "Back" buttons
// are only shown in the phone apps. Buttons that do more than go back (wizard
// steps, in-page views, "what next" buttons on result screens) stay everywhere.
export const SHOW_BACK_BUTTONS = Platform.OS !== "web";
