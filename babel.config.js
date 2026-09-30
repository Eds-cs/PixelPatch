module.exports = function (api) {
  api.cache(true);
  return {
    presets: [
      ["babel-preset-expo", { jsxImportSource: "nativewind" }],
      "nativewind/babel",
    ],
    // react-native-worklets/plugin must stay LAST (Reanimated 4 requirement)
    plugins: ["react-native-worklets/plugin"],
  };
};
