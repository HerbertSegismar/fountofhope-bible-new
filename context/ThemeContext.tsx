import React, {
  createContext,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";

export type ColorScheme = "purple" | "green" | "red" | "yellow";
export type Theme = "light" | "dark";

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
      from: "from-red-400",
      to: "to-orange-300",
      bg: "bg-gradient-to-r from-red-400 to-orange-300",
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


interface ThemeContextType {
  theme: Theme;
  colorScheme: ColorScheme;
  colorSchemes: typeof colorSchemes;
  toggleTheme: () => void;
  setColorScheme: (scheme: ColorScheme) => void;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

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
  const [isReady, setIsReady] = useState(false);

  // Load saved values from AsyncStorage
  useEffect(() => {
    const loadSavedValues = async () => {
      try {
        const [savedTheme, savedScheme] = await Promise.all([
          AsyncStorage.getItem("theme"),
          AsyncStorage.getItem("colorScheme"),
        ]);

        if (savedTheme) setTheme(savedTheme as Theme);
        if (savedScheme) setColorScheme(savedScheme as ColorScheme);
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

  const toggleTheme = () => {
    setTheme((prev) => (prev === "light" ? "dark" : "light"));
  };

  const value: ThemeContextType = {
    theme,
    colorScheme,
    colorSchemes,
    toggleTheme,
    setColorScheme,
  };

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
        gradient: "from-red-500 to-orange-400",
        text: "text-red-400",
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
