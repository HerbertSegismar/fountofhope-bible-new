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
  TextStyle,
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
import { useTheme } from "../context/ThemeContext";
import { getTestament } from "../utils/testamentUtils";
import { lightenColor } from "../utils/colorUtils";
import { BibleDatabase } from "../services/BibleDatabase";

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

const dbToDisplayName: Record<string, string> = {
  "esv.sqlite3": "ESV",
  "esvgsb.sqlite3": "ESVGSB",
  "iesvth.sqlite3": "IESVTH",
  "rv1895.sqlite3": "RV1895",
  "cebB.sqlite3": "CEB",
  "hilab82.sqlite3": "HILAB",
  "tagab01.sqlite3": "TAGAB",
  "tagmb12.sqlite3": "TAGMB",
  "mbb05.sqlite3": "MBB",
  "niv11.sqlite3": "NIV",
  "csb17.sqlite3": "CSB",
  "ylt.sqlite3": "YLT",
  "nlt15.sqlite3": "NLT",
  "nkjv.sqlite3": "NKJV",
  "nasb.sqlite3": "NASB",
  "logos.sqlite3": "LOGOS",
  "kj2.sqlite3": "KJ2",
};

export default function ReaderScreen({ navigation, route }: Props) {
  // Use route params directly as source of truth
  const { bookId, chapter, bookName, verse: targetVerse } = route.params;

  // Theme
  const {
    theme,
    navTheme,
    colorScheme,
    setColorScheme,
    colorSchemes,
    toggleTheme,
  } = useTheme();
  const isDark = theme === "dark";
  const primaryColor = navTheme.colors.primary;
  const primaryTextColor = "#ffffff";

  const handleColorSchemePress = useCallback(() => {
    const currentIndex = colorSchemes.findIndex((s) => s.name === colorScheme);
    const nextIndex = (currentIndex + 1) % colorSchemes.length;
    setColorScheme(colorSchemes[nextIndex].name);
  }, [colorScheme, colorSchemes, setColorScheme]);

  // Light theme colors
  const lightColors = {
    primary: "#3B82F6",
    secondary: "#1E40AF",
    accent: "#FF6B6B",
    background: {
      target: "#FFF9E6",
      highlight: "#EFF6FF",
      default: "#FFFFFF",
    },
    border: {
      target: "#FFD700",
      highlight: "#3B82F6",
      default: "#E5E7EB",
    },
    text: {
      primary: "#1F2937",
      secondary: "#374151",
      verseNumber: "#1E40AF",
      target: "#DC2626",
    },
    muted: "#6B7280",
    card: "#FFFFFF",
  };

  // Dark theme colors
  const darkColors = {
    primary: "#60A5FA",
    secondary: "#3B82F6",
    accent: "#F87171",
    background: {
      target: "#1F2937",
      highlight: "#1E3A8A",
      default: "#111827",
    },
    border: {
      target: "#FCD34D",
      highlight: "#60A5FA",
      default: "#374151",
    },
    text: {
      primary: "#F9FAFB",
      secondary: "#D1D5DB",
      verseNumber: "#93C5FD",
      target: "#FECACA",
    },
    muted: "#9CA3AF",
    card: "#111827",
  };

  const themeColors = isDark ? darkColors : lightColors;

  const colors = {
    primary: primaryColor,
    background: themeColors.background,
    text: themeColors.text,
    border: themeColors.border,
    secondary: themeColors.secondary,
    accent: themeColors.accent,
    muted: isDark ? "#9ca3af" : "#6b7280",
    card: isDark ? "#1e293b" : "#ffffff",
  };

  const versionSelectorColors = {
    primary: primaryColor,
    background: themeColors.background.default,
    text: themeColors.text.primary,
    muted: colors.muted,
    card: colors.card,
    border: themeColors.border.default,
    secondary: themeColors.secondary,
    accent: themeColors.accent,
  };

  // Component state
  const [verses, setVerses] = useState<Verse[]>([]);
  const [secondaryVerses, setSecondaryVerses] = useState<Verse[]>([]);
  const [loading, setLoading] = useState(true);
  const [secondaryLoading, setSecondaryLoading] = useState(false);
  const [book, setBook] = useState<any>(null);
  const [fontSize, setFontSize] = useState(16);
  const [showEnd, setShowEnd] = useState(false);
  const { addBookmark, bookmarks } = useContext(BookmarksContext);

  // Settings and navigation state
  const [showSettings, setShowSettings] = useState(false);
  const [showNavigation, setShowNavigation] = useState(false);
  const [books, setBooks] = useState<Book[]>([]);
  const [oldTestament, setOldTestament] = useState<Book[]>([]);
  const [newTestament, setNewTestament] = useState<Book[]>([]);
  const [chapters, setChapters] = useState<ChapterInfo[]>([]);
  const [versesList, setVersesList] = useState<number[]>([]);

  // Multi-version state
  const [showMultiVersion, setShowMultiVersion] = useState(false);
  const [secondaryVersion, setSecondaryVersion] = useState<string | null>(null);
  const [isSwitchingVersion, setIsSwitchingVersion] = useState(false);
  // REFACTORED: Added failure tracking to prevent loops on bad versions
  const [secondaryFailureCount, setSecondaryFailureCount] = useState(0);
  const secondaryDBCache = useRef<Record<string, BibleDatabase>>({});

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
  const lastScrollYRef = useRef(0);
  const [scrollThreshold] = useState(50);

  // Scroll and measurement state
  const [hasScrolledToVerse, setHasScrolledToVerse] = useState(false);
  const [verseMeasurements, setVerseMeasurements] = useState<
    Record<number, number>
  >({});
  const [secondaryVerseMeasurements, setSecondaryVerseMeasurements] = useState<
    Record<number, number>
  >({});
  const [scrollViewReady, setScrollViewReady] = useState(false);
  const [chapterContainerY, setChapterContainerY] = useState(0);
  const [contentHeight, setContentHeight] = useState(1);
  const [secondaryContentHeight, setSecondaryContentHeight] = useState(1);
  const [scrollViewHeight, setScrollViewHeight] = useState(0);

  // Auto-scroll state for navigation modal
  const [shouldScrollToChapters, setShouldScrollToChapters] = useState(false);

  // Cache for chapters
  const [chaptersCache, setChaptersCache] = useState<
    Record<number, ChapterInfo[]>
  >({});

  // Context and refs
  const { bibleDB, currentVersion, availableVersions, switchVersion } =
    useBibleDatabase();
  const {
    toggleVerseHighlight,
    getChapterHighlights,
    loading: highlightedVersesLoading,
  } = useHighlights();

  const defaultVerseHeight = 80;

  const bookmarkedVerses = useMemo(() => {
    const chapterBookmarks = bookmarks.filter(
      (bookmark) =>
        bookmark.book_number === bookId && bookmark.chapter === chapter
    );
    return new Set(chapterBookmarks.map((bookmark) => bookmark.verse));
  }, [bookmarks, bookId, chapter]);

  const highlightedVerses = useMemo(
    () => getChapterHighlights(bookId, chapter),
    [bookId, chapter, getChapterHighlights]
  );

  const scrollViewRef = useRef<ScrollView>(null);
  const secondaryScrollViewRef = useRef<ScrollView>(null);
  const chapterContainerRef = useRef<View>(null);
  const scrollY = useRef(new Animated.Value(0)).current;
  const scrollTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const isMounted = useRef(true);
  const isSyncing = useRef(false);

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

  // Auto-scroll effects
  useEffect(() => {
    if (shouldScrollToChapters && !isLoadingNavigation) {
      scrollToChaptersSection();
      setShouldScrollToChapters(false);
    }
  }, [shouldScrollToChapters, isLoadingNavigation, scrollToChaptersSection]);

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
    } catch (error) {
      console.error("Failed to load books:", error);
      Alert.alert("Error", "Failed to load books");
    } finally {
      setIsLoadingNavigation(false);
    }
  }, [bibleDB]);

  const loadChaptersForBook = useCallback(
    async (bookId: number) => {
      if (!bibleDB) return;

      if (chaptersCache[bookId]) {
        setChapters(chaptersCache[bookId]);
        setShouldScrollToChapters(true);
        return;
      }

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
        setChaptersCache((prev) => ({ ...prev, [bookId]: chapterData }));
        setShouldScrollToChapters(true);
      } catch (error) {
        console.error("Failed to load chapters:", error);
        setChapters([]);
      } finally {
        setIsLoadingChapters(false);
      }
    },
    [bibleDB, chaptersCache]
  );

  const handleBookSelect = useCallback(
    async (book: Book) => {
      setSelectedBook(book);
      setSelectedChapter(1);
      setSelectedVerse(null);
      setHasTappedChapter(false);

      await loadChaptersForBook(book.book_number);
    },
    [loadChaptersForBook]
  );

  const handleChapterSelect = useCallback((chapterNum: number) => {
    setSelectedChapter(chapterNum);
    setSelectedVerse(null);
    setHasTappedChapter(true);
  }, []);

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

  // Load chapter data with retry logic for intermittent DB errors
  const loadChapter = useCallback(async () => {
    if (!bibleDB) return;

    const maxRetries = 3;
    let lastError: unknown;

    for (let attempt = 0; attempt < maxRetries; attempt++) {
      try {
        setLoading(true);
        setHasScrolledToVerse(false);
        setScrollViewReady(false);
        setVerseMeasurements({});
        setChapterContainerY(0);
        setIsFullScreen(false);
        scrollTimeoutRef.current = null;

        const bookDetails = await bibleDB.getBook(bookId);
        setBook(bookDetails);
        const chapterVerses = await bibleDB.getVerses(bookId, chapter);
        setVerses(chapterVerses);

        // Success - set loading false and exit
        if (isMounted.current) {
          setLoading(false);
          setShowEnd(false);
        }
        return; // Exit on success
      } catch (error) {
        lastError = error;
        console.error(`Chapter load attempt ${attempt + 1} failed:`, error);

        if (attempt < maxRetries - 1) {
          // Exponential backoff delay
          const delay = 500 * Math.pow(2, attempt);
          await new Promise((resolve) => setTimeout(resolve, delay));
        }
      }
    }

    // All retries exhausted
    console.error("All chapter load attempts failed:", lastError);
    if (isMounted.current) {
      setLoading(false);
      setShowEnd(false);
    }
    Alert.alert(
      "Error",
      `Failed to load chapter content after ${maxRetries} attempts. Please try refreshing or switching versions.`
    );
  }, [bibleDB, bookId, chapter]);

  // Create ref for loadChapter to avoid dependency issues
  const loadChapterRef = useRef(loadChapter);
  useEffect(() => {
    loadChapterRef.current = loadChapter;
  }, [loadChapter]);

  const handleVersionSelect = useCallback(
    async (version: string) => {
      if (version === currentVersion) {
        return;
      }

      try {
        setIsSwitchingVersion(true);
        // Close modal first to prevent state conflicts
        setShowSettings(false);

        // Switch version and wait for completion
        await switchVersion(version);
      } catch (error) {
        console.error("Version switch failed:", error);
        Alert.alert(
          "Error",
          "Failed to switch Bible version. Please try again."
        );
      } finally {
        setIsSwitchingVersion(false);
      }
    },
    [currentVersion, switchVersion]
  );

  // REFACTORED: Reset failure count on toggle
  const toggleMultiVersion = useCallback(async () => {
    setSecondaryFailureCount(0); // Reset on toggle
    if (!showMultiVersion) {
      // Enable multi-version - set a default secondary version if none selected
      if (!secondaryVersion) {
        // Choose a different version than current
        const otherVersions = availableVersions.filter(
          (v) => v !== currentVersion
        );
        if (otherVersions.length > 0) {
          setSecondaryVersion(otherVersions[0]);
        } else {
          Alert.alert("Info", "No other Bible versions available");
          return;
        }
      }
      setShowMultiVersion(true);
    } else {
      // Disable multi-version
      setShowMultiVersion(false);
      setSecondaryVerses([]);
    }
  }, [showMultiVersion, secondaryVersion, availableVersions, currentVersion]);

  // Handle secondary version selection
  const handleSecondaryVersionSelect = useCallback(
    async (version: string) => {
      if (version === currentVersion) {
        Alert.alert(
          "Error",
          "Secondary version cannot be the same as primary version"
        );
        return;
      }

      setSecondaryVersion(version);
    },
    [currentVersion]
  );

  // Load secondary verses with retry logic
  const loadSecondaryVerses = useCallback(
    async (dbInstance: BibleDatabase, retryCount = 0) => {
      const maxRetries = 3;
      if (retryCount >= maxRetries) {
        throw new Error(`Failed after ${maxRetries} retries`);
      }

      try {
        return await dbInstance.getVerses(bookId, chapter);
      } catch (error) {
        console.error(
          `Secondary load attempt ${retryCount + 1} failed:`,
          error
        );
        if (retryCount < maxRetries - 1) {
          await new Promise((resolve) => setTimeout(resolve, 500));
          return loadSecondaryVerses(dbInstance, retryCount + 1);
        }
        throw error;
      }
    },
    [bookId, chapter]
  );

  // REFACTORED: Enhanced loadSecondary effect with failure tracking
  useEffect(() => {
    const loadSecondary = async () => {
      if (!showMultiVersion || !secondaryVersion || !bibleDB) return;

      setSecondaryLoading(true);
      try {
        let secondaryChapterVerses: Verse[] = [];

        const dbName = secondaryVersion;
        let dbInstance = secondaryDBCache.current[dbName];

        if (!dbInstance) {
          dbInstance = new BibleDatabase(dbName);
          await dbInstance.init();
          secondaryDBCache.current[dbName] = dbInstance;
        }

        if (secondaryVersion === currentVersion) {
          secondaryChapterVerses = verses;
        } else {
          if (!dbInstance) {
            throw new Error("Failed to initialize secondary database");
          }
          secondaryChapterVerses = await loadSecondaryVerses(dbInstance);
        }

        // Reset failure count on success
        setSecondaryFailureCount(0);
        setSecondaryVerses(secondaryChapterVerses);
      } catch (error) {
        console.error("Failed to load secondary version:", error);

        // Track failures; disable multi-version after 3 attempts to prevent loops
        const newFailureCount = secondaryFailureCount + 1;
        setSecondaryFailureCount(newFailureCount);
        if (newFailureCount >= 3) {
          Alert.alert(
            "Version Load Error",
            `Failed to load ${getDisplayVersion(secondaryVersion)}. Disabling multi-version. Try a different version.`
          );
          setShowMultiVersion(false);
          setSecondaryVersion(null);
        }

        setSecondaryVerses([]);
      } finally {
        setSecondaryLoading(false);
      }
    };

    loadSecondary();
  }, [
    showMultiVersion,
    secondaryVersion,
    currentVersion,
    bookId,
    chapter,
    verses,
    bibleDB,
    loadSecondaryVerses,
    secondaryFailureCount, // Add this to re-trigger on failure reset
  ]);

  // Cleanup secondary DB when disabling multi-version
  useEffect(() => {
    if (!showMultiVersion && Object.keys(secondaryDBCache.current).length > 0) {
      Object.values(secondaryDBCache.current).forEach((db) => {
        db.close().catch(console.error);
      });
      secondaryDBCache.current = {};
    }
  }, [showMultiVersion]);

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
      // Check if next chapter exists by getting verse count
      const verseCount = await bibleDB.getVerseCount(bookId, chapter + 1);
      if (verseCount > 0) {
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
  const scrollToTargetVerse = useCallback((): boolean => {
    if (!targetVerse || verses.length === 0) return false;

    const verseIndex = verses.findIndex((v) => v.verse === targetVerse);
    if (verseIndex === -1) return false;

    let cumulative = 0;
    for (let i = 0; i < verseIndex; i++) {
      const verseNum = verses[i].verse;
      cumulative += verseMeasurements[verseNum] || defaultVerseHeight;
    }

    const verseHeight = verseMeasurements[targetVerse] || defaultVerseHeight;
    const scrollPosition = Math.max(
      0,
      cumulative - scrollViewHeight / 2 + verseHeight / 2
    );

    if (scrollViewRef.current) {
      scrollViewRef.current.scrollTo({
        y: scrollPosition,
        animated: true,
      });
    }

    setHasScrolledToVerse(true);
    return true;
  }, [verses, verseMeasurements, scrollViewHeight, targetVerse]);

  // Layout handlers
  const handleVerseLayout = useCallback(
    (verseNumber: number, event: LayoutChangeEvent) => {
      const { height } = event.nativeEvent.layout;

      if (height > 0) {
        setVerseMeasurements((prev) => {
          if (prev[verseNumber] === height) {
            return prev;
          }
          return { ...prev, [verseNumber]: height };
        });
      }
    },
    []
  );

  const handleSecondaryVerseLayout = useCallback(
    (verseNumber: number, event: LayoutChangeEvent) => {
      const { height } = event.nativeEvent.layout;

      if (height > 0) {
        setSecondaryVerseMeasurements((prev) => {
          if (prev[verseNumber] === height) {
            return prev;
          }
          return { ...prev, [verseNumber]: height };
        });
      }
    },
    []
  );

  const handleContentSizeChange = useCallback((w: number, h: number) => {
    setContentHeight(h);
  }, []);

  const handleSecondaryContentSizeChange = useCallback(
    (w: number, h: number) => {
      setSecondaryContentHeight(h);
    },
    []
  );

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
        const scrollDelta = offsetY - lastScrollYRef.current;
        if (scrollDelta > scrollThreshold && !isFullScreen && offsetY > 100) {
          setIsFullScreen(true);
        }
        lastScrollYRef.current = offsetY;
      }

      // Sync secondary scroll view if in multi-version mode
      if (
        showMultiVersion &&
        secondaryScrollViewRef.current &&
        !isSyncing.current
      ) {
        isSyncing.current = true;

        const viewHeight = scrollViewHeight;
        let targetY = 0;
        const maxSecondary = Math.max(secondaryContentHeight - viewHeight, 0);

        // Find verse index in primary
        let cumulative = 0;
        let verseIndex = -1;
        for (let i = 0; i < verses.length; i++) {
          const verseNum = verses[i].verse;
          const height = verseMeasurements[verseNum] || defaultVerseHeight;
          if (offsetY < cumulative + height) {
            verseIndex = i;
            break;
          }
          cumulative += height;
        }

        if (verseIndex !== -1) {
          const startY = cumulative;
          const verseNum = verses[verseIndex].verse;
          const secIndex = secondaryVerses.findIndex(
            (v) => v.verse === verseNum
          );
          if (secIndex !== -1) {
            let secCumulative = 0;
            for (let j = 0; j < secIndex; j++) {
              const sVerseNum = secondaryVerses[j].verse;
              secCumulative +=
                secondaryVerseMeasurements[sVerseNum] || defaultVerseHeight;
            }
            const secStartY = secCumulative;
            targetY = secStartY - startY + offsetY;
          } else {
            // Fallback to progress
            const maxPrimary = Math.max(contentHeight - viewHeight, 0);
            const progress = maxPrimary > 0 ? offsetY / maxPrimary : 0;
            targetY = progress * maxSecondary;
          }
        } else {
          // At end
          targetY = maxSecondary;
        }

        targetY = Math.max(0, Math.min(targetY, maxSecondary));
        secondaryScrollViewRef.current!.scrollTo({
          y: targetY,
          animated: false,
        });

        requestAnimationFrame(() => {
          isSyncing.current = false;
        });
      }
    },
    [
      isLandscape,
      scrollThreshold,
      isFullScreen,
      scrollViewHeight,
      contentHeight,
      showMultiVersion,
      secondaryContentHeight,
      verses,
      verseMeasurements,
      secondaryVerses,
      secondaryVerseMeasurements,
    ]
  );

  const handleSecondaryScroll = useCallback(
    (event: NativeSyntheticEvent<NativeScrollEvent>) => {
      const secondaryOffsetY = event.nativeEvent.contentOffset.y;

      // Sync primary scroll view
      if (showMultiVersion && scrollViewRef.current && !isSyncing.current) {
        isSyncing.current = true;

        const viewHeight = scrollViewHeight;
        let targetY = 0;
        const maxPrimary = Math.max(contentHeight - viewHeight, 0);

        // Find verse index in secondary
        let cumulative = 0;
        let verseIndex = -1;
        for (let i = 0; i < secondaryVerses.length; i++) {
          const verseNum = secondaryVerses[i].verse;
          const height =
            secondaryVerseMeasurements[verseNum] || defaultVerseHeight;
          if (secondaryOffsetY < cumulative + height) {
            verseIndex = i;
            break;
          }
          cumulative += height;
        }

        if (verseIndex !== -1) {
          const startY = cumulative;
          const verseNum = secondaryVerses[verseIndex].verse;
          const priIndex = verses.findIndex((v) => v.verse === verseNum);
          if (priIndex !== -1) {
            let priCumulative = 0;
            for (let j = 0; j < priIndex; j++) {
              const pVerseNum = verses[j].verse;
              priCumulative +=
                verseMeasurements[pVerseNum] || defaultVerseHeight;
            }
            const priStartY = priCumulative;
            targetY = priStartY - startY + secondaryOffsetY;
          } else {
            // Fallback to progress
            const maxSecondary = Math.max(
              secondaryContentHeight - viewHeight,
              0
            );
            const progress =
              maxSecondary > 0 ? secondaryOffsetY / maxSecondary : 0;
            targetY = progress * maxPrimary;
          }
        } else {
          // At end
          targetY = maxPrimary;
        }

        targetY = Math.max(0, Math.min(targetY, maxPrimary));
        scrollViewRef.current!.scrollTo({
          y: targetY,
          animated: false,
        });
        scrollY.setValue(targetY);

        // Handle full screen trigger
        if (isLandscape) {
          const scrollDelta = targetY - lastScrollYRef.current;
          if (scrollDelta > scrollThreshold && !isFullScreen && targetY > 100) {
            setIsFullScreen(true);
          }
          lastScrollYRef.current = targetY;
        }

        requestAnimationFrame(() => {
          isSyncing.current = false;
        });
      }
    },
    [
      showMultiVersion,
      scrollViewHeight,
      contentHeight,
      secondaryContentHeight,
      isLandscape,
      scrollThreshold,
      isFullScreen,
      secondaryVerses,
      secondaryVerseMeasurements,
      verses,
      verseMeasurements,
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
    const baseTitle = targetVerse
      ? `${bookName} ${chapter}:${targetVerse}`
      : `${bookName} ${chapter}`;

    // Add version info when not in multi-version mode
    if (!showMultiVersion) {
      const displayVersion = getDisplayVersion(currentVersion);
      return `${baseTitle} (${displayVersion})`;
    }
    return baseTitle;
  }, [bookName, chapter, targetVerse, showMultiVersion, currentVersion]);

  const getDisplayVersion = useCallback((version: string | null) => {
    if (!version) return "";
    return (
      dbToDisplayName[version] || version.replace(".sqlite3", "").toUpperCase()
    );
  }, []);

  // Effects
  useEffect(() => {
    isMounted.current = true;
    return () => {
      isMounted.current = false;
      if (scrollTimeoutRef.current) {
        clearTimeout(scrollTimeoutRef.current);
      }
      // Clean up when component unmounts
      setSecondaryVerses([]);
      setSecondaryVerseMeasurements({});
      Object.values(secondaryDBCache.current).forEach((db) => {
        db.close().catch(console.error);
      });
      secondaryDBCache.current = {};
    };
  }, []);

  // Preload books on mount
  useEffect(() => {
    if (bibleDB && books.length === 0) {
      loadBooks();
    }
  }, [bibleDB, loadBooks]);

  // Load chapter when route params change
  useEffect(() => {
    if (bibleDB) {
      loadChapterRef.current();
    }
  }, [bibleDB, bookId, chapter, currentVersion]);

  // Reset modal state when route params change
  useEffect(() => {
    resetModalState();
  }, [bookId, chapter, targetVerse, resetModalState]);

  // Reset modal state and load chapters if needed when navigation modal opens
  useEffect(() => {
    if (showNavigation) {
      resetModalState();
    }
  }, [showNavigation, resetModalState]);

  useEffect(() => {
    if (
      showNavigation &&
      selectedBook &&
      !chaptersCache[selectedBook.book_number]
    ) {
      loadChaptersForBook(selectedBook.book_number);
    }
  }, [showNavigation, selectedBook, chaptersCache, loadChaptersForBook]);

  // Derive verses list from chapter info
  useEffect(() => {
    if (selectedBook && selectedChapter && chapters.length > 0) {
      const chapterInfo = chapters.find((c) => c.chapter === selectedChapter);
      if (chapterInfo && chapterInfo.verseCount > 0) {
        setVersesList(
          Array.from({ length: chapterInfo.verseCount }, (_, i) => i + 1)
        );
      } else {
        setVersesList([]);
      }
    }
  }, [selectedBook, selectedChapter, chapters]);

  // Set hasTappedChapter when verses are available
  useEffect(() => {
    if (versesList.length > 0) {
      setHasTappedChapter(true);
    }
  }, [versesList.length]);

  // Reset secondary data when multi-version is disabled
  useEffect(() => {
    if (!showMultiVersion) {
      setSecondaryVerses([]);
      setSecondaryVerseMeasurements({});
    }
  }, [showMultiVersion]);

  // Scroll to verse effect - wait for measurements
  useEffect(() => {
    const ready =
      targetVerse &&
      verses.length > 0 &&
      scrollViewReady &&
      (() => {
        const index = verses.findIndex((v) => v.verse === targetVerse);
        if (index === -1) return false;
        for (let i = 0; i <= index; i++) {
          const vnum = verses[i].verse;
          if (!verseMeasurements[vnum]) return false;
        }
        return true;
      })();

    if (ready && !hasScrolledToVerse && scrollViewRef.current) {
      requestAnimationFrame(() => {
        if (!hasScrolledToVerse && isMounted.current) {
          scrollToTargetVerse();
        }
      });
    }
  }, [
    verses,
    verseMeasurements,
    scrollViewReady,
    targetVerse,
    hasScrolledToVerse,
    scrollToTargetVerse,
  ]);

  // Initial sync for secondary when multi-version is enabled and secondary is ready
  useEffect(() => {
    if (
      showMultiVersion &&
      secondaryVerses.length > 0 &&
      !secondaryLoading &&
      secondaryScrollViewRef.current
    ) {
      const syncSecondary = () => {
        const primaryOffset = (scrollY as any).__getValue();

        const viewHeight = scrollViewHeight;
        let targetY = 0;
        const maxSecondary = Math.max(secondaryContentHeight - viewHeight, 0);

        // Find verse index in primary
        let cumulative = 0;
        let verseIndex = -1;
        for (let i = 0; i < verses.length; i++) {
          const verseNum = verses[i].verse;
          const height = verseMeasurements[verseNum] || defaultVerseHeight;
          if (primaryOffset < cumulative + height) {
            verseIndex = i;
            break;
          }
          cumulative += height;
        }

        if (verseIndex !== -1) {
          const startY = cumulative;
          const verseNum = verses[verseIndex].verse;
          const secIndex = secondaryVerses.findIndex(
            (v) => v.verse === verseNum
          );
          if (secIndex !== -1) {
            let secCumulative = 0;
            for (let j = 0; j < secIndex; j++) {
              const sVerseNum = secondaryVerses[j].verse;
              secCumulative +=
                secondaryVerseMeasurements[sVerseNum] || defaultVerseHeight;
            }
            const secStartY = secCumulative;
            targetY = secStartY - startY + primaryOffset;
          } else {
            // Fallback to progress
            const maxPrimary = Math.max(contentHeight - viewHeight, 0);
            const progress = maxPrimary > 0 ? primaryOffset / maxPrimary : 0;
            targetY = progress * maxSecondary;
          }
        } else {
          // At end
          targetY = maxSecondary;
        }

        targetY = Math.max(0, Math.min(targetY, maxSecondary));

        isSyncing.current = true;
        secondaryScrollViewRef.current!.scrollTo({
          y: targetY,
          animated: false,
        });
        requestAnimationFrame(() => {
          isSyncing.current = false;
        });
      };

      const timer = setTimeout(syncSecondary, 100);
      return () => clearTimeout(timer);
    }
  }, [
    showMultiVersion,
    secondaryLoading,
    secondaryVerses.length,
    verses,
    verseMeasurements,
    secondaryVerseMeasurements,
    scrollViewHeight,
    contentHeight,
    secondaryContentHeight,
  ]);

  // Listen to scrollY for showEnd and other global updates
  useEffect(() => {
    const listener = scrollY.addListener(({ value }) => {
      // Update showEnd
      if (value + scrollViewHeight >= contentHeight - 20) {
        setShowEnd(true);
      } else {
        setShowEnd(false);
      }

      // Full screen trigger (fallback, but primarily handled in handlers)
      if (isLandscape) {
        const scrollDelta = value - lastScrollYRef.current;
        if (scrollDelta > scrollThreshold && !isFullScreen && value > 100) {
          setIsFullScreen(true);
        }
        lastScrollYRef.current = value;
      }
    });

    return () => scrollY.removeListener(listener);
  }, [scrollViewHeight, contentHeight, isLandscape, scrollThreshold]);

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

  // Render multi-version layout
  const renderMultiVersionContent = () => {
    const primaryDisplay = getDisplayVersion(currentVersion);
    const secondaryDisplay = getDisplayVersion(secondaryVersion);

    if (!showMultiVersion) {
      return (
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
            style={{ paddingTop: isFullScreen ? 16 : 0 }}
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
              highlightVerse={targetVerse}
              highlightedVerses={new Set(highlightedVerses)}
              bookmarkedVerses={bookmarkedVerses}
              isFullScreen={isFullScreen}
              displayVersion={primaryDisplay}
              colors={colors}
            />
          </View>
        </ScrollView>
      );
    }

    // Multi-version layout - side by side for both orientations
    return (
      <View className="flex-1 flex-row">
        {/* Primary Version */}
        <View
          style={{
            flex: 1,
            borderRightWidth: 1,
            borderRightColor: colors.border?.default || "#E5E7EB",
          }}
        >
          <View
            style={{
              backgroundColor: colors.muted + "20",
              paddingVertical: 8,
              paddingHorizontal: 16,
              borderBottomWidth: 1,
              borderBottomColor: colors.border?.default || "#E5E7EB",
            }}
          >
            <Text
              style={{ color: colors.primary, fontSize: 14, fontWeight: "600" }}
            >
              {primaryDisplay}
            </Text>
          </View>
          <ScrollView
            ref={scrollViewRef}
            showsVerticalScrollIndicator={false}
            contentContainerStyle={{ paddingBottom: 40 }}
            onScroll={handleScroll}
            scrollEventThrottle={16}
            onContentSizeChange={handleContentSizeChange}
            onLayout={handleScrollViewLayout}
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
              highlightVerse={targetVerse}
              highlightedVerses={new Set(highlightedVerses)}
              bookmarkedVerses={bookmarkedVerses}
              isFullScreen={isFullScreen}
              displayVersion={primaryDisplay}
              colors={colors}
            />
          </ScrollView>
        </View>

        {/* Secondary Version */}
        <View style={{ flex: 1 }}>
          <View
            style={{
              backgroundColor: colors.muted + "20",
              paddingVertical: 8,
              paddingHorizontal: 16,
              borderBottomWidth: 1,
              borderBottomColor: colors.border?.default || "#E5E7EB",
            }}
          >
            <Text
              style={{ color: colors.primary, fontSize: 14, fontWeight: "600" }}
            >
              {secondaryDisplay}
            </Text>
          </View>
          {secondaryLoading ? (
            <View
              style={{
                flex: 1,
                justifyContent: "center",
                alignItems: "center",
              }}
            >
              <ActivityIndicator size="small" color={colors.primary} />
              <Text style={{ color: colors.muted, marginTop: 8 }}>
                Loading version...
              </Text>
            </View>
          ) : secondaryVerses.length === 0 ? (
            <View
              style={{
                flex: 1,
                justifyContent: "center",
                alignItems: "center",
              }}
            >
              <Text style={{ color: colors.muted, textAlign: "center" }}>
                Unable to load {secondaryDisplay} version
              </Text>
              <Text
                style={{
                  color: colors.muted + "80",
                  fontSize: 12,
                  textAlign: "center",
                  marginTop: 4,
                }}
              >
                This version may not be available
              </Text>
            </View>
          ) : (
            <ScrollView
              ref={secondaryScrollViewRef}
              showsVerticalScrollIndicator={false}
              contentContainerStyle={{ paddingBottom: 40 }}
              onScroll={handleSecondaryScroll}
              scrollEventThrottle={16}
              onContentSizeChange={handleSecondaryContentSizeChange}
              onLayout={handleScrollViewLayout}
            >
              <ChapterViewEnhanced
                verses={secondaryVerses}
                bookName={bookName}
                chapterNumber={chapter}
                bookId={bookId}
                showVerseNumbers
                fontSize={fontSize}
                onVersePress={handleVersePress}
                onVerseLayout={handleSecondaryVerseLayout}
                highlightVerse={targetVerse}
                highlightedVerses={new Set(highlightedVerses)}
                bookmarkedVerses={bookmarkedVerses}
                isFullScreen={isFullScreen}
                displayVersion={secondaryDisplay}
                colors={colors}
              />
            </ScrollView>
          )}
        </View>
      </View>
    );
  };

  if (!bibleDB || loading || highlightedVersesLoading || isSwitchingVersion) {
    return (
      <SafeAreaView
        style={{
          flex: 1,
          backgroundColor: colors.background?.default || "#FFFFFF",
          justifyContent: "center",
          alignItems: "center",
        }}
      >
        <ActivityIndicator size="large" color={colors.primary} />
        <Text
          style={{ color: colors.text?.primary || "#000000", marginTop: 8 }}
        >
          {isSwitchingVersion ? "Switching version..." : "Loading..."}
        </Text>
      </SafeAreaView>
    );
  }

  return (
    <View
      style={{
        flex: 1,
        backgroundColor: colors.background?.default || "#FFFFFF",
      }}
    >
      {/* Header */}
      {!isFullScreen && (
        <View
          style={{
            backgroundColor: colors.primary,
            width: "100%",
            height: 96,
            justifyContent: "flex-end",
          }}
        >
          <View className="flex-row justify-between items-center w-full px-6 pb-2 reader">
            <Text
              style={{
                color: primaryTextColor,
                marginLeft: 0,
                letterSpacing: 1,
                fontSize: 20,
              }}
            >
              Bible Reader
            </Text>
            <View
              className={`flex-row ${isLandscape ? "mr-40 top-2 gap-4" : "mr-0 gap-2"}`}
            >
              <TouchableOpacity onPress={toggleTheme} className="p-2">
                <Ionicons
                  name={theme === "light" ? "moon-outline" : "sunny-outline"}
                  size={24}
                  color={primaryTextColor}
                />
              </TouchableOpacity>
              <TouchableOpacity
                onPress={handleColorSchemePress}
                className="p-2"
              >
                <Ionicons
                  name="color-palette-outline"
                  size={24}
                  color={primaryTextColor}
                />
              </TouchableOpacity>
              <TouchableOpacity
                onPress={() => {
                  setShowNavigation(true);
                  setHasTappedChapter(false);
                }}
                className="p-2 mr-2"
                testID="navigation-button"
              >
                <Ionicons
                  name="book-outline"
                  size={24}
                  color={primaryTextColor}
                />
              </TouchableOpacity>
              <TouchableOpacity
                onPress={toggleMultiVersion}
                className="p-2 mr-2"
                testID="multi-version-button"
              >
                <Ionicons
                  name={showMultiVersion ? "copy" : "copy-outline"}
                  size={24}
                  color={showMultiVersion ? "#f6f0f0ff" : "white"}
                />
              </TouchableOpacity>
              <TouchableOpacity
                onPress={() => setShowSettings(true)}
                className="p-2"
                testID="settings-button"
              >
                <Ionicons
                  name="settings-outline"
                  size={24}
                  color={primaryTextColor}
                />
              </TouchableOpacity>
            </View>
          </View>
        </View>
      )}

      {/* Chapter Navigation */}
      {!isFullScreen && (
        <View
          style={{
            backgroundColor: colors.primary,
            paddingHorizontal: 16,
            paddingVertical: 8,
          }}
        >
          <View className="flex-row justify-between items-center">
            <TouchableOpacity
              onPress={goToPreviousChapter}
              disabled={chapter <= 1}
              className={`p-2 ${chapter <= 1 ? "opacity-30" : ""}`}
            >
              <Text
                style={{
                  color: primaryTextColor,
                  fontWeight: "600",
                  fontSize: 12,
                }}
              >
                ← Prev
              </Text>
            </TouchableOpacity>

            <View className="flex-1 items-center">
              <Text
                style={{
                  color: primaryTextColor,
                  fontWeight: "bold",
                  textAlign: "center",
                  fontSize: 12,
                }}
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
              <Text
                style={{
                  color: primaryTextColor,
                  fontWeight: "600",
                  fontSize: 12,
                }}
              >
                Next →
              </Text>
            </TouchableOpacity>
          </View>

          {/* Progress Bar */}
          <View
            style={{
              marginTop: 8,
              width: "100%",
              height: 4,
              backgroundColor: colors.primary + "40",
              borderRadius: 2,
            }}
          >
            <Animated.View
              className="h-1 bg-primary rounded-full"
              style={{
                height: 4,
                backgroundColor: colors.primary,
                borderRadius: 2,
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
        <View
          className="flex-row justify-between items-center px-4 py-2"
          style={{
            backgroundColor: colors.card + "80",
            borderBottomWidth: 1,
            borderBottomColor: colors.border?.default || "#E5E7EB",
          }}
        >
          <Text style={{ color: colors.muted, fontSize: 12 }}>Font Size</Text>
          <View
            className={`flex-row items-center space-x-3 ${isLandscape ? "mr-12 gap-4" : "mr-0 gap-2"}`}
          >
            <TouchableOpacity
              onPress={decreaseFontSize}
              className="w-8 h-8 rounded-full items-center justify-center"
              style={{ backgroundColor: colors.card }}
            >
              <Text style={{ color: colors.muted, fontWeight: "bold" }}>
                A-
              </Text>
            </TouchableOpacity>
            <Text
              className="text-gray-700 w-10 text-center text-sm"
              style={{ color: colors.text?.primary || "#000000" }}
            >
              {fontSize}px
            </Text>
            <TouchableOpacity
              onPress={increaseFontSize}
              className="w-8 h-8 rounded-full items-center justify-center"
              style={{ backgroundColor: colors.card }}
            >
              <Text style={{ color: colors.muted, fontWeight: "bold" }}>
                A+
              </Text>
            </TouchableOpacity>
          </View>

          {targetVerse && !hasScrolledToVerse && (
            <TouchableOpacity
              onPress={() => {
                setHasScrolledToVerse(false);
                scrollToTargetVerse();
              }}
              className="px-3 py-1 rounded-full"
              style={{ backgroundColor: colors.primary }}
            >
              <Text
                style={{ color: primaryTextColor, fontSize: 12 }}
              >{`Center ${targetVerse}`}</Text>
            </TouchableOpacity>
          )}
        </View>
      )}

      {/* Settings Modal */}
      <Modal
        visible={showSettings}
        transparent={true}
        animationType="fade"
        onRequestClose={() => {
          setTimeout(() => setShowSettings(false), 100);
        }}
      >
        <TouchableOpacity
          className="flex-1 justify-center items-center"
          activeOpacity={1}
          onPress={() => setShowSettings(false)}
          style={{
            backgroundColor: colors.background?.default + "CC" || "#FFFFFFCC",
          }}
        >
          <SafeAreaView
            style={{
              backgroundColor: colors.card,
              borderRadius: 12,
              flex: 1,
              width: "92%",
            }}
            onStartShouldSetResponder={() => true}
          >
            <View
              style={{
                padding: 16,
                borderBottomWidth: 1,
                borderBottomColor: colors.border?.default || "#E5E7EB",
                backgroundColor: colors.primary,
              }}
            >
              <Text
                style={{
                  color: primaryTextColor,
                  fontSize: 18,
                  fontWeight: "bold",
                }}
              >
                Settings
              </Text>
            </View>

            <ScrollView className="flex-1 mx-4">
              {/* Font Size Controls */}
              <View
                style={{
                  paddingHorizontal: 16,
                  paddingVertical: 8,
                  borderBottomWidth: 1,
                  borderBottomColor: colors.border?.default || "#E5E7EB",
                }}
              >
                <Text
                  style={{
                    color: colors.primary,
                    fontSize: 12,
                    fontWeight: "600",
                    marginBottom: 8,
                  }}
                >
                  Font Size
                </Text>
                <View className="flex-row justify-between items-center">
                  <TouchableOpacity
                    onPress={decreaseFontSize}
                    className="size-8 rounded-full items-center justify-center"
                    style={{ backgroundColor: colors.card }}
                  >
                    <Text
                      style={{
                        color: colors.primary,
                        fontWeight: "bold",
                        fontSize: 16,
                      }}
                    >
                      A-
                    </Text>
                  </TouchableOpacity>
                  <Text
                    style={{
                      color: colors.text?.primary || "#000000",
                      fontSize: 12,
                      fontWeight: "500",
                    }}
                  >
                    {fontSize}px
                  </Text>
                  <TouchableOpacity
                    onPress={increaseFontSize}
                    className="size-8 rounded-full items-center justify-center"
                    style={{ backgroundColor: colors.card }}
                  >
                    <Text
                      style={{
                        color: colors.primary,
                        fontWeight: "bold",
                        fontSize: 16,
                      }}
                    >
                      A+
                    </Text>
                  </TouchableOpacity>
                </View>
              </View>

              {/* Multi-Version Toggle */}
              <View
                style={{
                  paddingHorizontal: 16,
                  paddingTop: 8,
                  borderBottomWidth: 1,
                  borderBottomColor: colors.border?.default || "#E5E7EB",
                }}
              >
                <Text
                  style={{
                    color: colors.primary,
                    fontSize: 12,
                    fontWeight: "600",
                  }}
                >
                  Multi-Version Display
                </Text>
                <View className="flex-row justify-between items-center">
                  <Text
                    style={{
                      color: colors.text?.primary || "#000000",
                      flex: 1,
                      marginBottom: 8,
                    }}
                  >
                    Show two Bible versions side by side
                  </Text>
                  <TouchableOpacity
                    onPress={toggleMultiVersion}
                    className="w-12 h-6 rounded-full justify-center -mt-8 bg-gray-200"
                  >
                    <View
                      className={`w-5 h-5 rounded-full absolute z-50 ${
                        showMultiVersion ? "right-1" : "left-1"
                      }`}
                      style={{
                        backgroundColor: showMultiVersion
                          ? colors.primary
                          : colors.muted,
                      }}
                    />
                  </TouchableOpacity>
                </View>
              </View>

              {/* Bible Version Selection */}
              {isLandscape && showMultiVersion ? (
                <View className="flex-row gap-4">
                  <View className="flex-1">
                    <VersionSelector
                      currentVersion={currentVersion}
                      availableVersions={availableVersions}
                      onVersionSelect={handleVersionSelect}
                      title="Primary Bible Version"
                      description="Choose your preferred Bible translation"
                      showCurrentVersion={true}
                      colors={versionSelectorColors}
                    />
                  </View>
                  <View className="flex-1">
                    <VersionSelector
                      currentVersion={secondaryVersion || ""}
                      availableVersions={availableVersions.filter(
                        (v) => v !== currentVersion
                      )}
                      onVersionSelect={handleSecondaryVersionSelect}
                      title="Secondary Bible Version"
                      description="Choose a different translation for comparison"
                      showCurrentVersion={true}
                      colors={versionSelectorColors}
                    />
                  </View>
                </View>
              ) : (
                <>
                  <VersionSelector
                    currentVersion={currentVersion}
                    availableVersions={availableVersions}
                    onVersionSelect={handleVersionSelect}
                    title="Primary Bible Version"
                    description="Choose your preferred Bible translation"
                    showCurrentVersion={true}
                    colors={versionSelectorColors}
                  />
                  {showMultiVersion && (
                    <VersionSelector
                      currentVersion={secondaryVersion || ""}
                      availableVersions={availableVersions.filter(
                        (v) => v !== currentVersion
                      )}
                      onVersionSelect={handleSecondaryVersionSelect}
                      title="Secondary Bible Version"
                      description="Choose a different translation for comparison"
                      showCurrentVersion={true}
                      colors={versionSelectorColors}
                    />
                  )}
                </>
              )}
            </ScrollView>

            <TouchableOpacity
              onPress={() => setShowSettings(false)}
              style={{
                padding: 16,
                borderTopWidth: 1,
                borderTopColor: colors.border?.default || "#E5E7EB",
                alignItems: "center",
              }}
            >
              <Text
                style={{
                  color: colors.primary,
                  fontSize: 16,
                  fontWeight: "600",
                }}
              >
                Close
              </Text>
            </TouchableOpacity>
          </SafeAreaView>
        </TouchableOpacity>
      </Modal>

      {/* Navigation Modal - UPDATED: Auto-scroll and auto-navigation */}
      <Modal
        visible={showNavigation}
        transparent={true}
        animationType="slide"
        onRequestClose={() => setShowNavigation(false)}
      >
        <SafeAreaView style={{ flex: 1, backgroundColor: colors.card }}>
          {/* Header */}
          <View
            style={{
              backgroundColor: colors.primary,
              paddingHorizontal: 16,
              paddingVertical: 16,
            }}
          >
            <View className="flex-row justify-between items-center">
              <TouchableOpacity
                onPress={() => {
                  setShowNavigation(false);
                }}
                className="p-2"
              >
                <Ionicons
                  name="arrow-back"
                  size={24}
                  color={primaryTextColor}
                />
              </TouchableOpacity>
              <Text
                style={{
                  color: primaryTextColor,
                  fontWeight: "bold",
                  fontSize: 18,
                }}
              >
                Choose Passage to Read
              </Text>
              <View style={{ width: 24 }} />
            </View>
          </View>

          <ScrollView
            ref={modalScrollViewRef}
            className="flex-1 p-4"
            showsVerticalScrollIndicator={true}
            style={{ backgroundColor: colors.background?.default || "#FFFFFF" }}
          >
            {isLoadingNavigation && (
              <View
                style={{
                  position: "absolute",
                  top: 0,
                  left: 0,
                  right: 0,
                  bottom: 0,
                  backgroundColor: colors.card + "80",
                  zIndex: 10,
                  justifyContent: "center",
                  alignItems: "center",
                }}
              >
                <ActivityIndicator size="large" color={colors.primary} />
                <Text
                  style={{
                    color: colors.text?.primary || "#000000",
                    marginTop: 8,
                  }}
                >
                  Loading books...
                </Text>
              </View>
            )}

            {/* Book Selection */}
            <View className="mb-6">
              <Text
                style={{
                  color: colors.text?.primary || "#000000",
                  fontSize: 18,
                  fontWeight: "600",
                  marginBottom: 12,
                }}
              >
                Select Book
              </Text>

              {/* Old Testament */}
              {oldTestament.length > 0 && (
                <View className="mb-6">
                  <View className="flex-row items-center justify-between mb-3">
                    <Text
                      style={{
                        color: colors.primary,
                        fontSize: 20,
                        fontWeight: "bold",
                      }}
                    >
                      Old Testament
                    </Text>
                    <Text style={{ color: colors.muted, fontSize: 12 }}>
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
                            colors.card,
                        }}
                      >
                        <Text
                          style={{
                            color: colors.text?.primary || "#000000",
                            fontWeight: "600",
                            textAlign: "center",
                            fontSize: 12,
                          }}
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
                    <Text
                      style={{
                        color: colors.primary,
                        fontSize: 20,
                        fontWeight: "bold",
                      }}
                    >
                      New Testament
                    </Text>
                    <Text style={{ color: colors.muted, fontSize: 12 }}>
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
                            colors.card,
                        }}
                      >
                        <Text
                          style={{
                            color: colors.text?.primary || "#000000",
                            fontWeight: "600",
                            textAlign: "center",
                            fontSize: 12,
                          }}
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
            <View
              style={{
                backgroundColor: colors.primary + "10",
                borderRadius: 8,
                padding: 8,
                marginBottom: 16,
                borderWidth: 1,
                borderColor: colors.primary + "30",
              }}
            >
              <Text
                style={{
                  color: colors.primary,
                  fontWeight: "600",
                  textAlign: "center",
                  fontSize: 16,
                }}
              >
                {selectedBook
                  ? `${selectedBook.long_name} ${selectedChapter}${selectedVerse ? `:${selectedVerse}` : ""}`
                  : "Select a book"}
              </Text>
              <Text
                style={{
                  color: colors.primary + "80",
                  fontSize: 12,
                  textAlign: "center",
                  marginTop: 4,
                }}
              >
                {selectedBook
                  ? `${chapters.length} ${chapters.length > 1 ? "chapters available" : "chapter available"}`
                  : ""}
              </Text>
            </View>

            {/* Chapter Selection - UPDATED: Added ref for auto-scroll */}
            {selectedBook && chapters.length > 0 && (
              <View ref={chaptersSectionRef} className="mb-6">
                <Text
                  style={{
                    color: colors.text?.primary || "#000000",
                    fontSize: 18,
                    fontWeight: "600",
                    marginBottom: 12,
                  }}
                >
                  Select Chapter
                </Text>
                {isLoadingChapters ? (
                  <View className="flex-row justify-center py-4">
                    <ActivityIndicator size="small" color={colors.primary} />
                  </View>
                ) : (
                  <View className="flex-row flex-wrap gap-2 justify-center">
                    {chapters.map((chapterInfo) => (
                      <TouchableOpacity
                        key={chapterInfo.chapter}
                        onPress={() => handleChapterSelect(chapterInfo.chapter)}
                        className={`rounded-lg border items-center justify-center ${
                          selectedChapter === chapterInfo.chapter
                            ? "bg-primary border-primary"
                            : "bg-card border-border"
                        }`}
                        style={{
                          width: 40,
                          height: 40,
                        }}
                      >
                        <Text
                          style={{
                            fontWeight: "bold",
                            fontSize: 12,
                            color:
                              selectedChapter === chapterInfo.chapter
                                ? primaryTextColor
                                : colors.primary,
                          }}
                        >
                          {chapterInfo.chapter}
                        </Text>
                        <Text
                          style={{
                            fontSize: 10,
                            color:
                              selectedChapter === chapterInfo.chapter
                                ? primaryTextColor + "80"
                                : colors.muted,
                          }}
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
                <Text
                  style={{
                    color: colors.muted,
                    fontSize: 12,
                    marginBottom: 12,
                  }}
                >
                  Choose a chapter to reveal verse selection
                </Text>
              </View>
            )}

            {/* Verse Selection - UPDATED: Added ref for auto-scroll and auto-navigation */}
            {hasTappedChapter &&
              selectedBook &&
              selectedChapter &&
              versesList.length > 0 && (
                <View ref={versesSectionRef} className="mb-6">
                  <Text
                    style={{
                      color: colors.text?.primary || "#000000",
                      fontSize: 18,
                      fontWeight: "600",
                      marginBottom: 12,
                    }}
                  >
                    Select Verse{" "}
                    {selectedVerse && `- Selected: ${selectedVerse}`}
                  </Text>
                  <Text
                    style={{
                      color: colors.muted,
                      fontSize: 12,
                      marginBottom: 12,
                    }}
                  >
                    {selectedVerse
                      ? `Will navigate to ${selectedBook.long_name} ${selectedChapter}:${selectedVerse}`
                      : "Choose any verse to navigate directly"}
                  </Text>
                  <View className="flex-row flex-wrap gap-1">
                    {hasTappedChapter &&
                      versesList.map((verse) => (
                        <TouchableOpacity
                          key={verse}
                          onPress={() => handleVerseSelect(verse)}
                          className="size-10 rounded-lg border items-center justify-center bg-card border-primary"
                        >
                          <Text
                            style={{
                              color: colors.text?.primary || "#000000",
                              fontSize: 12,
                              fontWeight: "500",
                            }}
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
              className={`p-4 rounded-lg mt-4 mb-20 ${
                selectedBook && !isLoadingNavigation ? "bg-primary" : "bg-muted"
              }`}
            >
              <Text
                style={{
                  color: primaryTextColor,
                  fontWeight: "600",
                  textAlign: "center",
                  fontSize: 16,
                }}
              >
                {selectedBook
                  ? `Go to ${selectedBook.long_name} ${selectedChapter}`
                  : "Select a book to continue"}
              </Text>
              <Text
                style={{
                  color: primaryTextColor + "80",
                  fontSize: 12,
                  textAlign: "center",
                  marginTop: 4,
                }}
              >
                Navigate to chapter {selectedChapter}
              </Text>
            </TouchableOpacity>
          </ScrollView>
        </SafeAreaView>
      </Modal>

      {/* Chapter Content */}
      {renderMultiVersionContent()}

      {/* Quick Navigation Footer */}
      {!isFullScreen && (
        <View
          className="flex-row justify-between items-center px-4 py-3"
          style={{
            backgroundColor: colors.card + "80",
            borderTopWidth: 1,
            borderTopColor: colors.border?.default || "#E5E7EB",
          }}
        >
          <TouchableOpacity
            onPress={() =>
              navigation.navigate("VerseList", {
                book: book || { book_number: bookId, long_name: bookName },
                chapter: chapter,
              })
            }
            className="px-4 py-2 rounded-lg border"
            style={{
              backgroundColor: colors.card,
              borderColor: colors.border?.default || "#E5E7EB",
            }}
          >
            <Text
              style={{ color: colors.text?.primary || "#000000", fontSize: 12 }}
            >
              Verse List
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            onPress={() =>
              navigation.navigate("ChapterList", {
                book: book || { book_number: bookId, long_name: bookName },
              })
            }
            className={`px-4 py-2 rounded-lg border ${isLandscape ? "mr-12" : "mr-0"}`}
            style={{
              backgroundColor: colors.card,
              borderColor: colors.border?.default || "#E5E7EB",
            }}
          >
            <Text
              style={{ color: colors.text?.primary || "#000000", fontSize: 12 }}
            >
              All Chapters
            </Text>
          </TouchableOpacity>
        </View>
      )}

      {/* Full screen toggle button */}
      {isLandscape && (
        <TouchableOpacity
          onPress={toggleFullScreen}
          className="absolute top-12 right-18 size-12 rounded-full items-center justify-center z-50"
          style={{
            backgroundColor: colors.background?.default + "80" || "#FFFFFF80",
          }}
        >
          <Text
            style={{
              color: colors.text?.primary || "#000000",
              fontSize: 24,
              fontWeight: "bold",
            }}
          >
            {isFullScreen ? "◱" : "◲"}
          </Text>
        </TouchableOpacity>
      )}
    </View>
  );
}
