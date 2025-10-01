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
      for (const bookmark of bookmarks) {
        try {
          const verse = await bibleDB.getVerse(
            bookmark.book_number,
            bookmark.chapter,
            bookmark.verse
          );
          if (verse) details[bookmark.id] = verse;
        } catch (err) {
          console.error(`Failed to load verse ${bookmark.id}:`, err);
        }
      }
      setVerseDetails(details);
    };
    fetchVerseDetails();
  }, [bookmarks, bibleDB]);

  const handleBookmarkPress = (bookmark: (typeof bookmarks)[0]) => {
    const verse = verseDetails[bookmark.id];
    navigation.navigate("Reader", {
      bookId: bookmark.book_number,
      chapter: bookmark.chapter,
      bookName: verse?.book_name || "Unknown Book",
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
    <SafeAreaView className="flex-1 bg-gray-50">
      {/* Header */}
      <View className="bg-white p-6 shadow-sm">
        <Text className="text-2xl font-bold text-primary text-center">
          My Bookmarks
        </Text>
        <Text className="text-gray-600 text-center mt-1">
          {bookmarks.length} saved verse{bookmarks.length !== 1 ? "s" : ""}
        </Text>
        {currentVersion && (
          <Text className="text-sm text-gray-500 text-center mt-1">
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
              return (
                <View
                  key={bookmark.id}
                  className="bg-blue-100 rounded-lg shadow-sm overflow-hidden p-4 mb-4"
                >
                  <TouchableOpacity
                    onPress={() => handleBookmarkPress(bookmark)}
                    activeOpacity={0.7}
                  >
                    {verse && (
                      <VerseViewEnhanced
                        verses={[verse]}
                        bookName={verse.book_name || "Unknown Book"}
                        chapterNumber={verse.chapter}
                        showVerseNumbers
                        fontSize={16}
                        onVersePress={() => handleBookmarkPress(bookmark)}
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

      {/* Refresh Button */}
      {bookmarks.length > 0 && (
        <TouchableOpacity
          className="absolute bottom-6 left-6 bg-gray-600 w-14 h-14 rounded-full justify-center items-center shadow-lg"
          onPress={loadBookmarks}
          activeOpacity={0.8}
        >
          <Text className="text-white text-lg font-bold">↻</Text>
        </TouchableOpacity>
      )}
    </SafeAreaView>
  );
}
