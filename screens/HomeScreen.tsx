// screens/HomeScreen.tsx - Updated with proper sizing
import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  ScrollView,
  Alert,
  TouchableOpacity,
  ActivityIndicator,
  Dimensions,
} from "react-native";
import { StackNavigationProp } from "@react-navigation/stack";
import { RootStackParamList } from "../types";
import { Button } from "../components/Button";
import { bibleDB } from "../lib/database";
import { VerseCard } from "../components/VerseCard";
import { Verse } from "../lib/database";

type HomeScreenNavigationProp = StackNavigationProp<RootStackParamList, "Home">;

interface Props {
  navigation: HomeScreenNavigationProp;
}

const { width } = Dimensions.get("window");

export default function HomeScreen({ navigation }: Props) {
  const [recentVerse, setRecentVerse] = useState<Verse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadHomeData();
  }, []);

  const loadHomeData = async () => {
    try {
      setLoading(true);
      setError(null);
      await bibleDB.init();

      // Load a sample verse
      const verses = await bibleDB.getVerses(10, 1); // Genesis 1:1
      if (verses.length > 0) {
        setRecentVerse(verses[0]);
      }
    } catch (error) {
      console.error("Failed to load home data:", error);
      setError("Failed to load content. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <View className="flex-1 justify-center items-center bg-gray-50">
        <ActivityIndicator size="large" color="#3B82F6" />
        <Text className="text-lg text-gray-600 mt-4">Loading Bible App...</Text>
      </View>
    );
  }

  if (error) {
    return (
      <View className="flex-1 justify-center items-center bg-gray-50 p-6">
        <Text className="text-lg text-red-600 text-center mb-4">{error}</Text>
        <Button title="Try Again" onPress={loadHomeData} />
      </View>
    );
  }

  return (
    <ScrollView
      className="flex-1 bg-gray-50"
      contentContainerStyle={{ padding: 16 }}
      showsVerticalScrollIndicator={false}
    >
      {/* Header */}
      <View className="items-center mb-6">
        <Text className="text-2xl font-bold text-primary text-center">
          Bible App
        </Text>
      </View>

      {/* Verse of the Day */}
      <View className="mb-6">
        <View className="flex-row justify-between items-center mb-3">
          <Text className="text-sm font-semibold">Verse of the Day</Text>
          <TouchableOpacity onPress={loadHomeData}>
            <Text className="text-blue-500 text-sm">Refresh</Text>
          </TouchableOpacity>
        </View>
        {recentVerse ? (
          <VerseCard verse={recentVerse} />
        ) : (
          <View className="bg-white p-4 rounded-lg border border-gray-200">
            <Text className="text-gray-600 text-center">
              No verse available
            </Text>
          </View>
        )}
      </View>

      {/* Main Actions */}
      <View className="mb-6">
        <Button
          title="Read Bible"
          onPress={() => navigation.navigate("BookList")}
        />
      </View>
    </ScrollView>
  );
}
