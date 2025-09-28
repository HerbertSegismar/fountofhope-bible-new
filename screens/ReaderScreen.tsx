import React, { useEffect, useState } from "react";
import {
  Text,
  ScrollView,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  Dimensions,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { StackNavigationProp } from "@react-navigation/stack";
import { RouteProp } from "@react-navigation/native";
import { RootStackParamList, Verse } from "../types";
import { bibleDB } from "../lib/database";
import { VerseCard } from "../components/VerseCard";

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

  useEffect(() => {
    loadChapter();
  }, [bookId, currentChapter]);

  const loadChapter = async () => {
    try {
      setLoading(true);

      // Load book details
      const bookDetails = await bibleDB.getBook(bookId);
      setBook(bookDetails);

      // Load verses for the chapter
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
      setCurrentChapter(currentChapter - 1);
    }
  };

  const goToNextChapter = async () => {
    try {
      // Check if next chapter exists
      const nextChapterVerses = await bibleDB.getVerses(
        bookId,
        currentChapter + 1
      );
      if (nextChapterVerses.length > 0) {
        setCurrentChapter(currentChapter + 1);
      } else {
        Alert.alert("End of Book", "This is the last chapter of the book.");
      }
    } catch (error) {
      Alert.alert("Error", "Cannot load next chapter");
    }
  };

  const increaseFontSize = () => {
    setFontSize((prev) => Math.min(prev + 2, 24));
  };

  const decreaseFontSize = () => {
    setFontSize((prev) => Math.max(prev - 2, 12));
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
    // In a real app, you'd save to persistent storage
  };

  const shareVerse = (verse: Verse) => {
    Alert.alert("Share", "Sharing feature coming soon!");
  };

  if (loading) {
    return (
      <SafeAreaView className="flex-1 bg-gray-50 justify-center items-center">
        <ActivityIndicator size="large" color="#3B82F6" />
        <Text className="text-lg text-gray-600 mt-4">
          Loading {bookName} {currentChapter}...
        </Text>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView className="flex-1 bg-white">
      {/* Header */}
      <SafeAreaView className="bg-primary p-4 shadow-sm">
        <SafeAreaView className="flex-row justify-between items-center mb-2">
          <TouchableOpacity onPress={goToPreviousChapter}>
            <Text className="text-white font-semibold">
              {currentChapter > 1 ? "← Previous" : ""}
            </Text>
          </TouchableOpacity>

          <Text className="text-white text-lg font-bold text-center">
            {bookName} {currentChapter}
          </Text>

          <TouchableOpacity onPress={goToNextChapter}>
            <Text className="text-white font-semibold">Next →</Text>
          </TouchableOpacity>
        </SafeAreaView>

        {/* Progress Bar */}
        <SafeAreaView className="w-full bg-blue-200 rounded-full h-1">
          <SafeAreaView
            className="bg-yellow-400 h-1 rounded-full"
            style={{
              width: `${(currentChapter / (book?.chapters || 1)) * 100}%`,
            }}
          />
        </SafeAreaView>
      </SafeAreaView>

      {/* Font Size Controls */}
      <SafeAreaView className="flex-row justify-between items-center p-3 bg-gray-50 border-b border-gray-200">
        <Text className="text-gray-600">Font Size:</Text>
        <SafeAreaView className="flex-row items-center">
          <TouchableOpacity onPress={decreaseFontSize} className="p-2">
            <Text className="text-xl">A-</Text>
          </TouchableOpacity>
          <Text className="mx-3 text-gray-700">{fontSize}px</Text>
          <TouchableOpacity onPress={increaseFontSize} className="p-2">
            <Text className="text-xl">A+</Text>
          </TouchableOpacity>
        </SafeAreaView>
      </SafeAreaView>

      {/* Chapter Content */}
      <ScrollView className="flex-1 p-4" showsVerticalScrollIndicator={false}>
        <SafeAreaView className="space-y-4">
          {verses.map((verse) => (
            <TouchableOpacity
              key={`${verse.book_number}-${verse.chapter}-${verse.verse}`}
              onPress={() => handleVersePress(verse)}
              onLongPress={() => handleVersePress(verse)}
              delayLongPress={500}
            >
              <SafeAreaView className="flex-row">
                <Text
                  className="text-primary font-bold mr-3 text-sm"
                  style={{ fontSize: fontSize - 2 }}
                >
                  {verse.verse}
                </Text>
                <Text
                  className="flex-1 text-gray-800 leading-7"
                  style={{ fontSize }}
                >
                  {verse.text}
                </Text>
              </SafeAreaView>
            </TouchableOpacity>
          ))}
        </SafeAreaView>

        {verses.length === 0 && (
          <SafeAreaView className="flex-1 justify-center items-center py-16">
            <Text className="text-lg text-gray-600 text-center">
              No verses found in {bookName} {currentChapter}
            </Text>
          </SafeAreaView>
        )}

        {/* Chapter Navigation at Bottom */}
        <SafeAreaView className="flex-row justify-between items-center mt-8 mb-4">
          <TouchableOpacity
            className="bg-gray-100 px-4 py-2 rounded-lg"
            onPress={goToPreviousChapter}
            disabled={currentChapter <= 1}
          >
            <Text
              className={currentChapter > 1 ? "text-gray-800" : "text-gray-400"}
            >
              ← Chapter {currentChapter - 1}
            </Text>
          </TouchableOpacity>

          <Text className="text-gray-600">
            {currentChapter} of {book?.chapters || "?"}
          </Text>

          <TouchableOpacity
            className="bg-gray-100 px-4 py-2 rounded-lg"
            onPress={goToNextChapter}
          >
            <Text className="text-gray-800">
              Chapter {currentChapter + 1} →
            </Text>
          </TouchableOpacity>
        </SafeAreaView>
      </ScrollView>

      {/* Quick Actions Bar */}
      <SafeAreaView className="flex-row justify-around items-center p-3 bg-gray-50 border-t border-gray-200">
        <TouchableOpacity className="items-center">
          <Text className="text-2xl">🔖</Text>
          <Text className="text-xs text-gray-600 mt-1">Bookmark</Text>
        </TouchableOpacity>

        <TouchableOpacity className="items-center">
          <Text className="text-2xl">📖</Text>
          <Text className="text-xs text-gray-600 mt-1">Table of Contents</Text>
        </TouchableOpacity>

        <TouchableOpacity className="items-center">
          <Text className="text-2xl">⚙️</Text>
          <Text className="text-xs text-gray-600 mt-1">Settings</Text>
        </TouchableOpacity>
      </SafeAreaView>
    </SafeAreaView>
  );
}
