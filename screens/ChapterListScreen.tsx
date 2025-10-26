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
import { lightenColor } from "../utils/themeUtils";
import { getBookInfo } from "../utils/testamentUtils";

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

interface VerseMapping {
  [chapter: number]: number;
}

export default function ChapterListScreen({ navigation, route }: Props) {
  const { book } = route.params;
  const bookInfo = getBookInfo(Number(book.book_number));
  const longName = bookInfo?.long || book.long_name;
  const [loading, setLoading] = useState(false);
  const [verseMapping, setVerseMapping] = useState<VerseMapping>({});
  const [chapterCount, setChapterCount] = useState(0);

  const { bibleDB, currentVersion } = useBibleDatabase();
  const { theme, navTheme } = useTheme();
  const primaryColor = navTheme.colors.primary;
  const primaryBorder = lightenColor(primaryColor, 0.5);
  const neutralBorder = theme === "dark" ? "#4B5563" : "#D1D5DB";

  const bgClass = theme === "dark" ? "bg-gray-900" : "bg-gray-50";
  const textSecondaryClass =
    theme === "dark" ? "text-gray-400" : "text-gray-500";
  const textTertiaryClass =
    theme === "dark" ? "text-gray-300" : "text-gray-600";
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

      const count = await bibleDB.getChapterCount(Number(book.book_number));
      setChapterCount(count);

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

      const chaptersToLoad = Array.from(
        { length: maxChapters },
        (_, i) => i + 1
      );

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
          mapping[chapter] = 0;
        }
      }

      setVerseMapping(mapping);
    } catch (error) {
      console.error("Failed to load verse mapping:", error);
    }
  };

  const handleChapterPress = (chapter: number) => {
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
      return theme === "dark" ? "bg-gray-700" : "bg-gray-100";
    }

    return theme === "dark" ? "bg-gray-800" : "bg-white";
  };

  const getBorderColor = (chapter: number) => {
    const verseCount = verseMapping[chapter] || 0;

    let color;
    if (verseCount === 0) {
      color = neutralBorder;
    } else {
      const testamentColor = book.testament === "OT" ? "#DC2626" : "#059669";
      color = book.book_color || testamentColor;
    }
    return { borderColor: color, borderWidth: 1.5 };
  };

  const getTextColorValue = (chapter: number) => {
    const verseCount = verseMapping[chapter] || 0;

    if (verseCount === 0) {
      return theme === "dark" ? "#6B7280" : "#9CA3AF";
    }

    return primaryColor;
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
          Loading verse mapping for {longName}
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
      <ScrollView className="flex-1 mb-20" showsVerticalScrollIndicator={false}>
        <View className="p-4">
          <View
            className="rounded-lg p-4 mb-4 shadow-sm h-30"
            style={{
              backgroundColor: primaryColor,
              borderColor: primaryBorder,
              borderLeftColor: book.book_color || primaryColor,
            }}
          >
            <Text className="text-xl font-bold text-center text-white h-10">
              {longName}
            </Text>
            <Text className="text-sm text-white/80 text-center">
              Select a chapter to read
            </Text>
            <Text className="text-xs text-white/70 text-center mt-1">
              {currentVersion.replace(".sqlite3", "").toUpperCase()} •{" "}
              {chapterCount} chapters • {totalVerses} total verses
            </Text>
          </View>

          {chapterCount > 0 ? (
            <View className="flex-row flex-wrap gap-3 justify-center">
              {chapters.map((chapter) => (
                <TouchableOpacity
                  key={chapter}
                  className={`rounded-lg shadow-sm justify-center items-center ${getChapterColor(
                    chapter
                  )}`}
                  style={[
                    {
                      width: CHAPTER_SIZE,
                      height: CHAPTER_SIZE,
                    },
                    getBorderColor(chapter),
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
