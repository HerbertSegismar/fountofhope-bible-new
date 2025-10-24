// utils/colorUtils.ts
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

// utils/colorUtils.ts

/**
 * Color utility functions for generating consistent light/dark variants
 */

// Interface for color variants
export interface ColorVariants {
  light: string;
  dark: string;
}

// Interface for gradient colors
export interface GradientColors {
  light: [string, string];
  dark: [string, string];
}

// Main color schemes with their light/dark variants
export const primaryColorSchemes: Record<string, ColorVariants> = {
  purple: { light: "#A855F7", dark: "#9333EA" },
  green: { light: "#10B981", dark: "#059669" },
  red: { light: "#EF4444", dark: "#DC2626" },
  yellow: { light: "#F59E0B", dark: "#D97706" },
};

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

/**
 * Convert hex color to RGB object
 */
export function hexToRgb(hex: string): { r: number; g: number; b: number } {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
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
  return "#" + ((1 << 24) + (r << 16) + (g << 8) + b).toString(16).slice(1);
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
  let h = 0, s = 0, l = (max + min) / 2;

  if (max !== min) {
    const d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    switch (max) {
      case r: h = (g - b) / d + (g < b ? 6 : 0); break;
      case g: h = (b - r) / d + 2; break;
      case b: h = (r - g) / d + 4; break;
    }
    h /= 6;
  }

  // Adjust lightness
  l = Math.max(0, Math.min(1, l + (percent / 100)));

  // Convert back to RGB
  const hue2rgb = (p: number, q: number, t: number): number => {
    if (t < 0) t += 1;
    if (t > 1) t -= 1;
    if (t < 1/6) return p + (q - p) * 6 * t;
    if (t < 1/2) return q;
    if (t < 2/3) return p + (q - p) * (2/3 - t) * 6;
    return p;
  };

  let rOut, gOut, bOut;
  if (s === 0) {
    rOut = gOut = bOut = l;
  } else {
    const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
    const p = 2 * l - q;
    rOut = hue2rgb(p, q, h + 1/3);
    gOut = hue2rgb(p, q, h);
    bOut = hue2rgb(p, q, h - 1/3);
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
    // Analyze the relationship between light and dark variants in existing schemes
    const schemePatterns = Object.values(primaryColorSchemes).map(scheme => {
      const lightRgb = hexToRgb(scheme.light);
      const darkRgb = hexToRgb(scheme.dark);
      
      // Calculate the average lightness difference
      const lightAvg = (lightRgb.r + lightRgb.g + lightRgb.b) / 3;
      const darkAvg = (darkRgb.r + darkRgb.g + darkRgb.b) / 3;
      const lightnessDiff = lightAvg - darkAvg;
      
      return {
        baseLightness: (lightAvg + darkAvg) / 2,
        lightnessDiff,
        // Calculate saturation and hue preservation patterns
        saturationRatio: calculateSaturationRatio(scheme.light, scheme.dark),
      };
    });

    // Calculate average patterns
    const avgLightnessDiff = schemePatterns.reduce((sum, pattern) => sum + pattern.lightnessDiff, 0) / schemePatterns.length;
    const avgSaturationRatio = schemePatterns.reduce((sum, pattern) => sum + pattern.saturationRatio, 0) / schemePatterns.length;

    // Generate variants based on patterns
    const baseRgb = hexToRgb(baseColor);
    const baseLightness = (baseRgb.r + baseRgb.g + baseRgb.b) / 3;
    
    // Calculate light variant (brighter)
    const lightVariant = adjustLightness(baseColor, 15); // Make 15% lighter
    
    // Calculate dark variant (darker)
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
    console.warn('Error calculating custom color variants, using fallback:', error);
    // Fallback to purple scheme if calculation fails
    return {
      variants: primaryColorSchemes.purple,
      gradients: gradientSchemes.purple,
    };
  }
}

/**
 * Calculate saturation ratio between two colors
 */
function calculateSaturationRatio(color1: string, color2: string): number {
  const rgb1 = hexToRgb(color1);
  const rgb2 = hexToRgb(color2);
  
  const max1 = Math.max(rgb1.r, rgb1.g, rgb1.b);
  const min1 = Math.min(rgb1.r, rgb1.g, rgb1.b);
  const saturation1 = max1 === 0 ? 0 : (max1 - min1) / max1;
  
  const max2 = Math.max(rgb2.r, rgb2.g, rgb2.b);
  const min2 = Math.min(rgb2.r, rgb2.g, rgb2.b);
  const saturation2 = max2 === 0 ? 0 : (max2 - min2) / max2;
  
  return saturation1 / saturation2;
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
  return isLightColor(backgroundColor) ? '#000000' : '#FFFFFF';
}

/**
 * Generate a palette of colors from a base color
 */
export function generateColorPalette(baseColor: string): {
  50: string;  // lightest
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
