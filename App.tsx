import React from "react";
import { StatusBar } from "expo-status-bar";
import { NavigationContainer } from "@react-navigation/native";
import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import { createStackNavigator } from "@react-navigation/stack";
import { Ionicons } from "@expo/vector-icons";
import "./global.css";

// Import screens
import HomeScreen from "./screens/Home";
import BookListScreen from "./screens/BookList";
import ChapterListScreen from "./screens/ChapterList";
import VerseListScreen from "./screens/VerseList";
import SearchScreen from "./screens/Search";
import { Book } from "./types";

export type RootStackParamList = {
  Home: undefined;
  BookList: undefined;
  ChapterList: { book: Book };
  VerseList: { book: Book; chapter: number };
  Search: undefined;
};

const Stack = createStackNavigator<RootStackParamList>();
const Tab = createBottomTabNavigator();

function HomeStack() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="Home" component={HomeScreen} />
      <Stack.Screen name="BookList" component={BookListScreen} />
      <Stack.Screen name="ChapterList" component={ChapterListScreen} />
      <Stack.Screen name="VerseList" component={VerseListScreen} />
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
      }}
    >
      <Tab.Screen
        name="HomeTab"
        component={HomeStack}
        options={{
          title: "Home",
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="home" size={size} color={color} />
          ),
          headerShown: false,
        }}
      />
      <Tab.Screen
        name="Search"
        component={SearchScreen}
        options={{
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="search" size={size} color={color} />
          ),
        }}
      />
    </Tab.Navigator>
  );
}

export default function App() {
  return (
    <NavigationContainer>
      <StatusBar style="auto" />
      <AppTabs />
    </NavigationContainer>
  );
}
