// Alternative hooks/useThemeColors.ts with backward compatibility
import { useCallback, useMemo } from "react";
import { useTheme } from "../context/ThemeContext";
import { getThemeColors, type ThemeColors } from "../utils/themeUtils";

export const useThemeColors = () => {
  const {
    theme,
    navTheme,
    colorScheme,
    customColor,
    setColorScheme,
    colorSchemes,
    toggleTheme,
  } = useTheme();

  const isDark = theme === "dark";
  const primaryColor = navTheme.colors.primary;
  const primaryTextColor = "#ffffff";

  // Get the base theme colors
  const baseThemeColors = useMemo(
    () => getThemeColors(theme, colorScheme, customColor),
    [theme, colorScheme, customColor]
  );

  const handleColorSchemePress = useCallback(() => {
    const currentIndex = colorSchemes.findIndex((s) => s.name === colorScheme);
    const nextIndex = (currentIndex + 1) % colorSchemes.length;
    setColorScheme(colorSchemes[nextIndex].name);
  }, [colorScheme, colorSchemes, setColorScheme]);

  // Light theme colors (customized for your app)
  const lightColors = useMemo(
    () => ({
      primary: primaryColor,
      secondary: baseThemeColors.verseNumber,
      accent: baseThemeColors.tagColor,
      background: {
        target: baseThemeColors.highlightBg,
        highlight: baseThemeColors.surface,
        default: baseThemeColors.background,
      },
      border: {
        target: baseThemeColors.highlightBorder,
        highlight: primaryColor,
        default: baseThemeColors.border,
      },
      text: {
        primary: baseThemeColors.textPrimary,
        secondary: baseThemeColors.textSecondary,
        verseNumber: baseThemeColors.verseNumber,
        target: baseThemeColors.highlightText,
      },
      muted: baseThemeColors.textMuted,
      card: baseThemeColors.card,
    }),
    [primaryColor, baseThemeColors]
  );

  // Dark theme colors (customized for your app)
  const darkColors = useMemo(
    () => ({
      primary: primaryColor,
      secondary: baseThemeColors.verseNumber,
      accent: baseThemeColors.tagColor,
      background: {
        target: baseThemeColors.highlightBg,
        highlight: baseThemeColors.surface,
        default: baseThemeColors.background,
      },
      border: {
        target: baseThemeColors.highlightBorder,
        highlight: primaryColor,
        default: baseThemeColors.border,
      },
      text: {
        primary: baseThemeColors.textPrimary,
        secondary: baseThemeColors.textSecondary,
        verseNumber: baseThemeColors.verseNumber,
        target: baseThemeColors.highlightText,
      },
      muted: baseThemeColors.textMuted,
      card: baseThemeColors.card,
    }),
    [primaryColor, baseThemeColors]
  );

  const themeColors = isDark ? darkColors : lightColors;

  const colors = themeColors;

  const versionSelectorColors = useMemo(
    () => ({
      primary: primaryColor,
      background: baseThemeColors.background,
      text: baseThemeColors.textPrimary,
      muted: baseThemeColors.textMuted,
      card: baseThemeColors.card,
      border: baseThemeColors.border,
      secondary: baseThemeColors.verseNumber,
      accent: baseThemeColors.tagColor,
    }),
    [primaryColor, baseThemeColors]
  );

  return {
    colors,
    versionSelectorColors,
    primaryTextColor,
    isDark,
    themeColors: colors, // For backward compatibility
    theme,
    handleColorSchemePress,
    toggleTheme,
    colorScheme,
    customColor,
  };
};
