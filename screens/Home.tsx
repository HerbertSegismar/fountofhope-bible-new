import React, { useEffect, useState } from "react";
import { View, Text, ScrollView, Alert, TouchableOpacity } from "react-native";
import { StackNavigationProp } from "@react-navigation/stack";
import { RootStackParamList } from "../types";
import { Button } from "../components/Button";
import { bibleDB } from "../lib/database";
import { VerseCard } from "../components/VerseCard";
import { Verse, Book } from "../types";

type HomeScreenNavigationProp = StackNavigationProp<RootStackParamList, "Home">;

interface Props {
  navigation: HomeScreenNavigationProp;
}

export default function HomeScreen({ navigation }: Props) {
  const [recentVerse, setRecentVerse] = useState<Verse | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadRecentVerse();
  }, []);

  const loadRecentVerse = async () => {
    try {
      setLoading(true);
      await bibleDB.init();
      const verses = await bibleDB.getVerses(1, 1);
      if (verses.length > 0) {
        setRecentVerse(verses[0]);
      }
    } catch (error) {
      Alert.alert("Error", "Failed to load verse");
    } finally {
      setLoading(false);
    }
  };

  const quickReferences = [
    { book: "Genesis", chapter: 1 },
    { book: "Psalm", chapter: 23 },
    { book: "John", chapter: 3 },
    { book: "Romans", chapter: 8 },
  ];

  return (
    <ScrollView className="flex-1 bg-gray-50">
      <View className="p-6">
        <Text className="text-3xl font-bold text-primary text-center mb-8">
          Bible App
        </Text>

        <View className="mb-8">
          <Text className="text-xl font-semibold mb-4">Verse of the Day</Text>
          {loading ? (
            <View className="bg-white p-6 rounded-lg">
              <Text className="text-gray-600">Loading...</Text>
            </View>
          ) : recentVerse ? (
            <VerseCard verse={recentVerse} />
          ) : null}
        </View>

        <View className="space-y-4 mb-8">
          <Button
            title="Read Bible"
            variant="primary"
            onPress={() => navigation.navigate("BookList")}
          />

          <Button
            title="Search Scriptures"
            variant="secondary"
            onPress={() => navigation.navigate("Search")}
          />
        </View>

        <View className="mt-4">
          <Text className="text-lg font-semibold mb-4">Quick Access</Text>
          <View className="flex-row flex-wrap gap-2">
            {quickReferences.map((ref, index) => (
              <TouchableOpacity
                key={index}
                className="bg-white px-4 py-2 rounded-full shadow-sm"
                onPress={() => {
                  // For demo purposes, navigate to book list
                  navigation.navigate("BookList");
                }}
              >
                <Text className="text-primary text-sm">
                  {ref.book} {ref.chapter}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>
      </View>
    </ScrollView>
  );
}
