import React, { useEffect, useState } from "react";
import {
  Text,
  ScrollView,
  Alert,
  TouchableOpacity,
  View,
  ActivityIndicator,
  Dimensions,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { StackNavigationProp } from "@react-navigation/stack";
import { RouteProp } from "@react-navigation/native";
import { RootStackParamList } from "../types";
import { Verse } from "../services/BibleDatabase";
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

const { width } = Dimensions.get("window");
const VERSES_PER_ROW = 6;
const VERSE_SIZE = (width - 32 - (VERSES_PER_ROW - 1) * 8) / VERSES_PER_ROW;

export default function VerseListScreen({ navigation, route }: Props) {
  const { book, chapter } = route.params;
  const [verses, setVerses] = useState<Verse[]>([]);
  const [loading, setLoading] = useState(true);
  const [verseCount, setVerseCount] = useState(0);
  const [chapterCount, setChapterCount] = useState(0);

  const { bibleDB, currentVersion } = useBibleDatabase();

  useEffect(() => {
    loadChapterData();
  }, [book.book_number, chapter, bibleDB, currentVersion]);

  const loadChapterData = async () => {
    if (!bibleDB) {
      setLoading(false);
      return;
    }

    try {
      setLoading(true);

      // Load verses and chapter count in parallel
      await Promise.all([loadVerses(), loadChapterCount()]);
    } catch (error) {
      console.error("Failed to load chapter data:", error);
      Alert.alert("Error", "Failed to load chapter information");
    } finally {
      setLoading(false);
    }
  };

  const loadVerses = async () => {
    if (!bibleDB) return;

    try {
      const versesList = await bibleDB.getVerses(
        Number(book.book_number),
        Number(chapter)
      );
      setVerses(versesList);
      setVerseCount(versesList.length);
    } catch (error) {
      console.error("Failed to load verses:", error);
      throw error;
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

  const handleVersePress = (verseNumber: number) => {
    // Navigate to Reader with the specific verse highlighted
    navigation.navigate("Reader", {
      bookId: book.book_number,
      chapter,
      verse: verseNumber, // Pass the selected verse number
      bookName: book.long_name,
      bookColor: book.book_color,
      testament: book.testament,
    });
  };

  const handleVerseLongPress = (verseNumber: number) => {
    Alert.alert(
      `${book.short_name} ${chapter}:${verseNumber}`,
      `Navigate to verse ${verseNumber}`,
      [
        {
          text: "Read This Verse",
          onPress: () => handleVersePress(verseNumber),
        },
        {
          text: "Read Full Chapter",
          onPress: () => handleReadFullChapter(),
        },
        { text: "Cancel", style: "cancel" },
      ]
    );
  };

  const handleReadFullChapter = () => {
    // Navigate to Reader without specific verse (starts from verse 1)
    navigation.navigate("Reader", {
      bookId: book.book_number,
      chapter,
      bookName: book.long_name,
      bookColor: book.book_color,
      testament: book.testament,
    });
  };

  const navigateToChapter = (newChapter: number) => {
    if (newChapter >= 1 && newChapter <= chapterCount) {
      navigation.navigate("VerseList", { book, chapter: newChapter });
    }
  };

  const getVerseColor = (verseNumber: number) => {
    if (book.book_color) {
      return "bg-white border";
    } else if (book.testament === "NT") {
      return "bg-blue-50 border-blue-200";
    } else {
      return "bg-green-50 border-green-200";
    }
  };

  const getBorderColor = () => {
    if (book.book_color) {
      return { borderColor: book.book_color };
    }
    return {};
  };

  const getTextColor = () => {
    if (book.book_color) {
      return { color: book.book_color };
    }
    return book.testament === "NT" ? "text-blue-800" : "text-green-800";
  };

  const isFirstChapter = chapter <= 1;
  const isLastChapter = chapter >= chapterCount;

  if (loading) {
    return (
      <SafeAreaView className="flex-1 justify-center items-center bg-gray-50">
        <ActivityIndicator size="large" color="#3B82F6" />
        <Text className="text-lg text-gray-600 mt-4">Loading verses...</Text>
        <Text className="text-sm text-gray-500 mt-2">
          {currentVersion.replace(".sqlite3", "").toUpperCase()}
        </Text>
        <Text className="text-xs text-gray-400 mt-1">
          Loading verse selection for {book.long_name} {chapter}
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
          onPress={loadChapterData}
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
          <Text className="text-xl text-gray-600 text-center">
            Chapter {chapter}
          </Text>
          <Text className="text-sm text-gray-500 text-center mt-1">
            {currentVersion.replace(".sqlite3", "").toUpperCase()} •{" "}
            {verseCount} verses
          </Text>

          {/* Chapter Progress */}
          {chapterCount > 0 && (
            <View className="mt-2">
              <Text className="text-xs text-gray-400 text-center">
                Chapter {chapter} of {chapterCount}
              </Text>
            </View>
          )}
        </View>

        {/* Verse Selection Grid */}
        {verses.length > 0 ? (
          <View className="mb-6">
            <Text className="text-lg font-semibold text-gray-700 mb-4 text-center">
              Select a Verse to Read
            </Text>
            <Text className="text-sm text-gray-500 text-center mb-4">
              Tap any verse to start reading from that verse
            </Text>

            <View className="flex-row flex-wrap gap-2 justify-center">
              {verses.map((verse) => (
                <TouchableOpacity
                  key={verse.verse}
                  className={`${getVerseColor(verse.verse)} rounded-lg shadow-sm justify-center items-center`}
                  style={[
                    {
                      width: VERSE_SIZE,
                      height: VERSE_SIZE,
                    },
                    getBorderColor(),
                  ]}
                  onPress={() => handleVersePress(verse.verse)}
                  onLongPress={() => handleVerseLongPress(verse.verse)}
                  delayLongPress={500}
                  activeOpacity={0.7}
                >
                  <Text className={`font-bold text-lg ${getTextColor()}`}>
                    {verse.verse}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        ) : (
          <View className="bg-yellow-50 p-6 rounded-lg border border-yellow-200 mb-6">
            <Text className="text-yellow-800 text-center text-lg">
              No verses found for {book.long_name} {chapter}
            </Text>
            <Text className="text-yellow-600 text-center mt-2 text-sm">
              This chapter may not exist in the current translation
            </Text>
            <TouchableOpacity
              onPress={loadChapterData}
              className="bg-yellow-500 px-4 py-2 rounded-lg mt-4"
            >
              <Text className="text-white font-semibold text-center">
                Try Again
              </Text>
            </TouchableOpacity>
          </View>
        )}

        {/* Full Chapter Reading */}
        {verses.length > 0 && (
          <View className="mb-6">
            <TouchableOpacity
              className="bg-blue-500 px-6 py-4 rounded-lg shadow-sm"
              onPress={handleReadFullChapter}
            >
              <Text className="text-white font-semibold text-center text-lg">
                Read Full Chapter
              </Text>
              <Text className="text-blue-100 text-sm text-center mt-1">
                Start reading from verse 1
              </Text>
            </TouchableOpacity>
          </View>
        )}

        {/* Chapter Navigation */}
        <View className="flex-row justify-between mb-6">
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
              ← Previous Chapter
            </Text>
          </TouchableOpacity>

          <View className="flex-1 mx-2 bg-white px-4 py-3 rounded-lg border border-gray-200">
            <Text className="text-gray-700 font-semibold text-center">
              {chapter} of {chapterCount || "?"}
            </Text>
            <Text className="text-gray-500 text-xs text-center mt-1">
              {verseCount} verses
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
              Next Chapter →
            </Text>
          </TouchableOpacity>
        </View>

        {/* Quick Actions */}
        <View className="bg-gray-100 rounded-lg p-4">
          <Text className="text-sm text-gray-600 font-semibold mb-2">
            Quick Actions
          </Text>
          <View className="flex-row justify-between">
            <TouchableOpacity
              className="bg-white px-3 py-2 rounded border border-gray-300"
              onPress={() => navigation.navigate("ChapterList", { book })}
            >
              <Text className="text-gray-700 text-sm">All Chapters</Text>
            </TouchableOpacity>

            <TouchableOpacity
              className="bg-white px-3 py-2 rounded border border-gray-300"
              onPress={loadChapterData}
            >
              <Text className="text-gray-700 text-sm">Refresh</Text>
            </TouchableOpacity>

            <TouchableOpacity
              className="bg-white px-3 py-2 rounded border border-gray-300"
              onPress={() => navigation.goBack()}
            >
              <Text className="text-gray-700 text-sm">Back</Text>
            </TouchableOpacity>
          </View>
        </View>
      </SafeAreaView>
    </ScrollView>
  );
}
