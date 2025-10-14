const { getDefaultConfig } = require("expo/metro-config");
const { withNativeWind } = require("nativewind/metro");

const config = getDefaultConfig(__dirname);

// Add ALL necessary asset extensions including fonts
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
  "ttf",
  "otf",
  "woff",
  "woff2",
];

// Ensure sourceExts includes all necessary file types
config.resolver.sourceExts = [
  ...config.resolver.sourceExts,
  "css",
  "scss",
  "sass",
];

// Only export once with NativeWind
module.exports = withNativeWind(config, { 
  input: "./global.css",
  // Add this for better font handling
  inlineRem: false 
});
