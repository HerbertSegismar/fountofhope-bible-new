// file: src/utils/themeUtils.ts
import { ColorScheme, Theme } from "../context/ThemeContext";

export const primaryColors: Record<
  ColorScheme,
  { light: string; dark: string }
> = {
  purple: { light: "#A855F7", dark: "#9333EA" },
  green: { light: "#10B981", dark: "#059669" },
  red: { light: "#EF4444", dark: "#DC2626" },
  yellow: { light: "#F59E0B", dark: "#D97706" },
};

export const BASE_LIGHT_THEME_COLORS = {
  card: "#FFFFFF",
  background: "#FFFFFF",
  surface: "#F8F9FA",
  textPrimary: "#1F2937",
  textSecondary: "#374151",
  textMuted: "#6C757D",
  highlightBg: "#FFF3CD",
  highlightBorder: "#FFD700",
  highlightText: "#8B4513",
  highlightIcon: "#B8860B",
  tagBg: "rgba(0,255,0,0.1)",
  searchHighlightBg: "#FFFF99",
  border: "#E9ECEF",
} as const;

export const BASE_DARK_THEME_COLORS = {
  card: "#111827",
  background: "#111827",
  surface: "#1F2937",
  textPrimary: "#F9FAFB",
  textSecondary: "#D1D5DB",
  textMuted: "#9CA3AF",
  highlightBg: "#1F2937",
  highlightBorder: "#FCD34D",
  highlightText: "#FECACA",
  highlightIcon: "#FCD34D",
  tagBg: "rgba(255,255,0.1)",
  searchHighlightBg: "#374151",
  border: "#374151",
} as const;

type BaseThemeColors =
  | typeof BASE_LIGHT_THEME_COLORS
  | typeof BASE_DARK_THEME_COLORS;

export const getThemeColors = (
  theme: Theme,
  colorScheme: ColorScheme
): ThemeColors => {
  const primary =
    primaryColors[colorScheme][theme === "dark" ? "dark" : "light"];
  const baseColors =
    theme === "dark" ? BASE_DARK_THEME_COLORS : BASE_LIGHT_THEME_COLORS;

  const getLighterColor = (hex: string, amount: number = 50): string => {
    const num = parseInt(hex.replace("#", ""), 16);
    const amt = Math.round(2.55 * amount);
    const R = (num >> 16) + amt;
    const G = ((num >> 8) & 0x00ff) + amt;
    const B = (num & 0x0000ff) + amt;
    return (
      "#" +
      (
        0x1000000 +
        (R < 255 ? (R < 1 ? 0 : R) : 255) * 0x10000 +
        (G < 255 ? (G < 1 ? 0 : G) : 255) * 0x100 +
        (B < 255 ? (B < 1 ? 0 : B) : 255)
      )
        .toString(16)
        .slice(1)
    );
  };

  const lighterPrimary = getLighterColor(primary, theme === "dark" ? 40 : -10);

  return {
    ...baseColors,
    primary,
    verseNumber: lighterPrimary,
    tagColor: primary,
  } as const;
};

export type ThemeColors = BaseThemeColors & {
  primary: string;
  verseNumber: string;
  tagColor: string;
};
