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
  ActivityIndicator,
  Modal,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { StackNavigationProp } from "@react-navigation/stack";
import { RouteProp } from "@react-navigation/native";
import { useFocusEffect } from "@react-navigation/native";
import { Ionicons } from "@expo/vector-icons";
import { RootStackParamList, Verse } from "../types";
import { ChapterViewEnhanced } from "../components/ChapterViewEnhanced";
import { useBibleDatabase } from "../context/BibleDatabaseContext";
import { BookmarksContext } from "../context/BookmarksContext";
import { useHighlights } from "../context/HighlightsContext";
import { getTestament } from "../utils/testamentUtils"; // Import the testament utility

type ReaderScreenNavigationProp = StackNavigationProp<
  RootStackParamList,
  "Reader"
>;
type ReaderScreenRouteProp = RouteProp<RootStackParamList, "Reader">;

interface Props {
  navigation: ReaderScreenNavigationProp;
  route: ReaderScreenRouteProp;
}

const { width: screenWidth, height: screenHeight } = Dimensions.get("window");

interface Book {
  book_number: number;
  short_name: string;
  long_name: string;
  book_color?: string;
  testament?: string;
}

interface ChapterInfo {
  chapter: number;
  verseCount: number;
}

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

  // Settings dropdown state
  const [showSettings, setShowSettings] = useState(false);
  const [selectedVersion, setSelectedVersion] = useState("");

  // Navigation modal state
  const [showNavigation, setShowNavigation] = useState(false);
  const [books, setBooks] = useState<Book[]>([]);
  const [oldTestament, setOldTestament] = useState<Book[]>([]);
  const [newTestament, setNewTestament] = useState<Book[]>([]);
  const [chapters, setChapters] = useState<ChapterInfo[]>([]);
  const [versesList, setVersesList] = useState<number[]>([]);
  const [selectedBook, setSelectedBook] = useState<Book | null>(null);
  const [selectedChapter, setSelectedChapter] = useState<number>(1);
  const [selectedVerse, setSelectedVerse] = useState<number | null>(null);
  const [isLoadingNavigation, setIsLoadingNavigation] = useState(false);
  const [isLoadingChapters, setIsLoadingChapters] = useState(false);

  // Full screen state for landscape mode
  const [isFullScreen, setIsFullScreen] = useState(false);
  const [isLandscape, setIsLandscape] = useState(screenWidth > screenHeight);
  const [lastScrollY, setLastScrollY] = useState(0);
  const [scrollThreshold] = useState(50);

  // Scroll and measurement state
  const [hasScrolledToVerse, setHasScrolledToVerse] = useState(false);
  const [verseMeasurements, setVerseMeasurements] = useState<{
    [key: number]: { y: number; height: number };
  }>({});
  const [contentReady, setContentReady] = useState(false);
  const [scrollViewReady, setScrollViewReady] = useState(false);
  const [chapterContainerY, setChapterContainerY] = useState(0);

  const { bibleDB, currentVersion, availableVersions, switchVersion } =
    useBibleDatabase();
  const { addBookmark } = useContext(BookmarksContext);
  const {
    toggleVerseHighlight,
    getChapterHighlights,
    loading: highlightedVersesLoading,
  } = useHighlights();

  const highlightedVerses = getChapterHighlights(bookId, currentChapter);

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

  // Helper functions
  const getVersionDisplayName = (version: string) => {
    const versionMap: { [key: string]: string } = {
      "niv11.sqlite3": "NIV (2011)",
      "csb17.sqlite3": "CSB (2017)",
      "ylt.sqlite3": "Young's Literal Translation",
      "nlt15.sqlite3": "NLT (2015)",
      "nkjv.sqlite3": "NKJV",
      "nasb.sqlite3": "NASB",
      "logos.sqlite3": "Logos Edition",
      "kj2.sqlite3": "King James II",
      "esv.sqlite3": "ESV",
      "esvgsb.sqlite3": "ESV Gospel Study Bible",
    };
    return versionMap[version] || version;
  };

  const getVersionDescription = (version: string) => {
    const descriptionMap: { [key: string]: string } = {
      "niv11.sqlite3": "New International Version",
      "csb17.sqlite3": "Christian Standard Bible",
      "ylt.sqlite3": "Young's Literal Translation",
      "nlt15.sqlite3": "New Living Translation",
      "nkjv.sqlite3": "New King James Version",
      "nasb.sqlite3": "New American Standard Bible",
      "logos.sqlite3": "Logos Bible",
      "kj2.sqlite3": "King James 2",
      "esv.sqlite3": "English Standard Version",
      "esvgsb.sqlite3": "ESV Global Study Bible",
    };
    return descriptionMap[version] || "Bible translation";
  };

  // Utility to lighten color
  const lightenColor = (color: string, amount = 0.15) => {
    if (!color) return undefined;
    if (color.startsWith("#") && (color.length === 7 || color.length === 4)) {
      let r, g, b;
      if (color.length === 7) {
        r = parseInt(color.slice(1, 3), 16);
        g = parseInt(color.slice(3, 5), 16);
        b = parseInt(color.slice(5, 7), 16);
      } else {
        r = parseInt(color[1] + color[1], 16);
        g = parseInt(color[2] + color[2], 16);
        b = parseInt(color[3] + color[3], 16);
      }
      return `rgba(${r}, ${g}, ${b}, ${amount})`;
    }
    return color;
  };

  // Navigation functions
  const loadBooks = async () => {
    if (!bibleDB) return;
    try {
      setIsLoadingNavigation(true);
      const bookList = await bibleDB.getBooks();

      // Add testament information to each book
      const booksWithTestament = bookList.map((book) => ({
        ...book,
        testament: getTestament(book.book_number, book.long_name),
      }));

      setBooks(booksWithTestament);

      // Split books into Old and New Testament
      const ot = booksWithTestament.filter((book) => book.testament === "OT");
      const nt = booksWithTestament.filter((book) => book.testament === "NT");
      setOldTestament(ot);
      setNewTestament(nt);

      console.log("Loaded books:", booksWithTestament.length);
      console.log("Old Testament:", ot.length);
      console.log("New Testament:", nt.length);

      // Set current book as selected
      const currentBook = booksWithTestament.find(
        (b) => b.book_number === bookId
      );
      if (currentBook) {
        setSelectedBook(currentBook);
        setSelectedChapter(currentChapter);
        await loadChaptersForBook(currentBook.book_number);
        await loadVersesForChapter(currentBook.book_number, currentChapter);
      }
    } catch (error) {
      console.error("Failed to load books:", error);
      Alert.alert("Error", "Failed to load books");
    } finally {
      setIsLoadingNavigation(false);
    }
  };

  const loadChaptersForBook = async (bookId: number) => {
    if (!bibleDB) return;
    try {
      setIsLoadingChapters(true);
      const chapterCount = await bibleDB.getChapterCount(bookId);

      // Load verse counts for all chapters in parallel
      const chapterPromises = Array.from(
        { length: chapterCount },
        (_, i) => i + 1
      ).map(async (chapterNum) => {
        try {
          const verseCount = await bibleDB.getVerseCount(bookId, chapterNum);
          return { chapter: chapterNum, verseCount };
        } catch (error) {
          console.error(
            `Failed to load verse count for chapter ${chapterNum}:`,
            error
          );
          return { chapter: chapterNum, verseCount: 0 };
        }
      });

      const chapterData = await Promise.all(chapterPromises);
      setChapters(chapterData);
    } catch (error) {
      console.error("Failed to load chapters:", error);
      setChapters([]);
    } finally {
      setIsLoadingChapters(false);
    }
  };

  const loadVersesForChapter = async (bookId: number, chapter: number) => {
    if (!bibleDB) return;
    try {
      const verses = await bibleDB.getVerses(bookId, chapter);
      const verseNumbers = verses.map((v) => v.verse);
      setVersesList(verseNumbers);
    } catch (error) {
      console.error("Failed to load verses:", error);
      setVersesList([]);
    }
  };

  const handleBookSelect = async (book: Book) => {
    setSelectedBook(book);
    setSelectedChapter(1);
    setSelectedVerse(null);
    setIsLoadingNavigation(true);
    try {
      await loadChaptersForBook(book.book_number);
      await loadVersesForChapter(book.book_number, 1);
    } finally {
      setIsLoadingNavigation(false);
    }
  };

  const handleChapterSelect = async (chapter: number) => {
    setSelectedChapter(chapter);
    setSelectedVerse(null);
    setIsLoadingNavigation(true);
    try {
      if (selectedBook) {
        await loadVersesForChapter(selectedBook.book_number, chapter);
      }
    } finally {
      setIsLoadingNavigation(false);
    }
  };

  const handleVerseSelect = (verse: number) => {
    setSelectedVerse(verse);
  };

  // FIXED: Use navigation to navigate to the same screen with new parameters
  const handleNavigateToLocation = () => {
    if (!selectedBook) return;

    console.log(
      "Navigating to:",
      selectedBook.long_name,
      selectedChapter,
      selectedVerse
    );

    // Close the modal first
    setShowNavigation(false);

    // Use navigation to navigate to the same screen with new parameters
    // This is the same pattern that works in VerseListScreen
    navigation.navigate("Reader", {
      bookId: selectedBook.book_number,
      chapter: selectedChapter,
      verse: selectedVerse || undefined,
      bookName: selectedBook.long_name,
      bookColor: selectedBook.book_color,
      testament: selectedBook.testament,
    });
  };

  const handleVersionSelect = async (version: string) => {
    if (version === currentVersion) return;

    try {
      await switchVersion(version);
      setShowSettings(false);
      // Reload chapter with new version
      await loadChapter();
    } catch (error) {
      console.error("Version switch failed:", error);
      Alert.alert("Error", "Failed to switch Bible version. Please try again.");
    }
  };

  // Load chapter data
  const loadChapter = async () => {
    if (!bibleDB) return;
    try {
      setLoading(true);
      setHasScrolledToVerse(false);
      setContentReady(false);
      setScrollViewReady(false);
      setVerseMeasurements({});
      setChapterContainerY(0);
      setIsFullScreen(false);
      measurementCount.current = 0;
      scrollAttempts.current = 0;
      verseRefs.current = {};

      console.log("Loading chapter:", bookId, currentChapter);

      const bookDetails = await bibleDB.getBook(bookId);
      setBook(bookDetails);
      const chapterVerses = await bibleDB.getVerses(bookId, currentChapter);
      setVerses(chapterVerses);
      totalVerses.current = chapterVerses.length;

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

  // Effects
  useEffect(() => {
    setSelectedVersion(currentVersion);
  }, [currentVersion]);

  useEffect(() => {
    if (showNavigation && bibleDB) {
      loadBooks();
    }
  }, [showNavigation, bibleDB]);

  // Load chapter when route params change - THIS IS THE KEY FIX
  useEffect(() => {
    console.log("Route params changed:", route.params);
    if (bibleDB) {
      loadChapter();
    }
  }, [bibleDB, route.params.bookId, route.params.chapter]);

  // Also update local state when route params change
  useEffect(() => {
    if (route.params.bookId !== bookId || route.params.chapter !== chapter) {
      console.log("Updating local state from route params");
      setBookId(route.params.bookId);
      setChapter(route.params.chapter);
      setCurrentChapter(route.params.chapter);
      setBookName(route.params.bookName);
      setTargetVerse(route.params.verse);
    }
  }, [route.params]);

  useFocusEffect(
    useCallback(() => {
      const { width, height } = Dimensions.get("window");
      const currentIsLandscape = width > height;
      setIsLandscape(currentIsLandscape);

      if (!currentIsLandscape && isFullScreen) {
        setIsFullScreen(false);
      }
    }, [isFullScreen])
  );

  useEffect(() => {
    const updateLayout = () => {
      const { width: newWidth, height: newHeight } = Dimensions.get("window");
      const newIsLandscape = newWidth > newHeight;
      setIsLandscape(newIsLandscape);

      if (!newIsLandscape && isFullScreen) {
        setIsFullScreen(false);
      }
    };

    updateLayout();
    const subscription = Dimensions.addEventListener("change", updateLayout);

    return () => {
      subscription?.remove();
    };
  }, [isFullScreen]);

  useEffect(() => {
    setIsFullScreen(false);
  }, [currentChapter]);

  const toggleFullScreen = useCallback(() => {
    setIsFullScreen((prev) => !prev);
  }, []);

  const handleScroll = (event: NativeSyntheticEvent<NativeScrollEvent>) => {
    const offsetY = event.nativeEvent.contentOffset.y;
    scrollY.setValue(offsetY);

    if (isLandscape) {
      const scrollDelta = offsetY - lastScrollY;
      if (scrollDelta > scrollThreshold && !isFullScreen && offsetY > 100) {
        setIsFullScreen(true);
      }
      setLastScrollY(offsetY);
    }

    if (offsetY + scrollViewHeight >= contentHeight - 20) {
      setShowEnd(true);
    } else {
      setShowEnd(false);
    }
  };

  useEffect(() => {
    return () => {
      isMounted.current = false;
      if (scrollTimeoutRef.current) {
        clearTimeout(scrollTimeoutRef.current);
      }
    };
  }, []);

  useEffect(() => {
    if (
      verses.length > 0 &&
      Object.keys(verseMeasurements).length === verses.length
    ) {
      // Measurements complete
    }
  }, [verseMeasurements, verses.length]);

  useEffect(() => {
    return () => {
      isMounted.current = false;
    };
  }, []);

  // Main scrolling effect
  useEffect(() => {
    if (!targetVerse || !contentReady || !scrollViewReady || hasScrolledToVerse)
      return;

    const attemptScroll = () => {
      if (!isMounted.current) return;

      if (scrollAttempts.current >= 3) {
        scrollToVerseFallback(targetVerse);
        setHasScrolledToVerse(true);
        return;
      }

      scrollAttempts.current++;
      const success = scrollToTargetVerse();

      if (!success && scrollAttempts.current < 3) {
        scrollTimeoutRef.current = setTimeout(attemptScroll, 500);
      }
    };

    if (scrollTimeoutRef.current) {
      clearTimeout(scrollTimeoutRef.current);
    }

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

  const measureVersePosition = useCallback(
    (verseNumber: number): Promise<number> => {
      return new Promise((resolve) => {
        const verseRef = verseRefs.current[verseNumber];
        if (!verseRef || !scrollViewRef.current) {
          resolve(0);
          return;
        }

        try {
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

    return scrollToVerseFallback(targetVerse);
  }, [targetVerse, verseMeasurements, scrollViewHeight, measureVersePosition]);

  const scrollToVerseFallback = useCallback(
    (verseNumber: number): boolean => {
      if (!scrollViewRef.current) return false;

      const verseIndex = verses.findIndex((v) => v.verse === verseNumber);
      if (verseIndex === -1) return false;

      let cumulativeHeight = 0;
      for (let i = 0; i < verseIndex; i++) {
        const verse = verses[i];
        const verseHeight = verseMeasurements[verse.verse]?.height || 80;
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

  const handleVerseLayout = useCallback(
    (verseNumber: number, event: LayoutChangeEvent) => {
      const { layout } = event.nativeEvent;
      const { height } = layout;

      if (height > 0) {
        setVerseMeasurements((prev) => {
          if (prev[verseNumber] && prev[verseNumber].height === height) {
            return prev;
          }

          const newMeasurements = { ...prev, [verseNumber]: { y: 0, height } };
          measurementCount.current = Object.keys(newMeasurements).length;
          return newMeasurements;
        });

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

  const handleVersePress = (verse: Verse) => {
    const isHighlighted = highlightedVerses.includes(verse.verse);

    Alert.alert(
      `${verse.book_name} ${verse.chapter}:${verse.verse}`,
      "Options:",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: isHighlighted ? "Remove Highlight" : "Highlight",
          onPress: () => toggleVerseHighlight(verse),
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

  if (!bibleDB || loading || highlightedVersesLoading) {
    return (
      <SafeAreaView className="flex-1 bg-gray-50 justify-center items-center">
        <ActivityIndicator size="large" color="#3B82F6" />
        <Text className="text-gray-600 mt-2">Loading...</Text>
      </SafeAreaView>
    );
  }

  return (
    <View className="flex-1 bg-white">
      {/* Header */}
      {!isFullScreen && (
        <View className="bg-primary w-screen h-24 flex items-start justify-end readerView">
          <View className="flex-row justify-between items-center w-full px-6 pb-2">
            <Text className="text-white ml-0 tracking-wider text-xl">
              Reader
            </Text>
            <View
              className={`flex-row ${isLandscape ? "mr-28 top-2 gap-4" : "mr-0"}`}
            >
              <TouchableOpacity
                onPress={() => setShowNavigation(true)}
                className="p-2 mr-2"
              >
                <Ionicons name="book-outline" size={24} color="white" />
              </TouchableOpacity>
              <TouchableOpacity
                onPress={() => setShowSettings(true)}
                className="p-2"
              >
                <Ionicons name="settings-outline" size={24} color="white" />
              </TouchableOpacity>
            </View>
          </View>
        </View>
      )}

      {/* Chapter Navigation */}
      {!isFullScreen && (
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
      )}

      {/* Font Size Controls */}
      {!isFullScreen && (
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
      )}

      {/* Settings Modal */}
      <Modal
        visible={showSettings}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setShowSettings(false)}
      >
        <TouchableOpacity
          className="flex-1 bg-black/50 justify-center items-center"
          activeOpacity={1}
          onPress={() => setShowSettings(false)}
        >
          <View
            className="bg-white rounded-xl w-11/12 max-w-md max-h-4/5"
            onStartShouldSetResponder={() => true}
          >
            <View className="p-4 border-b border-gray-200 bg-blue-500">
              <Text className="text-lg font-bold text-white">Settings</Text>
            </View>

            <ScrollView className="max-h-96">
              {/* Font Size Controls */}
              <View className="p-4 border-b border-gray-100">
                <Text className="text-base font-semibold text-slate-700 mb-3">
                  Font Size
                </Text>
                <View className="flex-row justify-between items-center">
                  <TouchableOpacity
                    onPress={decreaseFontSize}
                    className="w-12 h-12 rounded-full bg-gray-100 items-center justify-center"
                  >
                    <Text className="text-gray-700 font-bold text-lg">A-</Text>
                  </TouchableOpacity>

                  <Text className="text-gray-700 text-lg font-medium">
                    {fontSize}px
                  </Text>

                  <TouchableOpacity
                    onPress={increaseFontSize}
                    className="w-12 h-12 rounded-full bg-gray-100 items-center justify-center"
                  >
                    <Text className="text-gray-700 font-bold text-lg">A+</Text>
                  </TouchableOpacity>
                </View>
              </View>

              {/* Bible Version Selection */}
              <View className="p-4">
                <Text className="text-base font-semibold text-slate-700 mb-2">
                  Bible Version
                </Text>
                <Text className="text-sm text-slate-500 mb-4">
                  Choose your preferred Bible translation
                </Text>

                <View className="rounded-md overflow-hidden border border-gray-200">
                  {availableVersions.map((version) => {
                    const isSelected = selectedVersion === version;
                    const isCurrentlyActive = currentVersion === version;

                    return (
                      <TouchableOpacity
                        key={version}
                        className={`p-4 border-b border-gray-100 ${
                          isSelected
                            ? "bg-blue-50 border-l-4 border-blue-500"
                            : "bg-white"
                        }`}
                        onPress={() => handleVersionSelect(version)}
                      >
                        <View className="flex-row justify-between items-center">
                          <View className="flex-1">
                            <Text
                              className={`text-base font-semibold ${
                                isSelected ? "text-blue-800" : "text-slate-800"
                              }`}
                            >
                              {getVersionDisplayName(version)}
                            </Text>
                            <Text className="text-sm text-slate-500">
                              {getVersionDescription(version)}
                            </Text>
                            {isCurrentlyActive && !isSelected && (
                              <Text className="text-xs text-green-600 mt-1">
                                Currently active
                              </Text>
                            )}
                          </View>

                          <View className="ml-3">
                            {isSelected && (
                              <Ionicons
                                name="checkmark-circle"
                                size={24}
                                color="#3b82f6"
                              />
                            )}
                          </View>
                        </View>
                      </TouchableOpacity>
                    );
                  })}
                </View>
              </View>

              {/* Current Version Display */}
              <View className="p-4 bg-blue-100 border-t border-blue-200">
                <Text className="text-sm font-medium text-blue-500 mb-1">
                  Current Version
                </Text>
                <Text className="text-base font-semibold text-blue-500">
                  {getVersionDisplayName(currentVersion)}
                </Text>
              </View>
            </ScrollView>

            <TouchableOpacity
              onPress={() => setShowSettings(false)}
              className="p-4 border-t border-gray-200 items-center"
            >
              <Text className="text-blue-600 font-semibold">Close</Text>
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      </Modal>

      {/* Navigation Modal */}
      <Modal
        visible={showNavigation}
        transparent={true}
        animationType="slide"
        onRequestClose={() => setShowNavigation(false)}
      >
        <View className="flex-1 bg-white">
          {/* Header */}
          <View className="bg-primary px-4 py-4">
            <View className="flex-row justify-between items-center">
              <TouchableOpacity
                onPress={() => setShowNavigation(false)}
                className="p-2"
              >
                <Ionicons name="arrow-back" size={24} color="white" />
              </TouchableOpacity>
              <Text className="text-white font-bold text-lg">
                Navigate to...
              </Text>
              <View style={{ width: 24 }} />
            </View>
          </View>

          <ScrollView className="flex-1 p-4">
            {isLoadingNavigation && (
              <View className="absolute top-0 left-0 right-0 bottom-0 bg-white/80 z-10 justify-center items-center">
                <ActivityIndicator size="large" color="#3B82F6" />
                <Text className="text-gray-600 mt-2">Loading books...</Text>
              </View>
            )}

            {/* Book Selection */}
            <View className="mb-6">
              <Text className="text-lg font-semibold text-slate-800 mb-3">
                Select Book
              </Text>

              {/* Old Testament */}
              {oldTestament.length > 0 && (
                <View className="mb-6">
                  <View className="flex-row items-center justify-between mb-3">
                    <Text className="text-xl font-bold text-primary">
                      Old Testament
                    </Text>
                    <Text className="text-sm text-gray-500">
                      {oldTestament.length} books
                    </Text>
                  </View>
                  <View className="flex-row flex-wrap justify-between">
                    {oldTestament.map((book) => (
                      <TouchableOpacity
                        key={book.book_number}
                        onPress={() => handleBookSelect(book)}
                        className="p-3 rounded-lg shadow-sm mb-3 border-l-4"
                        style={{
                          width: "15%",
                          borderLeftColor: book.book_color || "#DC2626",
                          backgroundColor:
                            lightenColor(book.book_color || "#DC2626", 0.15) ||
                            "#fff",
                        }}
                      >
                        <Text
                          className="font-semibold text-center text-xs"
                          style={{ color: "#1F2937" }}
                          numberOfLines={2}
                          adjustsFontSizeToFit
                          minimumFontScale={0.8}
                        >
                          {book.short_name}
                        </Text>
                        <Text
                          className="text-xs text-gray-500 text-center mt-1"
                          numberOfLines={1}
                        >
                          {book.long_name}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                </View>
              )}

              {/* New Testament */}
              {newTestament.length > 0 && (
                <View className="mb-6">
                  <View className="flex-row items-center justify-between mb-3">
                    <Text className="text-xl font-bold text-primary">
                      New Testament
                    </Text>
                    <Text className="text-sm text-gray-500">
                      {newTestament.length} books
                    </Text>
                  </View>
                  <View className="flex-row flex-wrap justify-between">
                    {newTestament.map((book) => (
                      <TouchableOpacity
                        key={book.book_number}
                        onPress={() => handleBookSelect(book)}
                        className="p-3 rounded-lg shadow-sm mb-3 border-l-4"
                        style={{
                          width: "15%",
                          borderLeftColor: book.book_color || "#059669",
                          backgroundColor:
                            lightenColor(book.book_color || "#059669", 0.15) ||
                            "#fff",
                        }}
                      >
                        <Text
                          className="font-semibold text-center text-xs"
                          style={{ color: "#1F2937" }}
                          numberOfLines={2}
                          adjustsFontSizeToFit
                          minimumFontScale={0.8}
                        >
                          {book.short_name}
                        </Text>
                        <Text
                          className="text-xs text-gray-500 text-center mt-1"
                          numberOfLines={1}
                        >
                          {book.long_name}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                </View>
              )}
            </View>

            {/* Current Selection Display */}
            <View className="bg-blue-100 rounded-lg p-4 mb-4 border border-blue-200">
              <Text className="text-blue-800 font-semibold text-center text-lg">
                {selectedBook
                  ? `${selectedBook.long_name} ${selectedChapter}${selectedVerse ? `:${selectedVerse}` : ""}`
                  : "Select a book"}
              </Text>
              <Text className="text-blue-600 text-sm text-center mt-1">
                {selectedBook
                  ? `${chapters.length} ${chapters.length > 1 ? "chapters available" : "chapter available"}`
                  : ""}
              </Text>
            </View>

            {/* Chapter Selection */}
            {selectedBook && chapters.length > 0 && (
              <View className="mb-6">
                <Text className="text-lg font-semibold text-slate-800 mb-3">
                  Select Chapter
                </Text>
                {isLoadingChapters ? (
                  <View className="flex-row justify-center py-4">
                    <ActivityIndicator size="small" color="#3B82F6" />
                  </View>
                ) : (
                  <View className="flex-row flex-wrap gap-3 justify-center">
                    {chapters.map((chapterInfo) => (
                      <TouchableOpacity
                        key={chapterInfo.chapter}
                        onPress={() => handleChapterSelect(chapterInfo.chapter)}
                        className={`rounded-lg border items-center justify-center ${
                          selectedChapter === chapterInfo.chapter
                            ? "bg-blue-500 border-blue-600"
                            : "bg-white border-gray-300"
                        }`}
                        style={{
                          width: 60,
                          height: 60,
                        }}
                      >
                        <Text
                          className={`font-bold text-lg ${
                            selectedChapter === chapterInfo.chapter
                              ? "text-white"
                              : "text-slate-700"
                          }`}
                        >
                          {chapterInfo.chapter}
                        </Text>
                        <Text
                          className={`text-xs ${
                            selectedChapter === chapterInfo.chapter
                              ? "text-blue-100"
                              : "text-gray-500"
                          }`}
                        >
                          {chapterInfo.verseCount} v
                          {chapterInfo.verseCount !== 1 ? "s" : ""}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                )}
              </View>
            )}

            {/* Verse Selection */}
            {selectedBook && selectedChapter && versesList.length > 0 && (
              <View className="mb-6">
                <Text className="text-lg font-semibold text-slate-800 mb-3">
                  Select Verse
                </Text>
                <View className="flex-row flex-wrap gap-2">
                  {versesList.map((verse) => (
                    <TouchableOpacity
                      key={verse}
                      onPress={() => handleVerseSelect(verse)}
                      className={`w-10 h-10 rounded-lg border items-center justify-center ${
                        selectedVerse === verse
                          ? "bg-blue-500 border-blue-600"
                          : "bg-white border-gray-300"
                      }`}
                    >
                      <Text
                        className={`text-sm font-medium ${
                          selectedVerse === verse
                            ? "text-white"
                            : "text-slate-700"
                        }`}
                      >
                        {verse}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>
            )}

            {/* Action Button */}
            <TouchableOpacity
              onPress={handleNavigateToLocation}
              disabled={!selectedBook || isLoadingNavigation}
              className={`p-4 rounded-lg mt-4 mb-10 ${
                selectedBook && !isLoadingNavigation
                  ? "bg-blue-500"
                  : "bg-gray-300"
              }`}
            >
              <Text className="text-white font-semibold text-center text-lg">
                {selectedBook
                  ? `Go to ${selectedBook.long_name} ${selectedChapter}${selectedVerse ? `:${selectedVerse}` : ""}`
                  : "Select a book to continue"}
              </Text>
            </TouchableOpacity>
          </ScrollView>
        </View>
      </Modal>

      {/* Chapter Content */}
      <ScrollView
        ref={scrollViewRef}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{
          paddingBottom: 40,
          paddingHorizontal: isFullScreen ? 20 : 0,
        }}
        onScroll={handleScroll}
        scrollEventThrottle={16}
        onContentSizeChange={handleContentSizeChange}
        onLayout={handleScrollViewLayout}
      >
        <View
          ref={chapterContainerRef}
          onLayout={handleChapterContainerLayout}
          className={isFullScreen ? "pt-4" : ""}
        >
          <ChapterViewEnhanced
            verses={verses}
            bookName={bookName}
            chapterNumber={currentChapter}
            bookId={bookId}
            showVerseNumbers
            fontSize={fontSize}
            onVersePress={handleVersePress}
            onVerseLayout={handleVerseLayout}
            onVerseRef={handleVerseRef}
            highlightVerse={targetVerse}
            highlightedVerses={new Set(highlightedVerses)}
            isFullScreen={isFullScreen}
          />
        </View>
      </ScrollView>

      {/* Quick Navigation Footer */}
      {!isFullScreen && (
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
        </View>
      )}

      {/* Full screen toggle button */}
      {isLandscape && (
        <TouchableOpacity
          onPress={toggleFullScreen}
          className="absolute top-12 right-18 size-12 bg-gray-600/50 rounded-full items-center justify-center z-50"
        >
          <Text className="text-white text-4xl font-bold">
            {isFullScreen ? "◱" : "◲"}
          </Text>
        </TouchableOpacity>
      )}
    </View>
  );
}
