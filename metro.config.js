const { getDefaultConfig } = require("expo/metro-config");
const { withNativeWind } = require("nativewind/metro");

const config = getDefaultConfig(__dirname);

// Add ALL necessary asset extensions
config.resolver.assetExts = [
  ...config.resolver.assetExts, // Keep existing default extensions
  "sqlite",
  "sqlite3",
  "db",
  "png",
  "jpg",
  "jpeg",
  "gif",
  "webp",
  "svg",
  "ico",
  "bmp",
];

// Only export once with NativeWind
module.exports = withNativeWind(config, { input: "./global.css" });
