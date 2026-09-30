const { getDefaultConfig } = require("expo/metro-config");
const { withNativeWind } = require("nativewind/metro");

const config = getDefaultConfig(__dirname);

// The old Vite app still lives in legacy-web/ during the migration. Metro must
// not crawl it — its node_modules would surface as duplicate modules.
config.resolver.blockList = [/[\/]legacy-web[\/].*/];

module.exports = withNativeWind(config, { input: "./global.css" });
