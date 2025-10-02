import React, { useEffect, useContext, useState } from "react";
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

type BookmarksScreenNavigationProp = StackNavigationProp<
  RootStackParamList,
  "Bookmarks"
>;

interface Props {
  navigation: BookmarksScreenNavigationProp;
}

export default function BookmarksScreen({ navigation }: Props) {
  const { bibleDB, currentVersion } = useBibleDatabase();
  const { bookmarks, removeBookmark, loadBookmarks } =
    useContext(BookmarksContext);

  const [verseDetails, setVerseDetails] = useState<{ [key: string]: Verse }>(
    {}
  );
  const [loading, setLoading] = useState(true);
  const [bookLongNames, setBookLongNames] = useState<Record<number, string>>(
    {}
  );

  // Load bookmarks once when screen mounts or database changes
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
        console.error(err);
        Alert.alert("Error", "Failed to load bookmarks");
      } finally {
        setLoading(false);
      }
    };
    fetchBookmarks();
  }, [bibleDB]);

  // Load verse details whenever bookmarks change
  useEffect(() => {
    const fetchVerseDetails = async () => {
      if (!bibleDB || bookmarks.length === 0) {
        setVerseDetails({});
        return;
      }

      const details: { [key: string]: Verse } = {};
      const names: Record<number, string> = { ...bookLongNames };

      for (const bookmark of bookmarks) {
        try {
          const verse = await bibleDB.getVerse(
            bookmark.book_number,
            bookmark.chapter,
            bookmark.verse
          );
          if (verse) details[bookmark.id] = verse;

          // Fetch long name if missing
          if (!names[bookmark.book_number]) {
            const book = await bibleDB.getBook(bookmark.book_number);
            names[bookmark.book_number] = book?.long_name ?? "Unknown Book";
          }
        } catch (err) {
          console.error(`Failed to load verse ${bookmark.id}:`, err);
          names[bookmark.book_number] =
            names[bookmark.book_number] || "Unknown Book";
        }
      }

      setVerseDetails(details);
      setBookLongNames(names);
    };

    fetchVerseDetails();
  }, [bookmarks, bibleDB]);

  const handleBookmarkPress = (verse: Verse) => {
    const longName =
      bookLongNames[verse.book_number] || verse.book_name || "Unknown Book";
    const tabNavigation = navigation.getParent();
    tabNavigation?.navigate("Bible", {
      screen: "Reader",
      params: {
        bookId: verse.book_number,
        chapter: verse.chapter,
        bookName: longName,
      },
    });
  };

  const handleDeleteBookmark = (bookmarkId: string) => {
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
  };

  if (loading) {
    return (
      <SafeAreaView className="flex-1 justify-center items-center bg-gray-50">
        <ActivityIndicator size="large" color="#3B82F6" />
        <Text className="text-lg text-gray-600 mt-4">Loading bookmarks...</Text>
        {currentVersion && (
          <Text className="text-sm text-gray-500 mt-2">
            {currentVersion.replace(".sqlite3", "").toUpperCase()}
          </Text>
        )}
      </SafeAreaView>
    );
  }

  if (!bibleDB) {
    return (
      <SafeAreaView className="flex-1 justify-center items-center bg-gray-50 p-6">
        <Text className="text-lg text-red-600 text-center mb-4">
          Database not available
        </Text>
        <TouchableOpacity
          onPress={loadBookmarks}
          className="bg-blue-500 px-4 py-3 rounded-lg"
        >
          <Text className="text-white font-semibold">Try Again</Text>
        </TouchableOpacity>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView className="flex-1 bg-gray-50 -top-10">
      {/* Header */}
      <View className="shadow-sm mb-2">
        <Text className="text-gray-600 text-center">
          {bookmarks.length} saved verse{bookmarks.length !== 1 ? "s" : ""}
        </Text>
        {currentVersion && (
          <Text className="text-sm text-gray-500 text-center">
            {currentVersion.replace(".sqlite3", "").toUpperCase()} Version
          </Text>
        )}
      </View>

      {/* Bookmarks List */}
      <ScrollView className="flex-1 p-4" showsVerticalScrollIndicator={false}>
        {bookmarks.length === 0 ? (
          <View className="flex-1 justify-center items-center py-16">
            <Text className="text-lg text-gray-600 text-center mb-4">
              No bookmarks yet
            </Text>
            <Text className="text-gray-500 text-center mb-6">
              Save your favorite verses to access them quickly
            </Text>
          </View>
        ) : (
          <View className="space-y-4">
            {bookmarks.map((bookmark) => {
              const verse = verseDetails[bookmark.id];
              const longName =
                verse && bookLongNames[verse.book_number]
                  ? bookLongNames[verse.book_number]
                  : verse?.book_name || "Unknown Book";

              return (
                <View
                  key={bookmark.id}
                  className="bg-blue-100 rounded-lg shadow-sm overflow-hidden p-4 mb-4"
                >
                  <TouchableOpacity
                    onPress={() => verse && handleBookmarkPress(verse)}
                    activeOpacity={0.7}
                  >
                    {verse && (
                      <VerseViewEnhanced
                        verses={[verse]}
                        bookName={longName}
                        chapterNumber={verse.chapter}
                        showVerseNumbers
                        fontSize={16}
                        onVersePress={() => handleBookmarkPress(verse)}
                      />
                    )}
                    <Text className="text-gray-500 text-xs mt-2">
                      Saved on{" "}
                      {new Date(bookmark.createdAt).toLocaleDateString()}
                    </Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    onPress={() => handleDeleteBookmark(bookmark.id)}
                    className="mt-2"
                  >
                    <Text className="text-red-500 font-medium text-base">
                      Delete
                    </Text>
                  </TouchableOpacity>
                </View>
              );
            })}
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}
