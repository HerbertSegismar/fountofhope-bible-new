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
import { useTheme } from "../context/ThemeContext";

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
const VERSES_PER_ROW = 8;
const VERSE_SIZE = (width - 32 - (VERSES_PER_ROW - 1) * 8) / VERSES_PER_ROW;

export default function VerseListScreen({ navigation, route }: Props) {
  const { book, chapter } = route.params;
  const [verses, setVerses] = useState<Verse[]>([]);
  const [loading, setLoading] = useState(true);
  const [verseCount, setVerseCount] = useState(0);
  const [chapterCount, setChapterCount] = useState(0);

  const { bibleDB, currentVersion } = useBibleDatabase();
  const { theme, navTheme } = useTheme();
  const primaryColor = navTheme.colors.primary;

  const bgClass = theme === "dark" ? "bg-gray-900" : "bg-gray-50";
  const cardBgClass = theme === "dark" ? "bg-gray-800" : "bg-white";
  const headerBgClass = theme === "dark" ? "bg-gray-800" : "bg-white";
  const textPrimaryClass = theme === "dark" ? "text-gray-100" : "text-gray-800";
  const textSecondaryClass =
    theme === "dark" ? "text-gray-400" : "text-gray-500";
  const textTertiaryClass =
    theme === "dark" ? "text-gray-300" : "text-gray-600";
  const borderClass = theme === "dark" ? "border-gray-700" : "border-gray-200";
  const lightGrayClass = theme === "dark" ? "bg-gray-700" : "bg-gray-100";
  const warningBgClass = theme === "dark" ? "bg-yellow-900/20" : "bg-yellow-50";
  const warningBorderClass =
    theme === "dark" ? "border-yellow-800/50" : "border-yellow-200";
  const warningTextPrimaryClass =
    theme === "dark" ? "text-yellow-300" : "text-yellow-800";
  const warningTextSecondaryClass =
    theme === "dark" ? "text-yellow-400" : "text-yellow-600";
  const disabledBgClass = theme === "dark" ? "bg-gray-700" : "bg-gray-300";
  const disabledTextClass =
    theme === "dark" ? "text-gray-500" : "text-gray-500";

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
      return `${theme === "dark" ? "bg-gray-800" : "bg-white"} border`;
    } else {
      const testamentScheme = book.testament === "OT" ? "red" : "green";
      const lightBg = `bg-${testamentScheme}-50`;
      const lightBorder = `border-${testamentScheme}-200`;
      const darkBg = `bg-${testamentScheme}-900/20`;
      const darkBorder = `border-${testamentScheme}-800/50`;
      return theme === "dark"
        ? `${darkBg} ${darkBorder}`
        : `${lightBg} ${lightBorder}`;
    }
  };

  const getBorderColor = () => {
    if (book.book_color) {
      return { borderColor: book.book_color };
    }
    return {};
  };

  const getTextColorValue = () => {
    if (book.book_color) {
      return book.book_color;
    } else {
      const baseColor = book.testament === "OT" ? "#DC2626" : "#059669";
      return baseColor;
    }
  };

  const isFirstChapter = chapter <= 1;
  const isLastChapter = chapter >= chapterCount;

  if (loading) {
    return (
      <SafeAreaView className={`flex-1 justify-center items-center ${bgClass}`}>
        <ActivityIndicator size="large" color={primaryColor} />
        <Text className={`text-lg ${textTertiaryClass} mt-4`}>
          Loading verses...
        </Text>
        <Text className={`text-sm ${textSecondaryClass} mt-2`}>
          {currentVersion.replace(".sqlite3", "").toUpperCase()}
        </Text>
        <Text className={`text-xs ${textTertiaryClass} mt-1`}>
          Loading verse selection for {book.long_name} {chapter}
        </Text>
      </SafeAreaView>
    );
  }

  if (!bibleDB) {
    return (
      <SafeAreaView
        className={`flex-1 justify-center items-center ${bgClass} p-6`}
      >
        <Text className="text-lg text-red-500 text-center mb-4">
          Database not available
        </Text>
        <TouchableOpacity
          onPress={loadChapterData}
          className="px-4 py-3 rounded-lg"
          style={{ backgroundColor: primaryColor }}
        >
          <Text className="text-white font-semibold">Try Again</Text>
        </TouchableOpacity>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView className={`flex-1 ${bgClass}`}>
      <ScrollView className="flex-1" showsVerticalScrollIndicator={false}>
        <View className="p-4">
          {/* Header */}
          <View
            className={`${headerBgClass} rounded-lg p-4 mb-4 shadow-sm border-l-4 h-30 ${borderClass}`}
            style={{ borderLeftColor: book.book_color || primaryColor }}
          >
            <Text
              className="text-2xl font-bold text-center"
              style={{ color: primaryColor }}
            >
              {book.long_name}
            </Text>
            <Text className={`text-base ${textTertiaryClass} text-center`}>
              Chapter {chapter}
            </Text>
            <Text className={`text-sm ${textSecondaryClass} text-center mt-1`}>
              {currentVersion.replace(".sqlite3", "").toUpperCase()} •{" "}
              {verseCount} verses
            </Text>

            {/* Chapter Progress */}
            {chapterCount > 0 && (
              <View className="mt-2">
                <Text className={`text-xs ${textTertiaryClass} text-center`}>
                  Chapter {chapter} of {chapterCount}
                </Text>
              </View>
            )}
          </View>

          {/* Verse Selection Grid */}
          {verses.length > 0 ? (
            <View className="mb-6">
              <Text
                className={`text-lg font-semibold ${textTertiaryClass} mb-2 text-center`}
              >
                Select a Verse to Read
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
                    <Text
                      className="font-bold text-lg"
                      style={{ color: getTextColorValue() }}
                    >
                      {verse.verse}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>
          ) : (
            <View
              className={`p-6 rounded-lg border ${warningBorderClass}`}
              style={{ backgroundColor: warningBgClass }}
            >
              <Text
                className={`text-center text-lg ${warningTextPrimaryClass}`}
              >
                No verses found for {book.long_name} {chapter}
              </Text>
              <Text
                className={`text-center mt-2 text-sm ${warningTextSecondaryClass}`}
              >
                This chapter may not exist in the current translation
              </Text>
              <TouchableOpacity
                onPress={loadChapterData}
                className="px-4 py-2 rounded-lg mt-4"
                style={{ backgroundColor: "#F59E0B" }}
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
                className="px-6 py-4 rounded-lg shadow-sm"
                style={{ backgroundColor: primaryColor }}
                onPress={handleReadFullChapter}
              >
                <Text className="text-white font-semibold text-center text-lg">
                  Read Full Chapter
                </Text>
                <Text className="text-white/80 text-sm text-center mt-1">
                  Start reading from verse 1
                </Text>
              </TouchableOpacity>
            </View>
          )}

          {/* Chapter Navigation */}
          <View className="flex-row justify-between mb-6">
            <TouchableOpacity
              className={`flex-1 mr-2 px-4 py-3 rounded-lg ${isFirstChapter ? disabledBgClass : ""}`}
              style={{
                backgroundColor: isFirstChapter ? undefined : primaryColor,
              }}
              onPress={() => navigateToChapter(chapter - 1)}
              disabled={isFirstChapter}
            >
              <Text
                className={`font-semibold text-center ${isFirstChapter ? disabledTextClass : "text-white"}`}
              >
                ← Previous Chapter
              </Text>
            </TouchableOpacity>

            <View className={`flex-1 mx-2 px-4 py-3 rounded-lg ${borderClass}`}>
              <Text className={`font-semibold text-center ${textPrimaryClass}`}>
                {chapter} of {chapterCount || "?"}
              </Text>
              <Text
                className={`text-xs text-center mt-1 ${textSecondaryClass}`}
              >
                {verseCount} verses
              </Text>
            </View>

            <TouchableOpacity
              className={`flex-1 ml-2 px-4 py-3 rounded-lg ${isLastChapter ? disabledBgClass : ""}`}
              style={{
                backgroundColor: isLastChapter ? undefined : primaryColor,
              }}
              onPress={() => navigateToChapter(chapter + 1)}
              disabled={isLastChapter}
            >
              <Text
                className={`font-semibold text-center ${isLastChapter ? disabledTextClass : "text-white"}`}
              >
                Next Chapter →
              </Text>
            </TouchableOpacity>
          </View>

          {/* Quick Actions */}
          <View className={`${lightGrayClass} rounded-lg p-4`}>
            <Text className={`text-sm ${textTertiaryClass} font-semibold mb-2`}>
              Quick Actions
            </Text>
            <View className="flex-row justify-between">
              <TouchableOpacity
                className={`${cardBgClass} px-3 py-2 rounded ${borderClass}`}
                onPress={() => navigation.navigate("ChapterList", { book })}
              >
                <Text className={`text-sm ${textTertiaryClass}`}>
                  All Chapters
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                className={`${cardBgClass} px-3 py-2 rounded ${borderClass}`}
                onPress={() => navigation.goBack()}
              >
                <Text className={`text-sm ${textTertiaryClass}`}>Back</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
