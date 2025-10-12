// Updated hooks/useThemeColors.ts
import { useCallback } from "react";
import { useTheme } from "../context/ThemeContext";

export const useThemeColors = () => {
  const {
    theme,
    navTheme,
    colorScheme,
    setColorScheme,
    colorSchemes,
    toggleTheme,
  } = useTheme();
  const isDark = theme === "dark";
  const primaryColor = navTheme.colors.primary;
  const primaryTextColor = "#ffffff";

  const handleColorSchemePress = useCallback(() => {
    const currentIndex = colorSchemes.findIndex((s) => s.name === colorScheme);
    const nextIndex = (currentIndex + 1) % colorSchemes.length;
    setColorScheme(colorSchemes[nextIndex].name);
  }, [colorScheme, colorSchemes, setColorScheme]);

  // Light theme colors (unchanged)
  const lightColors = {
    primary: "#3B82F6",
    secondary: "#1E40AF",
    accent: "#FF6B6B",
    background: { target: "#FFF9E6", highlight: "#EFF6FF", default: "#FFFFFF" },
    border: { target: "#FFD700", highlight: "#3B82F6", default: "#E5E7EB" },
    text: {
      primary: "#1F2937",
      secondary: "#374151",
      verseNumber: "#1E40AF",
      target: "#DC2626",
    },
    muted: "#6B7280",
    card: "#FFFFFF",
  };

  // Dark theme colors (unchanged)
  const darkColors = {
    primary: "#60A5FA",
    secondary: "#3B82F6",
    accent: "#F87171",
    background: { target: "#1F2937", highlight: "#1E3A8A", default: "#111827" },
    border: { target: "#FCD34D", highlight: "#60A5FA", default: "#374151" },
    text: {
      primary: "#F9FAFB",
      secondary: "#D1D5DB",
      verseNumber: "#93C5FD",
      target: "#FECACA",
    },
    muted: "#9CA3AF",
    card: "#111827",
  };

  const themeColors = isDark ? darkColors : lightColors;

  const colors = {
    primary: primaryColor,
    background: themeColors.background,
    text: themeColors.text,
    border: themeColors.border,
    secondary: themeColors.secondary,
    accent: themeColors.accent,
    muted: isDark ? "#9ca3af" : "#6b7280",
    card: isDark ? "#1e293b" : "#ffffff",
  };

  const versionSelectorColors = {
    primary: primaryColor,
    background: themeColors.background.default,
    text: themeColors.text.primary,
    muted: colors.muted,
    card: colors.card,
    border: themeColors.border.default,
    secondary: themeColors.secondary,
    accent: themeColors.accent,
  };

  return {
    colors,
    versionSelectorColors,
    primaryTextColor,
    isDark,
    themeColors, // Inner theme colors object
    theme, // Added this line to fix the error
    handleColorSchemePress,
    toggleTheme,
  };
};
