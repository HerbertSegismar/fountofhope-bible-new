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
  type FontFamily,
} from "../context/ThemeContext";
import Footer from "../components/Footer";
import { getBookInfo } from "../utils/testamentUtils";
import { SafeAreaView } from "react-native-safe-area-context";
import { getThemeColors } from "../utils/themeUtils";

type HomeScreenNavigationProp = StackNavigationProp<RootStackParamList, "Home">;

interface Props {
  navigation: HomeScreenNavigationProp;
}

const { width: screenWidth, height: screenHeight } = Dimensions.get("window");

const primaryColors: Record<ColorScheme, { light: string; dark: string }> = {
  purple: { light: "#A855F7", dark: "#9333EA" },
  green: { light: "#10B981", dark: "#059669" },
  red: { light: "#EF4444", dark: "#DC2626" },
  yellow: { light: "#F59E0B", dark: "#D97706" },
  custom: { light: "#A855F7", dark: "#9333EA" },
};

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
  const { theme, colorScheme, fontFamily, customColor } = useTheme();
  const themeColors = getThemeColors(theme, colorScheme, customColor);

  if (colorScheme === "custom" && customColor) {
    primaryColors.custom.light = customColor;
    primaryColors.custom.dark = customColor;
  }

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
  const [_isLandscape, setIsLandscape] = useState(screenWidth > screenHeight);

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

      const bookInfo = getBookInfo(bookId);
      setBookLongName(bookInfo?.long || "Unknown Book");
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
    const bookInfo = getBookInfo(verse.book_number);
    navigation.navigate("Reader", {
      bookId: verse.book_number,
      chapter: verse.chapter,
      bookName: bookInfo?.long || bookLongName || "Unknown Book",
      verse: verse.verse,
    });
  };

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

  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: themeColors.background }}
      contentContainerStyle={{ padding: 16 }}
      showsVerticalScrollIndicator={false}
    >
      <SafeAreaView style={{ alignItems: "center", marginBottom: 24 }}>
        <Text
          style={{
            fontSize: 25,
            color: themeColors.primary,
            textAlign: "center",
            padding: 8,
            width: "100%",
            fontFamily: Fonts.RubikGlitchRegular || actualFontFamily,
          }}
        >
          Fount of Hope
        </Text>
        <Image
          source={require("../assets/images/fohs-512x512.png")}
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
      </SafeAreaView>

      <SafeAreaView style={{ marginBottom: 24 }}>
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

        <View>
          {verseRange && verseRange.length > 0 && (
            <VerseViewEnhanced
              verses={verseRange}
              bookName={bookLongName}
              bookNumber={verseRange[0].book_number}
              chapterNumber={verseRange[0].chapter}
              fontSize={16}
              onVersePress={handleVersePress}
            />
          )}
        </View>
      </SafeAreaView>

      <View
        style={{
          padding: 10,
          margin: 20,
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

      <SafeAreaView
        style={{
          gap: 8,
          marginBottom: 24,
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
      </SafeAreaView>

      {verseRange && verseRange.length > 0 && (
        <SafeAreaView>
          <View
            style={{
              backgroundColor: themeColors.card,
              padding: 16,
              borderRadius: 8,
              borderWidth: 1,
              borderColor: themeColors.border,
            }}
          >
            <Text
              style={{
                color: themeColors.textMuted,
                textAlign: "center",
                fontSize: 16,
                fontFamily: actualFontFamily,
              }}
            >
              ✨ Tap "Refresh" for fresh inspiration anytime
            </Text>
          </View>
        </SafeAreaView>
      )}

      <SafeAreaView>
        <MatrixRN />
      </SafeAreaView>
      <Footer />
    </ScrollView>
  );
}
