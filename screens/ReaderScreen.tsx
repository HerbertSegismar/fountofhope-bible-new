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
import { ChapterViewEnhanced } from "../components/ChapterViewEnhanced";
import { SettingsModal } from "../components/SettingsModal";
import { useChapterLoader } from "../hooks/useChapterLoader";
import { useMultiVersion } from "../hooks/useMultiVersion";
import { useScrollSync } from "../hooks/useScrollSync";
import { useThemeColors } from "../hooks/useThemeColors";
import { getVersionDisplayName } from "../utils/bibleVersionUtils";
import { Verse } from "../types";
import { getBookInfo } from "../utils/testamentUtils";
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

  // Additional states for selectors
  const [maxChapter, setMaxChapter] = useState(0);
  const [openSelector, setOpenSelector] = useState<SelectorType>(null);
  const [selectorLoading, setSelectorLoading] = useState(false);

  // Multi-view layout state
  const [multiViewLayout, setMultiViewLayout] =
    useState<MultiViewLayout>("horizontal");

  // Header position states
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

  // Dynamic dimensions
  const [dimensions, setDimensions] = useState(initialDimensions);
  const screenWidth = dimensions.width;
  const screenHeight = dimensions.height;

  // Hooks
  const themeColors = useThemeColors();
  const {
    colors,
    versionSelectorColors,
    primaryTextColor,
    handleColorSchemePress,
    toggleTheme,
  } = themeColors;
  const chapterLoader = useChapterLoader(bookId, chapter, targetVerse);
  const {
    verses,
    book,
    loading: chapterLoading,
    scrollViewRef: primaryScrollViewRef,
    ...chapterProps
  } = chapterLoader;
  const multiVersion = useMultiVersion(bookId, chapter, verses);
  const {
    showMultiVersion,
    secondaryVerses,
    secondaryLoading,
    secondaryScrollViewRef,
    ...multiProps
  } = multiVersion;
  const [fontSize, setFontSize] = useState(16);
  const [uiMode, setUiMode] = useState(0);
  const [isLandscape, setIsLandscape] = useState(
    initialDimensions.width > initialDimensions.height
  );
  const [_showEnd, setShowEnd] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [showDropdown, setShowDropdown] = useState(false);
  const lastScrollYRef = useRef(0);
  const [scrollThreshold] = useState(50);
  const scrollY = useRef(new Animated.Value(0)).current;
  const buttonOpacity = useRef(new Animated.Value(1)).current;
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Effective layout considering orientation
  const effectiveLayout = useMemo(
    () => (isLandscape ? "horizontal" : multiViewLayout),
    [isLandscape, multiViewLayout]
  );

  // Long press ref
  const longPressTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(
    null
  );

  const isFullScreen = uiMode === 1;
  const hideHeader = uiMode === 1;
  const scrollSync = useScrollSync(
    showMultiVersion,
    chapterProps.scrollViewHeight,
    chapterProps.contentHeight,
    multiProps.secondaryContentHeight,
    verses,
    chapterProps.verseMeasurements,
    secondaryVerses,
    multiProps.secondaryVerseMeasurements,
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

  // Reset scroll position when chapter changes
  const resetScrollPosition = useCallback(() => {
    // Reset scrollY animated value
    scrollY.setValue(0);
    lastScrollYRef.current = 0;

    // Reset primary scroll view
    if (primaryScrollViewRef.current) {
      primaryScrollViewRef.current.scrollTo({ y: 0, animated: false });
      updatePrimaryOffset(0);
    }

    // Reset secondary scroll view if multi-version is enabled
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

  // Load max chapter
  useEffect(() => {
    const loadData = async () => {
      if (bibleDB) {
        try {
          const chCount = await bibleDB.getChapterCount(Number(bookId));
          setMaxChapter(chCount);
        } catch (error) {
          console.error("Failed to load navigation data:", error);
        }
      }
    };
    loadData();
  }, [bibleDB, bookId]);

  // Load multi-view layout preference
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

  // Save multi-view layout preference
  useEffect(() => {
    AsyncStorage.setItem("multiViewLayout", multiViewLayout).catch((e) =>
      console.error("Failed to save layout preference", e)
    );
  }, [multiViewLayout]);

  const currentVerse = targetVerse || 1;
  const versionName = getVersionDisplayName(currentVersion);
  const bookInfo = useMemo(() => getBookInfo(Number(bookId)), [bookId]);
  const displayBookName = bookInfo?.long || bookName;

  const closeSelector = useCallback(() => setOpenSelector(null), []);

  const openNavigationSelector = useCallback(() => {
    navigation.navigate("BookList", {
      showMultiVersion,
      secondaryVersion: multiProps.secondaryVersion,
    });
  }, [navigation, showMultiVersion, multiProps.secondaryVersion]);

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
        multiProps.setIsSwitchingVersion(true);
        await switchVersion(version);
      } catch (error) {
        Alert.alert("Error", "Failed to switch Bible version.");
      } finally {
        multiProps.setIsSwitchingVersion(false);
      }
    },
    [currentVersion, switchVersion, multiProps.setIsSwitchingVersion]
  );

  // Original press handler - toggle multi-version view
  const handleTogglePress = useCallback(() => {
    multiProps.toggleMultiVersion();
    resetButtonOpacity();
  }, [multiProps.toggleMultiVersion, resetButtonOpacity]);

  // Long press handler - change layout
  const handleToggleLongPress = useCallback(() => {
    setMultiViewLayout((prev) =>
      prev === "horizontal" ? "vertical" : "horizontal"
    );
    resetButtonOpacity();
  }, [resetButtonOpacity]);

  const bookmarkedVerses = useMemo(() => {
    const chapterBookmarks = bookmarks.filter(
      (b) => b.book_number === bookId && b.chapter === chapter
    );
    return new Set(chapterBookmarks.map((b) => b.verse));
  }, [bookmarks, bookId, chapter]);

  // REFACTOR: Memoize highlightedVerses to prevent re-compute on every render (uses getChapterHighlights which may query storage)
  const highlightedVerses = useMemo(
    () => getChapterHighlights(bookId, chapter),
    [bookId, chapter, getChapterHighlights]
  );

  // Update menu items to include layout information
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
        onPress: multiProps.toggleMultiVersion,
        color: showMultiVersion ? "#f6f0f0ff" : primaryTextColor,
      },
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
      multiProps.toggleMultiVersion,
      navigation,
      setShowSettings,
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
            onPress: () =>
              navigation.navigate("Reader", {
                ...route.params,
                verse: verse.verse,
              }),
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

  const goToPreviousChapter = useCallback(() => {
    if (chapter > 1) {
      resetScrollPosition();
      navigation.navigate("Reader", {
        ...route.params,
        chapter: chapter - 1,
        verse: undefined,
      });
    }
  }, [chapter, navigation, route.params, resetScrollPosition]);

  const goToNextChapter = useCallback(() => {
    if (chapter < maxChapter) {
      resetScrollPosition();
      navigation.navigate("Reader", {
        ...route.params,
        chapter: chapter + 1,
        verse: undefined,
      });
    } else {
      Alert.alert("End of Book", "This is the last chapter.");
    }
  }, [maxChapter, chapter, navigation, route.params, resetScrollPosition]);

  const progress = Animated.divide(
    scrollY,
    Math.max(chapterProps.contentHeight - chapterProps.scrollViewHeight, 1)
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

  // Scroll to top for primary when loading completes and no target verse
  useEffect(() => {
    if (!targetVerse && !chapterLoading && primaryScrollViewRef.current) {
      primaryScrollViewRef.current.scrollTo({ y: 0, animated: false });
      updatePrimaryOffset(0);
      lastScrollYRef.current = 0;
    }
  }, [chapterLoading, targetVerse, primaryScrollViewRef, updatePrimaryOffset]);

  // Scroll to top for secondary when loading completes and no target verse
  useEffect(() => {
    if (
      showMultiVersion &&
      !targetVerse &&
      !secondaryLoading &&
      secondaryScrollViewRef.current
    ) {
      secondaryScrollViewRef.current.scrollTo({ y: 0, animated: false });
      updateSecondaryOffset(0);
    }
  }, [
    secondaryLoading,
    showMultiVersion,
    targetVerse,
    secondaryScrollViewRef,
    updateSecondaryOffset,
  ]);

  const handlePrimaryContentSizeChange = useCallback(
    (width: number, height: number) => {
      chapterProps.handleContentSizeChange(width, height);
    },
    [chapterProps.handleContentSizeChange]
  );

  const handleSecondaryContentSizeChange = useCallback(
    (width: number, height: number) => {
      multiProps.handleSecondaryContentSizeChange(width, height);
    },
    [multiProps.handleSecondaryContentSizeChange]
  );

  useEffect(() => {
    const loadSettings = async () => {
      try {
        const [showMultiStr, secVer] = await Promise.all([
          AsyncStorage.getItem("showMultiVersion"),
          AsyncStorage.getItem("secondaryVersion"),
        ]);
        if (showMultiStr === "true" && !showMultiVersion) {
          multiProps.toggleMultiVersion();
        }
        if (secVer && secVer !== multiProps.secondaryVersion) {
          multiProps.handleSecondaryVersionSelect(secVer);
        }
      } catch (e) {
        console.error("Failed to load reader settings", e);
      }
    };
    loadSettings();
  }, []);

  useEffect(() => {
    AsyncStorage.setItem(
      "showMultiVersion",
      showMultiVersion ? "true" : "false"
    ).catch((e) => console.error("Failed to save showMultiVersion", e));
  }, [showMultiVersion]);

  useEffect(() => {
    AsyncStorage.setItem(
      "secondaryVersion",
      multiProps.secondaryVersion || ""
    ).catch((e) => console.error("Failed to save secondaryVersion", e));
  }, [multiProps.secondaryVersion]);

  const renderMultiVersionContent = () => {
    const primaryDisplay = getVersionDisplayName(currentVersion);
    const secondaryDisplay = getVersionDisplayName(
      multiProps.secondaryVersion || ""
    );
    const versionHeaderPaddingVertical = isLandscape ? 4 : 8;

    const renderPrimaryContent = () => {
      if (chapterLoading) {
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

      if (verses.length === 0) {
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
          onScroll={handleScroll}
          scrollEventThrottle={16}
          onContentSizeChange={handlePrimaryContentSizeChange}
          onLayout={chapterProps.handleScrollViewLayout}
        >
          <View
            ref={chapterProps.chapterContainerRef}
            onLayout={chapterProps.handleChapterContainerLayout}
            style={{}}
          >
            <ChapterViewEnhanced
              verses={verses}
              bookName={bookName}
              chapterNumber={chapter}
              bookId={bookId}
              showVerseNumbers
              fontSize={fontSize}
              onVersePress={handleVersePress}
              onVerseLayout={chapterProps.handleVerseLayout}
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
    };

    if (!showMultiVersion) {
      return renderPrimaryContent();
    }

    // Render based on effective layout
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
                onPress={openNavigationSelector}
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
                  {`${displayBookName} ${chapter}`}
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
                onPress={openNavigationSelector}
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
                  {`${displayBookName} ${chapter}`}
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
                onScroll={handleSecondaryScroll}
                scrollEventThrottle={16}
                onContentSizeChange={handleSecondaryContentSizeChange}
                onLayout={multiProps.handleSecondaryScroll}
              >
                <ChapterViewEnhanced
                  verses={secondaryVerses}
                  bookName={bookName}
                  chapterNumber={chapter}
                  bookId={bookId}
                  showVerseNumbers
                  fontSize={fontSize}
                  onVersePress={handleVersePress}
                  onVerseLayout={multiProps.handleSecondaryVerseLayout}
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
    } else {
      // Vertical layout
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
                  onPress={openNavigationSelector}
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
                    {`${displayBookName} ${chapter}`}
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
                gap: 5,
              }}
            >
              <TouchableOpacity
                onPress={openNavigationSelector}
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
                  {`${displayBookName} ${chapter}`}
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
                onScroll={handleSecondaryScroll}
                scrollEventThrottle={16}
                onContentSizeChange={handleSecondaryContentSizeChange}
                onLayout={multiProps.handleSecondaryScroll}
              >
                <ChapterViewEnhanced
                  verses={secondaryVerses}
                  bookName={bookName}
                  chapterNumber={chapter}
                  bookId={bookId}
                  showVerseNumbers
                  fontSize={fontSize}
                  onVersePress={handleVersePress}
                  onVerseLayout={multiProps.handleSecondaryVerseLayout}
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

  // Dynamic selector position
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
      {/* Header */}
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
                  gap: 5,
                }}
              >
                <TouchableOpacity
                  onPress={openNavigationSelector}
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
                    {`${displayBookName} ${chapter}:${currentVerse}`}
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
                    onPress={handleTogglePress}
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
      {/* Dropdown for portrait */}
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
      {/* Enhanced Selector Dropdown */}
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
                        await multiProps.handleSecondaryVersionSelect(v);
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

      {/* Modals */}
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
        toggleMultiVersion={multiProps.toggleMultiVersion}
        currentVersion={currentVersion}
        availableBibleVersions={availableBibleVersions}
        handleVersionSelect={handleVersionSelect}
        handleSecondaryVersionSelect={multiProps.handleSecondaryVersionSelect}
        secondaryVersion={multiProps.secondaryVersion}
        isSwitchingVersion={multiProps.isSwitchingVersion}
      />

      {/* Chapter Content */}
      <View
        style={{
          flex: 1,
          marginTop: hideHeader ? 0 : headerTotalHeight - insets.top + 2,
        }}
      >
        {renderMultiVersionContent()}
      </View>

      {/* Footer with buttons */}
      <Animated.View
        style={{
          position: "relative",
          height: 0,
          opacity: buttonOpacity,
        }}
      >
        {/* Chevron navigation bar */}
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
            disabled={chapter <= 1}
            style={{
              width: buttonSize,
              height: buttonSize,
              backgroundColor: colors.primary,
              borderRadius: "100%",
              justifyContent: "center",
              alignItems: "center",
              marginLeft: 28,
              opacity: chapter <= 1 ? 0.3 : 1,
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
        {/* Full screen toggle button */}
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
