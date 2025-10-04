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
  ScrollView,
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

const { width, height } = Dimensions.get("window");

export default function ReaderScreen({ navigation, route }: Props) {
  // Use state to track the current bookId and chapter, but update them when route params change
  const [bookId, setBookId] = useState(route.params.bookId);
  const [chapter, setChapter] = useState(route.params.chapter);
  const [bookName, setBookName] = useState(route.params.bookName);
  const [targetVerse, setTargetVerse] = useState(route.params.verse);

  const [verses, setVerses] = useState<Verse[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentChapter, setCurrentChapter] = useState(chapter);
  const [book, setBook] = useState<any>(null);
  const [fontSize, setFontSize] = useState(16);
  const [showEnd, setShowEnd] = useState(false);
  const [hasScrolledToVerse, setHasScrolledToVerse] = useState(false);
  const [verseHeights, setVerseHeights] = useState<{ [key: number]: number }>(
    {}
  );

  const { bibleDB, currentVersion } = useBibleDatabase();
  const { addBookmark } = useContext(BookmarksContext);

  // Refs for scrolling
  const scrollViewRef = useRef<ScrollView>(null);
  const versePositions = useRef<{ [key: number]: number }>({});
  const scrollTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Animated scroll for progress bar
  const scrollY = useRef(new Animated.Value(0)).current;
  const [contentHeight, setContentHeight] = useState(1);
  const [scrollViewHeight, setScrollViewHeight] = useState(0);

  const progress = Animated.divide(
    scrollY,
    Math.max(contentHeight - scrollViewHeight, 1)
  );

  // Update state when route params change - THIS IS THE KEY FIX
  useEffect(() => {
    if (route.params.bookId !== bookId || route.params.chapter !== chapter) {
      setBookId(route.params.bookId);
      setChapter(route.params.chapter);
      setCurrentChapter(route.params.chapter);
      setBookName(route.params.bookName);
      setTargetVerse(route.params.verse);
      setHasScrolledToVerse(false);
      setVerseHeights({});
      versePositions.current = {};
    }
  }, [route.params]);

  useEffect(() => {
    if (bibleDB) loadChapter();
  }, [bibleDB, bookId, currentChapter]);

  useEffect(() => {
    // Reset scroll state when target verse changes
    if (targetVerse) {
      setHasScrolledToVerse(false);
    }
  }, [targetVerse]);

  useEffect(() => {
    // Scroll to target verse after verses are loaded and layout is complete
    if (targetVerse && verses.length > 0 && !hasScrolledToVerse) {
      // Clear any existing timeout
      if (scrollTimeoutRef.current) {
        clearTimeout(scrollTimeoutRef.current);
        scrollTimeoutRef.current = null;
      }

      // Use multiple attempts to ensure we scroll to the verse
      scrollTimeoutRef.current = setTimeout(() => {
        scrollToVerse(targetVerse);

        // Second attempt after a delay in case first one fails
        const secondAttempt = setTimeout(() => {
          if (!hasScrolledToVerse) {
            scrollToVerse(targetVerse);
          }
        }, 1000);

        scrollTimeoutRef.current = secondAttempt;
      }, 300);
    }

    return () => {
      if (scrollTimeoutRef.current) {
        clearTimeout(scrollTimeoutRef.current);
        scrollTimeoutRef.current = null;
      }
    };
  }, [verses, targetVerse, hasScrolledToVerse, verseHeights]);

  const loadChapter = async () => {
    if (!bibleDB) return;
    try {
      setLoading(true);
      setHasScrolledToVerse(false);
      setVerseHeights({});
      versePositions.current = {};

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

  const scrollToVerse = (verseNumber: number) => {
    if (!scrollViewRef.current) {
      console.log("ScrollView ref not available");
      return;
    }

    // Method 1: Use measured verse positions
    if (versePositions.current[verseNumber] !== undefined) {
      const versePosition = versePositions.current[verseNumber];
      const verseHeight = verseHeights[verseNumber] || 100;

      console.log(
        `Scrolling to verse ${verseNumber} at position ${versePosition}`
      );

      const scrollPosition = Math.max(
        0,
        versePosition - scrollViewHeight / 2 + verseHeight / 2
      );

      scrollViewRef.current.scrollTo({
        y: scrollPosition,
        animated: true,
      });
      setHasScrolledToVerse(true);
      return;
    }

    // Method 2: Estimate position based on verse index
    const verseIndex = verses.findIndex((v) => v.verse === verseNumber);
    if (verseIndex !== -1) {
      console.log(
        `Using estimated position for verse ${verseNumber} at index ${verseIndex}`
      );
      const estimatedPosition = verseIndex * 120; // Approximate height per verse
      const scrollPosition = Math.max(
        0,
        estimatedPosition - scrollViewHeight / 2 + 60
      );

      scrollViewRef.current.scrollTo({
        y: scrollPosition,
        animated: true,
      });
      setHasScrolledToVerse(true);
      return;
    }

    console.log(`Verse ${verseNumber} not found in chapter`);
  };

  const handleVerseLayout = (verseNumber: number, event: any) => {
    const { y, height } = event.nativeEvent.layout;
    versePositions.current[verseNumber] = y;
    setVerseHeights((prev) => ({ ...prev, [verseNumber]: height }));

    // If this is the target verse and we haven't scrolled yet, scroll to it
    if (targetVerse === verseNumber && !hasScrolledToVerse) {
      setTimeout(() => {
        scrollToVerse(verseNumber);
      }, 100);
    }
  };

  const goToPreviousChapter = () => {
    if (currentChapter > 1) {
      setCurrentChapter((prev) => prev - 1);
      setTargetVerse(undefined); // Clear target verse when changing chapters
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
        setTargetVerse(undefined); // Clear target verse when changing chapters
      } else {
        Alert.alert("End of Book", "This is the last chapter.");
      }
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
        {
          text: "Center Verse",
          onPress: () => {
            setHasScrolledToVerse(false);
            setTimeout(() => scrollToVerse(verse.verse), 100);
          },
        },
        { text: "Share", onPress: () => Alert.alert("Share", "Coming soon!") },
      ]
    );
  };

  const handleScroll = (event: NativeSyntheticEvent<NativeScrollEvent>) => {
    const offsetY = event.nativeEvent.contentOffset.y;
    scrollY.setValue(offsetY);

    // Check if we reached the end
    if (offsetY + scrollViewHeight >= contentHeight - 20) {
      setShowEnd(true);
    } else {
      setShowEnd(false);
    }
  };

  const getHeaderTitle = () => {
    if (targetVerse) {
      return `${bookName} ${currentChapter}:${targetVerse}`;
    }
    return `${bookName} ${currentChapter}`;
  };

  if (!bibleDB || loading) {
    return (
      <SafeAreaView className="flex-1 bg-gray-50 justify-center items-center">
        <Text className="text-lg text-gray-600 mt-4">
          Loading {bookName} {currentChapter}
          {targetVerse && `:${targetVerse}`}...
        </Text>
        {currentVersion && (
          <Text className="text-sm text-gray-500 mt-2">
            {currentVersion.replace(".sqlite3", "").toUpperCase()}
          </Text>
        )}
        {targetVerse && (
          <Text className="text-xs text-gray-400 mt-1">
            Centering verse {targetVerse}
          </Text>
        )}
      </SafeAreaView>
    );
  }

  return (
    <View className="flex-1 bg-white">
      {/* Header */}
      <View className="bg-primary w-screen h-24 flex items-start justify-end">
        <Text className="text-white ml-6 tracking-wider text-xl">Reader</Text>
      </View>
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
              {getHeaderTitle()}
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

        {/* Scroll to Verse Button */}
        {targetVerse && !hasScrolledToVerse && (
          <TouchableOpacity
            onPress={() => scrollToVerse(targetVerse)}
            className="bg-blue-500 px-3 py-1 rounded-full"
          >
            <Text className="text-white text-xs">Center {targetVerse}</Text>
          </TouchableOpacity>
        )}
      </View>

      {/* Chapter Content */}
      <ScrollView
        ref={scrollViewRef}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 40 }}
        onScroll={handleScroll}
        scrollEventThrottle={16}
        onContentSizeChange={(_, height) => setContentHeight(height)}
        onLayout={(e) => setScrollViewHeight(e.nativeEvent.layout.height)}
      >
        <ChapterViewEnhanced
          verses={verses}
          bookName={bookName}
          chapterNumber={currentChapter}
          showVerseNumbers
          fontSize={fontSize}
          onVersePress={handleVersePress}
          onVerseLayout={handleVerseLayout}
          highlightVerse={targetVerse}
        />
      </ScrollView>

      {/* Quick Navigation Footer */}
      <View className="flex-row justify-between items-center px-4 py-3 bg-gray-50 border-t border-gray-200">
        <TouchableOpacity
          onPress={() =>
            navigation.navigate("VerseList", {
              book: book || { book_number: bookId, long_name: bookName },
              chapter: currentChapter,
            })
          }
          className="bg-white px-4 py-2 rounded-lg border border-gray-300"
        >
          <Text className="text-gray-700 text-sm">Verse List</Text>
        </TouchableOpacity>

        <TouchableOpacity
          onPress={() =>
            navigation.navigate("ChapterList", {
              book: book || { book_number: bookId, long_name: bookName },
            })
          }
          className="bg-white px-4 py-2 rounded-lg border border-gray-300"
        >
          <Text className="text-gray-700 text-sm">All Chapters</Text>
        </TouchableOpacity>

        {targetVerse && (
          <TouchableOpacity
            onPress={() => {
              setHasScrolledToVerse(false);
              setTimeout(() => scrollToVerse(targetVerse), 100);
            }}
            className="bg-blue-500 px-4 py-2 rounded-lg"
          >
            <Text className="text-white text-sm">Center {targetVerse}</Text>
          </TouchableOpacity>
        )}
      </View>
    </View>
  );
}
