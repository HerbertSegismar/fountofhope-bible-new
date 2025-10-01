import React, { useEffect, useState, useContext, useRef } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  Dimensions,
  Animated,
  NativeSyntheticEvent,
  NativeScrollEvent,
  Alert,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { StackNavigationProp } from "@react-navigation/stack";
import { RouteProp } from "@react-navigation/native";
import { RootStackParamList, Verse } from "../types";
import { ChapterViewEnhanced } from "../components/ChapterViewEnhanced";
import { useBibleDatabase } from "../context/BibleDatabaseContext";
import { BookmarksContext } from "../context/BookmarksContext";

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
  const [showEnd, setShowEnd] = useState(false);

  const { bibleDB, currentVersion } = useBibleDatabase();
  const { addBookmark } = useContext(BookmarksContext);

  // Animated scroll
  const scrollY = useRef(new Animated.Value(0)).current;
  const [contentHeight, setContentHeight] = useState(1);
  const [scrollViewHeight, setScrollViewHeight] = useState(0);

  const progress = Animated.divide(
    scrollY,
    Math.max(contentHeight - scrollViewHeight, 1)
  );

  useEffect(() => {
    if (bibleDB) loadChapter();
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
      setShowEnd(false);
    }
  };

  const goToPreviousChapter = () => {
    if (currentChapter > 1) setCurrentChapter((prev) => prev - 1);
  };

  const goToNextChapter = async () => {
    if (!bibleDB) return;
    try {
      const nextChapterVerses = await bibleDB.getVerses(
        bookId,
        currentChapter + 1
      );
      if (nextChapterVerses.length > 0) setCurrentChapter((prev) => prev + 1);
      else Alert.alert("End of Book", "This is the last chapter.");
    } catch {
      Alert.alert("Error", "Cannot load next chapter");
    }
  };

  const increaseFontSize = () => setFontSize((prev) => Math.min(prev + 1, 24));
  const decreaseFontSize = () => setFontSize((prev) => Math.max(prev - 1, 12));

  const handleVersePress = (verse: Verse) => {
    Alert.alert(
      `${verse.book_name} ${verse.chapter}:${verse.verse}`,
      "Options:",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Bookmark",
          onPress: () => {
            addBookmark(verse);
            Alert.alert("Bookmarked!", "Verse added to bookmarks.");
          },
        },
        { text: "Share", onPress: () => Alert.alert("Share", "Coming soon!") },
      ]
    );
  };

  if (!bibleDB || loading) {
    return (
      <SafeAreaView className="flex-1 bg-gray-50 justify-center items-center">
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
      {/* Header */}
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
            <Text
              className="text-white font-bold text-center text-sm"
              numberOfLines={2}
              adjustsFontSizeToFit
            >
              {bookName} {currentChapter}
            </Text>
          </View>

          <TouchableOpacity onPress={goToNextChapter} className="p-2">
            <Text className="text-white font-semibold text-sm">Next →</Text>
          </TouchableOpacity>
        </View>

        {/* Progress Bar */}
        <View className="mt-2 w-full h-1 bg-blue-300 rounded-full">
          <Animated.View
            className="h-1 bg-yellow-400 rounded-full"
            style={{
              width: progress.interpolate({
                inputRange: [0, 1],
                outputRange: ["0%", "100%"],
                extrapolate: "clamp",
              }),
            }}
          />
        </View>
      </View>

      {/* Font Size Controls */}
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

      {/* Chapter Content with Scroll-based progress */}
      <Animated.ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 40 }}
        onScroll={Animated.event(
          [{ nativeEvent: { contentOffset: { y: scrollY } } }],
          { useNativeDriver: false }
        )}
        onContentSizeChange={(_, height) => setContentHeight(height)}
        onLayout={(e) => setScrollViewHeight(e.nativeEvent.layout.height)}
        onScrollEndDrag={(e: NativeSyntheticEvent<NativeScrollEvent>) => {
          const offset = e.nativeEvent.contentOffset.y;
          if (offset + scrollViewHeight >= contentHeight - 20) setShowEnd(true);
        }}
      >
        <ChapterViewEnhanced
          verses={verses}
          bookName={bookName}
          chapterNumber={currentChapter}
          showVerseNumbers
          fontSize={fontSize}
          onVersePress={handleVersePress}
        />
      </Animated.ScrollView>
    </SafeAreaView>
  );
}
