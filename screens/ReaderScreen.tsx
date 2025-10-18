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
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { useFocusEffect } from "@react-navigation/native";
import { BookmarksContext } from "../context/BookmarksContext";
import { useHighlights } from "../context/HighlightsContext";
import { useBibleDatabase } from "../context/BibleDatabaseContext";
import { ChapterViewEnhanced } from "../components/ChapterViewEnhanced";
import { SettingsModal } from "../components/SettingsModal";
import { NavigationModal } from "../components/NavigationModal";
import { useChapterLoader } from "../hooks/useChapterLoader";
import { useMultiVersion } from "../hooks/useMultiVersion";
import { useNavigationModal } from "../hooks/useNavigationModal";
import { useScrollSync } from "../hooks/useScrollSync";
import { useThemeColors } from "../hooks/useThemeColors";
import { getVersionDisplayName } from "../utils/bibleVersionUtils";
import { Verse } from "../types";

const { width: screenWidth, height: screenHeight } = Dimensions.get("window");

export default function ReaderScreen({
  navigation,
  route,
}: {
  navigation: any;
  route: any;
}) {
  const { bookId, chapter, bookName, verse: targetVerse } = route.params;
  const { addBookmark, bookmarks } = useContext(BookmarksContext);
  const {
    toggleVerseHighlight,
    getChapterHighlights,
    loading: highlightedVersesLoading,
  } = useHighlights();
  const {
    bibleDB,
    currentVersion,
    availableBibleVersions, // Changed from availableVersions
    switchVersion,
  } = useBibleDatabase();

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
  const navModal = useNavigationModal(
    bookId,
    chapter,
    targetVerse,
    navigation,
    route
  );
  const { showNavigation, ...navProps } = navModal;
  const [fontSize, setFontSize] = useState(16);
  const [uiMode, setUiMode] = useState(0);
  const [isLandscape, setIsLandscape] = useState(screenWidth > screenHeight);
  const [_showEnd, setShowEnd] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const lastScrollYRef = useRef(0);
  const [scrollThreshold] = useState(50);
  const scrollY = useRef(new Animated.Value(0)).current;
  const buttonOpacity = useRef(new Animated.Value(1)).current;
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isFullScreen = uiMode === 2;
  const hideHeader = uiMode === 1 || uiMode === 2;
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
    () => {}, // Placeholder, no longer used for setting full screen
    scrollThreshold,
    lastScrollYRef,
    scrollY,
    setShowEnd,
    primaryScrollViewRef,
    secondaryScrollViewRef
  );
  const { handleScroll, handleSecondaryScroll } = scrollSync;

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

  useEffect(() => {
    resetButtonOpacity();
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
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
    if (chapter > 1)
      navigation.navigate("Reader", {
        ...route.params,
        chapter: chapter - 1,
        verse: undefined,
      });
  }, [chapter, navigation, route.params]);

  // REFACTOR: Use getChapterCount (cached MAX) instead of getVerseCount (COUNT) for faster next-chapter check (Bible chapters are consecutive)
  const goToNextChapter = useCallback(async () => {
    if (!bibleDB) return;
    try {
      const maxChapter = await bibleDB.getChapterCount(bookId);
      if (chapter < maxChapter)
        navigation.navigate("Reader", {
          ...route.params,
          chapter: chapter + 1,
          verse: undefined,
        });
      else Alert.alert("End of Book", "This is the last chapter.");
    } catch {
      Alert.alert("Error", "Cannot load next chapter");
    }
  }, [bibleDB, bookId, chapter, navigation, route.params]);

  const getHeaderTitle = useCallback(() => {
    const baseTitle = targetVerse
      ? `${bookName} ${chapter}:${targetVerse}`
      : `${bookName} ${chapter}`;
    return !showMultiVersion
      ? `${baseTitle} (${getVersionDisplayName(currentVersion)})`
      : baseTitle;
  }, [bookName, chapter, targetVerse, showMultiVersion, currentVersion]);

  const progress = Animated.divide(
    scrollY,
    Math.max(chapterProps.contentHeight - chapterProps.scrollViewHeight, 1)
  );

  useFocusEffect(
    useCallback(() => {
      const { width, height } = Dimensions.get("window");
      const currentIsLandscape = width > height;
      setIsLandscape(currentIsLandscape);
    }, [])
  );

  useEffect(() => {
    const updateLayout = () => {
      const { width: newWidth, height: newHeight } = Dimensions.get("window");
      const newIsLandscape = newWidth > newHeight;
      setIsLandscape(newIsLandscape);
    };
    updateLayout();
    const subscription = Dimensions.addEventListener("change", updateLayout);
    return () => subscription?.remove();
  }, []);

  // Hide tab bar in full screen mode
  useEffect(() => {
    const parent = navigation.getParent();
    if (parent) {
      parent.setOptions({
        tabBarStyle: {
          backgroundColor: colors.primary,
          display: isFullScreen ? "none" : "flex",
        },
      });
    }
  }, [isFullScreen, navigation, colors.primary]);

  const renderMultiVersionContent = () => {
    const primaryDisplay = getVersionDisplayName(currentVersion);
    const secondaryDisplay = getVersionDisplayName(
      multiProps.secondaryVersion || ""
    );

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
          ref={primaryScrollViewRef}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{
            paddingBottom: 40,
            paddingTop: hideHeader ? 40 : 0,
          }}
          onScroll={handleScroll}
          scrollEventThrottle={16}
          onContentSizeChange={chapterProps.handleContentSizeChange}
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

    return (
      <View className="flex-1 flex-row">
        <View
          style={{
            flex: 1,
            borderRightWidth: 1,
            borderRightColor: colors.border?.default,
          }}
        >
          <View
            style={{
              backgroundColor: colors.muted + "20",
              paddingVertical: 8,
              paddingHorizontal: 16,
              borderBottomWidth: 1,
              borderBottomColor: colors.border?.default,
            }}
          >
            <Text
              style={{ color: colors.primary, fontSize: 14, fontWeight: "600" }}
            >
              {primaryDisplay}
            </Text>
          </View>
          {renderPrimaryContent()}
        </View>
        <View style={{ flex: 1 }}>
          <View
            style={{
              backgroundColor: colors.muted + "20",
              paddingVertical: 8,
              paddingHorizontal: 16,
              borderBottomWidth: 1,
              borderBottomColor: colors.border?.default,
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
              <Text style={{ color: colors.muted, marginTop: 8 }}>Loading</Text>
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
              contentContainerStyle={{
                paddingBottom: 40,
                paddingTop: hideHeader ? 10 : 0,
              }}
              onScroll={handleSecondaryScroll}
              scrollEventThrottle={16}
              onContentSizeChange={multiProps.handleSecondaryContentSizeChange}
              onLayout={chapterProps.handleScrollViewLayout}
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

  return (
    <View style={{ flex: 1, backgroundColor: colors.background?.default }}>
      {/* Header */}
      {!hideHeader && (
        <View
          style={{
            backgroundColor: colors.primary,
            width: "100%",
            height: 96,
            justifyContent: "flex-end",
          }}
        >
          <View className="flex-row justify-between items-center w-full px-6 pb-2">
            <Text
              style={{
                color: primaryTextColor,
                letterSpacing: 1,
                fontSize: 20,
              }}
            >
              Bible Reader
            </Text>
            <View className="flex-row gap-2">
              <TouchableOpacity onPress={toggleTheme} className="p-2">
                <Ionicons
                  name={
                    themeColors.theme === "light"
                      ? "moon-outline"
                      : "sunny-outline"
                  }
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
                  navProps.setShowNavigation(true);
                  navProps.setHasTappedChapter(false);
                }}
                className="p-2 mr-2"
              >
                <Ionicons
                  name="book-outline"
                  size={24}
                  color={primaryTextColor}
                />
              </TouchableOpacity>
              <TouchableOpacity
                onPress={multiProps.toggleMultiVersion}
                className="p-2 mr-2"
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
      {!hideHeader && (
        <View
          style={{
            backgroundColor: colors.primary,
            paddingHorizontal: 16,
            paddingVertical: 8,
          }}
        >
          <View className="flex-row justify-between items-center">
            <TouchableOpacity
              onPress={() => {
                goToPreviousChapter();
                resetButtonOpacity();
              }}
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
              onPress={() => {
                goToNextChapter();
                resetButtonOpacity();
              }}
              className="p-2"
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
      {!hideHeader && (
        <View
          className="flex-row justify-between items-center px-4 py-2"
          style={{
            backgroundColor: colors.card + "80",
            borderBottomWidth: 1,
            borderBottomColor: colors.border?.default,
          }}
        >
          <Text style={{ color: colors.muted, fontSize: 12 }}>Font Size</Text>
          <View className="flex-row items-center gap-2">
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
              style={{
                color: colors.text?.primary,
                textAlign: "center",
                fontSize: 12,
              }}
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
        </View>
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
        availableBibleVersions={availableBibleVersions} // Fixed: Changed from availableVersions
        handleVersionSelect={handleVersionSelect}
        handleSecondaryVersionSelect={multiProps.handleSecondaryVersionSelect}
        secondaryVersion={multiProps.secondaryVersion}
        isSwitchingVersion={multiProps.isSwitchingVersion}
      />
      <NavigationModal
        visible={showNavigation}
        onClose={() => navProps.setShowNavigation(false)}
        {...navProps}
        colors={colors}
        primaryTextColor={primaryTextColor}
      />

      {/* Chapter Content */}
      {renderMultiVersionContent()}

      {/* Full screen toggle button - always visible, positioned absolutely */}
      <Animated.View
        className={`absolute left-1/2 -ml-6 size-12 rounded-full items-center justify-center z-50`}
        style={{ opacity: buttonOpacity, bottom: 44 }}
      >
        <TouchableOpacity
          onPress={() => {
            setUiMode((prev) => (prev + 1) % 3);
            resetButtonOpacity();
          }}
          className={`absolute left-1/2 -ml-6 size-12 rounded-full items-center justify-center z-50`}
          style={{ backgroundColor: colors.primary }}
        >
          <Text
            style={{
              color: "white",
              fontSize: 24,
              fontWeight: "bold",
            }}
          >
            {isFullScreen ? "◱" : "◲"}
          </Text>
        </TouchableOpacity>
      </Animated.View>
      <Animated.View
        style={{
          position: "absolute",
          bottom: 34,
          left: 0,
          right: 0,
          height: 60,
          flexDirection: "row",
          justifyContent: "space-between",
          alignItems: "center",
          paddingHorizontal: 16,
          opacity: buttonOpacity,
        }}
      >
        <TouchableOpacity
          onPress={() => {
            goToPreviousChapter();
            resetButtonOpacity();
          }}
          disabled={chapter <= 1}
          style={{
            width: 35,
            height: 35,
            backgroundColor: colors.primary,
            borderRadius: "100%",
            justifyContent: "center",
            alignItems: "center",
            marginLeft: 28,
          }}
        >
          <Ionicons name="chevron-back" size={24} color="white" />
        </TouchableOpacity>
        <View style={{ flex: 1, alignItems: "center" }} />
        <TouchableOpacity
          onPress={() => {
            goToNextChapter();
            resetButtonOpacity();
          }}
          style={{
            width: 35,
            height: 35,
            backgroundColor: colors.primary,
            borderRadius: "100%",
            justifyContent: "center",
            alignItems: "center",
            marginRight: 28,
          }}
        >
          <Ionicons name="chevron-forward" size={24} color="white" />
        </TouchableOpacity>
      </Animated.View>
    </View>
  );
}
