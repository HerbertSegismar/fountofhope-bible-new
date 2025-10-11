import React, {
  createContext,
  useContext,
  useEffect,
  useState,
  type ReactNode,
  useMemo,
} from "react";
import {
  DefaultTheme,
  DarkTheme,
  Theme as NavTheme,
} from "@react-navigation/native";
import AsyncStorage from "@react-native-async-storage/async-storage";

export type ColorScheme = "purple" | "green" | "red" | "yellow";
export type Theme = "light" | "dark";
export type FontFamily = "system" | "serif" | "sans-serif";

export const colorSchemes = [
  {
    name: "purple" as const,
    light: {
      from: "from-purple-400",
      to: "to-blue-300",
      bg: "bg-gradient-to-r from-purple-400 to-blue-300",
    },
    dark: {
      from: "from-purple-500",
      to: "to-blue-400",
      bg: "bg-gradient-to-r from-purple-500 to-blue-400",
    },
  },
  {
    name: "green" as const,
    light: {
      from: "from-green-400",
      to: "to-teal-300",
      bg: "bg-gradient-to-r from-green-400 to-teal-300",
    },
    dark: {
      from: "from-green-500",
      to: "to-teal-400",
      bg: "bg-gradient-to-r from-green-500 to-teal-400",
    },
  },
  {
    name: "red" as const,
    light: {
      from: "from-red-300",
      to: "to-orange-300",
      bg: "bg-gradient-to-r from-red-300 to-orange-300",
    },
    dark: {
      from: "from-red-500",
      to: "to-orange-400",
      bg: "bg-gradient-to-r from-red-500 to-orange-400",
    },
  },
  {
    name: "yellow" as const,
    light: {
      from: "from-yellow-300",
      to: "to-amber-500",
      bg: "bg-gradient-to-r from-yellow-400 to-amber-300",
    },
    dark: {
      from: "from-yellow-500",
      to: "to-amber-400",
      bg: "bg-gradient-to-r from-yellow-500 to-amber-400",
    },
  },
];

const primaryColors: Record<ColorScheme, { light: string; dark: string }> = {
  purple: { light: "#A855F7", dark: "#9333EA" },
  green: { light: "#10B981", dark: "#059669" },
  red: { light: "#c64141ff", dark: "#d44545ff" },
  yellow: { light: "#F59E0B", dark: "#D97706" },
};

const gradientMap: Record<
  ColorScheme,
  { light: [string, string]; dark: [string, string] }
> = {
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

type GradientColors = [string, string];

interface ThemeContextType {
  theme: Theme;
  colorScheme: ColorScheme;
  fontFamily: FontFamily;
  colorSchemes: typeof colorSchemes;
  navTheme: NavTheme;
  gradientColors: GradientColors;
  toggleTheme: () => void;
  setColorScheme: (scheme: ColorScheme) => void;
  setFontFamily: (family: FontFamily) => void;
}

export const ThemeContext = createContext<ThemeContextType | undefined>(
  undefined
);

export const useTheme = () => {
  const context = useContext(ThemeContext);
  if (context === undefined) {
    throw new Error("useTheme must be used within a ThemeProvider");
  }
  return context;
};

interface ThemeProviderProps {
  children: ReactNode;
}

export const ThemeProvider: React.FC<ThemeProviderProps> = ({ children }) => {
  const [theme, setTheme] = useState<Theme>("light");
  const [colorScheme, setColorScheme] = useState<ColorScheme>("green");
  const [fontFamily, setFontFamily] = useState<FontFamily>("system");
  const [isReady, setIsReady] = useState(false);

  // Load saved values from AsyncStorage
  useEffect(() => {
    const loadSavedValues = async () => {
      try {
        const [savedTheme, savedScheme, savedFont] = await Promise.all([
          AsyncStorage.getItem("theme"),
          AsyncStorage.getItem("colorScheme"),
          AsyncStorage.getItem("fontFamily"),
        ]);

        if (savedTheme) setTheme(savedTheme as Theme);
        if (savedScheme) setColorScheme(savedScheme as ColorScheme);
        if (savedFont) setFontFamily(savedFont as FontFamily);
      } catch (error) {
        console.error("Failed to load theme settings:", error);
      } finally {
        setIsReady(true);
      }
    };

    loadSavedValues();
  }, []);

  // Sync theme with AsyncStorage
  useEffect(() => {
    if (!isReady) return;

    const saveTheme = async () => {
      try {
        await AsyncStorage.setItem("theme", theme);
      } catch (error) {
        console.error("Failed to save theme:", error);
      }
    };

    saveTheme();
  }, [theme, isReady]);

  // Sync colorScheme with AsyncStorage
  useEffect(() => {
    if (!isReady) return;

    const saveColorScheme = async () => {
      try {
        await AsyncStorage.setItem("colorScheme", colorScheme);
      } catch (error) {
        console.error("Failed to save color scheme:", error);
      }
    };

    saveColorScheme();
  }, [colorScheme, isReady]);

  // Sync fontFamily with AsyncStorage
  useEffect(() => {
    if (!isReady) return;

    const saveFontFamily = async () => {
      try {
        await AsyncStorage.setItem("fontFamily", fontFamily);
      } catch (error) {
        console.error("Failed to save font family:", error);
      }
    };

    saveFontFamily();
  }, [fontFamily, isReady]);

  const primaryColor =
    primaryColors[colorScheme][theme === "dark" ? "dark" : "light"];

  const gradientColors = useMemo(
    () => gradientMap[colorScheme][theme],
    [colorScheme, theme]
  );

  const baseNavTheme = theme === "dark" ? DarkTheme : DefaultTheme;

  const navTheme: NavTheme = {
    dark: baseNavTheme.dark,
    colors: {
      ...baseNavTheme.colors,
      primary: primaryColor,
    },
    fonts: {
      regular: {
        fontFamily: "",
        fontWeight: "bold",
      },
      medium: {
        fontFamily: "",
        fontWeight: "bold",
      },
      bold: {
        fontFamily: "",
        fontWeight: "bold",
      },
      heavy: {
        fontFamily: "",
        fontWeight: "bold",
      },
    },
  };

  const toggleTheme = () => {
    setTheme((prev) => (prev === "light" ? "dark" : "light"));
  };

  const value: ThemeContextType = {
    theme,
    colorScheme,
    fontFamily,
    colorSchemes,
    navTheme,
    gradientColors,
    toggleTheme,
    setColorScheme,
    setFontFamily,
  };

  if (!isReady) {
    return null; // or a loading component
  }

  return (
    <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>
  );
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
    default:
      return {
        gradient: "from-purple-500 to-blue-400",
        text: "text-purple-400",
        lightBg: "bg-purple-100",
        lightBorder: "border-purple-100",
      };
  }
};
