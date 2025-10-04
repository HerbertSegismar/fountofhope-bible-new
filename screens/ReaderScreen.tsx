import React, {
  useEffect,
  useState,
  useContext,
  useRef,
  useCallback,
} from "react";
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
  LayoutChangeEvent,
  findNodeHandle,
  UIManager,
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
  // State from route params
  const [bookId, setBookId] = useState(route.params.bookId);
  const [chapter, setChapter] = useState(route.params.chapter);
  const [bookName, setBookName] = useState(route.params.bookName);
  const [targetVerse, setTargetVerse] = useState(route.params.verse);

  // Component state
  const [verses, setVerses] = useState<Verse[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentChapter, setCurrentChapter] = useState(chapter);
  const [book, setBook] = useState<any>(null);
  const [fontSize, setFontSize] = useState(16);
  const [showEnd, setShowEnd] = useState(false);
  const [highlightedVerses, setHighlightedVerses] = useState<Set<number>>(new Set()); // NEW: Highlighted verses state

  // Scroll and measurement state
  const [hasScrolledToVerse, setHasScrolledToVerse] = useState(false);
  const [verseMeasurements, setVerseMeasurements] = useState<{
    [key: number]: { y: number; height: number };
  }>({});
  const [contentReady, setContentReady] = useState(false);
  const [scrollViewReady, setScrollViewReady] = useState(false);
  const [chapterContainerY, setChapterContainerY] = useState(0);

  const { bibleDB, currentVersion } = useBibleDatabase();
  const { addBookmark } = useContext(BookmarksContext);

  // Refs
  const scrollViewRef = useRef<ScrollView>(null);
  const chapterContainerRef = useRef<View>(null);
  const scrollY = useRef(new Animated.Value(0)).current;
  const [contentHeight, setContentHeight] = useState(1);
  const [scrollViewHeight, setScrollViewHeight] = useState(0);

  // Tracking refs
  const measurementCount = useRef(0);
  const totalVerses = useRef(0);
  const scrollAttempts = useRef(0);
  const scrollTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const isMounted = useRef(true);
  const verseRefs = useRef<{ [key: number]: View | undefined }>({});
  const progress = Animated.divide(
    scrollY,
    Math.max(contentHeight - scrollViewHeight, 1)
  );

  // NEW: Toggle verse highlight
  const toggleVerseHighlight = useCallback((verseNumber: number) => {
    setHighlightedVerses(prev => {
      const newHighlights = new Set(prev);
      if (newHighlights.has(verseNumber)) {
        newHighlights.delete(verseNumber);
      } else {
        newHighlights.add(verseNumber);
      }
      return newHighlights;
    });
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      isMounted.current = false;
      if (scrollTimeoutRef.current) {
        clearTimeout(scrollTimeoutRef.current);
      }
    };
  }, []);

  // Update when route params change
  useEffect(() => {
    if (route.params.bookId !== bookId || route.params.chapter !== chapter) {
      setBookId(route.params.bookId);
      setChapter(route.params.chapter);
      setCurrentChapter(route.params.chapter);
      setBookName(route.params.bookName);
      setTargetVerse(route.params.verse);
      setHasScrolledToVerse(false);
      setVerseMeasurements({});
      setContentReady(false);
      setScrollViewReady(false);
      setChapterContainerY(0);
      setHighlightedVerses(new Set()); // NEW: Clear highlights when chapter changes
      measurementCount.current = 0;
      scrollAttempts.current = 0;
    }
  }, [route.params, bookId, chapter]);

  // Load chapter when bibleDB, bookId, or chapter changes
  useEffect(() => {
    if (bibleDB) loadChapter();
  }, [bibleDB, bookId, currentChapter]);

  // Check if all verses have been measured
  useEffect(() => {
    if (
      verses.length > 0 &&
      Object.keys(verseMeasurements).length === verses.length
    ) {
    }
  }, [verseMeasurements, verses.length]);

  // Main scrolling effect - SIMPLIFIED
  useEffect(() => {
    if (!targetVerse || !contentReady || !scrollViewReady || hasScrolledToVerse)
      return;

    const attemptScroll = () => {
      if (!isMounted.current) return;

      if (scrollAttempts.current >= 3) {
        // Use fallback method
        scrollToVerseFallback(targetVerse);
        setHasScrolledToVerse(true);
        return;
      }

      scrollAttempts.current++;

      const success = scrollToTargetVerse();

      if (!success && scrollAttempts.current < 3) {
        // Schedule next attempt
        scrollTimeoutRef.current = setTimeout(attemptScroll, 500);
      }
    };

    // Clear any existing timeout
    if (scrollTimeoutRef.current) {
      clearTimeout(scrollTimeoutRef.current);
    }

    // Start attempts with a delay to ensure layout is complete
    scrollTimeoutRef.current = setTimeout(attemptScroll, 300);

    return () => {
      if (scrollTimeoutRef.current) {
        clearTimeout(scrollTimeoutRef.current);
      }
    };
  }, [
    targetVerse,
    contentReady,
    scrollViewReady,
    hasScrolledToVerse,
    verseMeasurements,
  ]);

  const loadChapter = async () => {
    if (!bibleDB) return;
    try {
      setLoading(true);
      setHasScrolledToVerse(false);
      setContentReady(false);
      setScrollViewReady(false);
      setVerseMeasurements({});
      setChapterContainerY(0);
      setHighlightedVerses(new Set()); // NEW: Clear highlights when loading new chapter
      measurementCount.current = 0;
      scrollAttempts.current = 0;
      verseRefs.current = {};

      const bookDetails = await bibleDB.getBook(bookId);
      setBook(bookDetails);
      const chapterVerses = await bibleDB.getVerses(bookId, currentChapter);
      setVerses(chapterVerses);
      totalVerses.current = chapterVerses.length;

      // Mark content as ready after a brief delay
      setTimeout(() => {
        if (isMounted.current) {
          setContentReady(true);
        }
      }, 200);
    } catch (error) {
      console.error("Failed to load chapter:", error);
      Alert.alert("Error", "Failed to load chapter content");
    } finally {
      if (isMounted.current) {
        setLoading(false);
        setShowEnd(false);
      }
    }
  };

  const measureVersePosition = useCallback(
    (verseNumber: number): Promise<number> => {
      return new Promise((resolve) => {
        const verseRef = verseRefs.current[verseNumber];
        if (!verseRef || !scrollViewRef.current) {
          resolve(0);
          return;
        }

        try {
          // Use measure to get position relative to ScrollView
          verseRef.measure((x, y, width, height, pageX, pageY) => {
            resolve(pageY);
          });
        } catch (error) {
          console.error(`Error measuring verse ${verseNumber}:`, error);
          resolve(0);
        }
      });
    },
    []
  );

  const scrollToTargetVerse = useCallback(async (): Promise<boolean> => {
    if (!scrollViewRef.current || !targetVerse) {
      return false;
    }

    // Method 1: Try to measure the verse position directly
    try {
      const versePosition = await measureVersePosition(targetVerse);
      const verseHeight = verseMeasurements[targetVerse]?.height || 100;

      if (versePosition > 0 && scrollViewHeight > 0) {
        const scrollPosition = Math.max(
          0,
          versePosition - scrollViewHeight / 2 + verseHeight / 2
        );

        scrollViewRef.current.scrollTo({
          y: scrollPosition,
          animated: true,
        });

        setHasScrolledToVerse(true);
        return true;
      }
    } catch (error) {
      console.error("Error in direct measurement:", error);
    }

    // Method 2: Use verse index with cumulative height calculation
    return scrollToVerseFallback(targetVerse);
  }, [targetVerse, verseMeasurements, scrollViewHeight, measureVersePosition]);

  const scrollToVerseFallback = useCallback(
    (verseNumber: number): boolean => {
      if (!scrollViewRef.current) return false;

      const verseIndex = verses.findIndex((v) => v.verse === verseNumber);
      if (verseIndex === -1) return false;
      // Calculate cumulative height up to this verse
      let cumulativeHeight = 0;
      for (let i = 0; i < verseIndex; i++) {
        const verse = verses[i];
        const verseHeight = verseMeasurements[verse.verse]?.height || 80; // Default height
        cumulativeHeight += verseHeight;
      }

      const currentVerseHeight = verseMeasurements[verseNumber]?.height || 80;
      const scrollPosition = Math.max(
        0,
        cumulativeHeight - scrollViewHeight / 2 + currentVerseHeight / 2
      );

      scrollViewRef.current.scrollTo({
        y: scrollPosition,
        animated: true,
      });

      setHasScrolledToVerse(true);
      return true;
    },
    [verses, verseMeasurements, scrollViewHeight]
  );

  // UPDATED: Store verse ref and basic measurements
  const handleVerseLayout = useCallback(
    (verseNumber: number, event: LayoutChangeEvent) => {
      const { layout } = event.nativeEvent;
      const { height } = layout;

      // Only update if we have valid measurements
      if (height > 0) {
        setVerseMeasurements((prev) => {
          // Don't update if we already have this measurement
          if (prev[verseNumber] && prev[verseNumber].height === height) {
            return prev;
          }

          const newMeasurements = { ...prev, [verseNumber]: { y: 0, height } }; // y will be measured separately
          measurementCount.current = Object.keys(newMeasurements).length;
          return newMeasurements;
        });

        // If this is our target verse and we haven't scrolled yet, try to scroll after a delay
        if (
          verseNumber === targetVerse &&
          !hasScrolledToVerse &&
          contentReady &&
          scrollViewReady
        ) {
          setTimeout(() => {
            if (isMounted.current && !hasScrolledToVerse) {
              scrollToTargetVerse();
            }
          }, 200);
        }
      }
    },
    [
      targetVerse,
      hasScrolledToVerse,
      contentReady,
      scrollViewReady,
      scrollToTargetVerse,
    ]
  );

  const handleVerseRef = useCallback(
    (verseNumber: number, ref: View | null) => {
      if (ref) {
        verseRefs.current[verseNumber] = ref;
      } else {
        // Optional: Remove the ref when component unmounts
        delete verseRefs.current[verseNumber];
      }
    },
    []
  );

  const handleContentSizeChange = useCallback((w: number, h: number) => {
    setContentHeight(h);
  }, []);

  const handleScrollViewLayout = useCallback((event: LayoutChangeEvent) => {
    const { height } = event.nativeEvent.layout;
    setScrollViewHeight(height);
    setScrollViewReady(true);
  }, []);

  const handleChapterContainerLayout = useCallback(
    (event: LayoutChangeEvent) => {
      const { y } = event.nativeEvent.layout;
      setChapterContainerY(y);
    },
    []
  );

  const handleScroll = (event: NativeSyntheticEvent<NativeScrollEvent>) => {
    const offsetY = event.nativeEvent.contentOffset.y;
    scrollY.setValue(offsetY);

    if (offsetY + scrollViewHeight >= contentHeight - 20) {
      setShowEnd(true);
    } else {
      setShowEnd(false);
    }
  };

  const goToPreviousChapter = () => {
    if (currentChapter > 1) {
      setCurrentChapter((prev) => prev - 1);
      setTargetVerse(undefined);
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
        setTargetVerse(undefined);
      } else {
        Alert.alert("End of Book", "This is the last chapter.");
      }
    } catch {
      Alert.alert("Error", "Cannot load next chapter");
    }
  };

  const increaseFontSize = () => setFontSize((prev) => Math.min(prev + 1, 24));
  const decreaseFontSize = () => setFontSize((prev) => Math.max(prev - 1, 12));

  // UPDATED: Verse press handler with highlight option
  const handleVersePress = (verse: Verse) => {
    const isHighlighted = highlightedVerses.has(verse.verse);
    
    Alert.alert(
      `${verse.book_name} ${verse.chapter}:${verse.verse}`,
      "Options:",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: isHighlighted ? "Remove Highlight" : "Highlight",
          onPress: () => toggleVerseHighlight(verse.verse),
        },
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
            setTargetVerse(verse.verse);
            setHasScrolledToVerse(false);
            scrollAttempts.current = 0;
          },
        },
        { text: "Share", onPress: () => Alert.alert("Share", "Coming soon!") },
      ]
    );
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
          Loading {bookName} ${currentChapter}
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

      {/* Chapter Navigation */}
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
            onPress={async () => {
              setHasScrolledToVerse(false);
              scrollAttempts.current = 0;
              await scrollToTargetVerse();
            }}
            className="bg-blue-500 px-3 py-1 rounded-full"
          >
            <Text className="text-white text-xs">
              {`Center ${targetVerse}`}
            </Text>
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
        onContentSizeChange={handleContentSizeChange}
        onLayout={handleScrollViewLayout}
      >
        <View ref={chapterContainerRef} onLayout={handleChapterContainerLayout}>
          <ChapterViewEnhanced
            verses={verses}
            bookName={bookName}
            chapterNumber={currentChapter}
            showVerseNumbers
            fontSize={fontSize}
            onVersePress={handleVersePress}
            onVerseLayout={handleVerseLayout}
            onVerseRef={handleVerseRef}
            highlightVerse={targetVerse}
            highlightedVerses={highlightedVerses} // NEW: Pass highlighted verses
          />
        </View>
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
            onPress={async () => {
              setHasScrolledToVerse(false);
              scrollAttempts.current = 0;
              await scrollToTargetVerse();
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