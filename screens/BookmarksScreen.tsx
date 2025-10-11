import React, {
  useEffect,
  useContext,
  useState,
  useCallback,
  useRef,
  useMemo,
} from "react";
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  RefreshControl,
  Platform,
  StyleSheet,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { StackNavigationProp } from "@react-navigation/stack";
import { RootStackParamList, Verse } from "../types";
import { VerseViewEnhanced } from "../components/VerseViewEnhanced";
import { useBibleDatabase } from "../context/BibleDatabaseContext";
import { BookmarksContext } from "../context/BookmarksContext";
import Ionicons from "react-native-vector-icons/Ionicons";
import {
  useTheme,
  type ColorScheme,
  type Theme,
  type FontFamily,
} from "../context/ThemeContext";
import { getBookInfo } from "../utils/testamentUtils";

type BookmarksScreenNavigationProp = StackNavigationProp<
  RootStackParamList,
  "Bookmarks"
>;

interface Props {
  navigation: BookmarksScreenNavigationProp;
}

interface VerseDetailsState {
  [key: string]: Verse;
}

interface BookLongNamesState {
  [key: number]: string;
}

interface ContextBookmark {
  id: string;
  book_number: number;
  chapter: number;
  verse: number;
  createdAt: string;
}

// Constants
const BOOK_COLORS: { [key: string]: string } = {
  genesis: "#8B4513",
  exodus: "#FF8C00",
  leviticus: "#DC143C",
  numbers: "#32CD32",
  deuteronomy: "#1E90FF",
  // ... (keep your existing color mappings)
  revelation: "#DC143C",
};

const BATCH_SIZE = 5;
const FALLBACK_COLORS = [
  "#3B82F6",
  "#EF4444",
  "#10B981",
  "#F59E0B",
  "#8B5CF6",
  "#EC4899",
  "#06B6D4",
  "#84CC16",
  "#F97316",
  "#6366F1",
];

// Primary colors for each scheme and theme
const primaryColors: Record<ColorScheme, { light: string; dark: string }> = {
  purple: { light: "#A855F7", dark: "#9333EA" },
  green: { light: "#10B981", dark: "#059669" },
  red: { light: "#da4242ff", dark: "#b93b3bff" },
  yellow: { light: "#F59E0B", dark: "#D97706" },
};

// Base light theme colors (adjust accents based on scheme)
const BASE_LIGHT_THEME_COLORS = {
  card: "#FFFFFF",
  background: "#FFFFFF",
  surface: "#F8F9FA",
  textPrimary: "#1F2937",
  textSecondary: "#374151",
  textMuted: "#6C757D",
  highlightBg: "#FFF3CD",
  highlightBorder: "#FFD700",
  highlightText: "#8B4513",
  highlightIcon: "#B8860B",
  tagBg: "rgba(0,255,0,0.1)",
  searchHighlightBg: "#FFFF99",
  border: "#E9ECEF",
} as const;

// Base dark theme colors (adjust accents based on scheme)
const BASE_DARK_THEME_COLORS = {
  card: "#111827",
  background: "#111827",
  surface: "#1F2937",
  textPrimary: "#F9FAFB",
  textSecondary: "#D1D5DB",
  textMuted: "#9CA3AF",
  highlightBg: "#1F2937",
  highlightBorder: "#FCD34D",
  highlightText: "#FECACA",
  highlightIcon: "#FCD34D",
  tagBg: "rgba(255,255,255,0.1)",
  searchHighlightBg: "#374151",
  border: "#374151",
} as const;

type BaseThemeColors =
  | typeof BASE_LIGHT_THEME_COLORS
  | typeof BASE_DARK_THEME_COLORS;

// Dynamic theme colors function
const getThemeColors = (
  theme: Theme,
  colorScheme: ColorScheme
): ThemeColors => {
  const primary =
    primaryColors[colorScheme][theme === "dark" ? "dark" : "light"];
  const baseColors =
    theme === "dark" ? BASE_DARK_THEME_COLORS : BASE_LIGHT_THEME_COLORS;

  // Generate lighter/darker variants for verseNumber, tagColor, etc.
  const getLighterColor = (hex: string, amount: number = 50): string => {
    const num = parseInt(hex.replace("#", ""), 16);
    const amt = Math.round(2.55 * amount);
    const R = (num >> 16) + amt;
    const G = ((num >> 8) & 0x00ff) + amt;
    const B = (num & 0x0000ff) + amt;
    return (
      "#" +
      (
        0x1000000 +
        (R < 255 ? (R < 1 ? 0 : R) : 255) * 0x10000 +
        (G < 255 ? (G < 1 ? 0 : G) : 255) * 0x100 +
        (B < 255 ? (B < 1 ? 0 : B) : 255)
      )
        .toString(16)
        .slice(1)
    );
  };

  const lighterPrimary = getLighterColor(primary, theme === "dark" ? 80 : 30);

  return {
    ...baseColors,
    primary,
    verseNumber: lighterPrimary,
    tagColor: primary,
  } as const;
};

type ThemeColors = BaseThemeColors & {
  primary: string;
  verseNumber: string;
  tagColor: string;
};

// Helper function to determine text color based on background color
const getContrastColor = (
  backgroundColor: string,
  themeColors: ThemeColors
): string => {
  // Default to theme text primary if no background color
  if (!backgroundColor) return themeColors.textPrimary;

  // Convert hex color to RGB
  const hex = backgroundColor.replace("#", "");
  const r = parseInt(hex.substr(0, 2), 16);
  const g = parseInt(hex.substr(2, 2), 16);
  const b = parseInt(hex.substr(4, 2), 16);

  // Calculate luminance
  const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255;

  // Return dark text for light colors, light text for dark colors
  return luminance > 0.5 ? themeColors.textSecondary : themeColors.textPrimary;
};

// Map fontFamily to actual font family string
const getFontFamily = (fontFamily: FontFamily): string | undefined => {
  switch (fontFamily) {
    case "serif":
      return Platform.OS === "ios" ? "Georgia" : "serif";
    case "sans-serif":
      return Platform.OS === "ios" ? "Helvetica Neue" : "sans-serif";
    case "system":
    default:
      return undefined;
  }
};

// Helper functions
const getBookColor = (bookName: string, verse?: Verse): string => {
  if (verse?.book_color) return verse.book_color;

  const normalizedBookName = bookName.toLowerCase().trim();
  const color = BOOK_COLORS[normalizedBookName];
  if (color) return color;

  return generateColorFromString(bookName);
};

const generateColorFromString = (str: string): string => {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = str.charCodeAt(i) + ((hash << 5) - hash);
  }
  return FALLBACK_COLORS[Math.abs(hash) % FALLBACK_COLORS.length];
};

const getVersionDisplayName = (version: string): string => {
  return version.replace(".sqlite3", "").toUpperCase();
};

const formatDate = (dateString: string): string => {
  return new Date(dateString).toLocaleDateString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
};

const getBookmarksKey = (bookmarks: ContextBookmark[]): string => {
  return bookmarks
    .map((b) => b.id)
    .sort()
    .join(",");
};

export default function BookmarksScreen({ navigation }: Props) {
  // Theme
  const { theme, colorScheme, fontFamily } = useTheme();
  const themeColors = getThemeColors(theme, colorScheme);
  const actualFontFamily = getFontFamily(fontFamily);

  // Context and state
  const { bibleDB, currentVersion } = useBibleDatabase();
  const { bookmarks, removeBookmark, loadBookmarks } =
    useContext(BookmarksContext);

  const [verseDetails, setVerseDetails] = useState<VerseDetailsState>({});
  const [bookLongNames, setBookLongNames] = useState<BookLongNamesState>({});
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // Refs
  const previousBookmarksRef = useRef<string>("");
  const isMountedRef = useRef(true);
  const initialLoadRef = useRef(false);

  // Memoized values
  const bookmarksKey = useMemo(
    () => getBookmarksKey(bookmarks as ContextBookmark[]),
    [bookmarks]
  );

  const sortedBookmarks = useMemo(
    () =>
      [...(bookmarks as ContextBookmark[])].sort(
        (a, b) =>
          new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
      ),
    [bookmarks]
  );

  // Event handlers
  const handleBookmarkPress = useCallback(
    (verse: Verse) => {
      const bookInfo = getBookInfo(verse.book_number);
      const longName = bookInfo?.long || verse.book_name || "Unknown Book";
      const testament = verse.book_number >= 470 ? "NT" : "OT";

      // Use the same pattern as VerseListScreen
      const tabNavigation = navigation.getParent();
      tabNavigation?.navigate("Bible", {
        screen: "Reader",
        params: {
          bookId: verse.book_number,
          chapter: verse.chapter,
          verse: verse.verse,
          bookName: longName,
          testament: testament,
        },
      });
    },
    [navigation]
  );

  const handleDeleteBookmark = useCallback(
    (bookmarkId: string) => {
      Alert.alert(
        "Delete Bookmark",
        "Are you sure you want to delete this bookmark?",
        [
          { text: "Cancel", style: "cancel" },
          {
            text: "Delete",
            style: "destructive",
            onPress: () => removeBookmark(bookmarkId),
          },
        ]
      );
    },
    [removeBookmark]
  );

  const handleRetryLoad = useCallback(() => {
    setLoading(true);
    initialLoadRef.current = false;
    loadBookmarks();
  }, [loadBookmarks]);

  const handleGoToBible = useCallback(() => {
    const tabNavigator = navigation.getParent();
    tabNavigator?.navigate("Bible");
  }, [navigation]);

  const handleRefresh = useCallback(async () => {
    setRefreshing(true);
    try {
      await loadBookmarks();
    } catch (error) {
      console.error("Failed to refresh bookmarks:", error);
    } finally {
      setRefreshing(false);
    }
  }, [loadBookmarks]);

  // Effects
  useEffect(() => {
    return () => {
      isMountedRef.current = false;
    };
  }, []);

  useEffect(() => {
    if (initialLoadRef.current || !bibleDB) {
      setLoading(false);
      return;
    }

    const initializeBookmarks = async () => {
      setLoading(true);
      try {
        await loadBookmarks();
        initialLoadRef.current = true;
      } catch (error) {
        console.error("Failed to load bookmarks:", error);
        Alert.alert("Error", "Failed to load bookmarks");
      } finally {
        if (isMountedRef.current) {
          setLoading(false);
        }
      }
    };

    initializeBookmarks();
  }, [bibleDB, loadBookmarks]);

  useEffect(() => {
    if (!bibleDB || bookmarks.length === 0) {
      if (bookmarks.length === 0) {
        setVerseDetails({});
      }
      return;
    }

    // Skip if bookmarks haven't changed
    if (bookmarksKey === previousBookmarksRef.current) {
      return;
    }
    previousBookmarksRef.current = bookmarksKey;

    const loadVerseDetails = async () => {
      const newVerseDetails: VerseDetailsState = {};
      const newBookLongNames: BookLongNamesState = { ...bookLongNames };

      try {
        for (let i = 0; i < sortedBookmarks.length; i += BATCH_SIZE) {
          const batch = sortedBookmarks.slice(i, i + BATCH_SIZE);

          const batchPromises = batch.map(async (bookmark) => {
            try {
              const [verse, book] = await Promise.all([
                bibleDB.getVerse(
                  bookmark.book_number,
                  bookmark.chapter,
                  bookmark.verse
                ),
                !newBookLongNames[bookmark.book_number]
                  ? bibleDB.getBook(bookmark.book_number)
                  : Promise.resolve(null),
              ]);

              if (verse) {
                newVerseDetails[bookmark.id] = verse;
              }

              if (book && !newBookLongNames[bookmark.book_number]) {
                newBookLongNames[bookmark.book_number] =
                  book.long_name ?? "Unknown Book";
              }
            } catch (error) {
              console.error(`Failed to load verse ${bookmark.id}:`, error);
              newBookLongNames[bookmark.book_number] =
                newBookLongNames[bookmark.book_number] || "Unknown Book";
            }
          });

          await Promise.all(batchPromises);

          // Update state incrementally for better UX
          if (isMountedRef.current) {
            setVerseDetails((prev) => ({ ...prev, ...newVerseDetails }));
            setBookLongNames((prev) => ({ ...prev, ...newBookLongNames }));
          }
        }
      } catch (error) {
        console.error("Error loading verse details:", error);
      }
    };

    loadVerseDetails();
  }, [bibleDB, bookmarksKey, sortedBookmarks, bookLongNames]);

  // Component render functions
  const renderLoading = () => (
    <SafeAreaView
      style={{
        flex: 1,
        justifyContent: "center",
        alignItems: "center",
        backgroundColor: themeColors.background,
      }}
    >
      <ActivityIndicator size="large" color={themeColors.primary} />
      <Text
        style={{
          fontSize: 18,
          color: themeColors.textPrimary,
          marginTop: 16,
          fontFamily: actualFontFamily,
        }}
      >
        Loading bookmarks...
      </Text>
      {currentVersion && (
        <Text
          style={{
            fontSize: 14,
            color: themeColors.textMuted,
            marginTop: 8,
            fontFamily: actualFontFamily,
          }}
        >
          {getVersionDisplayName(currentVersion)}
        </Text>
      )}
    </SafeAreaView>
  );

  const renderError = () => (
    <SafeAreaView
      style={{
        flex: 1,
        justifyContent: "center",
        alignItems: "center",
        backgroundColor: themeColors.background,
        padding: 24,
      }}
    >
      <Ionicons
        name="alert-circle-outline"
        size={48}
        color={themeColors.textSecondary}
      />
      <Text
        style={{
          fontSize: 18,
          color: themeColors.textSecondary,
          textAlign: "center",
          marginBottom: 16,
          fontFamily: actualFontFamily,
        }}
      >
        Database not available
      </Text>
      <TouchableOpacity
        onPress={handleRetryLoad}
        style={{
          backgroundColor: themeColors.primary,
          paddingHorizontal: 16,
          paddingVertical: 12,
          borderRadius: 8,
          flexDirection: "row",
          alignItems: "center",
        }}
      >
        <Ionicons
          name="refresh"
          size={20}
          color={getContrastColor(themeColors.primary, themeColors)}
        />
        <Text
          style={{
            color: getContrastColor(themeColors.primary, themeColors),
            fontWeight: "600",
            marginLeft: 8,
            fontFamily: actualFontFamily,
          }}
        >
          Try Again
        </Text>
      </TouchableOpacity>
    </SafeAreaView>
  );

  const renderEmptyState = () => (
    <View
      style={{
        flex: 1,
        justifyContent: "center",
        alignItems: "center",
        paddingVertical: 64,
        backgroundColor: themeColors.background,
      }}
    >
      <Ionicons
        name="bookmark-outline"
        size={64}
        color={themeColors.textMuted}
      />
      <Text
        style={{
          fontSize: 18,
          color: themeColors.textSecondary,
          textAlign: "center",
          marginBottom: 8,
          marginTop: 16,
          fontFamily: actualFontFamily,
        }}
      >
        No bookmarks yet
      </Text>
      <Text
        style={{
          color: themeColors.textMuted,
          textAlign: "center",
          marginBottom: 24,
          paddingHorizontal: 32,
          fontFamily: actualFontFamily,
        }}
      >
        Save your favorite verses to access them quickly
      </Text>
      <TouchableOpacity
        onPress={handleGoToBible}
        style={{
          backgroundColor: themeColors.primary,
          paddingHorizontal: 24,
          paddingVertical: 12,
          borderRadius: 8,
          flexDirection: "row",
          alignItems: "center",
        }}
      >
        <Ionicons
          name="book"
          size={18}
          color={getContrastColor(themeColors.primary, themeColors)}
        />
        <Text
          style={{
            color: getContrastColor(themeColors.primary, themeColors),
            fontWeight: "600",
            marginLeft: 8,
            fontFamily: actualFontFamily,
          }}
        >
          Go Back
        </Text>
      </TouchableOpacity>
    </View>
  );

  const renderBookmarkItem = useCallback(
    (bookmark: ContextBookmark) => {
      const verse = verseDetails[bookmark.id];
      const longName =
        verse && bookLongNames[verse.book_number]
          ? bookLongNames[verse.book_number]
          : verse?.book_name || "Unknown Book";

      if (!verse) {
        return (
          <View
            key={bookmark.id}
            style={{
              backgroundColor: themeColors.card,
              borderRadius: 12,
              shadowOpacity: 0.1,
              shadowRadius: 4,
              shadowOffset: { width: 0, height: 2 },
              elevation: 2,
              overflow: "hidden",
              borderWidth: 1,
              borderColor: themeColors.border,
              marginBottom: 16,
            }}
          >
            <View
              style={{
                backgroundColor: themeColors.surface,
                paddingHorizontal: 16,
                paddingVertical: 8,
                flexDirection: "row",
                alignItems: "center",
                justifyContent: "space-between",
              }}
            >
              <View
                style={{ flexDirection: "row", alignItems: "center", flex: 1 }}
              >
                <Ionicons
                  name="bookmark"
                  size={16}
                  color={themeColors.primary}
                />
                <Text
                  style={{
                    color: themeColors.textPrimary,
                    fontWeight: "500",
                    marginLeft: 8,
                    fontFamily: actualFontFamily,
                  }}
                >
                  Loading...
                </Text>
              </View>
            </View>
            <View style={{ padding: 16 }}>
              <ActivityIndicator size="small" color={themeColors.primary} />
            </View>
          </View>
        );
      }

      const bookColor = getBookColor(longName, verse);
      const headerTextColor = getContrastColor(bookColor, themeColors);

      return (
        <View
          key={bookmark.id}
          style={{
            backgroundColor: themeColors.card,
            borderRadius: 12,
            shadowOpacity: 0.1,
            shadowRadius: 4,
            shadowOffset: { width: 0, height: 2 },
            elevation: 2,
            overflow: "hidden",
            borderWidth: 1,
            borderColor: themeColors.border,
            marginBottom: 10,
          }}
        >
          <VerseViewEnhanced
            verses={[verse]}
            bookName={longName}
            chapterNumber={verse.chapter}
            showVerseNumbers={true}
            fontSize={16}
            onVersePress={() => handleBookmarkPress(verse)}
            compact={true}
            bookColor={bookColor}
          />

          <View
            style={{
              flexDirection: "row",
              alignItems: "center",
              justifyContent: "space-between",
              paddingHorizontal: 16,
              paddingVertical: 12,
              backgroundColor: themeColors.surface,
            }}
          >
            <View style={{ flexDirection: "row", alignItems: "center" }}>
              <Ionicons
                name="time-outline"
                size={14}
                color={themeColors.textMuted}
              />
              <Text
                style={{
                  color: themeColors.textMuted,
                  fontSize: 12,
                  marginLeft: 4,
                  fontFamily: actualFontFamily,
                }}
              >
                {formatDate(bookmark.createdAt)}
              </Text>
            </View>

            <View
              style={{ flexDirection: "row", alignItems: "center", gap: 8 }}
            >
              <TouchableOpacity
                onPress={() => handleDeleteBookmark(bookmark.id)}
                style={{
                  flexDirection: "row",
                  alignItems: "center",
                  paddingHorizontal: 12,
                  paddingVertical: 4,
                }}
              >
                <Ionicons
                  name="trash-outline"
                  size={12}
                  color={themeColors.highlightText}
                />
                <Text
                  style={{
                    color: themeColors.highlightText,
                    fontSize: 12,
                    fontWeight: "500",
                    marginLeft: 4,
                    fontFamily: actualFontFamily,
                  }}
                >
                  Delete
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                onPress={() => handleBookmarkPress(verse)}
                style={{
                  flexDirection: "row",
                  alignItems: "center",
                  backgroundColor: themeColors.primary,
                  paddingHorizontal: 12,
                  paddingVertical: 4,
                  borderRadius: 999,
                }}
              >
                <Ionicons
                  name="eye"
                  size={12}
                  color="white"
                />
                <Text
                  style={{
                    color: "white",
                    fontSize: 12,
                    fontWeight: "500",
                    marginLeft: 4,
                    fontFamily: actualFontFamily,
                  }}
                >
                  Read
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      );
    },
    [
      verseDetails,
      bookLongNames,
      handleBookmarkPress,
      handleDeleteBookmark,
      themeColors,
      actualFontFamily,
    ]
  );

  const renderBookmarksList = () => (
    <View style={{ gap: 16, marginBottom: 160 }}>
      {sortedBookmarks.map(renderBookmarkItem)}
    </View>
  );

  const renderHeader = () => (
    <View
      style={{
        backgroundColor: themeColors.card,
        paddingVertical: 16,
        shadowOpacity: 0.1,
        shadowRadius: 4,
        shadowOffset: { width: 0, height: -2 },
        elevation: 2,
        marginTop: -56,
      }}
    >
      <View
        style={{
          flexDirection: "row",
          alignItems: "center",
          justifyContent: "center",
          marginBottom: 4,
        }}
      >
        <Ionicons name="bookmark" size={20} color={themeColors.primary} />
        <Text
          style={{
            color: themeColors.textPrimary,
            fontSize: 18,
            fontWeight: "600",
            marginLeft: 8,
            fontFamily: actualFontFamily,
          }}
        >
          My Bookmarks
        </Text>
      </View>
      <Text
        style={{
          color: themeColors.textSecondary,
          textAlign: "center",
          fontFamily: actualFontFamily,
        }}
      >
        {bookmarks.length} saved verse{bookmarks.length !== 1 ? "s" : ""}
      </Text>
      {currentVersion && (
        <Text
          style={{
            fontSize: 14,
            color: themeColors.textMuted,
            textAlign: "center",
            fontFamily: actualFontFamily,
          }}
        >
          {getVersionDisplayName(currentVersion)} Version
        </Text>
      )}
    </View>
  );

  // Main render
  if (loading) {
    return renderLoading();
  }

  if (!bibleDB) {
    return renderError();
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: themeColors.background }}>
      {renderHeader()}

      <ScrollView
        style={{ flex: 1, padding: 16 }}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 20 }}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={handleRefresh}
            colors={[themeColors.primary]}
            tintColor={themeColors.primary}
            progressBackgroundColor={themeColors.background}
          />
        }
      >
        {bookmarks.length === 0 ? renderEmptyState() : renderBookmarksList()}
      </ScrollView>
    </SafeAreaView>
  );
}
