// App.tsx
import React from "react";
import { StatusBar } from "expo-status-bar";
import { NavigationContainer } from "@react-navigation/native";
import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import { createStackNavigator } from "@react-navigation/stack";
import { Ionicons } from "@expo/vector-icons";
import "./global.css";

// Import screens
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

export type RootStackParamList = {
  Home: undefined;
  BookList: undefined;
  ChapterList: { book: Book };
  VerseList: { book: Book; chapter: number };
  Reader: { bookId: number; chapter: number; bookName: string };
  Search: undefined;
  Bookmarks: undefined;
  Settings: undefined;
};

const Stack = createStackNavigator<RootStackParamList>();
const Tab = createBottomTabNavigator();

function BibleStack() {
  return (
    <Stack.Navigator
      screenOptions={{
        headerShown: true,
        headerStyle: {
          backgroundColor: "#1e40af",
        },
        headerTintColor: "#fff",
      }}
    >
      <Stack.Screen
        name="Home"
        component={HomeScreen}
        options={{ title: "Fount of Hope" }}
      />
      <Stack.Screen
        name="BookList"
        component={BookListScreen}
        options={{ title: "Books of the Bible" }}
      />
      <Stack.Screen
        name="ChapterList"
        component={ChapterListScreen}
        options={({ route }) => ({ title: route.params.book.long_name })}
      />
      <Stack.Screen
        name="VerseList"
        component={VerseListScreen}
        options={({ route }) => ({
          title: `${route.params.book.short_name} ${route.params.chapter}`,
        })}
      />
      <Stack.Screen
        name="Reader"
        component={ReaderScreen}
        options={({ route }) => ({
          title: `${route.params.bookName} ${route.params.chapter}`,
        })}
      />
    </Stack.Navigator>
  );
}

function SearchStack() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="Search" component={SearchScreen} />
    </Stack.Navigator>
  );
}

function BookmarksStack() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="Bookmarks" component={BookmarksScreen} />
    </Stack.Navigator>
  );
}

function SettingsStack() {
  return (
    <Stack.Navigator
      screenOptions={{
        headerShown: true,
        headerStyle: {
          backgroundColor: "#1e40af",
        },
        headerTintColor: "#fff",
      }}
    >
      <Stack.Screen
        name="Settings"
        component={SettingsScreen}
        options={{ title: "Settings" }}
      />
    </Stack.Navigator>
  );
}

function AppTabs() {
  return (
    <Tab.Navigator
      screenOptions={{
        tabBarStyle: {
          backgroundColor: "#1e40af",
        },
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

export default function App() {
  return (
    <SafeAreaProvider>
      <BibleDatabaseProvider>
        <NavigationContainer>
          <StatusBar style="auto" />
          <AppTabs />
        </NavigationContainer>
      </BibleDatabaseProvider>
    </SafeAreaProvider>
  );
}
