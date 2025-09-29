import React, { useState, useEffect } from "react";
import {
  Text,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  Dimensions,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { StackNavigationProp } from "@react-navigation/stack";
import { RouteProp } from "@react-navigation/native";
import { RootStackParamList } from "../types";
import { useBibleDatabase } from "../context/BibleDatabaseContext"; // Import the context

type ChapterListScreenNavigationProp = StackNavigationProp<
  RootStackParamList,
  "ChapterList"
>;
type ChapterListScreenRouteProp = RouteProp<RootStackParamList, "ChapterList">;

interface Props {
  navigation: ChapterListScreenNavigationProp;
  route: ChapterListScreenRouteProp;
}

const { width } = Dimensions.get("window");
const CHAPTERS_PER_ROW = 6;
const CHAPTER_SIZE =
  (width - 32 - (CHAPTERS_PER_ROW - 1) * 12) / CHAPTERS_PER_ROW;

export default function ChapterListScreen({ navigation, route }: Props) {
  const { book } = route.params;
  const [loading, setLoading] = useState(false);
  const [verseCounts, setVerseCounts] = useState<{ [key: number]: number }>({});
  const [chapterCount, setChapterCount] = useState(0);

  // Use the context
  const { bibleDB, currentVersion } = useBibleDatabase();

  useEffect(() => {
    loadChapterData();
  }, [book, bibleDB, currentVersion]); // Reload when database or version changes

  const loadChapterData = async () => {
    if (!bibleDB) {
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      // Get the number of chapters for this book
      const count = await bibleDB.getChapterCount(Number(book.book_number));
      setChapterCount(count);

      // Load verse counts for the first few chapters
      await loadVerseCounts(count);
    } catch (error) {
      console.error("Failed to load chapter data:", error);
      Alert.alert("Error", "Failed to load chapter information");
    } finally {
      setLoading(false);
    }
  };

  const loadVerseCounts = async (maxChapters: number) => {
    if (!bibleDB) return;

    try {
      const counts: { [key: number]: number } = {};

      // Load verse counts for the first few chapters to improve performance
      const chaptersToLoad = Array.from(
        { length: Math.min(maxChapters, 15) }, // Increased to 15 for better coverage
        (_, i) => i + 1
      );

      for (const chapter of chaptersToLoad) {
        try {
          const count = await bibleDB.getVerseCount(
            Number(book.book_number),
            chapter
          );
          counts[chapter] = count;
        } catch (error) {
          console.error(
            `Failed to load verse count for ${book.short_name} ${chapter}:`,
            error
          );
          counts[chapter] = 0;
        }
      }

      setVerseCounts(counts);
    } catch (error) {
      console.error("Failed to load verse counts:", error);
    }
  };

  const chapters = Array.from({ length: chapterCount }, (_, i) => i + 1);

  const handleChapterPress = (chapter: number) => {
    navigation.navigate("VerseList", {
      book,
      chapter,
    });
  };

  const handleLongPress = (chapter: number) => {
    const verseCount = verseCounts[chapter];
    Alert.alert(
      `${book.short_name} ${chapter}`,
      verseCount
        ? `This chapter has ${verseCount} verse${verseCount !== 1 ? "s" : ""}`
        : "Verse count not available",
      [{ text: "OK" }]
    );
  };

  const getChapterColor = (chapter: number) => {
    // Use book color if available, otherwise fallback to testament colors
    if (book.book_color) {
      return "bg-white border-l-4";
    } else if (book.testament === "NT") {
      return "bg-blue-50 border-blue-200";
    } else {
      return "bg-green-50 border-green-200";
    }
  };

  const getBorderColor = () => {
    if (book.book_color) {
      return { borderLeftColor: book.book_color };
    }
    return {};
  };

  const getTextColor = () => {
    if (book.book_color) {
      return { color: book.book_color };
    }
    return book.testament === "NT" ? "text-blue-800" : "text-green-800";
  };

  const refreshData = () => {
    loadChapterData();
  };

  if (loading && chapterCount === 0) {
    return (
      <SafeAreaView className="flex-1 bg-gray-50 justify-center items-center">
        <ActivityIndicator size="large" color="#3B82F6" />
        <Text className="text-lg text-gray-600 mt-4">Loading chapters...</Text>
        <Text className="text-sm text-gray-500 mt-2">
          {currentVersion.replace(".sqlite3", "").toUpperCase()}
        </Text>
      </SafeAreaView>
    );
  }

  if (!bibleDB) {
    return (
      <SafeAreaView className="flex-1 bg-gray-50 justify-center items-center p-6">
        <Text className="text-lg text-red-600 text-center mb-4">
          Database not available
        </Text>
        <TouchableOpacity
          onPress={refreshData}
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
    >
      <SafeAreaView className="p-4">
        {/* Header */}
        <View
          className="bg-white rounded-lg p-6 mb-6 shadow-sm border-l-4"
          style={{ borderLeftColor: book.book_color || "#3B82F6" }}
        >
          <Text className="text-2xl font-bold text-primary mb-2 text-center">
            {book.long_name}
          </Text>
          <Text className="text-gray-500 text-sm text-center">
            Select a chapter to read
          </Text>
          <Text className="text-xs text-gray-400 text-center mt-1">
            {currentVersion.replace(".sqlite3", "").toUpperCase()} •{" "}
            {chapterCount} chapters
          </Text>
        </View>

        {/* Chapters Grid */}
        {chapterCount > 0 ? (
          <View className="flex-row flex-wrap gap-3 justify-center">
            {chapters.map((chapter) => (
              <TouchableOpacity
                key={chapter}
                className={`${getChapterColor(chapter)} border rounded-lg shadow-sm justify-center items-center`}
                style={[
                  {
                    width: CHAPTER_SIZE,
                    height: CHAPTER_SIZE,
                  },
                  getBorderColor(),
                ]}
                onPress={() => handleChapterPress(chapter)}
                onLongPress={() => handleLongPress(chapter)}
                delayLongPress={500}
                activeOpacity={0.7}
              >
                <Text className={`font-bold text-lg ${getTextColor()}`}>
                  {chapter}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        ) : (
          <View className="bg-yellow-50 p-6 rounded-lg border border-yellow-200">
            <Text className="text-yellow-800 text-center text-lg">
              No chapters found for this book
            </Text>
            <Text className="text-yellow-600 text-center mt-2 text-sm">
              This book may not be available in the{" "}
              {currentVersion.replace(".sqlite3", "").toUpperCase()} translation
            </Text>
          </View>
        )}

        {/* Book Information */}
        <View className="mt-6 bg-gray-100 rounded-lg p-4">
          <View className="flex-row justify-between items-center">
            <Text className="text-sm text-gray-600">
              {book.testament === "OT" ? "Old Testament" : "New Testament"} Book
            </Text>
            <Text className="text-xs text-gray-500">
              {currentVersion.replace(".sqlite3", "").toUpperCase()}
            </Text>
          </View>
          <View className="flex-row justify-between items-center mt-2">
            <Text className="text-sm text-gray-600">
              Total Chapters: {chapterCount}
            </Text>
            <TouchableOpacity onPress={refreshData}>
              <Text className="text-blue-500 text-sm font-medium">Refresh</Text>
            </TouchableOpacity>
          </View>
        </View>
      </SafeAreaView>
    </ScrollView>
  );
}
