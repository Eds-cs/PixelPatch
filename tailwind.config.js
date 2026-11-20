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
    extend: {
      colors: {
        // Primary accent: charcoal for buttons, links and active states, warm
        // beige tints for highlighted backgrounds. Keep in sync with
        // constants/theme.js for places that need a hex value.
        brand: {
          50: "#f7f5f2",
          100: "#efebe5",
          200: "#e2dcd3",
          300: "#cfc7bb",
          400: "#a59d91",
          500: "#6f685f",
          600: "#2b2724",
          700: "#1f1c1a",
          800: "#181614",
          900: "#100f0e",
        },
        // Neutral text, borders and backgrounds use a warm gray (Tailwind's
        // stone) instead of the default blue-tinted gray, to match the beige.
        gray: {
          50: "#fafaf9",
          100: "#f5f5f4",
          200: "#e7e5e4",
          300: "#d6d3d1",
          400: "#a8a29e",
          500: "#78716c",
          600: "#57534e",
          700: "#44403c",
          800: "#292524",
          900: "#1c1917",
          950: "#0c0a09",
        },
      },
    },
  },
  plugins: [],
};
