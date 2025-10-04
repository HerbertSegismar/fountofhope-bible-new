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

  // Generate a unique key for bookmarks to detect changes
  const getBookmarksKey = (bookmarks: ContextBookmark[]) => {
    return bookmarks
      .map((b) => b.id)
      .sort()
      .join(",");
  };

  // Fixed navigation handler - use the tab navigator directly
  const handleBookmarkPress = useCallback(
    (verse: Verse) => {
      const longName =
        bookLongNames[verse.book_number] || verse.book_name || "Unknown Book";

      // Get the parent tab navigator and navigate to Bible tab with Reader screen
      const tabNavigator = navigation.getParent();
      if (tabNavigator) {
        // Navigate to Bible tab and then to Reader screen
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
        // Fallback: navigate directly to Reader if we can't get tab navigator
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
    loadBookmarks();
  }, [loadBookmarks]);

  const handleGoToBible = useCallback(() => {
    // Navigate to Home screen which is in the Bible tab stack
    navigation.navigate("Home");
  }, [navigation]);

  // Load bookmarks on mount only
  useEffect(() => {
    const fetchBookmarks = async () => {
      if (!bibleDB) {
        setLoading(false);
        return;
      }

      setLoading(true);
      try {
        await loadBookmarks();
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

  // Load verse details only when bookmarks actually change
  useEffect(() => {
    if (!bibleDB || bookmarks.length === 0) {
      setVerseDetails({});
      return;
    }

    const currentBookmarksKey = getBookmarksKey(bookmarks as ContextBookmark[]);

    // Only fetch if bookmarks actually changed
    if (currentBookmarksKey === previousBookmarksRef.current) {
      return;
    }

    previousBookmarksRef.current = currentBookmarksKey;

    const fetchVerseDetails = async () => {
      const details: VerseDetailsState = {};
      const names: BookLongNamesState = { ...bookLongNames };

      try {
        // Process bookmarks in batches to avoid overwhelming the system
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

          // Update state progressively to show progress
          if (isMountedRef.current) {
            setVerseDetails((prev) => ({ ...prev, ...details }));
            setBookLongNames((prev) => ({ ...prev, ...names }));
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

  // Render bookmark item
  const renderBookmarkItem = (bookmark: ContextBookmark, index: number) => {
    const verse = verseDetails[bookmark.id];
    const longName =
      verse && bookLongNames[verse.book_number]
        ? bookLongNames[verse.book_number]
        : verse?.book_name || "Unknown Book";

    if (!verse) {
      // Show loading state for individual bookmark
      return (
        <View
          key={bookmark.id}
          className="bg-white rounded-xl shadow-sm overflow-hidden border border-gray-100"
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

    return (
      <View
        key={bookmark.id}
        className="bg-white rounded-xl shadow-sm overflow-hidden border border-gray-100 mb-2"
      >
        {/* Bookmark Header */}
        <View className="bg-blue-50 px-4 py-2 flex-row items-center justify-between">
          <TouchableOpacity
            onPress={() => handleBookmarkPress(verse)}
            className="flex-row items-center flex-1"
            activeOpacity={0.7}
          >
            <Ionicons name="bookmark" size={16} color="#3B82F6" />
            <Text className="text-blue-800 font-medium ml-2">
              {longName} {verse.chapter}:{verse.verse}
            </Text>
            <Ionicons
              name="open-outline"
              size={14}
              color="#3B82F6"
              className="ml-2"
            />
          </TouchableOpacity>

          <TouchableOpacity
            onPress={() => handleDeleteBookmark(bookmark.id)}
            className="p-2"
          >
            <Ionicons name="trash-outline" size={18} color="#EF4444" />
          </TouchableOpacity>
        </View>

        {/* Verse Content */}
        <View className="p-4">
          <VerseViewEnhanced
            verses={[verse]}
            bookName={longName}
            chapterNumber={verse.chapter}
            showVerseNumbers
            fontSize={16}
            onVersePress={() => handleBookmarkPress(verse)}
            highlight={verse.verse.toString()}
          />

          {/* Footer with timestamp */}
          <View className="flex-row items-center justify-between mt-3 pt-3 border-t border-gray-100">
            <View className="flex-row items-center">
              <Ionicons name="time-outline" size={14} color="#6B7280" />
              <Text className="text-gray-500 text-xs ml-1">
                Saved {formatDate(bookmark.createdAt)}
              </Text>
            </View>

            <TouchableOpacity
              onPress={() => handleBookmarkPress(verse)}
              className="flex-row items-center bg-blue-500 px-3 py-1 rounded-full"
            >
              <Ionicons name="navigate" size={12} color="white" />
              <Text className="text-white text-xs font-medium ml-1">
                Go to Verse
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    );
  };

  // Render bookmarks list
  const renderBookmarksList = () => (
    <View className="space-y-3">
      {(bookmarks as unknown as ContextBookmark[]).map(renderBookmarkItem)}
    </View>
  );

  // Helper functions
  const getVersionDisplayName = (version: string): string => {
    return version.replace(".sqlite3", "").toUpperCase();
  };

  const formatDate = (dateString: string): string => {
    return new Date(dateString).toLocaleDateString();
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
      <ScrollView className="flex-1 p-4 mb-48" showsVerticalScrollIndicator={false}>
        {bookmarks.length === 0 ? renderEmptyState() : renderBookmarksList()}
      </ScrollView>
    </SafeAreaView>
  );
}
