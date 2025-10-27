import React, {
  useState,
  useRef,
  useMemo,
  useContext,
  useCallback,
  useEffect,
} from "react";
import {
  View,
  Text,
  TouchableOpacity,
  Dimensions,
  Animated,
  ScrollView,
  ActivityIndicator,
  Alert,
  LayoutChangeEvent,
} from "react-native";
import {
  SafeAreaView,
  useSafeAreaInsets,
} from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { StatusBar } from "expo-status-bar";
import { useFocusEffect } from "@react-navigation/native";
import { BookmarksContext } from "../context/BookmarksContext";
import { useHighlights } from "../context/HighlightsContext";
import { useBibleDatabase } from "../context/BibleDatabaseContext";
import { BibleDatabase } from "../services/BibleDatabase";
import { ChapterViewEnhanced } from "../components/ChapterViewEnhanced";
import { SettingsModal } from "../components/SettingsModal";
import { NavigationModal } from "../components/NavigationModal";
import { useChapterLoader } from "../hooks/useChapterLoader";
import { useScrollSync } from "../hooks/useScrollSync";
import { useThemeColors } from "../hooks/useThemeColors";
import { getVersionDisplayName } from "../utils/bibleVersionUtils";
import { Verse, Book, ChapterInfo } from "../types";
import { getBookInfo, getTestament } from "../utils/testamentUtils";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useTheme } from "../context/ThemeContext";

const initialDimensions = Dimensions.get("window");

type IconName = React.ComponentProps<typeof Ionicons>["name"];

type SelectorType = "primary" | "secondary" | null;

interface MenuItem {
  key: string;
  name: string;
  icon: IconName;
  onPress: () => void;
  color: string;
}

type MultiViewLayout = "horizontal" | "vertical";

interface Location {
  bookId: number;
  bookName: string;
  bookColor: string;
  chapter: number;
  verse?: number;
}

export default function ReaderScreen({
  navigation,
  route,
}: {
  navigation: any;
  route: any;
}) {
  const insets = useSafeAreaInsets();
  const {
    bookId,
    chapter,
    bookName,
    verse: targetVerse,
    bookColor,
  } = route.params;
  const { addBookmark, bookmarks } = useContext(BookmarksContext);
  const {
    toggleVerseHighlight,
    getChapterHighlights,
    loading: highlightedVersesLoading,
  } = useHighlights();
  const { bibleDB, currentVersion, availableBibleVersions, switchVersion } =
    useBibleDatabase();
  const [primaryMaxChapter, setPrimaryMaxChapter] = useState(0);
  const [secondaryMaxChapter, setSecondaryMaxChapter] = useState(0);
  const [openSelector, setOpenSelector] = useState<SelectorType>(null);
  const [selectorLoading, setSelectorLoading] = useState(false);
  const [multiViewLayout, setMultiViewLayout] =
    useState<MultiViewLayout>("horizontal");
  const [isLinked, setIsLinked] = useState(true);
  const [primaryTargetVerse, setPrimaryTargetVerse] = useState<
    number | undefined
  >(targetVerse);
  const [secondaryTargetVerse, setSecondaryTargetVerse] = useState<
    number | undefined
  >();
  const [primaryHeaderX, setPrimaryHeaderX] = useState(0);
  const [primaryHeaderY, setPrimaryHeaderY] = useState(0);
  const [primaryHeaderWidth, setPrimaryHeaderWidth] = useState(0);
  const [primaryHeaderHeight, setPrimaryHeaderHeight] = useState(0);
  const [secondaryHeaderX, setSecondaryHeaderX] = useState(0);
  const [secondaryHeaderY, setSecondaryHeaderY] = useState(0);
  const [secondaryHeaderWidth, setSecondaryHeaderWidth] = useState(0);
  const [secondaryHeaderHeight, setSecondaryHeaderHeight] = useState(0);
  const primaryHeaderRef = useRef<View>(null);
  const secondaryHeaderRef = useRef<View>(null);
  const [dimensions, setDimensions] = useState(initialDimensions);
  const screenWidth = dimensions.width;
  const themeColors = useThemeColors();
  const {
    colors,
    versionSelectorColors,
    primaryTextColor,
    handleColorSchemePress,
    toggleTheme,
  } = themeColors;
  const [primaryLocation, setPrimaryLocation] = useState<Location>({
    bookId,
    bookName,
    bookColor,
    chapter,
    verse: targetVerse,
  });
  const [secondaryLocation, setSecondaryLocation] =
    useState<Location>(primaryLocation);
  const primaryLoader = useChapterLoader(
    primaryLocation.bookId,
    primaryLocation.chapter,
    primaryTargetVerse
  );
  const {
    verses: primaryVerses,
    book: primaryBook,
    loading: primaryLoading,
    scrollViewRef: primaryScrollViewRef,
    ...primaryProps
  } = primaryLoader;
  const [showMultiVersion, setShowMultiVersion] = useState(false);
  const [secondaryVersion, setSecondaryVersion] = useState<string | null>(
    () => {
      const defaultPrimary = "KJ2";
      const availableVersions = [
        "KJ2",
        "NIV11",
        "ESV",
        "NASB",
        "NLT",
        "ESVGSB",
        "Logos",
      ];
      return (
        availableVersions.find((version) => version !== defaultPrimary) ||
        availableVersions[0]
      );
    }
  );
  const [secondaryVerses, setSecondaryVerses] = useState<Verse[]>([]);
  const [secondaryLoading, setSecondaryLoading] = useState(false);
  const [secondaryContentHeight, setSecondaryContentHeight] = useState(0);
  const secondaryVerseMeasurementsRef = useRef<{ [key: number]: number }>({});
  const [secondaryScrollViewHeight, setSecondaryScrollViewHeight] = useState(0);
  const secondaryScrollViewRef = useRef<ScrollView>(null);
  const [isSwitchingVersion, setIsSwitchingVersion] = useState(false);
  const secondaryDB = useRef<BibleDatabase | null>(null);
  const [fontSize, setFontSize] = useState(16);
  const [uiMode, setUiMode] = useState(0);
  const [isLandscape, setIsLandscape] = useState(
    initialDimensions.width > initialDimensions.height
  );
  const [_showEnd, setShowEnd] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [showDropdown, setShowDropdown] = useState(false);
  const [showNavigationModal, setShowNavigationModal] = useState(false);
  const [navigationTarget, setNavigationTarget] = useState<
    "primary" | "secondary"
  >("primary");
  const [books, setBooks] = useState<Book[]>([]);
  const [oldTestament, setOldTestament] = useState<
    (Book & { testament: string })[]
  >([]);
  const [newTestament, setNewTestament] = useState<
    (Book & { testament: string })[]
  >([]);
  const [selectedBook, setSelectedBook] = useState<Book | null>(null);
  const [selectedChapter, setSelectedChapter] = useState(1);
  const [selectedVerse, setSelectedVerse] = useState<number | null>(null);
  const [hasTappedChapter, setHasTappedChapter] = useState(false);
  const [chapters, setChapters] = useState<ChapterInfo[]>([]);
  const [versesList, setVersesList] = useState<number[]>([]);
  const [isLoadingNavigation, setIsLoadingNavigation] = useState(true);
  const [isLoadingChapters, setIsLoadingChapters] = useState(false);
  const lastScrollYRef = useRef(0);
  const [scrollThreshold] = useState(50);
  const scrollY = useRef(new Animated.Value(0)).current;
  const buttonOpacity = useRef(new Animated.Value(1)).current;
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const effectiveLayout = useMemo(
    () => (isLandscape ? "horizontal" : multiViewLayout),
    [isLandscape, multiViewLayout]
  );
  const longPressTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(
    null
  );

  const isFullScreen = uiMode === 1;
  const hideHeader = uiMode === 1;
  const scrollSync = useScrollSync(
    showMultiVersion && isLinked,
    primaryProps.scrollViewHeight,
    primaryProps.contentHeight,
    secondaryContentHeight,
    primaryVerses,
    primaryProps.verseMeasurements,
    secondaryVerses,
    secondaryVerseMeasurementsRef.current, // Pass .current here
    isLandscape,
    isFullScreen,
    () => {},
    scrollThreshold,
    lastScrollYRef,
    scrollY,
    setShowEnd,
    primaryScrollViewRef,
    secondaryScrollViewRef
  );
  const {
    handleScroll,
    handleSecondaryScroll,
    updatePrimaryOffset,
    updateSecondaryOffset,
  } = scrollSync;

  const { setShowColorPicker } = useTheme();

  const getHighlightVerse = useCallback(
    (isPrimary: boolean): number | undefined => {
      if (isLinked || !showMultiVersion) {
        return primaryTargetVerse;
      }
      return isPrimary ? primaryTargetVerse : secondaryTargetVerse;
    },
    [showMultiVersion, isLinked, primaryTargetVerse, secondaryTargetVerse]
  );

  const resetButtonOpacity = useCallback(() => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }
    Animated.timing(buttonOpacity, {
      toValue: 1,
      duration: 200,
      useNativeDriver: true,
    }).start();
    timeoutRef.current = setTimeout(() => {
      Animated.timing(buttonOpacity, {
        toValue: 0.2,
        duration: 500,
        useNativeDriver: true,
      }).start();
    }, 5000);
  }, [buttonOpacity]);

  const resetScrollPosition = useCallback(() => {
    scrollY.setValue(0);
    lastScrollYRef.current = 0;
    if (primaryScrollViewRef.current) {
      primaryScrollViewRef.current.scrollTo({ y: 0, animated: false });
      updatePrimaryOffset(0);
    }
    if (showMultiVersion && secondaryScrollViewRef.current) {
      secondaryScrollViewRef.current.scrollTo({ y: 0, animated: false });
      updateSecondaryOffset(0);
    }
    resetButtonOpacity();
  }, [
    scrollY,
    primaryScrollViewRef,
    secondaryScrollViewRef,
    showMultiVersion,
    updatePrimaryOffset,
    updateSecondaryOffset,
    resetButtonOpacity,
  ]);

  useEffect(() => {
    resetButtonOpacity();
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
      if (longPressTimeoutRef.current) {
        clearTimeout(longPressTimeoutRef.current);
      }
    };
  }, [resetButtonOpacity]);

  useEffect(() => {
    const load = async () => {
      if (bibleDB) {
        try {
          const chCount = await bibleDB.getChapterCount(primaryLocation.bookId);
          setPrimaryMaxChapter(chCount);
        } catch (error) {
          console.error("Failed to load navigation data:", error);
        }
      }
    };
    load();
  }, [bibleDB, primaryLocation.bookId]);

  useEffect(() => {
    const load = async () => {
      if (showMultiVersion && secondaryVersion) {
        let db =
          secondaryVersion === currentVersion ? bibleDB : secondaryDB.current;
        if (db) {
          try {
            const chCount = await db.getChapterCount(secondaryLocation.bookId);
            setSecondaryMaxChapter(chCount);
          } catch (error) {
            console.error("Failed to load secondary max chapter:", error);
          }
        }
      }
    };
    load();
  }, [
    showMultiVersion,
    secondaryVersion,
    currentVersion,
    secondaryLocation.bookId,
    bibleDB,
    secondaryDB,
  ]);

  useEffect(() => {
    const loadBooksData = async () => {
      if (bibleDB) {
        setIsLoadingNavigation(true);
        try {
          const allBooks = await bibleDB.getAllBooks();
          setBooks(allBooks);
          const ot: (Book & { testament: string })[] = [];
          const nt: (Book & { testament: string })[] = [];
          allBooks.forEach((b) => {
            if (getTestament(b.book_number, b.long_name) === "OT")
              ot.push({ ...b, testament: "OT" });
            else nt.push({ ...b, testament: "NT" });
          });
          setOldTestament(ot);
          setNewTestament(nt);
        } catch (error) {
          console.error("Failed to load books:", error);
        } finally {
          setIsLoadingNavigation(false);
        }
      }
    };
    loadBooksData();
  }, [bibleDB]);

  useEffect(() => {
    const loadLayoutPreference = async () => {
      try {
        const savedLayout = await AsyncStorage.getItem("multiViewLayout");
        if (savedLayout === "vertical" || savedLayout === "horizontal") {
          setMultiViewLayout(savedLayout);
        }
      } catch (error) {
        console.error("Failed to load layout preference:", error);
      }
    };
    loadLayoutPreference();
  }, []);

  useEffect(() => {
    AsyncStorage.setItem("multiViewLayout", multiViewLayout).catch((e) =>
      console.error("Failed to save layout preference", e)
    );
  }, [multiViewLayout]);

  useEffect(() => {
    AsyncStorage.setItem("isLinked", isLinked.toString()).catch((e) =>
      console.error("Failed to save isLinked", e)
    );
  }, [isLinked]);

  const closeSelector = useCallback(() => setOpenSelector(null), []);

  const openPrimaryNavigation = useCallback(() => {
    if (showMultiVersion && !isLinked) {
      setNavigationTarget("primary");
      setShowNavigationModal(true);
    } else {
      navigation.navigate("BookList", {
        showMultiVersion,
        secondaryVersion,
      });
    }
  }, [showMultiVersion, isLinked, navigation, secondaryVersion]);

  const openSecondaryNavigation = useCallback(() => {
    if (showMultiVersion && !isLinked) {
      setNavigationTarget("secondary");
      setShowNavigationModal(true);
    } else {
      navigation.navigate("BookList", {
        showMultiVersion,
        secondaryVersion,
      });
    }
  }, [showMultiVersion, isLinked, navigation, secondaryVersion]);

  const openPrimaryVersionSelector = useCallback(
    () => setOpenSelector("primary"),
    []
  );

  const openSecondaryVersionSelector = useCallback(
    () => setOpenSelector("secondary"),
    []
  );

  const selectorTitle = useMemo(() => {
    switch (openSelector) {
      case "primary":
        return "Select Primary Version";
      case "secondary":
        return "Select Secondary Version";
      default:
        return "";
    }
  }, [openSelector]);

  const handleVersionSelect = useCallback(
    async (version: string) => {
      if (version === currentVersion) return;
      try {
        setIsSwitchingVersion(true);
        await switchVersion(version);
      } catch (error) {
        Alert.alert("Error", "Failed to switch Bible version.");
      } finally {
        setIsSwitchingVersion(false);
      }
    },
    [currentVersion, switchVersion]
  );

  const toggleMultiVersion = useCallback(() => {
    setShowMultiVersion((prev) => !prev);
    resetButtonOpacity();
  }, [resetButtonOpacity]);

  const handleToggleLongPress = useCallback(() => {
    setMultiViewLayout((prev) =>
      prev === "horizontal" ? "vertical" : "horizontal"
    );
    resetButtonOpacity();
  }, [resetButtonOpacity]);

  const primaryBookmarkedVerses = useMemo(() => {
    const chapterBookmarks = bookmarks.filter(
      (b) =>
        b.book_number === primaryLocation.bookId &&
        b.chapter === primaryLocation.chapter
    );
    return new Set(chapterBookmarks.map((b) => b.verse));
  }, [bookmarks, primaryLocation.bookId, primaryLocation.chapter]);

  const secondaryBookmarkedVerses = useMemo(() => {
    const chapterBookmarks = bookmarks.filter(
      (b) =>
        b.book_number === secondaryLocation.bookId &&
        b.chapter === secondaryLocation.chapter
    );
    return new Set(chapterBookmarks.map((b) => b.verse));
  }, [bookmarks, secondaryLocation.bookId, secondaryLocation.chapter]);

  const primaryHighlightedVerses = useMemo(
    () => getChapterHighlights(primaryLocation.bookId, primaryLocation.chapter),
    [primaryLocation.bookId, primaryLocation.chapter, getChapterHighlights]
  );

  const secondaryHighlightedVerses = useMemo(
    () =>
      getChapterHighlights(secondaryLocation.bookId, secondaryLocation.chapter),
    [secondaryLocation.bookId, secondaryLocation.chapter, getChapterHighlights]
  );

  const linkItem: MenuItem = useMemo(
    () => ({
      key: "link",
      name: isLinked ? "Unsync Views" : "Sync Views",
      icon: (isLinked ? "unlink-outline" : "link-outline") as IconName,
      onPress: () => {
        const newLinked = !isLinked;
        setIsLinked(newLinked);
      },
      color: primaryTextColor,
    }),
    [isLinked, primaryTextColor]
  );

  const menuItems: MenuItem[] = useMemo(
    () => [
      {
        key: "home",
        name: "Home",
        icon: "home-outline",
        onPress: () => navigation.navigate("Home"),
        color: primaryTextColor,
      },
      {
        key: "bible",
        name: "Bible",
        icon: "book-outline",
        onPress: () => navigation.navigate("BookList"),
        color: primaryTextColor,
      },
      {
        key: "search",
        name: "Search",
        icon: "search-outline",
        onPress: () => navigation.navigate("Search"),
        color: primaryTextColor,
      },
      {
        key: "bookmarks",
        name: "Bookmarks",
        icon: "bookmark-outline",
        onPress: () => navigation.navigate("Bookmarks"),
        color: primaryTextColor,
      },
      {
        key: "theme",
        name: themeColors.theme === "light" ? "Dark Mode" : "Light Mode",
        icon: themeColors.theme === "light" ? "moon-outline" : "sunny-outline",
        onPress: toggleTheme,
        color: primaryTextColor,
      },
      {
        key: "color",
        name: "Color Scheme",
        icon: "color-palette-outline",
        onPress: handleColorSchemePress,
        color: primaryTextColor,
      },
      {
        key: "multi",
        name: "Toggle Multi-Version",
        icon: effectiveLayout === "horizontal" ? "copy-outline" : "copy",
        onPress: toggleMultiVersion,
        color: showMultiVersion ? "#f6f0f0ff" : primaryTextColor,
      },
      ...(showMultiVersion ? [linkItem] : []),
      {
        key: "settings",
        name: "Settings",
        icon: "settings-outline",
        onPress: () => setShowSettings(true),
        color: primaryTextColor,
      },
      {
        key: "close",
        name: "Close",
        icon: "close-outline",
        onPress: () => setShowDropdown(false),
        color: primaryTextColor,
      },
    ],
    [
      themeColors.theme,
      primaryTextColor,
      showMultiVersion,
      effectiveLayout,
      toggleTheme,
      handleColorSchemePress,
      toggleMultiVersion,
      navigation,
      setShowSettings,
      linkItem,
    ]
  );

  const filteredMenuItems = useMemo(
    () =>
      menuItems.filter(
        (item) =>
          item.key !== "multi" && item.key !== "theme" && item.key !== "color"
      ),
    [menuItems]
  );

  const themeItem = useMemo(
    () => menuItems.find((item) => item.key === "theme"),
    [menuItems]
  );
  const colorItem = useMemo(
    () => menuItems.find((item) => item.key === "color"),
    [menuItems]
  );

  const increaseFontSize = useCallback(
    () => setFontSize((prev) => Math.min(prev + 1, 24)),
    []
  );
  const decreaseFontSize = useCallback(
    () => setFontSize((prev) => Math.max(prev - 1, 12)),
    []
  );

  const handleVersePress = useCallback(
    (verse: Verse) => {
      const isHighlighted = primaryHighlightedVerses.includes(verse.verse);
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
            onPress: () => setPrimaryTargetVerse(verse.verse),
          },
          {
            text: "Share",
            onPress: () => Alert.alert("Share", "Coming soon!"),
          },
        ]
      );
    },
    [
      primaryHighlightedVerses,
      toggleVerseHighlight,
      addBookmark,
      setPrimaryTargetVerse,
    ]
  );

  const handlePrimaryVersePress = useCallback(
    (verse: Verse) => {
      const isHighlighted = primaryHighlightedVerses.includes(verse.verse);
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
              setPrimaryTargetVerse(verse.verse);
            },
          },
          {
            text: "Share",
            onPress: () => Alert.alert("Share", "Coming soon!"),
          },
        ]
      );
    },
    [primaryHighlightedVerses, toggleVerseHighlight, addBookmark]
  );

  const handleSecondaryVersePress = useCallback(
    (verse: Verse) => {
      const isHighlighted = secondaryHighlightedVerses.includes(verse.verse);
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
              setSecondaryTargetVerse(verse.verse);
            },
          },
          {
            text: "Share",
            onPress: () => Alert.alert("Share", "Coming soon!"),
          },
        ]
      );
    },
    [secondaryHighlightedVerses, toggleVerseHighlight, addBookmark]
  );

  const goToPreviousChapter = useCallback(() => {
    if (primaryLocation.chapter > 1) {
      resetScrollPosition();
      const newChapter = primaryLocation.chapter - 1;
      setPrimaryLocation((prev) => ({
        ...prev,
        chapter: newChapter,
        verse: undefined,
      }));
      setPrimaryTargetVerse(undefined);
      if (showMultiVersion && isLinked) {
        setSecondaryLocation((prev) => ({
          ...prev,
          chapter: newChapter,
          verse: undefined,
        }));
        setSecondaryTargetVerse(undefined);
      }
    }
  }, [primaryLocation, resetScrollPosition, showMultiVersion, isLinked]);

  const goToNextChapter = useCallback(() => {
    if (primaryLocation.chapter < primaryMaxChapter) {
      resetScrollPosition();
      const newChapter = primaryLocation.chapter + 1;
      setPrimaryLocation((prev) => ({
        ...prev,
        chapter: newChapter,
        verse: undefined,
      }));
      setPrimaryTargetVerse(undefined);
      if (showMultiVersion && isLinked) {
        setSecondaryLocation((prev) => ({
          ...prev,
          chapter: newChapter,
          verse: undefined,
        }));
        setSecondaryTargetVerse(undefined);
      }
    } else {
      Alert.alert("End of Book", "This is the last chapter.");
    }
  }, [
    primaryMaxChapter,
    primaryLocation,
    resetScrollPosition,
    showMultiVersion,
    isLinked,
  ]);

  const progress = Animated.divide(
    scrollY,
    Math.max(primaryProps.contentHeight - primaryProps.scrollViewHeight, 1)
  );

  const primaryHandleScroll = useCallback(
    (event: any) => {
      lastScrollYRef.current = event.nativeEvent.contentOffset.y;
      if (showMultiVersion && isLinked) {
        handleScroll(event);
      }
    },
    [handleScroll, showMultiVersion, isLinked]
  );

  const secondaryHandleScrollCb = useCallback(
    (event: any) => {
      if (showMultiVersion && isLinked) {
        handleSecondaryScroll(event);
      }
    },
    [handleSecondaryScroll, showMultiVersion, isLinked]
  );

  useFocusEffect(
    useCallback(() => {
      const currentDimensions = Dimensions.get("window");
      const currentIsLandscape =
        currentDimensions.width > currentDimensions.height;
      setDimensions(currentDimensions);
      setIsLandscape(currentIsLandscape);
    }, [])
  );

  useEffect(() => {
    const updateLayout = () => {
      const newDimensions = Dimensions.get("window");
      const newIsLandscape = newDimensions.width > newDimensions.height;
      setShowDropdown(false);
      setDimensions(newDimensions);
      setIsLandscape(newIsLandscape);
    };
    updateLayout();
    const subscription = Dimensions.addEventListener("change", updateLayout);
    return () => subscription?.remove();
  }, []);

  useEffect(() => {
    setPrimaryTargetVerse(targetVerse);
  }, [targetVerse]);

  useEffect(() => {
    if (showMultiVersion && isLinked) {
      setSecondaryLocation(primaryLocation);
      setSecondaryTargetVerse(primaryTargetVerse);
    } else if (!showMultiVersion) {
      setSecondaryTargetVerse(undefined);
    }
  }, [showMultiVersion, isLinked, primaryTargetVerse, primaryLocation]);

  useEffect(() => {
    if (!primaryLoading && primaryScrollViewRef.current) {
      const verseNum = getHighlightVerse(true);
      if (verseNum) {
        const meas = primaryProps.verseMeasurements[verseNum];
        if (meas !== undefined) {
          const y = Math.max(0, meas - 100);
          primaryScrollViewRef.current.scrollTo({ y, animated: false });
          updatePrimaryOffset(y);
          lastScrollYRef.current = y;
          return;
        }
      }
      primaryScrollViewRef.current.scrollTo({ y: 0, animated: false });
      updatePrimaryOffset(0);
      lastScrollYRef.current = 0;
    }
  }, [
    primaryLoading,
    getHighlightVerse,
    primaryScrollViewRef,
    updatePrimaryOffset,
    primaryProps.verseMeasurements,
  ]);

  const [secondaryMeasuredVerses, setSecondaryMeasuredVerses] = useState<Set<number>>(new Set());

  useEffect(() => {
    secondaryVerseMeasurementsRef.current = {};
    setSecondaryMeasuredVerses(new Set());
  }, [secondaryVerses]);

  useEffect(() => {
    if (
      showMultiVersion &&
      !secondaryLoading &&
      secondaryScrollViewRef.current &&
      secondaryMeasuredVerses.size >= secondaryVerses.length
    ) {
      const verseNum = getHighlightVerse(false);
      if (verseNum) {
        const meas = secondaryVerseMeasurementsRef.current[verseNum];
        if (meas !== undefined) {
          const y = Math.max(0, meas - 100);
          secondaryScrollViewRef.current?.scrollTo({ y, animated: false });
          updateSecondaryOffset(y);
        }
      } else {
        secondaryScrollViewRef.current?.scrollTo({ y: 0, animated: false });
        updateSecondaryOffset(0);
      }
    }
  }, [
    showMultiVersion,
    secondaryLoading,
    secondaryScrollViewRef,
    updateSecondaryOffset,
    secondaryMeasuredVerses.size,
    secondaryVerses.length,
    getHighlightVerse,
  ]);

  const handlePrimaryContentSizeChange = useCallback(
    (width: number, height: number) => {
      primaryProps.handleContentSizeChange(width, height);
    },
    [primaryProps.handleContentSizeChange]
  );

  const handleSecondaryContentSizeChange = useCallback(
    (width: number, height: number) => {
      setSecondaryContentHeight(height);
    },
    []
  );

  const handleSecondaryScrollViewLayout = useCallback((event: any) => {
    setSecondaryScrollViewHeight(event.nativeEvent.layout.height);
  }, []);

  const handleSecondaryVerseLayout = useCallback(
    (verseNumber: number, event: LayoutChangeEvent) => {
      const { y } = event.nativeEvent.layout;
      if (y >= 0) {
        secondaryVerseMeasurementsRef.current[verseNumber] = y;
        setSecondaryMeasuredVerses((prev) => {
          const newSet = new Set(prev);
          newSet.add(verseNumber);
          return newSet;
        });
      }
    },
    []
  );

  useEffect(() => {
    const load = async () => {
      try {
        const [showMultiStr, secVer, linkedStr] = await Promise.all([
          AsyncStorage.getItem("showMultiVersion"),
          AsyncStorage.getItem("secondaryVersion"),
          AsyncStorage.getItem("isLinked"),
        ]);
        if (showMultiStr === "true" && !showMultiVersion) {
          setShowMultiVersion(true);
        }
        if (secVer && secVer !== secondaryVersion) {
          setSecondaryVersion(secVer);
        }
        if (linkedStr !== null) {
          setIsLinked(linkedStr === "true");
        }
      } catch (e) {
        console.error("Failed to load reader settings", e);
      }
    };
    load();
  }, []);

  useEffect(() => {
    AsyncStorage.setItem(
      "showMultiVersion",
      showMultiVersion ? "true" : "false"
    ).catch((e) => console.error("Failed to save showMultiVersion", e));
  }, [showMultiVersion]);

  useEffect(() => {
    if (secondaryVersion) {
      AsyncStorage.setItem("secondaryVersion", secondaryVersion).catch((e) =>
        console.error("Failed to save secondaryVersion", e)
      );
    }
  }, [secondaryVersion]);

  useEffect(() => {
    if (
      showMultiVersion &&
      secondaryVersion &&
      secondaryVersion !== currentVersion
    ) {
      const initSecondaryDB = async () => {
        secondaryDB.current = new BibleDatabase(secondaryVersion);
        await secondaryDB.current.init();
      };
      initSecondaryDB();
    }
    return () => {
      if (secondaryDB.current) {
        secondaryDB.current.close().catch(console.error);
        secondaryDB.current = null;
      }
    };
  }, [showMultiVersion, secondaryVersion, currentVersion]);

  const loadSecondaryVerses = useCallback(async () => {
    if (!showMultiVersion || !secondaryVersion) {
      setSecondaryVerses([]);
      return;
    }
    setSecondaryLoading(true);
    secondaryVerseMeasurementsRef.current = {}; // Reset measurements
    try {
      let db =
        secondaryVersion === currentVersion ? bibleDB : secondaryDB.current;
      if (!db) {
        setSecondaryVerses([]);
        return;
      }
      const verses = await db.getVerses(
        secondaryLocation.bookId,
        secondaryLocation.chapter
      );
      setSecondaryVerses(verses);
    } catch (error) {
      console.error("Failed to load secondary verses:", error);
      setSecondaryVerses([]);
    } finally {
      setSecondaryLoading(false);
    }
  }, [
    showMultiVersion,
    secondaryVersion,
    currentVersion,
    secondaryLocation.bookId,
    secondaryLocation.chapter,
    bibleDB,
    secondaryDB,
  ]);

  useEffect(() => {
    loadSecondaryVerses();
  }, [loadSecondaryVerses]);

  const handleBookSelect = useCallback(
    (book: Book, resetChapter = true) => {
      setSelectedBook(book);
      if (resetChapter) {
        setSelectedChapter(1);
        setSelectedVerse(null);
        setHasTappedChapter(false);
      }
      setIsLoadingChapters(true);

      const currentTarget = navigationTarget;
      const load = async () => {
        let db: BibleDatabase | null = null;
        if (currentTarget === "primary") {
          db = bibleDB;
        } else if (secondaryDB.current) {
          db = secondaryDB.current;
        }
        if (db) {
          try {
            const chapterCount = await db.getChapterCount(book.book_number);
            const chapterInfos: ChapterInfo[] = [];
            for (let ch = 1; ch <= chapterCount; ch++) {
              const verseCount = await db.getVerseCount(book.book_number, ch);
              chapterInfos.push({ chapter: ch, verseCount });
            }
            setChapters(chapterInfos);
          } finally {
            setIsLoadingChapters(false);
          }
        } else {
          setIsLoadingChapters(false);
        }
      };
      load();
    },
    [bibleDB, secondaryDB, navigationTarget]
  );

  const handleChapterSelect = useCallback(
    (chapter: number) => {
      setSelectedChapter(chapter);
      setHasTappedChapter(true);
      setSelectedVerse(null);

      const currentTarget = navigationTarget;
      const load = async () => {
        if (!selectedBook) return;
        let db: BibleDatabase | null = null;
        if (currentTarget === "primary") {
          db = bibleDB;
        } else if (secondaryDB.current) {
          db = secondaryDB.current;
        }
        if (db) {
          try {
            const verseCount = await db.getVerseCount(
              selectedBook.book_number,
              chapter
            );
            setVersesList(Array.from({ length: verseCount }, (_, i) => i + 1));
          } catch (error) {
            console.error("Failed to load verses list:", error);
          }
        }
      };
      load();
    },
    [selectedBook, bibleDB, secondaryDB, navigationTarget]
  );

  const handleVerseSelect = useCallback((verse: number) => {
    setSelectedVerse(verse);
  }, []);

  const handleNavigateToLocation = useCallback(() => {
    if (!selectedBook) return;
    const bookInfo = getBookInfo(selectedBook.book_number);
    const newLocation: Location = {
      bookId: selectedBook.book_number,
      bookName: bookInfo?.long || selectedBook.long_name || "Unknown Book",
      bookColor: bookInfo?.color || selectedBook.book_color || "#DC2626",
      chapter: selectedChapter,
      verse: selectedVerse || undefined,
    };
    if (navigationTarget === "primary") {
      setPrimaryLocation(newLocation);
      setPrimaryTargetVerse(newLocation.verse);
    } else {
      setSecondaryLocation(newLocation);
      setSecondaryTargetVerse(newLocation.verse);
    }
    setShowNavigationModal(false);
  }, [selectedBook, selectedChapter, selectedVerse, navigationTarget]);

  useEffect(() => {
    if (showNavigationModal) {
      const loc =
        navigationTarget === "primary" ? primaryLocation : secondaryLocation;
      const book = books.find((b) => b.book_number === loc.bookId) || null;

      setSelectedBook(book);
      setSelectedChapter(loc.chapter);
      setSelectedVerse(loc.verse || null);
      setHasTappedChapter(true);

      if (book) {
        const loadForBook = async () => {
          let db: BibleDatabase | null = null;
          if (navigationTarget === "primary") {
            db = bibleDB;
          } else if (secondaryDB.current) {
            db = secondaryDB.current;
          }
          if (db) {
            try {
              const chapterCount = await db.getChapterCount(book.book_number);
              const chapterInfos: ChapterInfo[] = [];
              for (let ch = 1; ch <= chapterCount; ch++) {
                const verseCount = await db.getVerseCount(book.book_number, ch);
                chapterInfos.push({ chapter: ch, verseCount });
              }
              setChapters(chapterInfos);
            } finally {
              setIsLoadingChapters(false);
            }
          } else {
            setIsLoadingChapters(false);
          }
        };

        const loadForChapter = async () => {
          if (!book) return;
          let db: BibleDatabase | null = null;
          if (navigationTarget === "primary") {
            db = bibleDB;
          } else if (secondaryDB.current) {
            db = secondaryDB.current;
          }
          if (db) {
            try {
              const verseCount = await db.getVerseCount(
                book.book_number,
                loc.chapter
              );
              setVersesList(
                Array.from({ length: verseCount }, (_, i) => i + 1)
              );
            } catch (error) {
              console.error("Failed to load verses list:", error);
            }
          }
        };

        setIsLoadingChapters(true);
        loadForBook();
        loadForChapter();
      }
    }
  }, [
    showNavigationModal,
    navigationTarget,
    books,
    primaryLocation,
    secondaryLocation,
    bibleDB,
    secondaryDB,
  ]);

  useEffect(() => {
    if (!showNavigationModal) {
      setSelectedBook(null);
      setSelectedChapter(1);
      setSelectedVerse(null);
      setHasTappedChapter(false);
      setChapters([]);
      setVersesList([]);
      setIsLoadingChapters(false);
    }
  }, [showNavigationModal]);

  const primaryBookInfo = useMemo(
    () => getBookInfo(primaryLocation.bookId),
    [primaryLocation.bookId]
  );
  const primaryDisplayBookName =
    primaryBookInfo?.long || primaryLocation.bookName;
  const secondaryBookInfo = useMemo(
    () => getBookInfo(secondaryLocation.bookId),
    [secondaryLocation.bookId]
  );
  const secondaryDisplayBookName =
    secondaryBookInfo?.long || secondaryLocation.bookName;

  const versionName = getVersionDisplayName(currentVersion);

  const handleSecondaryVersionSelect = useCallback((version: string) => {
    setSecondaryVersion(version);
  }, []);

  const renderMultiVersionContent = () => {
    const primaryDisplay = getVersionDisplayName(currentVersion);
    const secondaryDisplay = getVersionDisplayName(secondaryVersion || "");
    const versionHeaderPaddingVertical = isLandscape ? 4 : 8;

    const primaryOnVersePress =
      showMultiVersion && !isLinked
        ? handlePrimaryVersePress
        : handleVersePress;
    const secondaryOnVersePress =
      showMultiVersion && !isLinked
        ? handleSecondaryVersePress
        : handleVersePress;

    const renderPrimaryContent = () => {
      if (primaryLoading) {
        return (
          <View
            style={{
              flex: 1,
              justifyContent: "center",
              alignItems: "center",
            }}
          >
            <ActivityIndicator size="small" color={colors.primary} />
            <Text style={{ color: colors.muted, marginTop: 8 }}>Loading</Text>
          </View>
        );
      }

      if (primaryVerses.length === 0) {
        return (
          <View
            style={{
              flex: 1,
              justifyContent: "center",
              alignItems: "center",
            }}
          >
            <Text style={{ color: colors.muted, textAlign: "center" }}>
              Unable to load {primaryDisplay} version
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
        );
      }

      return (
        <ScrollView
          style={{ flex: 1 }}
          ref={primaryScrollViewRef}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{
            paddingBottom: 40,
            paddingTop: 0,
          }}
          onScroll={primaryHandleScroll}
          scrollEventThrottle={16}
          onContentSizeChange={handlePrimaryContentSizeChange}
          onLayout={primaryProps.handleScrollViewLayout}
        >
          <View
            ref={primaryProps.chapterContainerRef}
            onLayout={primaryProps.handleChapterContainerLayout}
            style={{}}
          >
            <ChapterViewEnhanced
              verses={primaryVerses}
              bookName={primaryLocation.bookName}
              chapterNumber={primaryLocation.chapter}
              bookId={primaryLocation.bookId}
              showVerseNumbers
              fontSize={fontSize}
              onVersePress={primaryOnVersePress}
              onVerseLayout={primaryProps.handleVerseLayout}
              highlightVerse={getHighlightVerse(true)}
              highlightedVerses={new Set(primaryHighlightedVerses)}
              bookmarkedVerses={primaryBookmarkedVerses}
              isFullScreen={isFullScreen}
              displayVersion={primaryDisplay}
              colors={colors}
            />
          </View>
        </ScrollView>
      );
    };

    if (!showMultiVersion) {
      return renderPrimaryContent();
    }
    if (effectiveLayout === "horizontal") {
      return (
        <View style={{ flex: 1, flexDirection: "row" }}>
          <View
            style={{
              flex: 1,
              borderRightWidth: 1,
              borderRightColor: colors.border?.default,
            }}
          >
            <View
              ref={primaryHeaderRef}
              onLayout={() => {
                primaryHeaderRef.current?.measureInWindow((x, y, w, h) => {
                  setPrimaryHeaderX(x);
                  setPrimaryHeaderY(y);
                  setPrimaryHeaderWidth(w);
                  setPrimaryHeaderHeight(h);
                });
              }}
              style={{
                backgroundColor: colors.muted + "20",
                paddingVertical: versionHeaderPaddingVertical,
                paddingHorizontal: 16,
                borderBottomWidth: 1,
                borderBottomColor: colors.border?.default,
                flexDirection: "row",
                gap: 5,
              }}
            >
              <TouchableOpacity
                onPress={openPrimaryNavigation}
                style={{
                  paddingHorizontal: 5,
                  paddingVertical: 4,
                  backgroundColor: "rgba(255,255,255,0.1)",
                  borderRadius: 4,
                }}
              >
                <Text
                  style={{
                    color: colors.primary,
                    fontWeight: "500",
                    fontSize: 14,
                  }}
                  numberOfLines={1}
                >
                  {`${primaryDisplayBookName} ${primaryLocation.chapter}`}
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={openPrimaryVersionSelector}
                style={{
                  paddingHorizontal: 5,
                  paddingVertical: 4,
                  backgroundColor: "rgba(255,255,255,0.1)",
                  borderRadius: 4,
                }}
              >
                <Text
                  style={{
                    color: colors.primary,
                    fontWeight: "500",
                    fontSize: 14,
                  }}
                  numberOfLines={1}
                >
                  {primaryDisplay}
                </Text>
              </TouchableOpacity>
            </View>
            {renderPrimaryContent()}
          </View>
          <View style={{ flex: 1 }}>
            <View
              ref={secondaryHeaderRef}
              onLayout={() => {
                secondaryHeaderRef.current?.measureInWindow((x, y, w, h) => {
                  setSecondaryHeaderX(x);
                  setSecondaryHeaderY(y);
                  setSecondaryHeaderWidth(w);
                  setSecondaryHeaderHeight(h);
                });
              }}
              style={{
                backgroundColor: colors.muted + "20",
                paddingVertical: versionHeaderPaddingVertical,
                paddingHorizontal: 16,
                borderBottomWidth: 1,
                borderBottomColor: colors.border?.default,
                flexDirection: "row",
                gap: 5,
              }}
            >
              <TouchableOpacity
                onPress={openSecondaryNavigation}
                style={{
                  paddingHorizontal: 5,
                  paddingVertical: 4,
                  backgroundColor: "rgba(255,255,255,0.1)",
                  borderRadius: 4,
                }}
              >
                <Text
                  style={{
                    color: colors.primary,
                    fontWeight: "500",
                    fontSize: 14,
                  }}
                  numberOfLines={1}
                >
                  {`${secondaryDisplayBookName} ${secondaryLocation.chapter}`}
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={openSecondaryVersionSelector}
                style={{
                  paddingHorizontal: 5,
                  paddingVertical: 4,
                  backgroundColor: "rgba(255,255,255,0.1)",
                  borderRadius: 4,
                }}
              >
                <Text
                  style={{
                    color: colors.primary,
                    fontWeight: "500",
                    fontSize: 14,
                  }}
                  numberOfLines={1}
                >
                  {secondaryDisplay}
                </Text>
              </TouchableOpacity>
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
                  Loading
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
                style={{ flex: 1 }}
                ref={secondaryScrollViewRef}
                showsVerticalScrollIndicator={false}
                contentContainerStyle={{
                  paddingBottom: 40,
                  paddingTop: 0,
                }}
                onScroll={secondaryHandleScrollCb}
                scrollEventThrottle={16}
                onContentSizeChange={handleSecondaryContentSizeChange}
                onLayout={handleSecondaryScrollViewLayout}
              >
                <ChapterViewEnhanced
                  verses={secondaryVerses}
                  bookName={secondaryLocation.bookName}
                  chapterNumber={secondaryLocation.chapter}
                  bookId={secondaryLocation.bookId}
                  showVerseNumbers
                  fontSize={fontSize}
                  onVersePress={secondaryOnVersePress}
                  onVerseLayout={handleSecondaryVerseLayout}
                  highlightVerse={getHighlightVerse(false)}
                  highlightedVerses={new Set(secondaryHighlightedVerses)}
                  bookmarkedVerses={secondaryBookmarkedVerses}
                  isFullScreen={isFullScreen}
                  displayVersion={secondaryDisplay}
                  colors={colors}
                />
              </ScrollView>
            )}
          </View>
        </View>
      );
    } else {
      return (
        <View style={{ flex: 1, flexDirection: "column" }}>
          <View style={{ flex: 1 }}>
            {hideHeader && (
              <View
                ref={primaryHeaderRef}
                onLayout={() => {
                  primaryHeaderRef.current?.measureInWindow((x, y, w, h) => {
                    setPrimaryHeaderX(x);
                    setPrimaryHeaderY(y);
                    setPrimaryHeaderWidth(w);
                    setPrimaryHeaderHeight(h);
                  });
                }}
                style={{
                  backgroundColor: colors.primary,
                  paddingVertical: versionHeaderPaddingVertical,
                  paddingHorizontal: 16,
                  borderBottomWidth: 1,
                  borderBottomColor: colors.border?.default,
                  flexDirection: "row",
                  gap: 5,
                }}
              >
                <TouchableOpacity
                  onPress={openPrimaryNavigation}
                  style={{
                    paddingHorizontal: 5,
                    paddingVertical: 4,
                    backgroundColor: "rgba(255,255,255,0.15)",
                    borderRadius: 4,
                  }}
                >
                  <Text
                    style={{
                      color: "white",
                      fontWeight: "500",
                      fontSize: 16,
                    }}
                    numberOfLines={1}
                  >
                    {`${primaryDisplayBookName} ${primaryLocation.chapter}`}
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  onPress={openPrimaryVersionSelector}
                  style={{
                    paddingHorizontal: 5,
                    paddingVertical: 4,
                    backgroundColor: "rgba(255,255,255,0.15)",
                    borderRadius: 4,
                  }}
                >
                  <Text
                    style={{
                      color: "white",
                      fontWeight: "500",
                      fontSize: 16,
                    }}
                    numberOfLines={1}
                  >
                    {primaryDisplay}
                  </Text>
                </TouchableOpacity>
              </View>
            )}
            {renderPrimaryContent()}
          </View>
          <View
            style={{
              flex: 1,
              borderTopWidth: 1,
              borderTopColor: colors.border?.default,
            }}
          >
            <View
              ref={secondaryHeaderRef}
              onLayout={() => {
                secondaryHeaderRef.current?.measureInWindow((x, y, w, h) => {
                  setSecondaryHeaderX(x);
                  setSecondaryHeaderY(y);
                  setSecondaryHeaderWidth(w);
                  setSecondaryHeaderHeight(h);
                });
              }}
              style={{
                backgroundColor: colors.primary,
                paddingVertical: versionHeaderPaddingVertical,
                paddingHorizontal: 16,
                borderBottomWidth: 1,
                borderBottomColor: colors.border?.default,
                flexDirection: "row",
                gap: 10,
              }}
            >
              <TouchableOpacity
                onPress={openSecondaryNavigation}
                style={{
                  paddingHorizontal: 5,
                  paddingVertical: 4,
                  backgroundColor: "rgba(255,255,255,0.15)",
                  borderRadius: 4,
                }}
              >
                <Text
                  style={{
                    color: "white",
                    fontWeight: "500",
                    fontSize: 16,
                  }}
                  numberOfLines={1}
                >
                  {`${secondaryDisplayBookName} ${secondaryLocation.chapter}`}
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={openSecondaryVersionSelector}
                style={{
                  paddingHorizontal: 5,
                  paddingVertical: 4,
                  backgroundColor: "rgba(255,255,255,0.15)",
                  borderRadius: 4,
                }}
              >
                <Text
                  style={{
                    color: "white",
                    fontWeight: "500",
                    fontSize: 16,
                  }}
                  numberOfLines={1}
                >
                  {secondaryDisplay}
                </Text>
              </TouchableOpacity>
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
                  Loading
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
                style={{ flex: 1 }}
                ref={secondaryScrollViewRef}
                showsVerticalScrollIndicator={false}
                contentContainerStyle={{
                  paddingBottom: 40,
                  paddingTop: 0,
                }}
                onScroll={secondaryHandleScrollCb}
                scrollEventThrottle={16}
                onContentSizeChange={handleSecondaryContentSizeChange}
                onLayout={handleSecondaryScrollViewLayout}
              >
                <ChapterViewEnhanced
                  verses={secondaryVerses}
                  bookName={secondaryLocation.bookName}
                  chapterNumber={secondaryLocation.chapter}
                  bookId={secondaryLocation.bookId}
                  showVerseNumbers
                  fontSize={fontSize}
                  onVersePress={secondaryOnVersePress}
                  onVerseLayout={handleSecondaryVerseLayout}
                  highlightVerse={getHighlightVerse(false)}
                  highlightedVerses={new Set(secondaryHighlightedVerses)}
                  bookmarkedVerses={secondaryBookmarkedVerses}
                  isFullScreen={isFullScreen}
                  displayVersion={secondaryDisplay}
                  colors={colors}
                />
              </ScrollView>
            )}
          </View>
        </View>
      );
    }
  };

  if (!bibleDB || highlightedVersesLoading) {
    return (
      <SafeAreaView
        style={{
          flex: 1,
          backgroundColor: colors.background?.default,
          justifyContent: "center",
          alignItems: "center",
        }}
      >
        <ActivityIndicator size="large" color={colors.primary} />
        <Text style={{ color: colors.text?.primary, marginTop: 8 }}>
          Loading
        </Text>
      </SafeAreaView>
    );
  }

  const headerContentHeight = 60;
  const headerTotalHeight = insets.top + headerContentHeight;
  const chevronBottom = 20;
  const toggleBottom = 22;
  const buttonSize = 35;
  const iconSize = 24;
  const toggleSize = 48;
  const selectorWidth = 200;
  let selectorTop = headerTotalHeight;
  let selectorLeft = (screenWidth - selectorWidth) / 2;

  if (openSelector === "primary") {
    if (primaryHeaderY > 0 && primaryHeaderHeight > 0) {
      selectorTop = primaryHeaderY + primaryHeaderHeight;
      selectorLeft =
        primaryHeaderX + primaryHeaderWidth / 2 - selectorWidth / 2;
    }
  } else if (openSelector === "secondary") {
    if (secondaryHeaderY > 0 && secondaryHeaderHeight > 0) {
      selectorTop = secondaryHeaderY + secondaryHeaderHeight;
      if (isLandscape) {
        selectorLeft =
          secondaryHeaderX + secondaryHeaderWidth / 2 - selectorWidth / 2;
      } else {
        selectorLeft = (screenWidth - selectorWidth) / 2;
      }
    }
  }

  return (
    <SafeAreaView
      style={{ flex: 1, backgroundColor: colors.background?.default }}
    >
      <StatusBar backgroundColor={colors.primary} />
      {!hideHeader && (
        <View
          style={{
            position: "absolute",
            top: 0,
            left: 0,
            right: 0,
            height: headerTotalHeight,
            backgroundColor: colors.primary,
            justifyContent: "flex-end",
            zIndex: 1,
          }}
        >
          <View
            style={{
              flexDirection: "row",
              justifyContent: "space-between",
              alignItems: "center",
              width: "100%",
              paddingHorizontal: 12,
            }}
          >
            <TouchableOpacity
              onPress={() => navigation.goBack()}
              style={{ opacity: 0.8, marginLeft: isLandscape ? 40 : 0 }}
            >
              <Ionicons name="arrow-back" size={24} color={primaryTextColor} />
            </TouchableOpacity>
            <View
              style={{ flex: 1, alignItems: "center", paddingHorizontal: 10 }}
            >
              <View
                style={{
                  flexDirection: "row",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: 10,
                }}
              >
                <TouchableOpacity
                  onPress={openPrimaryNavigation}
                  style={{
                    paddingHorizontal: 5,
                    paddingVertical: 4,
                    backgroundColor: "rgba(255,255,255,0.1)",
                    borderRadius: 4,
                  }}
                >
                  <Text
                    style={{
                      color: "white",
                      fontWeight: "500",
                      fontSize: 16,
                    }}
                    numberOfLines={1}
                  >
                    {`${primaryDisplayBookName} ${primaryLocation.chapter}`}
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  onPress={openPrimaryVersionSelector}
                  style={{
                    paddingHorizontal: 5,
                    paddingVertical: 4,
                    backgroundColor: "rgba(255,255,255,0.1)",
                    borderRadius: 4,
                  }}
                >
                  <Text
                    style={{
                      color: "white",
                      fontWeight: "500",
                      fontSize: 16,
                    }}
                    numberOfLines={1}
                  >
                    {versionName}
                  </Text>
                </TouchableOpacity>
              </View>
            </View>
            <View
              style={{ flexDirection: "row", alignItems: "center", gap: 4 }}
            >
              {isLandscape ? (
                <View
                  style={{
                    flexDirection: "row",
                    gap: 8,
                    marginRight: isLandscape ? 40 : 0,
                  }}
                >
                  {menuItems.slice(0, -1).map((item) => (
                    <TouchableOpacity
                      key={item.key}
                      onPress={item.onPress}
                      {...(item.key === "color" && {
                        onLongPress: () => setShowColorPicker(true),
                      })}
                      style={{ padding: 8 }}
                    >
                      <Ionicons
                        name={item.icon}
                        size={isLandscape ? 20 : 24}
                        color={item.color}
                      />
                    </TouchableOpacity>
                  ))}
                </View>
              ) : (
                <View
                  style={{ flexDirection: "row", alignItems: "center", gap: 8 }}
                >
                  <TouchableOpacity
                    onPress={toggleMultiVersion}
                    onLongPress={handleToggleLongPress}
                    style={{ padding: 2 }}
                  >
                    <Ionicons
                      name={
                        effectiveLayout === "horizontal"
                          ? "copy-outline"
                          : "copy"
                      }
                      size={24}
                      color={showMultiVersion ? "#f6f0f0ff" : primaryTextColor}
                    />
                  </TouchableOpacity>
                  {themeItem && (
                    <TouchableOpacity
                      onPress={themeItem.onPress}
                      style={{ padding: 2 }}
                    >
                      <Ionicons
                        name={themeItem.icon}
                        size={24}
                        color={themeItem.color}
                      />
                    </TouchableOpacity>
                  )}
                  {colorItem && (
                    <TouchableOpacity
                      onPress={colorItem.onPress}
                      onLongPress={() => setShowColorPicker(true)}
                      style={{ padding: 2 }}
                    >
                      <Ionicons
                        name={colorItem.icon}
                        size={24}
                        color={colorItem.color}
                      />
                    </TouchableOpacity>
                  )}
                  <TouchableOpacity
                    onPress={() => setShowDropdown(true)}
                    style={{ padding: 2 }}
                  >
                    <Ionicons
                      name="ellipsis-vertical"
                      size={24}
                      color={primaryTextColor}
                    />
                  </TouchableOpacity>
                </View>
              )}
            </View>
          </View>
          <View
            style={{
              marginTop: 8,
              marginHorizontal: 16,
              width: "100%",
              height: 4,
              backgroundColor: colors.primary + "40",
              borderRadius: 2,
            }}
          >
            <Animated.View
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
      {!isLandscape && showDropdown && (
        <TouchableOpacity
          style={{
            position: "absolute",
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            zIndex: 1000,
          }}
          activeOpacity={1}
          onPress={() => setShowDropdown(false)}
        >
          <View
            style={{
              position: "absolute",
              top: headerTotalHeight,
              right: 16,
              backgroundColor: colors.primary,
              borderRadius: 8,
              paddingVertical: 8,
              minWidth: 160,
              shadowColor: "#000",
              shadowOffset: { width: 0, height: 2 },
              shadowOpacity: 0.25,
              shadowRadius: 4,
              elevation: 5,
            }}
            onStartShouldSetResponder={() => true}
          >
            {filteredMenuItems.map((item, index) => (
              <TouchableOpacity
                key={item.key}
                onPress={() => {
                  item.onPress();
                  if (item.key !== "close") {
                    setShowDropdown(false);
                  }
                }}
                style={{
                  flexDirection: "row",
                  alignItems: "center",
                  paddingHorizontal: 12,
                  paddingVertical: 8,
                  borderBottomWidth:
                    index < filteredMenuItems.length - 1 ? 1 : 0,
                  borderBottomColor: colors.primary + "40",
                }}
              >
                <Ionicons
                  name={item.icon}
                  size={20}
                  color={item.color}
                  style={{ marginRight: 12 }}
                />
                <Text
                  style={{
                    color: primaryTextColor,
                    fontSize: 16,
                  }}
                >
                  {item.name}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </TouchableOpacity>
      )}
      {openSelector && (
        <TouchableOpacity
          style={{
            position: "absolute",
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            zIndex: 999,
          }}
          activeOpacity={1}
          onPress={closeSelector}
        >
          <View
            style={{
              position: "absolute",
              top: selectorTop,
              left: selectorLeft,
              width: selectorWidth,
              backgroundColor: colors.primary,
              borderRadius: 8,
              paddingVertical: 8,
              shadowColor: "#000",
              shadowOffset: { width: 0, height: 2 },
              shadowOpacity: 0.25,
              shadowRadius: 4,
              elevation: 5,
              flexDirection: "column",
              alignItems: "center",
            }}
            onStartShouldSetResponder={() => true}
          >
            <View
              style={{
                borderBottomWidth: 1,
                borderBottomColor: "white",
                paddingBottom: 8,
                width: "100%",
                alignItems: "center",
              }}
            >
              <Text
                style={{ color: "white", fontSize: 16, fontWeight: "bold" }}
              >
                {selectorTitle}
              </Text>
            </View>
            <ScrollView
              showsVerticalScrollIndicator={true}
              style={{
                maxHeight: 300,
                width: "100%",
              }}
            >
              {selectorLoading ? (
                <View
                  style={{
                    paddingVertical: 20,
                    alignItems: "center",
                  }}
                >
                  <ActivityIndicator size="small" color={primaryTextColor} />
                </View>
              ) : openSelector ? (
                availableBibleVersions.map((v, index) => (
                  <TouchableOpacity
                    key={v}
                    onPress={async () => {
                      if (openSelector === "primary") {
                        await handleVersionSelect(v);
                      } else {
                        handleSecondaryVersionSelect(v);
                      }
                      closeSelector();
                    }}
                    style={{
                      paddingHorizontal: 16,
                      paddingVertical: 8,
                      borderBottomWidth:
                        index < availableBibleVersions.length - 1 ? 1 : 0,
                      borderBottomColor: colors.primary + "40",
                    }}
                    activeOpacity={0.7}
                  >
                    <Text
                      style={{
                        color: primaryTextColor,
                        fontWeight: "500",
                        fontSize: 16,
                      }}
                    >
                      {getVersionDisplayName(v)}
                    </Text>
                  </TouchableOpacity>
                ))
              ) : null}
            </ScrollView>
          </View>
        </TouchableOpacity>
      )}

      <SettingsModal
        visible={showSettings}
        onClose={() => setShowSettings(false)}
        fontSize={fontSize}
        increaseFontSize={increaseFontSize}
        decreaseFontSize={decreaseFontSize}
        colors={colors}
        versionSelectorColors={versionSelectorColors}
        primaryTextColor={primaryTextColor}
        isLandscape={isLandscape}
        showMultiVersion={showMultiVersion}
        toggleMultiVersion={toggleMultiVersion}
        currentVersion={currentVersion}
        availableBibleVersions={availableBibleVersions}
        handleVersionSelect={handleVersionSelect}
        handleSecondaryVersionSelect={handleSecondaryVersionSelect}
        secondaryVersion={secondaryVersion}
        isSwitchingVersion={isSwitchingVersion}
      />

      <NavigationModal
        visible={showNavigationModal}
        onClose={() => setShowNavigationModal(false)}
        colors={colors}
        primaryTextColor={primaryTextColor}
        navigationTarget={navigationTarget}
        currentVersion={currentVersion}
        onLocationSelect={(location) => {
          const bookInfo = getBookInfo(location.book.book_number);
          const newLocation: Location = {
            bookId: location.book.book_number,
            bookName:
              bookInfo?.long || location.book.long_name || "Unknown Book",
            bookColor: bookInfo?.color || location.book.book_color || "#DC2626",
            chapter: location.chapter,
            verse: location.verse,
          };

          if (navigationTarget === "primary") {
            setPrimaryLocation(newLocation);
            setPrimaryTargetVerse(newLocation.verse);
          } else {
            setSecondaryLocation(newLocation);
            setSecondaryTargetVerse(newLocation.verse);
          }
        }}
      />

      <View
        style={{
          flex: 1,
          marginTop: hideHeader ? 0 : headerTotalHeight - insets.top + 2,
        }}
      >
        {renderMultiVersionContent()}
      </View>

      <Animated.View
        style={{
          position: "relative",
          height: 0,
          opacity: buttonOpacity,
        }}
      >
        <View
          style={{
            position: "absolute",
            bottom: chevronBottom,
            left: 0,
            right: 0,
            height: 20,
            flexDirection: "row",
            justifyContent: "space-between",
            alignItems: "center",
            paddingHorizontal: 16,
          }}
        >
          <TouchableOpacity
            onPress={goToPreviousChapter}
            disabled={primaryLocation.chapter <= 1}
            style={{
              width: buttonSize,
              height: buttonSize,
              backgroundColor: colors.primary,
              borderRadius: "100%",
              justifyContent: "center",
              alignItems: "center",
              marginLeft: 28,
              opacity: primaryLocation.chapter <= 1 ? 0.3 : 1,
            }}
          >
            <Ionicons name="chevron-back" size={iconSize} color="white" />
          </TouchableOpacity>
          <View style={{ flex: 1, alignItems: "center" }} />
          <TouchableOpacity
            onPress={goToNextChapter}
            style={{
              width: buttonSize,
              height: buttonSize,
              backgroundColor: colors.primary,
              borderRadius: "100%",
              justifyContent: "center",
              alignItems: "center",
              marginRight: 28,
            }}
          >
            <Ionicons name="chevron-forward" size={iconSize} color="white" />
          </TouchableOpacity>
        </View>
        <View
          style={{
            position: "absolute",
            bottom: toggleBottom,
            left: "50%",
            marginLeft: -toggleSize / 2,
            alignItems: "center",
            justifyContent: "center",
            height: 20,
          }}
        >
          <TouchableOpacity
            onPress={() => {
              setUiMode((prev) => (prev + 1) % 2);
              resetButtonOpacity();
            }}
            style={{
              width: toggleSize,
              height: toggleSize,
              borderRadius: toggleSize / 2,
              backgroundColor: colors.primary,
              justifyContent: "center",
              alignItems: "center",
            }}
          >
            <Text
              style={{
                color: "white",
                fontSize: isLandscape ? 20 : 24,
                fontWeight: "bold",
              }}
            >
              {isFullScreen ? "◱" : "◲"}
            </Text>
          </TouchableOpacity>
        </View>
      </Animated.View>
    </SafeAreaView>
  );
}
