// file: src/utils/themeUtils.ts
import { ColorScheme, Theme } from "../context/ThemeContext";

// Interfaces
export interface ColorVariants {
  light: string;
  dark: string;
}

export interface GradientColors {
  light: [string, string];
  dark: [string, string];
}

export type ThemeColors = BaseThemeColors & {
  primary: string;
  verseNumber: string;
  tagColor: string;
};

// Color schemes with light/dark variants
export const primaryColorSchemes: Record<string, ColorVariants> = {
  purple: { light: "#A855F7", dark: "#9333EA" },
  green: { light: "#10B981", dark: "#059669" },
  red: { light: "#EF4444", dark: "#DC2626" },
  yellow: { light: "#F59E0B", dark: "#D97706" },
  custom: { light: "#A855F7", dark: "#9333EA" }, // Will be overridden dynamically
};

// Legacy primaryColors for backward compatibility
export const primaryColors = primaryColorSchemes;

// Gradient schemes
export const gradientSchemes: Record<string, GradientColors> = {
  purple: {
    light: ["#c084fc", "#93c5fd"],
    dark: ["#a78bfa", "#60a5fa"],
  },
  green: {
    light: ["#4ade80", "#5eead4"],
    dark: ["#22c55e", "#2dd4bf"],
  },
  red: {
    light: ["#fca5a5", "#fdba74"],
    dark: ["#ef4444", "#fb923c"],
  },
  yellow: {
    light: ["#facc15", "#fcd34d"],
    dark: ["#eab308", "#fbbf24"],
  },
};

// Base theme colors
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

// Color Conversion Functions
/**
 * Convert hex color to RGB object
 */
export function hexToRgb(hex: string): { r: number; g: number; b: number } {
  // Remove # if present and validate
  const cleanHex = hex.replace("#", "");

  if (cleanHex.length !== 6 && cleanHex.length !== 3) {
    throw new Error(`Invalid hex color: ${hex}`);
  }

  // Expand 3-digit hex to 6-digit
  const fullHex =
    cleanHex.length === 3
      ? cleanHex
          .split("")
          .map((char) => char + char)
          .join("")
      : cleanHex;

  const result = /^([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(fullHex);
  if (!result) {
    throw new Error(`Invalid hex color: ${hex}`);
  }

  return {
    r: parseInt(result[1], 16),
    g: parseInt(result[2], 16),
    b: parseInt(result[3], 16),
  };
}

/**
 * Convert RGB to hex color
 */
export function rgbToHex(r: number, g: number, b: number): string {
  return (
    "#" +
    ((1 << 24) + (r << 16) + (g << 8) + b).toString(16).slice(1).toUpperCase()
  );
}

/**
 * Adjust the lightness of a color by a percentage
 */
export function adjustLightness(hex: string, percent: number): string {
  const rgb = hexToRgb(hex);

  // Convert RGB to HSL
  const r = rgb.r / 255;
  const g = rgb.g / 255;
  const b = rgb.b / 255;
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  let h = 0,
    s = 0,
    l = (max + min) / 2;

  if (max !== min) {
    const d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    switch (max) {
      case r:
        h = (g - b) / d + (g < b ? 6 : 0);
        break;
      case g:
        h = (b - r) / d + 2;
        break;
      case b:
        h = (r - g) / d + 4;
        break;
    }
    h /= 6;
  }

  // Adjust lightness
  l = Math.max(0, Math.min(1, l + percent / 100));

  // Convert back to RGB
  const hue2rgb = (p: number, q: number, t: number): number => {
    if (t < 0) t += 1;
    if (t > 1) t -= 1;
    if (t < 1 / 6) return p + (q - p) * 6 * t;
    if (t < 1 / 2) return q;
    if (t < 2 / 3) return p + (q - p) * (2 / 3 - t) * 6;
    return p;
  };

  let rOut, gOut, bOut;
  if (s === 0) {
    rOut = gOut = bOut = l;
  } else {
    const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
    const p = 2 * l - q;
    rOut = hue2rgb(p, q, h + 1 / 3);
    gOut = hue2rgb(p, q, h);
    bOut = hue2rgb(p, q, h - 1 / 3);
  }

  return rgbToHex(
    Math.round(rOut * 255),
    Math.round(gOut * 255),
    Math.round(bOut * 255)
  );
}

/**
 * Calculate light and dark variants for a custom color based on the pattern of existing schemes
 */
export function calculateCustomColorVariants(baseColor: string): {
  variants: ColorVariants;
  gradients: GradientColors;
} {
  try {
    // Generate variants based on patterns
    const lightVariant = adjustLightness(baseColor, 15); // Make 15% lighter
    const darkVariant = adjustLightness(baseColor, -15); // Make 15% darker

    // Generate gradients based on the custom color
    const gradients: GradientColors = {
      light: [
        adjustLightness(baseColor, 10), // Slightly lighter
        adjustLightness(baseColor, -5), // Slightly darker
      ],
      dark: [
        adjustLightness(baseColor, -10), // Slightly darker
        adjustLightness(baseColor, -25), // Even darker
      ],
    };

    return {
      variants: {
        light: lightVariant,
        dark: darkVariant,
      },
      gradients,
    };
  } catch (error) {
    console.warn(
      "Error calculating custom color variants, using fallback:",
      error
    );
    // Fallback to purple scheme if calculation fails
    return {
      variants: primaryColorSchemes.purple,
      gradients: gradientSchemes.purple,
    };
  }
}

/**
 * Get complementary color for a given color
 */
export function getComplementaryColor(hex: string): string {
  const rgb = hexToRgb(hex);
  return rgbToHex(255 - rgb.r, 255 - rgb.g, 255 - rgb.b);
}

/**
 * Check if a color is light (for determining text color)
 */
export function isLightColor(hex: string): boolean {
  const rgb = hexToRgb(hex);
  // Calculate relative luminance
  const luminance = (0.299 * rgb.r + 0.587 * rgb.g + 0.114 * rgb.b) / 255;
  return luminance > 0.5;
}

/**
 * Generate accessible text color for a background
 */
export function getAccessibleTextColor(backgroundColor: string): string {
  return isLightColor(backgroundColor) ? "#000000" : "#FFFFFF";
}

/**
 * Generate a palette of colors from a base color
 */
export function generateColorPalette(baseColor: string): {
  50: string; // lightest
  100: string;
  200: string;
  300: string;
  400: string;
  500: string; // base
  600: string;
  700: string;
  800: string;
  900: string; // darkest
} {
  return {
    50: adjustLightness(baseColor, 40),
    100: adjustLightness(baseColor, 30),
    200: adjustLightness(baseColor, 20),
    300: adjustLightness(baseColor, 10),
    400: adjustLightness(baseColor, 5),
    500: baseColor,
    600: adjustLightness(baseColor, -5),
    700: adjustLightness(baseColor, -10),
    800: adjustLightness(baseColor, -20),
    900: adjustLightness(baseColor, -30),
  };
}

// Legacy Functions (for backward compatibility)
/**
 * @deprecated Use adjustLightness instead
 * Generate lighter/darker variants for verseNumber, tagColor, etc.
 */
export const getLighterColor = (hex: string, amount: number = 50): string => {
  // Add validation for hex parameter
  if (!hex || typeof hex !== "string" || !hex.startsWith("#")) {
    console.warn("Invalid hex color provided to getLighterColor:", hex);
    return "#3B82F6"; // Fallback color
  }

  try {
    // Convert to percentage for adjustLightness
    const percent = amount > 0 ? amount * 0.5 : amount; // Scale down for better results
    return adjustLightness(hex, percent);
  } catch (error) {
    console.warn("Error in getLighterColor:", error);
    return "#3B82F6"; // Fallback color
  }
};

/**
 * Lighten color with transparency (for rgba)
 */
export const lightenColor = (
  color: string,
  amount = 0.15
): string | undefined => {
  if (!color) return undefined;
  if (color.startsWith("#") && (color.length === 7 || color.length === 4)) {
    let r, g, b;
    if (color.length === 7) {
      r = parseInt(color.slice(1, 3), 16);
      g = parseInt(color.slice(3, 5), 16);
      b = parseInt(color.slice(5, 7), 16);
    } else {
      r = parseInt(color[1] + color[1], 16);
      g = parseInt(color[2] + color[2], 16);
      b = parseInt(color[3] + color[3], 16);
    }
    return `rgba(${r}, ${g}, ${b}, ${amount})`;
  }
  return color;
};

// Theme Functions
/**
 * Get primary color with custom color support
 */
export const getPrimaryColor = (
  theme: Theme,
  colorScheme: ColorScheme,
  customColor?: string
): string => {
  if (colorScheme === "custom" && customColor) {
    return customColor;
  }
  return primaryColorSchemes[colorScheme][theme === "dark" ? "dark" : "light"];
};

/**
 * Main theme colors function with custom color support
 */
export const getThemeColors = (
  theme: Theme,
  colorScheme: ColorScheme,
  customColor?: string
): ThemeColors => {
  const primary = getPrimaryColor(theme, colorScheme, customColor);
  const baseColors =
    theme === "dark" ? BASE_DARK_THEME_COLORS : BASE_LIGHT_THEME_COLORS;

  const verseNumber = adjustLightness(primary, theme === "dark" ? 20 : -15);

  return {
    ...baseColors,
    primary,
    verseNumber,
    tagColor: primary,
  } as const;
};

/**
 * Helper function to determine text color based on background color
 * Updated to use hexToRgb instead of deprecated substr
 */
export const getContrastColor = (
  backgroundColor: string,
  themeColors: ThemeColors
): string => {
  // Default to theme text primary if no background color
  if (!backgroundColor) return themeColors.textPrimary;

  try {
    const rgb = hexToRgb(backgroundColor);

    // Calculate luminance
    const luminance = (0.299 * rgb.r + 0.587 * rgb.g + 0.114 * rgb.b) / 255;

    // Return dark text for light colors, light text for dark colors
    return luminance > 0.5
      ? themeColors.textSecondary
      : themeColors.textPrimary;
  } catch (error) {
    console.warn("Error calculating contrast color:", error);
    return themeColors.textPrimary;
  }
};

/**
 * Update primary colors for custom scheme
 */
export const updateCustomPrimaryColors = (customColor: string) => {
  primaryColorSchemes.custom.light = customColor;
  primaryColorSchemes.custom.dark = customColor;
};

/**
 * Get color classes for Tailwind (for components that use className)
 */
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
