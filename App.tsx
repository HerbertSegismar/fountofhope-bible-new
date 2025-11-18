import React, { useEffect, useState, useMemo, useCallback } from "react";
import { StatusBar as ExpoStatusBar } from "expo-status-bar";
import ColorWheelPicker from "./components/ColorWheelPicker";
import {
  NavigationContainer,
  useTheme as useNavigationTheme,
  useNavigation,
  useIsFocused, // ← Added
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
  StyleSheet,
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
import { HighlightsProvider } from "./context/HighlightsContext";
import { ThemeProvider, useTheme } from "./context/ThemeContext";

import Oswald_VariableFont from "./assets/fonts/Oswald_VariableFont.ttf";
import RubikGlitch_Regular from "./assets/fonts/RubikGlitch_Regular.ttf";
import FontLoader from "./components/FontLoader";
import { getBookInfo } from "./utils/testamentUtils";
import { ChapterMeasurementsProvider } from "./context/ChapterMeasurementsContext";

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

function useFonts() {
  const [fontsLoaded, setFontsLoaded] = useState(false);
  const [, setFontError] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;

    async function loadFonts() {
      try {
        console.log("Starting font loading...");

        await Font.loadAsync({
          "Oswald-Variable": Oswald_VariableFont,
          "RubikGlitch-Regular": RubikGlitch_Regular,
        });

        await new Promise((resolve) => setTimeout(resolve, 100));

        if (mounted) {
          const fontFamilies = await Font.getLoadedFonts();
          console.log("Loaded fonts:", fontFamilies);

          setFontsLoaded(true);
          setFontError(null);
        }
      } catch (error) {
        console.warn("Error loading fonts:", error);
        if (mounted) {
          const errorMessage =
            error instanceof Error
              ? error.message
              : "Unknown font loading error";
          setFontError(errorMessage);
          setFontsLoaded(true);
        }
      }
    }

    loadFonts();

    const timeoutId = setTimeout(() => {
      if (mounted && !fontsLoaded) {
        console.warn("Font loading timeout - continuing without custom fonts");
        setFontsLoaded(true);
      }
    }, 5000);

    return () => {
      mounted = false;
      clearTimeout(timeoutId);
    };
  }, []);

  return fontsLoaded;
}

function LoadingScreen() {
  return (
    <View className="flex-1 justify-center items-center bg-gray-50">
      <ActivityIndicator size="large" color="#3B82F6" />
      <Text className="text-lg text-gray-600 mt-4">Loading Bible App...</Text>
    </View>
  );
}

function usePortraitMode() {
  const { width, height } = useWindowDimensions();
  return height > width;
}

type IoniconName = React.ComponentProps<typeof Ionicons>["name"];

interface MenuItem {
  key: string;
  name: string;
  icon: IoniconName;
  onPress: () => void;
}

function HeaderActions({ navigation }: { navigation: any }) {
  const isPortrait = usePortraitMode();
  const [showDropdown, setShowDropdown] = useState(false);
  const navigationTheme = useNavigationTheme();
  const {
    toggleTheme,
    theme,
    colorScheme,
    setColorScheme,
    colorSchemes,
    setShowColorPicker,
  } = useTheme();

  const handleColorSchemePress = useCallback(() => {
    const currentIndex = colorSchemes.findIndex((s) => s.name === colorScheme);
    const nextIndex = (currentIndex + 1) % colorSchemes.length;
    setColorScheme(colorSchemes[nextIndex].name);
  }, [colorSchemes, colorScheme, setColorScheme]);

  const handleColorSchemeLongPress = useCallback(() => {
    setShowColorPicker(true);
  }, [setShowColorPicker]);

  const closeDropdown = useCallback(() => {
    setShowDropdown(false);
  }, []);

  const menuItems = useMemo<MenuItem[]>(
    () => [
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
        onPress: closeDropdown,
      },
    ],
    [navigation, toggleTheme, theme, handleColorSchemePress, closeDropdown]
  );

  const filteredMenuItems = useMemo(
    () =>
      menuItems.filter((item) => item.key !== "theme" && item.key !== "colors"),
    [menuItems]
  );

  const themeItem = useMemo(
    () => menuItems.find((item) => item.key === "theme"),
    [menuItems]
  );

  const colorItem = useMemo(
    () => menuItems.find((item) => item.key === "colors"),
    [menuItems]
  );

  const dropdownBgColor = navigationTheme.colors.primary;
  const textColor = "#fff";
  const borderColor = "rgba(255,255,255,0.3)";
  const iconColor = "#fff";

  const dropdownStyle = useMemo(
    () => [styles.dropdownStatic, { backgroundColor: dropdownBgColor }],
    [dropdownBgColor]
  );

  const textStyle = useMemo(
    () => [styles.dropdownText, { color: textColor }],
    [textColor]
  );

  const borderBottomStyle = useMemo(
    () => [styles.dropdownBorderBottom, { borderBottomColor: borderColor }],
    [borderColor]
  );

  const handleMenuItemPress = useCallback(
    (item: MenuItem) => {
      item.onPress();
      if (item.key !== "close") {
        closeDropdown();
      }
    },
    [closeDropdown]
  );

  if (!isPortrait) {
    return (
      <View>
        <View style={styles.landscapeMenuContainer}>
          {menuItems.slice(0, -1).map((item) => (
            <TouchableOpacity
              key={item.key}
              onPress={item.onPress}
              onLongPress={
                item.key === "colors" ? handleColorSchemeLongPress : undefined
              }
              style={styles.landscapeMenuItem}
            >
              <Ionicons name={item.icon} size={24} color={iconColor} />
            </TouchableOpacity>
          ))}
        </View>
        <ColorWheelPicker />
      </View>
    );
  }

  return (
    <View>
      <View style={styles.portraitHeaderContainer}>
        {themeItem && (
          <TouchableOpacity
            onPress={themeItem.onPress}
            style={styles.portraitHeaderButton}
          >
            <Ionicons name={themeItem.icon} size={24} color={iconColor} />
          </TouchableOpacity>
        )}
        {colorItem && (
          <TouchableOpacity
            onPress={colorItem.onPress}
            onLongPress={handleColorSchemeLongPress}
            style={styles.portraitHeaderButton}
          >
            <Ionicons name={colorItem.icon} size={24} color={iconColor} />
          </TouchableOpacity>
        )}
        <TouchableOpacity
          onPress={() => setShowDropdown(true)}
          style={styles.portraitHeaderButton}
        >
          <Ionicons name="ellipsis-vertical" size={24} color={iconColor} />
        </TouchableOpacity>
      </View>

            <Modal
        visible={showDropdown}
        transparent
        animationType="fade"
        onRequestClose={closeDropdown}
      >
        <TouchableWithoutFeedback onPress={closeDropdown}>
          <View style={styles.modalOverlay}>
            <TouchableWithoutFeedback>
              <View style={dropdownStyle}>
                {filteredMenuItems.map((item, index) => {
                  // Fixed: use useFocusEffect + useIsFocused + route name mapping
                  const navigation = useNavigation<any>();
                  const isFocused = useIsFocused();
                  const routeName = navigation.getState()?.routes[navigation.getState()?.index]?.name;

                  const routeMap: Record<string, string> = {
                    home: "Home",
                    bible: "BookList",
                    search: "Search",
                    bookmarks: "Bookmarks",
                    settings: "Settings",
                  };

                  const isActiveScreen = isFocused && routeName === routeMap[item.key];

                  return (
                    <TouchableOpacity
                      key={item.key}
                      onPress={() => handleMenuItemPress(item)}
                      style={[
                        styles.dropdownMenuItem,
                        index === filteredMenuItems.length - 1
                          ? undefined
                          : borderBottomStyle,
                        isActiveScreen && {
                          backgroundColor: "#FFFFFF44",
                        },
                      ]}
                    >
                      <Ionicons
                        name={item.icon}
                        size={20}
                        color={iconColor}
                        style={styles.dropdownIcon}
                      />
                      <Text style={textStyle}>{item.name}</Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
            </TouchableWithoutFeedback>
          </View>
        </TouchableWithoutFeedback>
      </Modal>
      <ColorWheelPicker />
    </View>
  );
}

const styles = StyleSheet.create({
  landscapeMenuContainer: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  landscapeMenuItem: {
    paddingHorizontal: 8,
    paddingVertical: 8,
    marginRight: 8,
  },
  portraitHeaderContainer: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  portraitHeaderButton: {
    padding: 8,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: "transparent",
    justifyContent: "flex-start",
    alignItems: "flex-end",
    marginTop: 105,
  },
  dropdownStatic: {
    borderRadius: 8,
    paddingVertical: 8,
    minWidth: 160,
    marginTop: 0,
    marginRight: 16,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 5,
  },
  dropdownMenuItem: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  dropdownBorderBottom: {
    borderBottomWidth: 1,
  },
  dropdownIcon: {
    marginRight: 12,
  },
  dropdownText: {
    fontSize: 16,
  },
});

const RootStack = createStackNavigator<RootStackParamList>();

function AppStack() {
  return (
    <RootStack.Navigator
      screenOptions={({ navigation, theme }) => ({
        headerStyle: {
          backgroundColor: theme.colors.primary,
        },
        headerTintColor: "#fff",
        headerShown: true,
        headerRight: () => <HeaderActions navigation={navigation} />,
      })}
    >
      <RootStack.Screen
        name="Home"
        component={HomeScreen}
        options={{ title: "Home" }}
      />
      <RootStack.Screen
        name="BookList"
        component={BookListScreen}
        options={{ title: "Bible Books" }}
      />
      <RootStack.Screen
        name="ChapterList"
        component={ChapterListScreen}
        options={({ route }) => {
          const bookInfo = getBookInfo(Number(route.params.book.book_number));
          const longName = bookInfo?.long || route.params.book.long_name;
          return { title: longName };
        }}
      />
      <RootStack.Screen
        name="VerseList"
        component={VerseListScreen}
        options={({ route }) => {
          const bookInfo = getBookInfo(Number(route.params.book.book_number));
          const longName = bookInfo?.long || route.params.book.long_name;
          return {
            title: `${longName} ${route.params.chapter}`,
          };
        }}
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
        options={{ title: "Bookmarks" }}
      />
      <RootStack.Screen
        name="Settings"
        component={SettingsScreen}
        options={{ title: "Settings" }}
      />
    </RootStack.Navigator>
  );
}

function AutoHideStatusBar() {
  const theme = useNavigationTheme();

  return (
    <ExpoStatusBar
      backgroundColor={theme.colors.primary}
      style={theme.dark ? "light" : "dark"}
      translucent={true}
      hidden={false}
    />
  );
}

function AppWithTheme() {
  const { navTheme } = useTheme();

  return (
    <NavigationContainer theme={navTheme}>
      <View style={{ flex: 1 }}>
        <AutoHideStatusBar />
        <AppStack />
      </View>
    </NavigationContainer>
  );
}

export default function App() {
  const fontsLoaded = useFonts();

  if (!fontsLoaded) {
    return <LoadingScreen />;
  }

  return (
    <SafeAreaProvider>
      <FontLoader>
        <HighlightsProvider>
          <ChapterMeasurementsProvider>
            <BibleDatabaseProvider>
              <ThemeProvider>
                <BookmarksProvider>
                  <AppWithTheme />
                </BookmarksProvider>
              </ThemeProvider>
            </BibleDatabaseProvider>
          </ChapterMeasurementsProvider>
        </HighlightsProvider>
      </FontLoader>
    </SafeAreaProvider>
  );
}
