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
  custom: { light: "#A855F7", dark: "#9333EA" }, // Will be overridden dynamically
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

// Generate lighter/darker variants for verseNumber, tagColor, etc.
export const getLighterColor = (hex: string, amount: number = 50): string => {
  // Add validation for hex parameter
  if (!hex || typeof hex !== "string" || !hex.startsWith("#")) {
    console.warn("Invalid hex color provided to getLighterColor:", hex);
    return "#3B82F6"; // Fallback color
  }

  try {
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
  } catch (error) {
    console.warn("Error in getLighterColor:", error);
    return "#3B82F6"; // Fallback color
  }
};

// Get primary color with custom color support
export const getPrimaryColor = (
  theme: Theme,
  colorScheme: ColorScheme,
  customColor?: string
): string => {
  if (colorScheme === "custom" && customColor) {
    return customColor;
  }
  return primaryColors[colorScheme][theme === "dark" ? "dark" : "light"];
};

// Main theme colors function with custom color support
export const getThemeColors = (
  theme: Theme,
  colorScheme: ColorScheme,
  customColor?: string
): ThemeColors => {
  const primary = getPrimaryColor(theme, colorScheme, customColor);
  const baseColors =
    theme === "dark" ? BASE_DARK_THEME_COLORS : BASE_LIGHT_THEME_COLORS;

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

// Helper function to determine text color based on background color
export const getContrastColor = (
  backgroundColor: string,
  themeColors: ThemeColors
): string => {
  // Default to theme text primary if no background color
  if (!backgroundColor) return themeColors.textPrimary;

  try {
    // Convert hex color to RGB
    const hex = backgroundColor.replace("#", "");
    if (hex.length !== 6) return themeColors.textPrimary;

    const r = parseInt(hex.substr(0, 2), 16);
    const g = parseInt(hex.substr(2, 2), 16);
    const b = parseInt(hex.substr(4, 2), 16);

    // Calculate luminance
    const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255;

    // Return dark text for light colors, light text for dark colors
    return luminance > 0.5
      ? themeColors.textSecondary
      : themeColors.textPrimary;
  } catch (error) {
    console.warn("Error calculating contrast color:", error);
    return themeColors.textPrimary;
  }
};

// Check if a color is light (for determining text color)
export const isLightColor = (hex: string): boolean => {
  try {
    const rgb = hexToRgb(hex);
    // Calculate relative luminance
    const luminance = (0.299 * rgb.r + 0.587 * rgb.g + 0.114 * rgb.b) / 255;
    return luminance > 0.5;
  } catch (error) {
    console.warn("Error checking if color is light:", error);
    return false;
  }
};

// Convert hex color to RGB object
export const hexToRgb = (hex: string): { r: number; g: number; b: number } => {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  if (!result) {
    throw new Error(`Invalid hex color: ${hex}`);
  }
  return {
    r: parseInt(result[1], 16),
    g: parseInt(result[2], 16),
    b: parseInt(result[3], 16),
  };
};

// Convert RGB to hex color
export const rgbToHex = (r: number, g: number, b: number): string => {
  return "#" + ((1 << 24) + (r << 16) + (g << 8) + b).toString(16).slice(1);
};

// Generate accessible text color for a background
export const getAccessibleTextColor = (backgroundColor: string): string => {
  return isLightColor(backgroundColor) ? "#000000" : "#FFFFFF";
};

// Update primary colors for custom scheme
export const updateCustomPrimaryColors = (customColor: string) => {
  primaryColors.custom.light = customColor;
  primaryColors.custom.dark = customColor;
};

// Get color classes for Tailwind (for components that use className)
export const getColorClasses = (colorScheme: string) => {
  switch (colorScheme) {
    case "green":
      return {
        gradient: "from-green-500 to-teal-400",
        text: "text-green-400",
        lightBg: "bg-green-100",
        lightBorder: "border-green-100",
      };
    case "red":
      return {
        gradient: "from-red-400 to-orange-300",
        text: "text-red-700",
        lightBg: "bg-red-100",
        lightBorder: "border-red-100",
      };
    case "yellow":
      return {
        gradient: "from-yellow-300 to-amber-500",
        text: "text-yellow-500",
        lightBg: "bg-yellow-100",
        lightBorder: "border-yellow-100",
      };
    case "custom":
      return {
        gradient: "from-purple-500 to-blue-400", // Fallback
        text: "text-purple-400",
        lightBg: "bg-purple-100",
        lightBorder: "border-purple-100",
      };
    default:
      return {
        gradient: "from-purple-500 to-blue-400",
        text: "text-purple-400",
        lightBg: "bg-purple-100",
        lightBorder: "border-purple-100",
      };
  }
};
