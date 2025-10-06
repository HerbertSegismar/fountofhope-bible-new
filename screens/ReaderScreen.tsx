import React, {
  useEffect,
  useState,
  useContext,
  useRef,
  useCallback,
  useMemo,
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
import { RouteProp, useFocusEffect } from "@react-navigation/native";
import { Ionicons } from "@expo/vector-icons";
import { RootStackParamList, Verse } from "../types";
import { ChapterViewEnhanced } from "../components/ChapterViewEnhanced";
import { VersionSelector } from "../components/VersionSelector";
import { useBibleDatabase } from "../context/BibleDatabaseContext";
import { BookmarksContext } from "../context/BookmarksContext";
import { useHighlights } from "../context/HighlightsContext";
import { getTestament } from "../utils/testamentUtils";
import { lightenColor } from "../utils/colorUtils"; // Extract this too if needed

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
  // Use route params directly as source of truth
  const { bookId, chapter, bookName, verse: targetVerse } = route.params;

  // Component state
  const [verses, setVerses] = useState<Verse[]>([]);
  const [loading, setLoading] = useState(true);
  const [book, setBook] = useState<any>(null);
  const [fontSize, setFontSize] = useState(16);
  const [showEnd, setShowEnd] = useState(false);

  // Settings and navigation state
  const [showSettings, setShowSettings] = useState(false);
  const [showNavigation, setShowNavigation] = useState(false);
  const [books, setBooks] = useState<Book[]>([]);
  const [oldTestament, setOldTestament] = useState<Book[]>([]);
  const [newTestament, setNewTestament] = useState<Book[]>([]);
  const [chapters, setChapters] = useState<ChapterInfo[]>([]);
  const [versesList, setVersesList] = useState<number[]>([]);

  // Navigation modal state - initialize with current route values
  const [selectedBook, setSelectedBook] = useState<Book | null>(null);
  const [selectedChapter, setSelectedChapter] = useState<number>(chapter);
  const [selectedVerse, setSelectedVerse] = useState<number | null>(
    targetVerse || null
  );
  const [hasTappedChapter, setHasTappedChapter] = useState(false);

  const [isLoadingNavigation, setIsLoadingNavigation] = useState(false);
  const [isLoadingChapters, setIsLoadingChapters] = useState(false);

  // UI state
  const [isFullScreen, setIsFullScreen] = useState(false);
  const [isLandscape, setIsLandscape] = useState(screenWidth > screenHeight);
  const [lastScrollY, setLastScrollY] = useState(0);
  const [scrollThreshold] = useState(50);

  // Scroll and measurement state
  const [hasScrolledToVerse, setHasScrolledToVerse] = useState(false);
  const [verseMeasurements, setVerseMeasurements] = useState<
    Record<number, { y: number; height: number }>
  >({});
  const [contentReady, setContentReady] = useState(false);
  const [scrollViewReady, setScrollViewReady] = useState(false);
  const [chapterContainerY, setChapterContainerY] = useState(0);
  const [contentHeight, setContentHeight] = useState(1);
  const [scrollViewHeight, setScrollViewHeight] = useState(0);

  // Auto-scroll state for navigation modal
  const [shouldScrollToChapters, setShouldScrollToChapters] = useState(false);
  const [shouldScrollToVerses, setShouldScrollToVerses] = useState(false);

  // Context and refs
  const { bibleDB, currentVersion, availableVersions, switchVersion } =
    useBibleDatabase();
  const { addBookmark } = useContext(BookmarksContext);
  const {
    toggleVerseHighlight,
    getChapterHighlights,
    loading: highlightedVersesLoading,
  } = useHighlights();

  const highlightedVerses = useMemo(
    () => getChapterHighlights(bookId, chapter),
    [bookId, chapter, getChapterHighlights]
  );

  const scrollViewRef = useRef<ScrollView>(null);
  const chapterContainerRef = useRef<View>(null);
  const scrollY = useRef(new Animated.Value(0)).current;
  const measurementCount = useRef(0);
  const totalVerses = useRef(0);
  const scrollAttempts = useRef(0);
  const scrollTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const isMounted = useRef(true);
  const verseRefs = useRef<Record<number, View | undefined>>({});

  // Navigation modal refs
  const modalScrollViewRef = useRef<ScrollView>(null);
  const chaptersSectionRef = useRef<View>(null);
  const versesSectionRef = useRef<View>(null);

  const progress = Animated.divide(
    scrollY,
    Math.max(contentHeight - scrollViewHeight, 1)
  );

  // Auto-scroll functions for navigation modal
  const scrollToChaptersSection = useCallback(() => {
    if (modalScrollViewRef.current && chaptersSectionRef.current) {
      setTimeout(() => {
        chaptersSectionRef.current?.measure(
          (x, y, width, height, pageX, pageY) => {
            if (modalScrollViewRef.current) {
              modalScrollViewRef.current.scrollTo({
                y: pageY - 100, // Adjust offset as needed
                animated: true,
              });
            }
          }
        );
      }, 100);
    }
  }, []);

  const scrollToVersesSection = useCallback(() => {
    if (modalScrollViewRef.current && versesSectionRef.current) {
      setTimeout(() => {
        versesSectionRef.current?.measure(
          (x, y, width, height, pageX, pageY) => {
            if (modalScrollViewRef.current) {
              modalScrollViewRef.current.scrollTo({
                y: pageY - 80, // Adjust offset as needed
                animated: true,
              });
            }
          }
        );
      }, 100);
    }
  }, []);

  // Auto-scroll effects
  useEffect(() => {
    if (shouldScrollToChapters && !isLoadingNavigation) {
      scrollToChaptersSection();
      setShouldScrollToChapters(false);
    }
  }, [shouldScrollToChapters, isLoadingNavigation, scrollToChaptersSection]);

  useEffect(() => {
    if (shouldScrollToVerses && !isLoadingNavigation) {
      scrollToVersesSection();
      setShouldScrollToVerses(false);
    }
  }, [shouldScrollToVerses, isLoadingNavigation, scrollToVersesSection]);

  // Reset modal state to current route values
  const resetModalState = useCallback(() => {
    // Find current book in loaded books
    const currentBook = books.find((b) => b.book_number === bookId);
    if (currentBook) {
      setSelectedBook(currentBook);
      setSelectedChapter(chapter);
      setSelectedVerse(targetVerse || null);
    }
  }, [books, bookId, chapter, targetVerse]);

  // Load books and initialize modal state
  const loadBooks = useCallback(async () => {
    if (!bibleDB) return;

    try {
      setIsLoadingNavigation(true);
      const bookList = await bibleDB.getBooks();

      const booksWithTestament = bookList.map((book) => ({
        ...book,
        testament: getTestament(book.book_number, book.long_name),
      }));

      setBooks(booksWithTestament);

      const ot = booksWithTestament.filter((book) => book.testament === "OT");
      const nt = booksWithTestament.filter((book) => book.testament === "NT");
      setOldTestament(ot);
      setNewTestament(nt);

      // Initialize modal state with current location
      const currentBook = booksWithTestament.find(
        (b) => b.book_number === bookId
      );
      if (currentBook) {
        setSelectedBook(currentBook);
        setSelectedChapter(chapter);
        setSelectedVerse(targetVerse || null);
        await loadChaptersForBook(currentBook.book_number);
        await loadVersesForChapter(currentBook.book_number, chapter);
      }
    } catch (error) {
      console.error("Failed to load books:", error);
      Alert.alert("Error", "Failed to load books");
    } finally {
      setIsLoadingNavigation(false);
    }
  }, [bibleDB, bookId, chapter, targetVerse]);

  const loadChaptersForBook = useCallback(
    async (bookId: number) => {
      if (!bibleDB) return;

      try {
        setIsLoadingChapters(true);
        const chapterCount = await bibleDB.getChapterCount(bookId);

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
    },
    [bibleDB]
  );

  const loadVersesForChapter = useCallback(
    async (bookId: number, chapterNum: number) => {
      if (!bibleDB) return;

      try {
        const verses = await bibleDB.getVerses(bookId, chapterNum);
        const verseNumbers = verses.map((v) => v.verse);
        setVersesList(verseNumbers);
      } catch (error) {
        console.error("Failed to load verses:", error);
        setVersesList([]);
      }
    },
    [bibleDB]
  );

  const handleBookSelect = useCallback(
    async (book: Book) => {
      setSelectedBook(book);
      setSelectedChapter(1);
      setSelectedVerse(null);
      setIsLoadingNavigation(true);
      setHasTappedChapter(false);

      try {
        await loadChaptersForBook(book.book_number);
        await loadVersesForChapter(book.book_number, 1);
        // Set flag to trigger scrolling after content is loaded
        setShouldScrollToChapters(true);
      } finally {
        setIsLoadingNavigation(false);
      }
    },
    [loadChaptersForBook, loadVersesForChapter]
  );

  const handleChapterSelect = useCallback(
    async (chapterNum: number) => {
      setSelectedChapter(chapterNum);
      setSelectedVerse(null);
      setIsLoadingNavigation(true);
      setHasTappedChapter(true);

      try {
        if (selectedBook) {
          await loadVersesForChapter(selectedBook.book_number, chapterNum);
          // Set flag to trigger scrolling to verses after content is loaded
          setShouldScrollToVerses(true);
        }
      } finally {
        setIsLoadingNavigation(false);
      }
    },
    [selectedBook, loadVersesForChapter]
  );

  // Auto-navigate when verse is selected
  const handleVerseSelect = useCallback(
    (verse: number) => {
      setSelectedVerse(verse);

      // Auto-navigate immediately when a verse is selected
      if (selectedBook) {
        // Close modal first
        setShowNavigation(false);
        // Navigate immediately
        navigation.navigate("Reader", {
          bookId: selectedBook.book_number,
          chapter: selectedChapter,
          verse: verse,
          bookName: selectedBook.long_name,
          bookColor: selectedBook.book_color,
          testament: selectedBook.testament,
        });
      }
    },
    [selectedBook, selectedChapter, navigation]
  );

  // Use navigation to update route like VerseListScreen does
  const handleNavigateToLocation = useCallback(() => {
    if (!selectedBook) return;

    // Close modal first
    setShowNavigation(false);

    // Use navigation to update route params
    navigation.navigate("Reader", {
      bookId: selectedBook.book_number,
      chapter: selectedChapter,
      verse: selectedVerse || undefined,
      bookName: selectedBook.long_name,
      bookColor: selectedBook.book_color,
      testament: selectedBook.testament,
    });
  }, [selectedBook, selectedChapter, selectedVerse, navigation]);

  const handleVersionSelect = useCallback(
    async (version: string) => {
      if (version === currentVersion) return;

      try {
        await switchVersion(version);
        setShowSettings(false);
        await loadChapter();
      } catch (error) {
        console.error("Version switch failed:", error);
        Alert.alert(
          "Error",
          "Failed to switch Bible version. Please try again."
        );
      }
    },
    [currentVersion, switchVersion]
  );

  // Load chapter data
  const loadChapter = useCallback(async () => {
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

      const bookDetails = await bibleDB.getBook(bookId);
      setBook(bookDetails);
      const chapterVerses = await bibleDB.getVerses(bookId, chapter);
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
  }, [bibleDB, bookId, chapter]);

  // Chapter navigation using navigation like VerseListScreen does
  const goToPreviousChapter = useCallback(() => {
    if (chapter > 1) {
      // Use navigation to update route
      navigation.navigate("Reader", {
        ...route.params,
        chapter: chapter - 1,
        verse: undefined,
      });
    }
  }, [chapter, navigation, route.params]);

  const goToNextChapter = useCallback(async () => {
    if (!bibleDB) return;

    try {
      const nextChapterVerses = await bibleDB.getVerses(bookId, chapter + 1);
      if (nextChapterVerses.length > 0) {
        // Use navigation to update route
        navigation.navigate("Reader", {
          ...route.params,
          chapter: chapter + 1,
          verse: undefined,
        });
      } else {
        Alert.alert("End of Book", "This is the last chapter.");
      }
    } catch {
      Alert.alert("Error", "Cannot load next chapter");
    }
  }, [bibleDB, bookId, chapter, navigation, route.params]);

  // Scroll functions
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
  }, [
    targetVerse,
    verseMeasurements,
    scrollViewHeight,
    measureVersePosition,
    scrollToVerseFallback,
  ]);

  // Layout handlers
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

  const handleScroll = useCallback(
    (event: NativeSyntheticEvent<NativeScrollEvent>) => {
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
    },
    [
      isLandscape,
      lastScrollY,
      scrollThreshold,
      isFullScreen,
      scrollViewHeight,
      contentHeight,
    ]
  );

  const increaseFontSize = useCallback(
    () => setFontSize((prev) => Math.min(prev + 1, 24)),
    []
  );
  const decreaseFontSize = useCallback(
    () => setFontSize((prev) => Math.max(prev - 1, 12)),
    []
  );

  // Verse press handler
  const handleVersePress = useCallback(
    (verse: Verse) => {
      const verseNumber = verse.verse;
      const isHighlighted = highlightedVerses.includes(verseNumber);

      Alert.alert(
        `${verse.book_name} ${verse.chapter}:${verseNumber}`,
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
              // Use navigation to update route with the selected verse
              navigation.navigate("Reader", {
                ...route.params,
                verse: verseNumber,
              });
            },
          },
          {
            text: "Share",
            onPress: () => Alert.alert("Share", "Coming soon!"),
          },
        ]
      );
    },
    [
      highlightedVerses,
      toggleVerseHighlight,
      addBookmark,
      navigation,
      route.params,
    ]
  );

  const toggleFullScreen = useCallback(() => {
    setIsFullScreen((prev) => !prev);
  }, []);

  const getHeaderTitle = useCallback(() => {
    if (targetVerse) {
      return `${bookName} ${chapter}:${targetVerse}`;
    }
    return `${bookName} ${chapter}`;
  }, [bookName, chapter, targetVerse]);

  // Effects
  useEffect(() => {
    isMounted.current = true;
    return () => {
      isMounted.current = false;
      if (scrollTimeoutRef.current) {
        clearTimeout(scrollTimeoutRef.current);
      }
    };
  }, []);

  // Load chapter when route params change
  useEffect(() => {
    if (bibleDB) {
      loadChapter();
    }
  }, [bibleDB, bookId, chapter, loadChapter]);

  // Reset modal state when route params change
  useEffect(() => {
    resetModalState();
  }, [bookId, chapter, targetVerse, resetModalState]);

  // Load books and reset modal when navigation modal opens
  useEffect(() => {
    if (showNavigation) {
      if (books.length === 0 && bibleDB) {
        loadBooks();
      } else {
        resetModalState();
      }
    }
  }, [showNavigation, books.length, bibleDB, loadBooks, resetModalState]);

  // Scroll to verse effect
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
    scrollToTargetVerse,
    scrollToVerseFallback,
  ]);

  // Layout effects
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
                onPress={() => {
                  setShowNavigation(true);
                  setHasTappedChapter(false);
                }}
                className="p-2 mr-2"
                testID="navigation-button"
              >
                <Ionicons name="book-outline" size={24} color="white" />
              </TouchableOpacity>
              <TouchableOpacity
                onPress={() => setShowSettings(true)}
                className="p-2"
                testID="settings-button"
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
              disabled={chapter <= 1}
              className={`p-2 ${chapter <= 1 ? "opacity-30" : ""}`}
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

            <TouchableOpacity
              onPress={goToNextChapter}
              className={`p-2 ${isLandscape ? "mr-12" : "mr-0"}`}
            >
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
          <View
            className={`flex-row items-center space-x-3 ${isLandscape ? "mr-12 gap-4" : "mr-0 gap-2"}`}
          >
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
              <Text className="text-white text-xs">{`Center ${targetVerse}`}</Text>
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

            <ScrollView className="max-h-96 m-4">
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

              {/* Bible Version Selection - USING SHARED COMPONENT */}
              <VersionSelector
                currentVersion={currentVersion}
                availableVersions={availableVersions}
                onVersionSelect={handleVersionSelect}
                title="Bible Version"
                description="Choose your preferred Bible translation"
                showCurrentVersion={true}
              />
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

      {/* Navigation Modal - UPDATED: Auto-scroll and auto-navigation */}
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
                onPress={() => {
                  setShowNavigation(false);
                }}
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

          <ScrollView
            ref={modalScrollViewRef}
            className="flex-1 p-4"
            showsVerticalScrollIndicator={true}
          >
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
                      </TouchableOpacity>
                    ))}
                  </View>
                </View>
              )}
            </View>

            {/* Current Selection Display */}
            <View className="bg-blue-100 rounded-lg p-2 mb-4 border border-blue-200">
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

            {/* Chapter Selection - UPDATED: Added ref for auto-scroll */}
            {selectedBook && chapters.length > 0 && (
              <View ref={chaptersSectionRef} className="mb-6">
                <Text className="text-lg font-semibold text-slate-800 mb-3">
                  Select Chapter
                </Text>
                {isLoadingChapters ? (
                  <View className="flex-row justify-center py-4">
                    <ActivityIndicator size="small" color="#3B82F6" />
                  </View>
                ) : (
                  <View className="flex-row flex-wrap gap-2 justify-center">
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
                          width: 40,
                          height: 40,
                        }}
                      >
                        <Text
                          className={`font-bold text-sm ${
                            selectedChapter === chapterInfo.chapter
                              ? "text-white"
                              : "text-blue-500"
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

            {!hasTappedChapter && (
              <View className="mb-6">
                <Text className="text-sm text-slate-500 mb-3">
                  Tap any chapter to reveal verse selection
                </Text>
              </View>
            )}

            {/* Verse Selection - UPDATED: Added ref for auto-scroll and auto-navigation */}
            {hasTappedChapter &&
              selectedBook &&
              selectedChapter &&
              versesList.length > 0 && (
                <View ref={versesSectionRef} className="mb-6">
                  <Text className="text-lg font-semibold text-slate-800 mb-3">
                    Select Verse{" "}
                    {selectedVerse && `- Selected: ${selectedVerse}`}
                  </Text>
                  <Text className="text-sm text-slate-500 mb-3">
                    {selectedVerse
                      ? `Will navigate to ${selectedBook.long_name} ${selectedChapter}:${selectedVerse}`
                      : "Tap any verse to navigate directly"}
                  </Text>
                  <View className="flex-row flex-wrap gap-1">
                    {hasTappedChapter &&
                      versesList.map((verse) => (
                        <TouchableOpacity
                          key={verse}
                          onPress={() => handleVerseSelect(verse)}
                          className={`size-10 rounded-lg border items-center justify-center ${
                            selectedVerse === verse
                              ? "bg-green-500 border-green-600"
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

            {/* Action Button - UPDATED: Only show for chapter-level navigation */}
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
                  ? `Go to ${selectedBook.long_name} ${selectedChapter}`
                  : "Select a book to continue"}
              </Text>
              <Text className="text-blue-100 text-sm text-center mt-1">
                Navigate to chapter {selectedChapter}
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
            chapterNumber={chapter}
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
                chapter: chapter,
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
            className={`bg-white px-4 py-2 rounded-lg border border-gray-300 ${isLandscape ? "mr-12" : "mr-0"}`}
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
