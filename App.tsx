// App.tsx
import React from "react";
import { StatusBar } from "expo-status-bar";
import { NavigationContainer } from "@react-navigation/native";
import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import { createStackNavigator } from "@react-navigation/stack";
import { Ionicons } from "@expo/vector-icons";
import "./global.css";

import HomeScreen from "./screens/HomeScreen";
import BookListScreen from "./screens/BookListScreen";
import ChapterListScreen from "./screens/ChapterListScreen";
import VerseListScreen from "./screens/VerseListScreen";
import SearchScreen from "./screens/SearchScreen";
import BookmarksScreen from "./screens/BookmarksScreen";
import ReaderScreen from "./screens/ReaderScreen";
import SettingsScreen from "./screens/SettingsScreen";

import { Book } from "./types";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { BibleDatabaseProvider } from "./context/BibleDatabaseContext";
import { BookmarksProvider } from "./context/BookmarksContext";

// Param list types
export type BibleStackParamList = {
  Home: undefined;
  BookList: undefined;
  ChapterList: { book: Book };
  VerseList: { book: Book; chapter: number };
  Reader: { bookId: number; chapter: number; bookName: string };
};

export type SearchStackParamList = {
  Search: undefined;
};

export type BookmarksStackParamList = {
  Bookmarks: undefined;
};

export type SettingsStackParamList = {
  Settings: undefined;
};

// Navigators
const BibleStackNav = createStackNavigator<BibleStackParamList>();
const SearchStackNav = createStackNavigator<SearchStackParamList>();
const BookmarksStackNav = createStackNavigator<BookmarksStackParamList>();
const SettingsStackNav = createStackNavigator<SettingsStackParamList>();
const Tab = createBottomTabNavigator();

// Shared header theme
const headerTheme = {
  headerShown: true,
  headerStyle: { backgroundColor: "#1e40af" },
  headerTintColor: "#fff",
};

// Bible Stack Navigator (Reader inside here)
function BibleStack() {
  return (
    <BibleStackNav.Navigator screenOptions={headerTheme}>
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
  return (
    <SearchStackNav.Navigator screenOptions={headerTheme}>
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
  return (
    <BookmarksStackNav.Navigator screenOptions={headerTheme}>
      <BookmarksStackNav.Screen
        name="Bookmarks"
        component={BookmarksScreen}
        options={{ title: "Saved Bookmarks" }}
      />
    </BookmarksStackNav.Navigator>
  );
}

// Settings Stack
function SettingsStack() {
  return (
    <SettingsStackNav.Navigator screenOptions={headerTheme}>
      <SettingsStackNav.Screen
        name="Settings"
        component={SettingsScreen}
        options={{ title: "Settings" }}
      />
    </SettingsStackNav.Navigator>
  );
}

// Bottom Tabs
function AppTabs() {
  return (
    <Tab.Navigator
      screenOptions={{
        tabBarStyle: { backgroundColor: "#1e40af" },
        tabBarActiveTintColor: "#f59e0b",
        tabBarInactiveTintColor: "#93c5fd",
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

// App Entry
export default function App() {
  return (
    <SafeAreaProvider>
      <BibleDatabaseProvider>
        <BookmarksProvider>
          <NavigationContainer>
            {/* Match status bar with header color */}
            <StatusBar backgroundColor="#1e40af" style="light" />
            <AppTabs />
          </NavigationContainer>
        </BookmarksProvider>
      </BibleDatabaseProvider>
    </SafeAreaProvider>
  );
}
