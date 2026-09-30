// ESLint 9 flat config.
const expoConfig = require("eslint-config-expo/flat");

module.exports = [
  ...expoConfig,
  {
    // Build output, the retired Vite app, and the Express API (its own project).
    ignores: ["dist/*", "legacy-web/*", "server/*", ".expo/*", "node_modules/*"],
  },
  {
    rules: {
      "import/no-unresolved": "error",
      "react-hooks/exhaustive-deps": "warn",

      // Fetch-on-mount ("kick off an async loader in an effect") trips this
      // React Compiler rule even though every setState happens in an async
      // continuation, not synchronously. The genuinely synchronous cases have
      // been rewritten as derived values; what remains is data loading.
      //
      // The real fix is a data-fetching library (TanStack Query / SWR) owning
      // that lifecycle — an architectural decision, not a lint suppression.
      // Kept as a warning so new occurrences stay visible.
      "react-hooks/set-state-in-effect": "warn",
    },
  },
];
