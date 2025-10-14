import React, { useEffect, useState, useMemo } from "react";
import { StatusBar } from "expo-status-bar";
import {
  NavigationContainer,
  useTheme as useNavigationTheme,
} from "@react-navigation/native";
import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import { createStackNavigator } from "@react-navigation/stack";
import { Ionicons } from "@expo/vector-icons";
import {
  useWindowDimensions,
  View,
  ActivityIndicator,
  Text,
  TouchableOpacity,
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

export type BibleStackParamList = {
  Home: undefined;
  BookList: undefined;
  ChapterList: { book: Book };
  VerseList: { book: Book; chapter: number };
  Reader: { bookId: number; chapter: number; bookName: string; verse?: number };
};

export type SearchStackParamList = {
  Search: undefined;
};

export type BookmarksStackParamList = {
  Bookmarks: undefined;
  Reader: { bookId: number; chapter: number; bookName: string; verse?: number };
};

export type SettingsStackParamList = {
  Settings: undefined;
};

export type RootStackParamList = {
  Bible: BibleStackParamList;
  SearchTab: SearchStackParamList;
  BookmarksTab: BookmarksStackParamList;
  SettingsTab: SettingsStackParamList;
};

// Improved font loading hook with proper TypeScript error handling
function useFonts() {
  const [fontsLoaded, setFontsLoaded] = useState(false);
  const [fontError, setFontError] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;

    async function loadFonts() {
      try {
        console.log('Starting font loading...');
        
        // Method 1: Try loading with Expo Font
        await Font.loadAsync({
          "Oswald-Variable": Oswald_Variable,
          "RubikGlitch-Regular": RubikGlitch_Regular,
        });
        
        // Method 2: Wait a bit and check if fonts are really loaded
        await new Promise(resolve => setTimeout(resolve, 100));
        
        // Method 3: Verify fonts are available
        if (mounted) {
          // Check if fonts are actually available
          const fontFamilies = await Font.getLoadedFonts();
          console.log('Loaded fonts:', fontFamilies);
          
          setFontsLoaded(true);
          setFontError(null);
        }
      } catch (error) {
        console.warn("Error loading fonts:", error);
        if (mounted) {
          // Proper TypeScript error handling
          const errorMessage = error instanceof Error ? error.message : 'Unknown font loading error';
          setFontError(errorMessage);
          setFontsLoaded(true); // Continue app anyway
        }
      }
    }

    loadFonts();

    // Fallback: If fonts don't load in 3 seconds, continue anyway
    const timeoutId = setTimeout(() => {
      if (mounted && !fontsLoaded) {
        console.warn('Font loading timeout - continuing without custom fonts');
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

// Header Right Actions Component
function HeaderActions() {
  const { toggleTheme, theme, colorScheme, setColorScheme, colorSchemes } =
    useTheme();

  const handleColorSchemePress = () => {
    const currentIndex = colorSchemes.findIndex((s) => s.name === colorScheme);
    const nextIndex = (currentIndex + 1) % colorSchemes.length;
    setColorScheme(colorSchemes[nextIndex].name);
  };

  return (
    <View style={{ flexDirection: "row", alignItems: "center" }}>
      <TouchableOpacity
        onPress={toggleTheme}
        style={{ paddingHorizontal: 8, paddingVertical: 8 }}
      >
        <Ionicons
          name={theme === "light" ? "moon" : "sunny"}
          size={24}
          color="#fff"
        />
      </TouchableOpacity>
      <TouchableOpacity
        onPress={handleColorSchemePress}
        style={{ paddingHorizontal: 8, paddingVertical: 8 }}
      >
        <Ionicons name="color-palette" size={24} color="#fff" />
      </TouchableOpacity>
    </View>
  );
}

// Navigators
const BibleStackNav = createStackNavigator<BibleStackParamList>();
const SearchStackNav = createStackNavigator<SearchStackParamList>();
const BookmarksStackNav = createStackNavigator<BookmarksStackParamList>();
const SettingsStackNav = createStackNavigator<SettingsStackParamList>();
const Tab = createBottomTabNavigator<RootStackParamList>();

// Hook to determine if device is in Portrait mode
function usePortraitMode() {
  const { width, height } = useWindowDimensions();
  return height > width;
}

// Bible Stack Navigator
function BibleStack() {
  const isPortrait = usePortraitMode();

  return (
    <BibleStackNav.Navigator
      screenOptions={({ theme }) => ({
        headerStyle: { backgroundColor: theme.colors.primary },
        headerTintColor: "#fff",
        headerShown: isPortrait,
        headerRight: () => <HeaderActions />,
      })}
    >
      <BibleStackNav.Screen
        name="Home"
        component={HomeScreen}
        options={{ title: "Fount of Hope" }}
      />
      <BibleStackNav.Screen
        name="BookList"
        component={BookListScreen}
        options={{ title: "Books of the Bible" }}
      />
      <BibleStackNav.Screen
        name="ChapterList"
        component={ChapterListScreen}
        options={({ route }) => ({ title: route.params.book.long_name })}
      />
      <BibleStackNav.Screen
        name="VerseList"
        component={VerseListScreen}
        options={({ route }) => ({
          title: `${route.params.book.short_name} ${route.params.chapter}`,
        })}
      />
      <BibleStackNav.Screen
        name="Reader"
        component={ReaderScreen}
        options={({ route }) => ({
          title: `${route.params.bookName} ${route.params.chapter}`,
          headerShown: false,
        })}
      />
    </BibleStackNav.Navigator>
  );
}

// Search Stack
function SearchStack() {
  const isPortrait = usePortraitMode();

  return (
    <SearchStackNav.Navigator
      screenOptions={({ theme }) => ({
        headerStyle: { backgroundColor: theme.colors.primary },
        headerTintColor: "#fff",
        headerShown: isPortrait,
        headerRight: () => <HeaderActions />,
      })}
    >
      <SearchStackNav.Screen
        name="Search"
        component={SearchScreen}
        options={{ title: "Search" }}
      />
    </SearchStackNav.Navigator>
  );
}

// Bookmarks Stack
function BookmarksStack() {
  const isPortrait = usePortraitMode();

  return (
    <BookmarksStackNav.Navigator
      screenOptions={({ theme }) => ({
        headerStyle: { backgroundColor: theme.colors.primary },
        headerTintColor: "#fff",
        headerShown: isPortrait,
        headerRight: () => <HeaderActions />,
      })}
    >
      <BookmarksStackNav.Screen
        name="Bookmarks"
        component={BookmarksScreen}
        options={{ title: "Saved Bookmarks" }}
      />
      <BookmarksStackNav.Screen
        name="Reader"
        component={ReaderScreen}
        options={({ route }) => ({
          title: `${route.params.bookName} ${route.params.chapter}`,
          headerShown: false,
        })}
      />
    </BookmarksStackNav.Navigator>
  );
}

// Settings Stack
function SettingsStack() {
  const isPortrait = usePortraitMode();

  return (
    <SettingsStackNav.Navigator
      screenOptions={({ theme }) => ({
        headerStyle: { backgroundColor: theme.colors.primary },
        headerTintColor: "#fff",
        headerShown: isPortrait,
        headerRight: () => <HeaderActions />,
      })}
    >
      <SettingsStackNav.Screen
        name="Settings"
        component={SettingsScreen}
        options={{ title: "Settings" }}
      />
    </SettingsStackNav.Navigator>
  );
}

// Bottom Tabs - RESTORED ORIGINAL STYLING
function AppTabs() {
  const navigationTheme = useNavigationTheme();
  const { colorScheme } = useTheme();

  const activeTintColor = useMemo(() => {
    switch (colorScheme) {
      case "purple":
        return "#C4B5FD";
      case "green":
        return "#A7F3D0";
      case "red":
        return "#FCA5A5";
      case "yellow":
        return "#FEF08A";
      default:
        return "#a5a4ecff";
    }
  }, [colorScheme]);

  return (
    <Tab.Navigator
      screenOptions={{
        tabBarStyle: {
          backgroundColor: navigationTheme.colors.primary,
          display: "flex",
        },
        tabBarActiveTintColor: activeTintColor,
        tabBarInactiveTintColor: "white",
        headerShown: false,
      }}
    >
      <Tab.Screen
        name="Bible"
        component={BibleStack}
        options={{
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="book" size={size} color={color} />
          ),
        }}
      />
      <Tab.Screen
        name="SearchTab"
        component={SearchStack}
        options={{
          title: "Search",
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="search" size={size} color={color} />
          ),
        }}
      />
      <Tab.Screen
        name="BookmarksTab"
        component={BookmarksStack}
        options={{
          title: "Bookmarks",
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="bookmark" size={size} color={color} />
          ),
        }}
      />
      <Tab.Screen
        name="SettingsTab"
        component={SettingsStack}
        options={{
          title: "Settings",
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="settings" size={size} color={color} />
          ),
        }}
      />
    </Tab.Navigator>
  );
}

// Custom Status Bar component - RESTORED ORIGINAL
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

// App with Theme - RESTORED ORIGINAL
function AppWithTheme() {
  const { navTheme } = useTheme();

  return (
    <NavigationContainer theme={navTheme}>
      <AutoHideStatusBar />
      <AppTabs />
    </NavigationContainer>
  );
}

// Main App Component - SIMPLIFIED
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
