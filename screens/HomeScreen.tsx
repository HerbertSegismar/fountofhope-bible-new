import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Image,
  Dimensions,
  Platform,
} from "react-native";
import { StackNavigationProp } from "@react-navigation/stack";
import { RootStackParamList } from "../types";
import { Button } from "../components/Button";
import { BibleDatabaseError, Verse } from "../services/BibleDatabase";
import { useBibleDatabase } from "../context/BibleDatabaseContext";
import { VerseViewEnhanced } from "../components/VerseViewEnhanced";
import MatrixRN from "../components/MatrixRN";
import { Fonts } from "../utils/fonts";
import {
  useTheme,
  type ColorScheme,
  type Theme,
  type FontFamily,
} from "../context/ThemeContext";
import Footer from "../components/Footer";

type HomeScreenNavigationProp = StackNavigationProp<RootStackParamList, "Home">;

interface Props {
  navigation: HomeScreenNavigationProp;
}

const { width: screenWidth, height: screenHeight } = Dimensions.get("window");

// Primary colors for each scheme and theme
const primaryColors: Record<ColorScheme, { light: string; dark: string }> = {
  purple: { light: "#A855F7", dark: "#9333EA" },
  green: { light: "#10B981", dark: "#059669" },
  red: { light: "#EF4444", dark: "#DC2626" },
  yellow: { light: "#F59E0B", dark: "#D97706" },
};

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

export default function HomeScreen({ navigation }: Props) {
  // Theme
  const { theme, colorScheme, fontFamily } = useTheme();
  const themeColors = getThemeColors(theme, colorScheme);
  const actualFontFamily = getFontFamily(fontFamily);

  const {
    bibleDB,
    currentVersion,
    isInitializing,
    initializationError,
    retryInitialization,
  } = useBibleDatabase();

  const [verseRange, setVerseRange] = useState<Verse[] | null>(null);
  const [bookLongName, setBookLongName] = useState<string>("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isLandscape, setIsLandscape] = useState(screenWidth > screenHeight);

  useEffect(() => {
    if (bibleDB && !isInitializing) loadRandomVerse();
    else setLoading(true);
  }, [bibleDB, currentVersion, isInitializing]);

  useEffect(() => {
    const updateLayout = () => {
      const { width: newWidth, height: newHeight } = Dimensions.get("window");
      setIsLandscape(newWidth > newHeight);
    };

    updateLayout();
    const subscription = Dimensions.addEventListener("change", updateLayout);
    return () => subscription?.remove();
  }, []);

  useEffect(() => {
    const initializeApp = async () => {
      if (bibleDB && !isInitializing) {
        try {
          await loadRandomVerse();
        } catch (err) {
          console.error("Failed to load random verse:", err);
          setError("Failed to load content");
        }
      } else {
        setLoading(true);
      }
    };

    initializeApp();
  }, [bibleDB, currentVersion, isInitializing]);

  const getRandomBookChapter = async (): Promise<{
    bookId: number;
    chapter: number;
  }> => {
    if (!bibleDB) throw new Error("Database not available");
    try {
      const books = await bibleDB.getBooks();
      const randomBook = books[Math.floor(Math.random() * books.length)];
      const chapterCount = await bibleDB.getChapterCount(
        randomBook.book_number
      );
      const chapter =
        chapterCount > 0
          ? Math.floor(Math.random() * chapterCount) + 1
          : Math.floor(Math.random() * 50) + 1;
      return { bookId: randomBook.book_number, chapter };
    } catch {
      const popularBooks = [
        { id: 19, chapters: 150 },
        { id: 20, chapters: 31 },
        { id: 40, chapters: 28 },
        { id: 43, chapters: 21 },
        { id: 1, chapters: 50 },
      ];
      const book =
        popularBooks[Math.floor(Math.random() * popularBooks.length)];
      return {
        bookId: book.id,
        chapter: Math.floor(Math.random() * book.chapters) + 1,
      };
    }
  };

  const loadRandomVerse = async () => {
    if (!bibleDB) return setError("Database not available");
    try {
      setLoading(true);
      setError(null);

      const { bookId, chapter } = await getRandomBookChapter();
      const verses = await bibleDB.getVerses(bookId, chapter);

      if (verses.length === 0) {
        setError("Could not load a verse. Please try again.");
        return;
      }

      const startIndex = Math.floor(Math.random() * verses.length);
      const maxRange = Math.min(5, verses.length - startIndex);
      const rangeLength = Math.floor(Math.random() * maxRange) + 1;
      const range = verses.slice(startIndex, startIndex + rangeLength);
      setVerseRange(range);

      try {
        const bookInfo = await bibleDB.getBook(bookId);
        setBookLongName(
          bookInfo?.long_name ?? range[0].book_name ?? "Unknown Book"
        );
      } catch {
        setBookLongName(range[0].book_name ?? "Unknown Book");
      }
    } catch (err) {
      console.error("Failed to load random verse:", err);
      if (err instanceof BibleDatabaseError)
        setError(`Database error: ${err.message}`);
      else setError("Failed to load content. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const handleVersePress = (verse: Verse) => {
    navigation.navigate("VerseList", {
      book: {
        book_number: verse.book_number,
        short_name: verse.book_name ?? "Unknown",
        long_name: bookLongName || verse.book_name || "Unknown Book",
        book_color: verse.book_color || "#3B82F6",
      },
      chapter: verse.chapter,
    });
  };

  // Early returns (must be before main return)
  if (initializationError) {
    return (
      <View
        style={{
          flex: 1,
          justifyContent: "center",
          alignItems: "center",
          backgroundColor: themeColors.background,
          padding: 24,
        }}
      >
        <Text
          style={{
            fontSize: 18,
            color: themeColors.textSecondary,
            textAlign: "center",
            marginBottom: 16,
            fontFamily: actualFontFamily,
          }}
        >
          Database Error: {initializationError}
        </Text>
        <Text
          style={{
            fontSize: 14,
            color: themeColors.textMuted,
            textAlign: "center",
            marginBottom: 16,
            fontFamily: actualFontFamily,
          }}
        >
          This might take a moment on first launch
        </Text>
        <Button title="Retry Initialization" onPress={retryInitialization} />
      </View>
    );
  }

  if (loading || isInitializing || !bibleDB) {
    return (
      <View
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
            color: themeColors.textSecondary,
            marginTop: 16,
            fontFamily: actualFontFamily,
          }}
        >
          Loading Bible App...
        </Text>
        <Text
          style={{
            fontSize: 14,
            color: themeColors.textMuted,
            marginTop: 8,
            fontFamily: actualFontFamily,
          }}
        >
          Preparing your Bible database
        </Text>
      </View>
    );
  }

  if (error) {
    return (
      <View
        style={{
          flex: 1,
          justifyContent: "center",
          alignItems: "center",
          backgroundColor: themeColors.background,
          padding: 24,
        }}
      >
        <Text
          style={{
            fontSize: 18,
            color: themeColors.textSecondary,
            textAlign: "center",
            marginBottom: 16,
            fontFamily: actualFontFamily,
          }}
        >
          {error}
        </Text>
        <Button title="Try Again" onPress={loadRandomVerse} />
      </View>
    );
  }

  // Main render
  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: themeColors.background }}
      contentContainerStyle={{ padding: 16 }}
      showsVerticalScrollIndicator={false}
    >
      {/* Header */}
      <View style={{ alignItems: "center", marginBottom: 24 }}>
        <Image
          source={require("../assets/fohs-512x512.png")}
          style={{ width: 160, height: 160, marginBottom: 16, borderRadius: 8 }}
          resizeMode="contain"
        />
        <Text
          style={{
            fontSize: 30,
            color: themeColors.primary,
            textAlign: "center",
            padding: 8,
            width: "100%",
            fontFamily: Fonts.RubikGlitchRegular || actualFontFamily,
          }}
        >
          Bible App
        </Text>
        <Text
          style={{
            color: themeColors.textMuted,
            textAlign: "center",
            marginTop: 8,
            textTransform: "capitalize",
            fontSize: 20,
            fontFamily: Fonts.OswaldVariable || actualFontFamily,
          }}
        >
          Your daily source of Inspiration
        </Text>
      </View>

      {/* Verse of the Day */}
      <View style={{ marginBottom: 24 }}>
        <View
          style={{
            flexDirection: "row",
            justifyContent: "space-between",
            alignItems: "center",
            marginBottom: 16,
          }}
        >
          <View style={{ flex: 1 }}>
            <Text
              style={{
                fontSize: 18,
                fontWeight: "600",
                color: themeColors.textPrimary,
                fontFamily: actualFontFamily,
              }}
            >
              Fresh Revelations
            </Text>
            <Text
              style={{
                fontSize: 14,
                color: themeColors.textMuted,
                fontFamily: actualFontFamily,
              }}
            >
              Version: {currentVersion.replace(".sqlite3", "").toUpperCase()}
            </Text>
          </View>
          <TouchableOpacity
            onPress={loadRandomVerse}
            style={{
              backgroundColor: themeColors.primary,
              paddingHorizontal: 16,
              paddingVertical: 8,
              borderRadius: 8,
              marginLeft: 16,
            }}
          >
            <Text
              style={{
                color: "white",
                fontSize: 14,
                fontWeight: "500",
                fontFamily: actualFontFamily,
              }}
            >
              Refresh
            </Text>
          </TouchableOpacity>
        </View>

        <View style={{ marginRight: isLandscape ? 48 : 0 }}>
          {verseRange && verseRange.length > 0 && (
            <VerseViewEnhanced
              verses={verseRange}
              bookName={bookLongName}
              chapterNumber={verseRange[0].chapter}
              fontSize={16}
              onVersePress={handleVersePress}
            />
          )}
        </View>
      </View>

      {/* Daily Inspiration */}
      <View
        style={{
          padding: 16,
          marginBottom: 24,
          marginRight: isLandscape ? 48 : 0,
        }}
      >
        <Text
          style={{
            color: themeColors.primary,
            fontSize: 16,
            textAlign: "center",
            fontWeight: "500",
            fontFamily: actualFontFamily,
          }}
        >
          📖 Start your day with God's Word
        </Text>
      </View>

      {/* Main Actions */}
      <View
        style={{
          gap: 8,
          marginBottom: 24,
          marginRight: isLandscape ? 48 : 0,
        }}
      >
        <Button
          title="Read Bible"
          onPress={() => navigation.navigate("BookList")}
        />
        <Button
          title="Browse Books"
          onPress={() => navigation.navigate("BookList")}
          variant="outline"
        />
      </View>

      {/* Quick Tips */}
      {verseRange && verseRange.length > 0 && (
        <View
          style={{
            backgroundColor: themeColors.card,
            padding: 16,
            borderRadius: 8,
            borderWidth: 1,
            borderColor: themeColors.border,
            marginRight: isLandscape ? 48 : 0,
          }}
        >
          <Text
            style={{
              color: themeColors.textMuted,
              textAlign: "center",
              fontSize: 14,
              fontFamily: actualFontFamily,
            }}
          >
            ✨ Tap "Refresh" for fresh inspiration anytime
          </Text>
        </View>
      )}

      <View>
        <MatrixRN />
      </View>
      <Footer/>
    </ScrollView>
  );
}
