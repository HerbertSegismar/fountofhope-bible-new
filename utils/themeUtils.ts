import { ColorScheme, Theme } from "../context/ThemeContext";

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

export const primaryColorSchemes: Record<string, ColorVariants> = {
  purple: { light: "#A855F7", dark: "#9333EA" },
  green: { light: "#10B981", dark: "#059669" },
  red: { light: "#EF4444", dark: "#DC2626" },
  yellow: { light: "#F59E0B", dark: "#D97706" },
  custom: { light: "#A855F7", dark: "#9333EA" },
};

export const primaryColors = primaryColorSchemes;

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

export const BASE_LIGHT_THEME_COLORS = {
  card: "#FFFFFF",
  background: "#FFFFFF",
  surface: "#F8F9FA",
  textPrimary: "#1F2937",
  textSecondary: "#374151",
  textMuted: "#6C757D",
  highlightBg: "#9ef496ff",
  highlightBorder: "#FFD700",
  highlightIcon: "#409851ff",
  tagBg: "rgba(0,255,0,0.1)",
  searchHighlightBg: "#FFFF99",
  border: "#E9ECEF",
  wordsOfJesus: "#de4924ff",
  highlightText: "#108828ff",
} as const;

export const BASE_DARK_THEME_COLORS = {
  card: "#111827",
  background: "#111827",
  surface: "#1F2937",
  textPrimary: "#F9FAFB",
  textSecondary: "#D1D5DB",
  textMuted: "#9CA3AF",
  highlightBg: "#624894ff",
  highlightBorder: "#FCD34D",
  highlightIcon: "#FCD34D",
  tagBg: "rgba(255,255,0.1)",
  searchHighlightBg: "#c7a44cff",
  border: "#374151",
  wordsOfJesus: "#d5520bff",
  highlightText: "#c7a44cff",
} as const;

type BaseThemeColors =
  | typeof BASE_LIGHT_THEME_COLORS
  | typeof BASE_DARK_THEME_COLORS;

export function hexToRgb(hex: string): { r: number; g: number; b: number } {
  const cleanHex = hex.replace("#", "");

  if (cleanHex.length !== 6 && cleanHex.length !== 3) {
    throw new Error(`Invalid hex color: ${hex}`);
  }

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

export function rgbToHex(r: number, g: number, b: number): string {
  return (
    "#" +
    ((1 << 24) + (r << 16) + (g << 8) + b).toString(16).slice(1).toUpperCase()
  );
}

export function adjustLightness(hex: string, percent: number): string {
  const rgb = hexToRgb(hex);

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

  l = Math.max(0, Math.min(1, l + percent / 100));

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

export function calculateCustomColorVariants(baseColor: string): {
  variants: ColorVariants;
  gradients: GradientColors;
} {
  try {
    const lightVariant = adjustLightness(baseColor, 15);
    const darkVariant = adjustLightness(baseColor, -15);

    const gradients: GradientColors = {
      light: [
        adjustLightness(baseColor, 10),
        adjustLightness(baseColor, -5),
      ],
      dark: [
        adjustLightness(baseColor, -10),
        adjustLightness(baseColor, -25),
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
    return {
      variants: primaryColorSchemes.purple,
      gradients: gradientSchemes.purple,
    };
  }
}

export function getComplementaryColor(hex: string): string {
  const rgb = hexToRgb(hex);
  return rgbToHex(255 - rgb.r, 255 - rgb.g, 255 - rgb.b);
}

export function isLightColor(hex: string): boolean {
  const rgb = hexToRgb(hex);
  const luminance = (0.299 * rgb.r + 0.587 * rgb.g + 0.114 * rgb.b) / 255;
  return luminance > 0.5;
}

export function getAccessibleTextColor(backgroundColor: string): string {
  return isLightColor(backgroundColor) ? "#000000" : "#FFFFFF";
}

export function generateColorPalette(baseColor: string): {
  50: string; 
  100: string;
  200: string;
  300: string;
  400: string;
  500: string; 
  600: string;
  700: string;
  800: string;
  900: string;
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

export const getLighterColor = (hex: string, amount: number = 50): string => {
  if (!hex || typeof hex !== "string" || !hex.startsWith("#")) {
    return "#3B82F6"; 
  }

  try {
    const percent = amount > 0 ? amount * 0.5 : amount;
    return adjustLightness(hex, percent);
  } catch (error) {
    return "#3B82F6";
  }
};

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

export const getContrastColor = (
  backgroundColor: string,
  themeColors: ThemeColors
): string => {
  if (!backgroundColor) return themeColors.textPrimary;

  try {
    const rgb = hexToRgb(backgroundColor);
    const luminance = (0.299 * rgb.r + 0.587 * rgb.g + 0.114 * rgb.b) / 255;
    return luminance > 0.5
      ? themeColors.textSecondary
      : themeColors.textPrimary;
  } catch (error) {
    return themeColors.textPrimary;
  }
};

export const updateCustomPrimaryColors = (customColor: string) => {
  primaryColorSchemes.custom.light = customColor;
  primaryColorSchemes.custom.dark = customColor;
};

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
        gradient: "from-purple-500 to-blue-400",
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
