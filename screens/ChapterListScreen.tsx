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
import { useBibleDatabase } from "../context/BibleDatabaseContext";
import { useTheme } from "../context/ThemeContext";
import { lightenColor } from "../utils/colorUtils";

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

// Interface for verse mapping
interface VerseMapping {
  [chapter: number]: number; // chapter -> verse count
}

export default function ChapterListScreen({ navigation, route }: Props) {
  const { book } = route.params;
  const [loading, setLoading] = useState(false);
  const [verseMapping, setVerseMapping] = useState<VerseMapping>({});
  const [chapterCount, setChapterCount] = useState(0);

  // Use the context
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

  useEffect(() => {
    loadChapterData();
  }, [book, bibleDB, currentVersion]);

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

      // Load verse mapping for all chapters
      await loadVerseMapping(count);
    } catch (error) {
      console.error("Failed to load chapter data:", error);
      Alert.alert("Error", "Failed to load chapter information");
    } finally {
      setLoading(false);
    }
  };

  const loadVerseMapping = async (maxChapters: number) => {
    if (!bibleDB) return;

    try {
      const mapping: VerseMapping = {};

      // Create an array of all chapters to load
      const chaptersToLoad = Array.from(
        { length: maxChapters },
        (_, i) => i + 1
      );

      // Load verse counts for all chapters
      for (const chapter of chaptersToLoad) {
        try {
          const verseCount = await bibleDB.getVerseCount(
            Number(book.book_number),
            chapter
          );
          mapping[chapter] = verseCount;
        } catch (error) {
          console.error(
            `Failed to load verse count for ${book.short_name} ${chapter}:`,
            error
          );
          mapping[chapter] = 0; // Default to 0 if there's an error
        }
      }

      setVerseMapping(mapping);
    } catch (error) {
      console.error("Failed to load verse mapping:", error);
    }
  };

  const handleChapterPress = (chapter: number) => {
    // Get the verse count for this chapter from our mapping
    const verseCount = verseMapping[chapter] || 0;

    if (verseCount > 0) {
      navigation.navigate("VerseList", {
        book,
        chapter,
      });
    } else {
      Alert.alert(
        "No Verses Available",
        `No verses found for ${book.short_name} chapter ${chapter}`,
        [{ text: "OK" }]
      );
    }
  };

  const handleLongPress = (chapter: number) => {
    const verseCount = verseMapping[chapter] || 0;
    Alert.alert(
      `${book.short_name} ${chapter}`,
      verseCount > 0
        ? `This chapter has ${verseCount} verse${verseCount !== 1 ? "s" : ""}`
        : "No verses available for this chapter",
      [{ text: "OK" }]
    );
  };

  const getChapterColor = (chapter: number) => {
    const verseCount = verseMapping[chapter] || 0;

    if (verseCount === 0) {
      return theme === "dark"
        ? "bg-gray-700 border-gray-600"
        : "bg-gray-100 border-gray-300";
    }

    if (book.book_color) {
      return `${theme === "dark" ? "bg-gray-800" : "bg-white"} border-l-4`;
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
      return { borderLeftColor: book.book_color };
    }
    return {};
  };

  const getTextColorValue = (chapter: number) => {
    const verseCount = verseMapping[chapter] || 0;

    if (verseCount === 0) {
      return theme === "dark" ? "#6B7280" : "#9CA3AF";
    }

    if (book.book_color) {
      return book.book_color;
    } else {
      const baseColor = book.testament === "OT" ? "#DC2626" : "#059669";
      return theme === "dark" ? lightenColor(baseColor, 0.6) : baseColor;
    }
  };

  const getChapterDisplay = (chapter: number) => {
    const verseCount = verseMapping[chapter] || 0;

    if (verseCount === 0) {
      return (
        <View className="justify-center items-center">
          <Text
            className="font-bold text-lg"
            style={{ color: getTextColorValue(chapter) }}
          >
            {chapter}
          </Text>
          <Text className={`text-xs mt-1 ${textSecondaryClass}`}>
            No verses
          </Text>
        </View>
      );
    }

    return (
      <View className="justify-center items-center">
        <Text
          className="font-bold text-lg"
          style={{ color: getTextColorValue(chapter) }}
        >
          {chapter}
        </Text>
        <Text className={`text-xs ${textSecondaryClass} mt-1`}>
          {verseCount} v{verseCount !== 1 ? "s" : ""}
        </Text>
      </View>
    );
  };

  const refreshData = () => {
    loadChapterData();
  };

  if (loading && chapterCount === 0) {
    return (
      <SafeAreaView className={`flex-1 ${bgClass} justify-center items-center`}>
        <ActivityIndicator size="large" color={primaryColor} />
        <Text className={`text-lg ${textTertiaryClass} mt-4`}>
          Loading chapters...
        </Text>
        <Text className={`text-sm ${textSecondaryClass} mt-2`}>
          {currentVersion.replace(".sqlite3", "").toUpperCase()}
        </Text>
        <Text className={`text-xs ${textTertiaryClass} mt-1`}>
          Loading verse mapping for {book.long_name}
        </Text>
      </SafeAreaView>
    );
  }

  if (!bibleDB) {
    return (
      <SafeAreaView
        className={`flex-1 ${bgClass} justify-center items-center p-6`}
      >
        <Text className="text-lg text-red-500 text-center mb-4">
          Database not available
        </Text>
        <TouchableOpacity
          onPress={refreshData}
          className="px-4 py-3 rounded-lg"
          style={{ backgroundColor: primaryColor }}
        >
          <Text className="text-white font-semibold">Try Again</Text>
        </TouchableOpacity>
      </SafeAreaView>
    );
  }

  const chapters = Array.from({ length: chapterCount }, (_, i) => i + 1);
  const totalVerses = Object.values(verseMapping).reduce(
    (sum, count) => sum + count,
    0
  );

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
            <Text className={`text-sm ${textSecondaryClass} text-center`}>
              Select a chapter to read
            </Text>
            <Text className={`text-xs ${textTertiaryClass} text-center mt-1`}>
              {currentVersion.replace(".sqlite3", "").toUpperCase()} •{" "}
              {chapterCount} chapters • {totalVerses} total verses
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
                  disabled={
                    !verseMapping[chapter] || verseMapping[chapter] === 0
                  }
                >
                  {getChapterDisplay(chapter)}
                </TouchableOpacity>
              ))}
            </View>
          ) : (
            <View
              className={`p-6 rounded-lg border ${warningBorderClass}`}
              style={{
                backgroundColor:
                  warningBgClass === "bg-yellow-50" ? undefined : undefined,
              }}
            >
              <Text
                className={`text-center text-lg ${warningTextPrimaryClass}`}
              >
                No chapters found for this book
              </Text>
              <Text
                className={`text-center mt-2 text-sm ${warningTextSecondaryClass}`}
              >
                This book may not be available in the{" "}
                {currentVersion.replace(".sqlite3", "").toUpperCase()}{" "}
                translation
              </Text>
            </View>
          )}

          {/* Book Information */}
          <View className={`mt-6 ${lightGrayClass} rounded-lg p-4`}>
            <View className="flex-row justify-between items-center">
              <Text className={`text-sm ${textTertiaryClass}`}>
                {book.testament === "OT" ? "Old Testament" : "New Testament"}{" "}
                Book
              </Text>
              <Text className={`text-xs ${textSecondaryClass}`}>
                {currentVersion.replace(".sqlite3", "").toUpperCase()}
              </Text>
            </View>
            <View className="flex-row justify-between items-center mt-2">
              <Text className={`text-sm ${textTertiaryClass}`}>
                Total: {chapterCount} chapters, {totalVerses} verses
              </Text>
              <TouchableOpacity onPress={refreshData}>
                <Text
                  className="text-sm font-medium"
                  style={{ color: primaryColor }}
                >
                  Refresh
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
