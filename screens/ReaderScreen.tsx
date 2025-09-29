import React, { useEffect, useState } from "react";
import {
  Text,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  Dimensions,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { StackNavigationProp } from "@react-navigation/stack";
import { RouteProp } from "@react-navigation/native";
import { RootStackParamList, Verse } from "../types";
import { ChapterViewEnhanced } from "../components/ChapterViewEnhanced";
import { useBibleDatabase } from "../context/BibleDatabaseContext"; // ✅ Import context

type ReaderScreenNavigationProp = StackNavigationProp<
  RootStackParamList,
  "Reader"
>;
type ReaderScreenRouteProp = RouteProp<RootStackParamList, "Reader">;

interface Props {
  navigation: ReaderScreenNavigationProp;
  route: ReaderScreenRouteProp;
}

const { width } = Dimensions.get("window");

export default function ReaderScreen({ navigation, route }: Props) {
  const { bookId, chapter, bookName } = route.params;
  const [verses, setVerses] = useState<Verse[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentChapter, setCurrentChapter] = useState(chapter);
  const [book, setBook] = useState<any>(null);
  const [fontSize, setFontSize] = useState(16);

  // ✅ Use context
  const { bibleDB, currentVersion } = useBibleDatabase();

  useEffect(() => {
    if (bibleDB) {
      loadChapter();
    }
  }, [bibleDB, bookId, currentChapter]);

  const loadChapter = async () => {
    if (!bibleDB) return;
    try {
      setLoading(true);
      const bookDetails = await bibleDB.getBook(bookId);
      setBook(bookDetails);
      const chapterVerses = await bibleDB.getVerses(bookId, currentChapter);
      setVerses(chapterVerses);
    } catch (error) {
      console.error("Failed to load chapter:", error);
      Alert.alert("Error", "Failed to load chapter content");
    } finally {
      setLoading(false);
    }
  };

  const goToPreviousChapter = () => {
    if (currentChapter > 1) {
      setCurrentChapter((prev) => prev - 1);
    }
  };

  const goToNextChapter = async () => {
    if (!bibleDB) return;

    try {
      const nextChapterVerses = await bibleDB.getVerses(
        bookId,
        currentChapter + 1
      );
      if (nextChapterVerses.length > 0) {
        setCurrentChapter((prev) => prev + 1);
      } else {
        Alert.alert("End of Book", "This is the last chapter of the book.");
      }
    } catch (error) {
      Alert.alert("Error", "Cannot load next chapter");
    }
  };


  const increaseFontSize = () => {
    setFontSize((prev) => Math.min(prev + 1, 24));
  };

  const decreaseFontSize = () => {
    setFontSize((prev) => Math.max(prev - 1, 12));
  };

  const handleVersePress = (verse: Verse) => {
    Alert.alert(
      `${verse.book_name} ${verse.chapter}:${verse.verse}`,
      "Options:",
      [
        { text: "Cancel", style: "cancel" },
        { text: "Bookmark", onPress: () => addBookmark(verse) },
        { text: "Share", onPress: () => shareVerse(verse) },
      ]
    );
  };

  const addBookmark = (verse: Verse) => {
    Alert.alert("Bookmark Added", "Verse has been bookmarked!");
  };

  const shareVerse = (verse: Verse) => {
    Alert.alert("Share", "Sharing feature coming soon!");
  };

  if (!bibleDB || loading) {
    return (
      <SafeAreaView className="flex-1 bg-gray-50 justify-center items-center">
        <ActivityIndicator size="large" color="#3B82F6" />
        <Text className="text-lg text-gray-600 mt-4">
          Loading {bookName} {currentChapter}...
        </Text>
        {currentVersion && (
          <Text className="text-sm text-gray-500 mt-2">
            {currentVersion.replace(".sqlite3", "").toUpperCase()}
          </Text>
        )}
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView className="flex-1 bg-white">
      {/* Compact Header */}
      <View className="bg-primary px-4 py-2">
        <View className="flex-row justify-between items-center">
          <TouchableOpacity
            onPress={goToPreviousChapter}
            disabled={currentChapter <= 1}
            className={`p-2 ${currentChapter <= 1 ? "opacity-30" : ""}`}
          >
            <Text className="text-white font-semibold text-sm">← Prev</Text>
          </TouchableOpacity>

          <View className="flex-1 items-center">
            <Text className="text-white font-bold text-center text-sm">
              {bookName} {currentChapter}
            </Text>
          </View>

          <TouchableOpacity onPress={goToNextChapter} className="p-2">
            <Text className="text-white font-semibold text-sm">Next →</Text>
          </TouchableOpacity>
        </View>

        {/* Compact Progress Bar */}
        <View className="mt-2 w-full h-1 bg-blue-300 rounded-full">
          <View
            className="h-1 bg-yellow-400 rounded-full"
            style={{
              width: `${(currentChapter / (book?.chapters || 1)) * 100}%`,
            }}
          />
        </View>
      </View>

      {/* Compact Font Size Controls */}
      <View className="flex-row justify-between items-center px-4 py-2 bg-gray-50 border-b border-gray-200">
        <Text className="text-gray-600 text-sm">Font Size</Text>
        <View className="flex-row items-center space-x-3">
          <TouchableOpacity
            onPress={decreaseFontSize}
            className="w-8 h-8 rounded-full bg-gray-200 items-center justify-center"
          >
            <Text className="text-gray-700 font-bold">A-</Text>
          </TouchableOpacity>
          <Text className="text-gray-700 w-10 text-center text-sm">
            {fontSize}px
          </Text>
          <TouchableOpacity
            onPress={increaseFontSize}
            className="w-8 h-8 rounded-full bg-gray-200 items-center justify-center"
          >
            <Text className="text-gray-700 font-bold">A+</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Chapter Content */}
      <View className="flex-1">
        <ChapterViewEnhanced
          verses={verses}
          bookName={bookName}
          chapterNumber={currentChapter}
          showVerseNumbers={true}
          fontSize={fontSize}
          onVersePress={handleVersePress}
        />
      </View>
    </SafeAreaView>
  );
}
