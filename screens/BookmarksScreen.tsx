import React, {
  useEffect,
  useContext,
  useState,
  useCallback,
  useRef,
} from "react";
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { StackNavigationProp } from "@react-navigation/stack";
import { RootStackParamList, Verse } from "../types";
import { VerseViewEnhanced } from "../components/VerseViewEnhanced";
import { useBibleDatabase } from "../context/BibleDatabaseContext";
import { BookmarksContext } from "../context/BookmarksContext";
import Ionicons from "react-native-vector-icons/Ionicons";

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

// Book color mapping for fallback colors
const BOOK_COLORS: { [key: string]: string } = {
  genesis: "#8B4513",
  exodus: "#FF8C00",
  leviticus: "#DC143C",
  numbers: "#32CD32",
  deuteronomy: "#1E90FF",
  joshua: "#FFD700",
  judges: "#8A2BE2",
  ruth: "#FF69B4",
  "1 samuel": "#4682B4",
  "2 samuel": "#5F9EA0",
  "1 kings": "#DA70D6",
  "2 kings": "#CD5C5C",
  "1 chronicles": "#F0E68C",
  "2 chronicles": "#90EE90",
  ezra: "#87CEEB",
  nehemiah: "#D2691E",
  esther: "#FF6347",
  job: "#40E0D0",
  psalms: "#FFA500",
  proverbs: "#9ACD32",
  ecclesiastes: "#808080",
  "song of solomon": "#FF1493",
  isaiah: "#4B0082",
  jeremiah: "#008000",
  lamentations: "#696969",
  ezekiel: "#8FBC8F",
  daniel: "#DAA520",
  hosea: "#FF4500",
  joel: "#2E8B57",
  amos: "#A0522D",
  obadiah: "#800000",
  jonah: "#FFDAB9",
  micah: "#778899",
  nahum: "#BDB76B",
  habakkuk: "#8B008B",
  zephaniah: "#FF00FF",
  haggai: "#DCDCDC",
  zechariah: "#F5DEB3",
  malachi: "#F4A460",
  matthew: "#0000FF",
  mark: "#FF0000",
  luke: "#008000",
  john: "#800080",
  acts: "#FFA500",
  romans: "#800000",
  "1 corinthians": "#808000",
  "2 corinthians": "#00FFFF",
  galatians: "#FF00FF",
  ephesians: "#C0C0C0",
  philippians: "#36454F",
  colossians: "#E6E6FA",
  "1 thessalonians": "#FFB6C1",
  "2 thessalonians": "#F0FFF0",
  "1 timothy": "#FFFACD",
  "2 timothy": "#ADD8E6",
  titus: "#F08080",
  philemon: "#E0FFFF",
  hebrews: "#FFA07A",
  james: "#20B2AA",
  "1 peter": "#FFE4B5",
  "2 peter": "#F5F5DC",
  "1 john": "#FF69B4",
  "2 john": "#CD853F",
  "3 john": "#FFEBCD",
  jude: "#DEB887",
  revelation: "#DC143C",
};

// Helper function to get book color with fallbacks
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
  const colors = [
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
  return colors[Math.abs(hash) % colors.length];
};

export default function BookmarksScreen({ navigation }: Props) {
  const { bibleDB, currentVersion } = useBibleDatabase();
  const { bookmarks, removeBookmark, loadBookmarks } =
    useContext(BookmarksContext);

  const [verseDetails, setVerseDetails] = useState<VerseDetailsState>({});
  const [loading, setLoading] = useState(true);
  const [bookLongNames, setBookLongNames] = useState<BookLongNamesState>({});

  // Refs to track previous values and prevent infinite loops
  const previousBookmarksRef = useRef<string>("");
  const isMountedRef = useRef(true);
  const initialLoadRef = useRef(false);

  // Generate a unique key for bookmarks to detect changes
  const getBookmarksKey = (bookmarks: ContextBookmark[]) => {
    return bookmarks
      .map((b) => b.id)
      .sort()
      .join(",");
  };

  // Fixed navigation handler
  const handleBookmarkPress = useCallback(
    (verse: Verse) => {
      const longName =
        bookLongNames[verse.book_number] || verse.book_name || "Unknown Book";

      const tabNavigator = navigation.getParent();
      if (tabNavigator) {
        tabNavigator.navigate("Bible", {
          screen: "Reader",
          params: {
            bookId: verse.book_number,
            chapter: verse.chapter,
            bookName: longName,
            verse: verse.verse,
          },
        });
      } else {
        navigation.navigate("Reader", {
          bookId: verse.book_number,
          chapter: verse.chapter,
          bookName: longName,
          verse: verse.verse,
        });
      }
    },
    [bookLongNames, navigation]
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
    navigation.navigate("Home");
  }, [navigation]);

  // FIXED: Load bookmarks on mount only once
  useEffect(() => {
    if (initialLoadRef.current) {
      return;
    }

    const fetchBookmarks = async () => {
      if (!bibleDB) {
        setLoading(false);
        return;
      }

      setLoading(true);
      try {
        await loadBookmarks();
        initialLoadRef.current = true;
      } catch (err) {
        console.error("Failed to load bookmarks:", err);
        Alert.alert("Error", "Failed to load bookmarks");
      } finally {
        if (isMountedRef.current) {
          setLoading(false);
        }
      }
    };

    fetchBookmarks();

    return () => {
      isMountedRef.current = false;
    };
  }, [bibleDB]);

  // FIXED: Load verse details only when bookmarks actually change
  useEffect(() => {
    if (!bibleDB || bookmarks.length === 0) {
      if (bookmarks.length === 0) {
        setVerseDetails({});
      }
      return;
    }

    const currentBookmarksKey = getBookmarksKey(bookmarks as ContextBookmark[]);

    if (currentBookmarksKey === previousBookmarksRef.current) {
      return;
    }

    previousBookmarksRef.current = currentBookmarksKey;

    const fetchVerseDetails = async () => {
      const details: VerseDetailsState = {};
      const names: BookLongNamesState = { ...bookLongNames };

      try {
        const batchSize = 5;
        for (let i = 0; i < bookmarks.length; i += batchSize) {
          const batch = bookmarks.slice(i, i + batchSize);

          const batchPromises = batch.map(async (bookmark) => {
            const contextBookmark = bookmark as ContextBookmark;
            try {
              const [verse, book] = await Promise.all([
                bibleDB.getVerse(
                  contextBookmark.book_number,
                  contextBookmark.chapter,
                  contextBookmark.verse
                ),
                !names[contextBookmark.book_number]
                  ? bibleDB.getBook(contextBookmark.book_number)
                  : Promise.resolve(null),
              ]);

              if (verse) {
                details[contextBookmark.id] = verse;
              }

              if (book && !names[contextBookmark.book_number]) {
                names[contextBookmark.book_number] =
                  book.long_name ?? "Unknown Book";
              }
            } catch (err) {
              console.error(`Failed to load verse ${contextBookmark.id}:`, err);
              names[contextBookmark.book_number] =
                names[contextBookmark.book_number] || "Unknown Book";
            }
          });

          await Promise.all(batchPromises);

          if (isMountedRef.current) {
            setVerseDetails((prev: VerseDetailsState) => ({
              ...prev,
              ...details,
            }));
            setBookLongNames((prev: BookLongNamesState) => ({
              ...prev,
              ...names,
            }));
          }
        }
      } catch (error) {
        console.error("Error fetching verse details:", error);
      }
    };

    fetchVerseDetails();
  }, [bookmarks, bibleDB]);

  // Render loading state
  const renderLoading = () => (
    <SafeAreaView className="flex-1 justify-center items-center bg-gray-50">
      <ActivityIndicator size="large" color="#3B82F6" />
      <Text className="text-lg text-gray-600 mt-4">Loading bookmarks...</Text>
      {currentVersion && (
        <Text className="text-sm text-gray-500 mt-2">
          {getVersionDisplayName(currentVersion)}
        </Text>
      )}
    </SafeAreaView>
  );

  // Render error state
  const renderError = () => (
    <SafeAreaView className="flex-1 justify-center items-center bg-gray-50 p-6">
      <Ionicons name="alert-circle-outline" size={48} color="#DC2626" />
      <Text className="text-lg text-red-600 text-center mb-4">
        Database not available
      </Text>
      <TouchableOpacity
        onPress={handleRetryLoad}
        className="bg-blue-500 px-4 py-3 rounded-lg flex-row items-center"
      >
        <Ionicons name="refresh" size={20} color="white" />
        <Text className="text-white font-semibold ml-2">Try Again</Text>
      </TouchableOpacity>
    </SafeAreaView>
  );

  // Render empty state
  const renderEmptyState = () => (
    <View className="flex-1 justify-center items-center py-16">
      <Ionicons name="bookmark-outline" size={64} color="#9CA3AF" />
      <Text className="text-lg text-gray-600 text-center mb-2 mt-4">
        No bookmarks yet
      </Text>
      <Text className="text-gray-500 text-center mb-6 px-8">
        Save your favorite verses to access them quickly
      </Text>
      <TouchableOpacity
        onPress={handleGoToBible}
        className="bg-blue-500 px-6 py-3 rounded-lg flex-row items-center"
      >
        <Ionicons name="book" size={18} color="white" />
        <Text className="text-white font-semibold ml-2">
          Go to Bible Reader
        </Text>
      </TouchableOpacity>
    </View>
  );

  // UPDATED: Simplified bookmark item that works with the new VerseViewEnhanced
  const renderBookmarkItem = (bookmark: ContextBookmark, index: number) => {
    const verse = verseDetails[bookmark.id];
    const longName =
      verse && bookLongNames[verse.book_number]
        ? bookLongNames[verse.book_number]
        : verse?.book_name || "Unknown Book";

    if (!verse) {
      return (
        <View
          key={bookmark.id}
          className="bg-white rounded-xl shadow-sm overflow-hidden border border-gray-100 mb-4"
        >
          <View className="bg-blue-50 px-4 py-2 flex-row items-center justify-between">
            <View className="flex-row items-center flex-1">
              <Ionicons name="bookmark" size={16} color="#3B82F6" />
              <Text className="text-blue-800 font-medium ml-2">Loading...</Text>
            </View>
          </View>
          <View className="p-4">
            <ActivityIndicator size="small" color="#3B82F6" />
          </View>
        </View>
      );
    }

    const bookColor = getBookColor(longName, verse);

    return (
      <View
        key={bookmark.id}
        className="bg-white rounded-xl shadow-sm overflow-hidden border border-gray-100 mb-8"
      >
        {/* SIMPLIFIED: Just the VerseViewEnhanced with book color */}
        <VerseViewEnhanced
          verses={[verse]}
          bookName={longName}
          chapterNumber={verse.chapter}
          showVerseNumbers={true}
          fontSize={16}
          onVersePress={() => handleBookmarkPress(verse)}
          highlight={verse.verse.toString()}
          compact={true}
          bookColor={bookColor}
        />

        {/* UPDATED: Simplified footer with only essential actions */}
        <View className="flex-row items-center justify-between px-4 py-3 border-t border-gray-100 bg-gray-50">
          <View className="flex-row items-center">
            <Ionicons name="time-outline" size={14} color="#6B7280" />
            <Text className="text-gray-500 text-xs ml-1">
              {formatDate(bookmark.createdAt)}
            </Text>
          </View>

          <View className="flex-row items-center space-x-2 gap-2">
            <TouchableOpacity
              onPress={() => handleDeleteBookmark(bookmark.id)}
              className="flex-row items-center bg-red-50 px-3 py-1 rounded-full border border-red-200"
            >
              <Ionicons name="trash-outline" size={12} color="#EF4444" />
              <Text className="text-red-600 text-xs font-medium ml-1">
                Delete
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              onPress={() => handleBookmarkPress(verse)}
              className="flex-row items-center bg-blue-500 px-3 py-1 rounded-full"
            >
              <Ionicons name="navigate" size={12} color="white" />
              <Text className="text-white text-xs font-medium ml-1">Read</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    );
  };

  // Render bookmarks list
  const renderBookmarksList = () => (
    <View className="space-y-4 mb-40">
      {(bookmarks as unknown as ContextBookmark[]).map(renderBookmarkItem)}
    </View>
  );

  // Helper functions
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

  // Main render conditions
  if (loading) {
    return renderLoading();
  }

  if (!bibleDB) {
    return renderError();
  }

  return (
    <SafeAreaView className="flex-1 bg-gray-50 min-h-screen">
      {/* Header */}
      <View className="bg-white py-4 shadow-sm -mt-14">
        <View className="flex-row items-center justify-center mb-1">
          <Ionicons name="bookmark" size={20} color="#3B82F6" />
          <Text className="text-gray-800 text-lg font-semibold ml-2">
            My Bookmarks
          </Text>
        </View>
        <Text className="text-gray-600 text-center">
          {bookmarks.length} saved verse{bookmarks.length !== 1 ? "s" : ""}
        </Text>
        {currentVersion && (
          <Text className="text-sm text-gray-500 text-center">
            {getVersionDisplayName(currentVersion)} Version
          </Text>
        )}
      </View>

      {/* Bookmarks List */}
      <ScrollView
        className="flex-1 p-4"
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 20 }}
      >
        {bookmarks.length === 0 ? renderEmptyState() : renderBookmarksList()}
      </ScrollView>
    </SafeAreaView>
  );
}
