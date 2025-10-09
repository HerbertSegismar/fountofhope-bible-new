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
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { StackNavigationProp } from "@react-navigation/stack";
import { RootStackParamList, Verse } from "../types";
import { VerseViewEnhanced } from "../components/VerseViewEnhanced";
import { useBibleDatabase } from "../context/BibleDatabaseContext";
import { BookmarksContext } from "../context/BookmarksContext";
import Ionicons from "react-native-vector-icons/Ionicons";
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

  // // Event handlers
  // const handleBookmarkPress = useCallback(
  //   (verse: Verse) => {
  //     const longName =
  //       bookLongNames[verse.book_number] || verse.book_name || "Unknown Book";

  //     navigation.navigate("Reader", {
  //       bookId: verse.book_number,
  //       chapter: verse.chapter,
  //       bookName: longName,
  //       verse: verse.verse,
  //     });
  //   },
  //   [bookLongNames, navigation]
  // );

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
            className="bg-white rounded-xl shadow-sm overflow-hidden border border-gray-100 mb-4"
          >
            <View className="bg-blue-50 px-4 py-2 flex-row items-center justify-between">
              <View className="flex-row items-center flex-1">
                <Ionicons name="bookmark" size={16} color="#3B82F6" />
                <Text className="text-blue-800 font-medium ml-2">
                  Loading...
                </Text>
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
                <Text className="text-white text-xs font-medium ml-1">
                  Read
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      );
    },
    [verseDetails, bookLongNames, handleBookmarkPress, handleDeleteBookmark]
  );

  const renderBookmarksList = () => (
    <View className="space-y-4 mb-40">
      {sortedBookmarks.map(renderBookmarkItem)}
    </View>
  );

  const renderHeader = () => (
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
  );

  // Main render
  if (loading) {
    return renderLoading();
  }

  if (!bibleDB) {
    return renderError();
  }

  return (
    <SafeAreaView className="flex-1 bg-gray-50 min-h-screen">
      {renderHeader()}

      <ScrollView
        className="flex-1 p-4"
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 20 }}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={handleRefresh}
            colors={["#3B82F6"]}
            tintColor="#3B82F6"
          />
        }
      >
        {bookmarks.length === 0 ? renderEmptyState() : renderBookmarksList()}
      </ScrollView>
    </SafeAreaView>
  );
}
