import React, { useState, useEffect } from "react";
import {
  Text,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  Dimensions,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { StackNavigationProp } from "@react-navigation/stack";
import { RouteProp } from "@react-navigation/native";
import { RootStackParamList } from "../types";
import { bibleDB, Book } from "../lib/database";

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

  useEffect(() => {
    loadChapterData();
  }, [book]);

  const loadChapterData = async () => {
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
    try {
      const counts: { [key: number]: number } = {};

      // Load verse counts for the first few chapters to improve performance
      const chaptersToLoad = Array.from(
        { length: Math.min(maxChapters, 10) },
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
      bookName: book.short_name,
    });
  };

  const handleLongPress = (chapter: number) => {
    Alert.alert(
      `${book.short_name} ${chapter}`,
      verseCounts[chapter]
        ? `This chapter has ${verseCounts[chapter]} verses`
        : "Loading verse count...",
      [{ text: "OK" }]
    );
  };

  const getChapterColor = (chapter: number) => {
    // Different colors for OT and NT books
    if (book.testament === "NT") {
      return "bg-blue-50 border-blue-200";
    } else {
      return "bg-green-50 border-green-200";
    }
  };

  const getTextColor = () => {
    return book.testament === "NT" ? "text-blue-800" : "text-green-800";
  };

  if (loading && chapterCount === 0) {
    return (
      <SafeAreaView className="flex-1 bg-gray-50 justify-center items-center">
        <ActivityIndicator size="large" color="#3B82F6" />
        <Text className="text-lg text-gray-600 mt-4">Loading chapters...</Text>
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
        <SafeAreaView className="bg-white rounded-lg p-6 mb-6 shadow-sm">
          <Text className="text-2xl font-bold text-primary mb-2 text-center">
            {book.short_name}
          </Text>
          <Text className="text-gray-600 text-center mb-3">
            {book.long_name}
          </Text>
          <Text className="text-gray-500 text-center mb-3">
            {book.testament} • {chapterCount} chapters
          </Text>
          <Text className="text-gray-500 text-sm text-center">
            Select a chapter to read
          </Text>
        </SafeAreaView>

        {/* Chapters Grid */}
        {chapterCount > 0 ? (
          <SafeAreaView className="flex-row flex-wrap gap-3 justify-center">
            {chapters.map((chapter) => (
              <TouchableOpacity
                key={chapter}
                className={`${getChapterColor(chapter)} border-2 rounded-lg shadow-sm justify-center items-center`}
                style={{
                  width: CHAPTER_SIZE,
                  height: CHAPTER_SIZE,
                }}
                onPress={() => handleChapterPress(chapter)}
                onLongPress={() => handleLongPress(chapter)}
                delayLongPress={500}
              >
                <Text className={`font-bold text-lg ${getTextColor()}`}>
                  {chapter}
                </Text>
                {verseCounts[chapter] > 0 && (
                  <Text className={`text-xs mt-1 ${getTextColor()} opacity-70`}>
                    {verseCounts[chapter]} v
                  </Text>
                )}
              </TouchableOpacity>
            ))}
          </SafeAreaView>
        ) : (
          <SafeAreaView className="bg-yellow-50 p-4 rounded-lg">
            <Text className="text-yellow-800 text-center">
              No chapters found for this book
            </Text>
          </SafeAreaView>
        )}

        {/* Quick Navigation for books with many chapters */}
        {chapterCount > 20 && (
          <SafeAreaView className="mt-6 bg-white rounded-lg p-4">
            <Text className="text-lg font-semibold mb-3 text-center">
              Quick Jump
            </Text>
            <SafeAreaView className="flex-row flex-wrap gap-2 justify-center">
              {[
                1,
                Math.floor(chapterCount / 4),
                Math.floor(chapterCount / 2),
                Math.floor((chapterCount * 3) / 4),
                chapterCount,
              ]
                .filter((chap, index, array) => array.indexOf(chap) === index)
                .map((chapter) => (
                  <TouchableOpacity
                    key={`jump-${chapter}`}
                    className="bg-primary px-3 py-2 rounded-full"
                    onPress={() => {
                      Alert.alert("Quick Jump", `Jump to chapter ${chapter}`, [
                        { text: "Cancel" },
                        {
                          text: "Go",
                          onPress: () => handleChapterPress(chapter),
                        },
                      ]);
                    }}
                  >
                    <Text className="text-white font-medium text-sm">
                      {chapter}
                    </Text>
                  </TouchableOpacity>
                ))}
            </SafeAreaView>
          </SafeAreaView>
        )}

        {/* Book Information */}
        <SafeAreaView className="mt-6 bg-gray-100 rounded-lg p-4">
          <Text className="text-sm text-gray-600 text-center">
            {book.testament === "OT" ? "Old Testament" : "New Testament"} Book
          </Text>
          <Text className="text-xs text-gray-500 text-center mt-1">
            Book Number: {String(book.book_number)}
          </Text>
          {book.book_color && (
            <SafeAreaView
              className="w-6 h-6 rounded-full mx-auto mt-2"
              style={{ backgroundColor: book.book_color }}
            />
          )}
        </SafeAreaView>
      </SafeAreaView>
    </ScrollView>
  );
}
