/** @type {import('tailwindcss').Config} */
// Colors come from the design tokens in global.css (teal and amber). Hex
// values for icons and other places classes can't reach are in
// constants/theme.js. Keep the three in sync.
const token = (name) => `rgb(var(--color-${name}) / <alpha-value>)`;

module.exports = {
  content: [
    "./app/**/*.{js,jsx,ts,tsx}",
    "./components/**/*.{js,jsx,ts,tsx}",
    // Status badge classes are defined in constants/theme.js.
    "./constants/**/*.{js,jsx,ts,tsx}",
    "./lib/**/*.{js,jsx,ts,tsx}",
  ],
  presets: [require("nativewind/preset")],
  // Must be "class", not "media".
  //
  // On web, react-native-css-interop watches <head> for its stylesheet and then
  // calls colorScheme.set() unconditionally — which throws outright when the
  // emitted --css-interop-darkMode flag is "media":
  //   "Cannot manually set color scheme, as dark mode is type 'media'."
  // "class" emits `class dark` instead, so the runtime can set the scheme.
  //
  // The app is light-only for now (app.json sets userInterfaceStyle: "light";
  // the dark palette in global.css is switched off), so no dark: variant
  // activates.
  darkMode: "class",
  theme: {
    extend: {
      colors: {
        background: token("background"),
        surface: { DEFAULT: token("surface"), muted: token("surface-muted") },
        border: token("border"),
        foreground: token("foreground"),
        muted: token("muted"),

        primary: {
          DEFAULT: token("primary"),
          foreground: token("primary-foreground"),
          soft: token("primary-soft"),
          "soft-foreground": token("primary-soft-foreground"),
        },
        accent: {
          DEFAULT: token("accent"),
          foreground: token("accent-foreground"),
        },
        price: token("price"),

        success: { DEFAULT: token("success"), soft: token("success-soft") },
        warning: { DEFAULT: token("warning"), soft: token("warning-soft") },
        danger: {
          DEFAULT: token("danger"),
          soft: token("danger-soft"),
          fill: token("danger-fill"),
        },
        info: { DEFAULT: token("info"), soft: token("info-soft") },
        neutral: { DEFAULT: token("neutral"), soft: token("neutral-soft") },

        /* Raw ramps for illustrations and one-off needs. Prefer the tokens above. */
        teal: {
          50: "#F0FDFA", 100: "#CCFBF1", 200: "#99F6E4", 300: "#5EEAD4",
          400: "#2DD4BF", 500: "#14B8A6", 600: "#0D9488", 700: "#0F766E",
          800: "#115E59", 900: "#134E4A", 950: "#042F2E",
        },
        amber: {
          50: "#FFFBEB", 100: "#FEF3C7", 200: "#FDE68A", 300: "#FCD34D",
          400: "#FBBF24", 500: "#F59E0B", 600: "#D97706", 700: "#B45309",
          800: "#92400E", 900: "#78350F", 950: "#451A03",
        },

        /* Neutral grays used across existing screens (text, borders, page
           backgrounds), tuned to the token neutrals: 50 = background,
           100 = surface-muted, 200 = border, 600 = muted, 900 = foreground.
           500 keeps 4.5:1 contrast on white and on gray-50 for secondary text. */
        gray: {
          50: "#F8FAFA", 100: "#F1F5F5", 200: "#E2E8E8", 300: "#CDD6D5",
          400: "#8A9B98", 500: "#5F706D", 600: "#52635F", 700: "#3D4D4A",
          800: "#22332F", 900: "#0F1F1E", 950: "#071110",
        },
      },
    },
  },
  plugins: [],
};
