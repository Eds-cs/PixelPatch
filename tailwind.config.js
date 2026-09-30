/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./app/**/*.{js,jsx}",
    "./components/**/*.{js,jsx}",
  ],
  presets: [require("nativewind/preset")],
  // Must be "class", not Tailwind's default "media".
  //
  // On web, react-native-css-interop watches <head> for its stylesheet and then
  // calls colorScheme.set() unconditionally — which throws outright when the
  // emitted --css-interop-darkMode flag is "media":
  //   "Cannot manually set color scheme, as dark mode is type 'media'."
  // "class" emits `class dark` instead, so the runtime can set the scheme.
  //
  // The app is light-only (app.json sets userInterfaceStyle: "light"), and
  // nothing adds a `dark` class to the document, so no dark: variant activates.
  darkMode: "class",
  theme: {
    extend: {},
  },
  plugins: [],
};
