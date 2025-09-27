import React, { useEffect, useState } from "react";
import { View, Text, ScrollView, Alert } from "react-native";
import { StackNavigationProp } from "@react-navigation/stack";
import { RouteProp } from "@react-navigation/native";
import { RootStackParamList } from "../types";
import { bibleDB } from "../lib/database";
import { VerseCard } from "../components/VerseCard";
import { Verse, Book } from "../types";

type VerseListScreenNavigationProp = StackNavigationProp<
  RootStackParamList,
  "VerseList"
>;
type VerseListScreenRouteProp = RouteProp<RootStackParamList, "VerseList">;

interface Props {
  navigation: VerseListScreenNavigationProp;
  route: VerseListScreenRouteProp;
}

export default function VerseListScreen({ navigation, route }: Props) {
  const { book, chapter } = route.params;
  const [verses, setVerses] = useState<Verse[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadVerses();
  }, [book.id, chapter]);

  const loadVerses = async () => {
    try {
      setLoading(true);
      const versesList = await bibleDB.getVerses(book.id, chapter);
      setVerses(versesList);
    } catch (error) {
      Alert.alert("Error", "Failed to load verses");
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <View className="flex-1 justify-center items-center bg-gray-50">
        <Text className="text-lg">Loading verses...</Text>
      </View>
    );
  }

  return (
    <ScrollView className="flex-1 bg-gray-50">
      <View className="p-4">
        <Text className="text-2xl font-bold text-primary mb-2 text-center">
          {book.name} {chapter}
        </Text>

        <View className="space-y-3">
          {verses.map((verse) => (
            <VerseCard key={verse.id} verse={verse} showReference={false} />
          ))}
        </View>
      </View>
    </ScrollView>
  );
}
