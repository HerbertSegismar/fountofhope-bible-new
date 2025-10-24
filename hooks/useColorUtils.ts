// hooks/useColorUtils.ts
import { useTheme } from "../context/ThemeContext";
import {
  calculateCustomColorVariants,
  generateColorPalette,
  getAccessibleTextColor,
  type ColorVariants,
} from "../utils/colorUtils";

export const useColorUtils = () => {
  const { colorScheme, customColor } = useTheme();

  const getCurrentColorVariants = (): ColorVariants => {
    if (colorScheme === "custom") {
      return calculateCustomColorVariants(customColor).variants;
    }

    // For predefined schemes, return their variants
    const schemes = {
      purple: { light: "#A855F7", dark: "#9333EA" },
      green: { light: "#10B981", dark: "#059669" },
      red: { light: "#EF4444", dark: "#DC2626" },
      yellow: { light: "#F59E0B", dark: "#D97706" },
    };

    return schemes[colorScheme];
  };

  const getCurrentColorPalette = () => {
    const baseColor =
      colorScheme === "custom" ? customColor : getCurrentColorVariants().light;

    return generateColorPalette(baseColor);
  };

  return {
    getCurrentColorVariants,
    getCurrentColorPalette,
    getAccessibleTextColor,
    calculateCustomColorVariants,
  };
};
