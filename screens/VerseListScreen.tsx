import React, { useEffect, useState } from "react";
import { Text, ScrollView, Alert, TouchableOpacity } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { StackNavigationProp } from "@react-navigation/stack";
import { RouteProp } from "@react-navigation/native";
import { RootStackParamList } from "../types";
import { bibleDB, Book, Verse } from "../lib/database";
import { VerseCard } from "../components/VerseCard";

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
  const [verseCount, setVerseCount] = useState(0);

  useEffect(() => {
    loadVerses();
  }, [book.book_number, chapter]);

  const loadVerses = async () => {
    try {
      setLoading(true);
      const versesList = await bibleDB.getVerses(
        Number(book.book_number),
        Number(chapter)
      );
      setVerses(versesList);
      setVerseCount(versesList.length);
    } catch (error) {
      console.error("Failed to load verses:", error);
      Alert.alert("Error", "Failed to load verses");
    } finally {
      setLoading(false);
    }
  };

  const handleVersePress = (verse: Verse) => {
    navigation.navigate("Reader", {
      bookId: verse.book_number,
      chapter: verse.chapter,
      bookName: verse.book_name || book.short_name,
    });
  };

  if (loading) {
    return (
      <SafeAreaView className="flex-1 justify-center items-center bg-gray-50">
        <Text className="text-lg">Loading verses...</Text>
      </SafeAreaView>
    );
  }

  return (
    <ScrollView
      className="flex-1 bg-gray-50"
      showsVerticalScrollIndicator={false}
    >
      <SafeAreaView className="p-4">
        {/* Header */}
        <SafeAreaView className="bg-white rounded-lg p-6 mb-4 shadow-sm">
          <Text className="text-2xl font-bold text-primary text-center">
            {book.short_name} {chapter}
          </Text>
          <Text className="text-gray-600 text-center mt-1">
            {book.long_name}
          </Text>
          <Text className="text-gray-500 text-sm text-center mt-2">
            {verseCount} verse{verseCount !== 1 ? "s" : ""}
          </Text>
        </SafeAreaView>

        {/* Verses */}
        <SafeAreaView className="space-y-3">
          {verses.map((verse) => (
            <TouchableOpacity
              key={`${verse.book_number}-${verse.chapter}-${verse.verse}`}
              onPress={() => handleVersePress(verse)}
            >
              <VerseCard verse={verse} showReference={false} />
            </TouchableOpacity>
          ))}
        </SafeAreaView>

        {verses.length === 0 && (
          <SafeAreaView className="bg-yellow-50 p-4 rounded-lg mt-4">
            <Text className="text-yellow-800 text-center">
              No verses found for {book.short_name} {chapter}
            </Text>
          </SafeAreaView>
        )}

        {/* Navigation */}
        <SafeAreaView className="flex-row justify-between mt-6">
          <TouchableOpacity
            className="bg-primary px-4 py-2 rounded-lg"
            onPress={() => {
              if (chapter > 1) {
                navigation.navigate("VerseList", {
                  book,
                  chapter: chapter - 1,
                  bookName: book.short_name,
                });
              }
            }}
            disabled={chapter <= 1}
          >
            <Text className="text-white font-semibold">Previous Chapter</Text>
          </TouchableOpacity>

          <TouchableOpacity
            className="bg-primary px-4 py-2 rounded-lg"
            onPress={() => {
              // You might want to get the total chapter count here
              navigation.navigate("VerseList", {
                book,
                chapter: chapter + 1,
                bookName: book.short_name,
              });
            }}
          >
            <Text className="text-white font-semibold">Next Chapter</Text>
          </TouchableOpacity>
        </SafeAreaView>
      </SafeAreaView>
    </ScrollView>
  );
}
