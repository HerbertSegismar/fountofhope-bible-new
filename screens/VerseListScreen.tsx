import React, { useEffect, useState } from "react";
import {
  Text,
  ScrollView,
  Alert,
  TouchableOpacity,
  View,
  ActivityIndicator,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { StackNavigationProp } from "@react-navigation/stack";
import { RouteProp } from "@react-navigation/native";
import { RootStackParamList } from "../types";
import { Verse } from "../services/BibleDatabase";
import { ChapterViewEnhanced } from "../components/ChapterViewEnhanced";
import { useBibleDatabase } from "../context/BibleDatabaseContext";

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
  const [chapterCount, setChapterCount] = useState(0);

  const { bibleDB, currentVersion } = useBibleDatabase();

  useEffect(() => {
    loadVerses();
    loadChapterCount();
  }, [book.book_number, chapter, bibleDB, currentVersion]);

  const loadVerses = async () => {
    if (!bibleDB) {
      setLoading(false);
      return;
    }
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

  const loadChapterCount = async () => {
    if (!bibleDB) return;
    try {
      const count = await bibleDB.getChapterCount(Number(book.book_number));
      setChapterCount(count);
    } catch (error) {
      console.error("Failed to load chapter count:", error);
    }
  };

  const handleChapterPress = () => {
    navigation.navigate("Reader", {
      bookId: book.book_number,
      chapter,
      bookName: book.long_name,
    });
  };

  const navigateToChapter = (newChapter: number) => {
    if (newChapter >= 1 && newChapter <= chapterCount) {
      navigation.navigate("VerseList", { book, chapter: newChapter });
    }
  };

  const isFirstChapter = chapter <= 1;
  const isLastChapter = chapter >= chapterCount;

  if (loading) {
    return (
      <SafeAreaView className="flex-1 justify-center items-center bg-gray-50">
        <ActivityIndicator size="large" color="#3B82F6" />
        <Text className="text-lg text-gray-600 mt-4">Loading chapter...</Text>
        <Text className="text-sm text-gray-500 mt-2">
          {currentVersion.replace(".sqlite3", "").toUpperCase()}
        </Text>
      </SafeAreaView>
    );
  }

  if (!bibleDB) {
    return (
      <SafeAreaView className="flex-1 justify-center items-center bg-gray-50 p-6">
        <Text className="text-lg text-red-600 text-center mb-4">
          Database not available
        </Text>
        <TouchableOpacity
          onPress={loadVerses}
          className="bg-blue-500 px-4 py-3 rounded-lg"
        >
          <Text className="text-white font-semibold">Try Again</Text>
        </TouchableOpacity>
      </SafeAreaView>
    );
  }

  return (
    <ScrollView
      className="flex-1 bg-gray-50"
      showsVerticalScrollIndicator={false}
      contentContainerStyle={{ flexGrow: 1 }}
    >
      <SafeAreaView className="flex-1">
        {/* Header */}
        <View
          className="bg-white rounded-lg p-4 mx-4 mt-4 shadow-sm border-l-4"
          style={{ borderLeftColor: book.book_color || "#3B82F6" }}
        >
          <Text className="text-2xl font-bold text-primary text-center">
            {book.long_name}
          </Text>
          <Text className="text-lg text-gray-600 text-center mt-1">
            Chapter {chapter}
          </Text>
          <Text className="text-sm text-gray-500 text-center mt-1">
            {currentVersion.replace(".sqlite3", "").toUpperCase()} •{" "}
            {verseCount} verses
          </Text>
        </View>

        {/* Verses */}
        <View className="flex-1 mx-4 my-4">
          {verses.length > 0 ? (
            <ChapterViewEnhanced
              verses={verses}
              bookName={book.long_name}
              chapterNumber={chapter}
              onPress={handleChapterPress}
              showVerseNumbers
            />
          ) : (
            <View className="bg-yellow-50 p-6 rounded-lg border border-yellow-200">
              <Text className="text-yellow-800 text-center text-lg">
                No verses found for {book.long_name} {chapter}
              </Text>
              <Text className="text-yellow-600 text-center mt-2 text-sm">
                This chapter may not exist in the current translation
              </Text>
            </View>
          )}
        </View>

        {/* Navigation */}
        <View className="flex-row justify-between mx-4 mb-6">
          <TouchableOpacity
            className={`flex-1 mr-2 px-4 py-3 rounded-lg ${
              isFirstChapter ? "bg-gray-300" : "bg-primary"
            }`}
            onPress={() => navigateToChapter(chapter - 1)}
            disabled={isFirstChapter}
          >
            <Text
              className={`font-semibold text-center ${
                isFirstChapter ? "text-gray-500" : "text-white"
              }`}
            >
              ← Previous
            </Text>
          </TouchableOpacity>

          <View className="flex-1 mx-2 bg-white px-4 py-3 rounded-lg border border-gray-200">
            <Text className="text-gray-700 font-semibold text-center">
              {chapter} of {chapterCount || "?"}
            </Text>
          </View>

          <TouchableOpacity
            className={`flex-1 ml-2 px-4 py-3 rounded-lg ${
              isLastChapter ? "bg-gray-300" : "bg-primary"
            }`}
            onPress={() => navigateToChapter(chapter + 1)}
            disabled={isLastChapter}
          >
            <Text
              className={`font-semibold text-center ${
                isLastChapter ? "text-gray-500" : "text-white"
              }`}
            >
              Next →
            </Text>
          </TouchableOpacity>
        </View>

        {/* Reader Mode */}
        <View className="mx-4 mb-6">
          <TouchableOpacity
            className="bg-blue-500 px-4 py-3 rounded-lg"
            onPress={handleChapterPress}
          >
            <Text className="text-white font-semibold text-center">
              Open Reader Mode
            </Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    </ScrollView>
  );
}
