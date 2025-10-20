import React, { useEffect, useState, useMemo } from "react";
import { StatusBar } from "expo-status-bar";
import {
  NavigationContainer,
  useTheme as useNavigationTheme,
} from "@react-navigation/native";
import { createStackNavigator } from "@react-navigation/stack";
import { Ionicons } from "@expo/vector-icons";
import {
  useWindowDimensions,
  View,
  ActivityIndicator,
  Text,
  TouchableOpacity,
  Modal,
  TouchableWithoutFeedback,
} from "react-native";
import * as Font from "expo-font";

import HomeScreen from "./screens/HomeScreen";
import BookListScreen from "./screens/BookListScreen";
import ChapterListScreen from "./screens/ChapterListScreen";
import VerseListScreen from "./screens/VerseListScreen";
import SearchScreen from "./screens/SearchScreen";
import BookmarksScreen from "./screens/BookmarksScreen";
import ReaderScreen from "./screens/ReaderScreen";
import SettingsScreen from "./screens/SettingsScreen";
import "./global.css";

import { Book } from "./types";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { BibleDatabaseProvider } from "./context/BibleDatabaseContext";
import { BookmarksProvider } from "./context/BookmarksContext";
import { VerseMeasurementsProvider } from "./context/VerseMeasurementsContext";
import { HighlightsProvider } from "./context/HighlightsContext";
import { ThemeProvider, useTheme } from "./context/ThemeContext";

import Oswald_Variable from "./assets/Oswald_VariableFont_wght.ttf";
import RubikGlitch_Regular from "./assets/RubikGlitch_Regular.ttf";
import FontLoader from "./components/FontLoader";

export type RootStackParamList = {
  Home: undefined;
  BookList: undefined;
  ChapterList: { book: Book };
  VerseList: { book: Book; chapter: number };
  Reader: { bookId: number; chapter: number; bookName: string; verse?: number };
  Search: undefined;
  Bookmarks: undefined;
  Settings: undefined;
};

// Improved font loading hook with proper TypeScript error handling
function useFonts() {
  const [fontsLoaded, setFontsLoaded] = useState(false);
  const [fontError, setFontError] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;

    async function loadFonts() {
      try {
        console.log("Starting font loading...");

        // Method 1: Try loading with Expo Font
        await Font.loadAsync({
          "Oswald-Variable": Oswald_Variable,
          "RubikGlitch-Regular": RubikGlitch_Regular,
        });

        // Method 2: Wait a bit and check if fonts are really loaded
        await new Promise((resolve) => setTimeout(resolve, 100));

        // Method 3: Verify fonts are available
        if (mounted) {
          // Check if fonts are actually available
          const fontFamilies = await Font.getLoadedFonts();
          console.log("Loaded fonts:", fontFamilies);

          setFontsLoaded(true);
          setFontError(null);
        }
      } catch (error) {
        console.warn("Error loading fonts:", error);
        if (mounted) {
          // Proper TypeScript error handling
          const errorMessage =
            error instanceof Error
              ? error.message
              : "Unknown font loading error";
          setFontError(errorMessage);
          setFontsLoaded(true); // Continue app anyway
        }
      }
    }

    loadFonts();

    // Fallback: If fonts don't load in 3 seconds, continue anyway
    const timeoutId = setTimeout(() => {
      if (mounted && !fontsLoaded) {
        console.warn("Font loading timeout - continuing without custom fonts");
        setFontsLoaded(true);
      }
    }, 3000);

    return () => {
      mounted = false;
      clearTimeout(timeoutId);
    };
  }, []);

  return fontsLoaded;
}

// Simple loading component
function LoadingScreen() {
  return (
    <View className="flex-1 justify-center items-center bg-gray-50">
      <ActivityIndicator size="large" color="#3B82F6" />
      <Text className="text-lg text-gray-600 mt-4">Loading Bible App...</Text>
    </View>
  );
}

// Hook to determine if device is in Portrait mode
function usePortraitMode() {
  const { width, height } = useWindowDimensions();
  return height > width;
}

// Define proper type for Ionicons names
type IoniconName = React.ComponentProps<typeof Ionicons>["name"];

interface MenuItem {
  key: string;
  name: string;
  icon: IoniconName;
  onPress: () => void;
}

// Enhanced Header Actions Component with Conditional Display
function HeaderActions({ navigation }: { navigation: any }) {
  const isPortrait = usePortraitMode();
  const [showDropdown, setShowDropdown] = useState(false);
  const navigationTheme = useNavigationTheme();
  const { toggleTheme, theme, colorScheme, setColorScheme, colorSchemes } =
    useTheme();

  const handleColorSchemePress = () => {
    const currentIndex = colorSchemes.findIndex((s) => s.name === colorScheme);
    const nextIndex = (currentIndex + 1) % colorSchemes.length;
    setColorScheme(colorSchemes[nextIndex].name);
  };

  const menuItems: MenuItem[] = [
    {
      key: "home",
      name: "Home",
      icon: "home",
      onPress: () => navigation.navigate("Home"),
    },
    {
      key: "bible",
      name: "Bible",
      icon: "book",
      onPress: () => navigation.navigate("BookList"),
    },
    {
      key: "search",
      name: "Search",
      icon: "search",
      onPress: () => navigation.navigate("Search"),
    },
    {
      key: "bookmarks",
      name: "Bookmarks",
      icon: "bookmark",
      onPress: () => navigation.navigate("Bookmarks"),
    },
    {
      key: "settings",
      name: "Settings",
      icon: "settings",
      onPress: () => navigation.navigate("Settings"),
    },
    {
      key: "theme",
      name: theme === "light" ? "Dark Mode" : "Light Mode",
      icon: theme === "light" ? "moon" : "sunny",
      onPress: toggleTheme,
    },
    {
      key: "colors",
      name: "Color Scheme",
      icon: "color-palette",
      onPress: handleColorSchemePress,
    },
    {
      key: "close",
      name: "Close",
      icon: "close",
      onPress: () => setShowDropdown(false),
    },
  ];

  const dropdownBgColor = navigationTheme.colors.primary;
  const textColor = "#fff";
  const borderColor = "rgba(255,255,255,0.3)";
  const iconColor = "#fff";

  // In landscape mode, show all icons except close
  if (!isPortrait) {
    return (
      <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
        {menuItems.slice(0, -1).map((item) => (
          <TouchableOpacity
            key={item.key}
            onPress={item.onPress}
            style={{ paddingHorizontal: 8, paddingVertical: 8 }}
          >
            <Ionicons name={item.icon} size={24} color={iconColor} />
          </TouchableOpacity>
        ))}
      </View>
    );
  }

  // In portrait mode, show dropdown menu
  return (
    <View>
      <TouchableOpacity
        onPress={() => setShowDropdown(true)}
        style={{ paddingHorizontal: 8, paddingVertical: 8 }}
      >
        <Ionicons name="ellipsis-vertical" size={24} color={iconColor} />
      </TouchableOpacity>

      <Modal
        visible={showDropdown}
        transparent
        animationType="fade"
        onRequestClose={() => setShowDropdown(false)}
      >
        <TouchableWithoutFeedback onPress={() => setShowDropdown(false)}>
          <View
            style={{
              flex: 1,
              backgroundColor: "transparent",
              justifyContent: "flex-start",
              alignItems: "flex-end",
            }}
          >
            <TouchableWithoutFeedback>
              <View
                style={{
                  backgroundColor: dropdownBgColor,
                  borderRadius: 8,
                  paddingVertical: 8,
                  minWidth: 160,
                  marginTop: 100, // Approximate: StatusBar + Header height (adjust if needed)
                  marginRight: 16,
                  shadowColor: "#000",
                  shadowOffset: { width: 0, height: 2 },
                  shadowOpacity: 0.25,
                  shadowRadius: 4,
                  elevation: 5,
                }}
              >
                {menuItems.map((item, index) => (
                  <TouchableOpacity
                    key={item.key}
                    onPress={() => {
                      item.onPress();
                      if (item.key !== "close") {
                        setShowDropdown(false);
                      }
                    }}
                    style={{
                      flexDirection: "row",
                      alignItems: "center",
                      paddingHorizontal: 12,
                      paddingVertical: 8,
                      borderBottomWidth: index === menuItems.length - 1 ? 0 : 1,
                      borderBottomColor: borderColor,
                    }}
                  >
                    <Ionicons
                      name={item.icon}
                      size={20}
                      color={iconColor}
                      style={{ marginRight: 12 }}
                    />
                    <Text style={{ color: textColor, fontSize: 16 }}>
                      {item.name}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </TouchableWithoutFeedback>
          </View>
        </TouchableWithoutFeedback>
      </Modal>
    </View>
  );
}

// Root Stack Navigator
const RootStack = createStackNavigator<RootStackParamList>();

function AppStack() {
  const isPortrait = usePortraitMode();

  return (
    <RootStack.Navigator
      screenOptions={({ navigation, theme }) => ({
        headerStyle: { backgroundColor: theme.colors.primary },
        headerTintColor: "#fff",
        headerShown: isPortrait,
        headerRight: () => <HeaderActions navigation={navigation} />,
      })}
    >
      <RootStack.Screen
        name="Home"
        component={HomeScreen}
        options={{ title: "Fount of Hope" }}
      />
      <RootStack.Screen
        name="BookList"
        component={BookListScreen}
        options={{ title: "Books of the Bible" }}
      />
      <RootStack.Screen
        name="ChapterList"
        component={ChapterListScreen}
        options={({ route }) => ({ title: route.params.book.long_name })}
      />
      <RootStack.Screen
        name="VerseList"
        component={VerseListScreen}
        options={({ route }) => ({
          title: `${route.params.book.short_name} ${route.params.chapter}`,
        })}
      />
      <RootStack.Screen
        name="Reader"
        component={ReaderScreen}
        options={({ route }) => ({
          title: `${route.params.bookName} ${route.params.chapter}`,
          headerShown: false,
        })}
      />
      <RootStack.Screen
        name="Search"
        component={SearchScreen}
        options={{ title: "Search" }}
      />
      <RootStack.Screen
        name="Bookmarks"
        component={BookmarksScreen}
        options={{ title: "Saved Bookmarks" }}
      />
      <RootStack.Screen
        name="Settings"
        component={SettingsScreen}
        options={{ title: "Settings" }}
      />
    </RootStack.Navigator>
  );
}

// Custom Status Bar component
function AutoHideStatusBar() {
  const theme = useNavigationTheme();

  return (
    <StatusBar
      backgroundColor={theme.colors.primary}
      style={theme.dark ? "light" : "dark"}
      translucent={true}
      hidden={false}
    />
  );
}

// App with Theme
function AppWithTheme() {
  const { navTheme } = useTheme();

  return (
    <NavigationContainer theme={navTheme}>
      <AutoHideStatusBar />
      <AppStack />
    </NavigationContainer>
  );
}

// Main App Component
export default function App() {
  const fontsLoaded = useFonts();

  if (!fontsLoaded) {
    return <LoadingScreen />;
  }

  return (
    <SafeAreaProvider>
      <FontLoader>
        <HighlightsProvider>
          <VerseMeasurementsProvider>
            <BibleDatabaseProvider>
              <ThemeProvider>
                <BookmarksProvider>
                  <AppWithTheme />
                </BookmarksProvider>
              </ThemeProvider>
            </BibleDatabaseProvider>
          </VerseMeasurementsProvider>
        </HighlightsProvider>
      </FontLoader>
    </SafeAreaProvider>
  );
}
