import React, { useEffect, useState } from "react";
import {
  Text,
  ScrollView,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { StackNavigationProp } from "@react-navigation/stack";
import { RootStackParamList, Verse } from "../types";
import { bibleDB } from "../lib/database";
import { VerseCard } from "../components/VerseCard";

type BookmarksScreenNavigationProp = StackNavigationProp<
  RootStackParamList,
  "Bookmarks"
>;

interface Props {
  navigation: BookmarksScreenNavigationProp;
}

interface Bookmark {
  id: string;
  bookNumber: number;
  chapter: number;
  verse: number;
  title: string;
  note?: string;
  createdAt: Date;
  color?: string;
}

export default function BookmarksScreen({ navigation }: Props) {
  const [bookmarks, setBookmarks] = useState<Bookmark[]>([]);
  const [verseDetails, setVerseDetails] = useState<{ [key: string]: Verse }>(
    {}
  );
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadBookmarks();
  }, []);

  // Mock function - replace with actual bookmark storage
  const loadBookmarks = async () => {
    try {
      setLoading(true);

      // For now, create some mock bookmarks
      const mockBookmarks: Bookmark[] = [
        {
          id: "1",
          bookNumber: 43, // John
          chapter: 3,
          verse: 16,
          title: "Favorite Verse",
          note: "God's love for the world",
          createdAt: new Date(),
          color: "#FF6B6B",
        },
        {
          id: "2",
          bookNumber: 19, // Psalm
          chapter: 23,
          verse: 1,
          title: "Comforting Verse",
          note: "The Lord is my shepherd",
          createdAt: new Date(),
          color: "#4ECDC4",
        },
        {
          id: "3",
          bookNumber: 40, // Matthew
          chapter: 5,
          verse: 16,
          title: "Light of the World",
          note: "Let your light shine",
          createdAt: new Date(),
          color: "#45B7D1",
        },
      ];

      setBookmarks(mockBookmarks);
      await loadVerseDetails(mockBookmarks);
    } catch (error) {
      console.error("Failed to load bookmarks:", error);
      Alert.alert("Error", "Failed to load bookmarks");
    } finally {
      setLoading(false);
    }
  };

  const loadVerseDetails = async (bookmarks: Bookmark[]) => {
    try {
      const details: { [key: string]: Verse } = {};

      for (const bookmark of bookmarks) {
        try {
          const verse = await bibleDB.getVerse(
            bookmark.bookNumber,
            bookmark.chapter,
            bookmark.verse
          );
          if (verse) {
            details[bookmark.id] = verse;
          }
        } catch (error) {
          console.error(
            `Failed to load verse for bookmark ${bookmark.id}:`,
            error
          );
        }
      }

      setVerseDetails(details);
    } catch (error) {
      console.error("Failed to load verse details:", error);
    }
  };

  const handleBookmarkPress = (bookmark: Bookmark) => {
    navigation.navigate("Reader", {
      bookId: bookmark.bookNumber,
      chapter: bookmark.chapter,
      bookName: verseDetails[bookmark.id]?.book_name || "Unknown Book",
    });
  };

  const handleAddBookmark = () => {
    Alert.alert("Add Bookmark", "This feature will be available soon!");
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
          onPress: () => {
            // Remove from local state
            setBookmarks((prev) => prev.filter((b) => b.id !== bookmarkId));
            // In a real app, you'd also remove from storage
          },
        },
      ]
    );
  };

  if (loading) {
    return (
      <SafeAreaView className="flex-1 bg-gray-50 justify-center items-center">
        <ActivityIndicator size="large" color="#3B82F6" />
        <Text className="text-lg text-gray-600 mt-4">Loading bookmarks...</Text>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView className="flex-1 bg-gray-50">
      {/* Header */}
      <SafeAreaView className="bg-white p-6 shadow-sm">
        <Text className="text-2xl font-bold text-primary text-center">
          My Bookmarks
        </Text>
        <Text className="text-gray-600 text-center mt-1">
          {bookmarks.length} saved verse{bookmarks.length !== 1 ? "s" : ""}
        </Text>
      </SafeAreaView>

      {/* Bookmarks List */}
      <ScrollView className="flex-1 p-4">
        {bookmarks.length === 0 ? (
          <SafeAreaView className="flex-1 justify-center items-center py-16">
            <Text className="text-lg text-gray-600 text-center mb-4">
              No bookmarks yet
            </Text>
            <Text className="text-gray-500 text-center mb-6">
              Save your favorite verses to access them quickly
            </Text>
            <TouchableOpacity
              className="bg-primary px-6 py-3 rounded-lg"
              onPress={handleAddBookmark}
            >
              <Text className="text-white font-semibold">Add Bookmark</Text>
            </TouchableOpacity>
          </SafeAreaView>
        ) : (
          <SafeAreaView className="space-y-4">
            {bookmarks.map((bookmark) => {
              const verse = verseDetails[bookmark.id];
              return (
                <SafeAreaView
                  key={bookmark.id}
                  className="bg-white rounded-lg shadow-sm overflow-hidden"
                >
                  {/* Bookmark Header */}
                  <SafeAreaView
                    className="p-3 border-b border-gray-100"
                    style={{ backgroundColor: bookmark.color + "20" }} // 20% opacity
                  >
                    <SafeAreaView className="flex-row justify-between items-center">
                      <Text
                        className="font-semibold"
                        style={{ color: bookmark.color }}
                      >
                        {bookmark.title}
                      </Text>
                      <TouchableOpacity
                        onPress={() => handleDeleteBookmark(bookmark.id)}
                        className="p-1"
                      >
                        <Text className="text-red-500 text-xs">Delete</Text>
                      </TouchableOpacity>
                    </SafeAreaView>
                    {bookmark.note && (
                      <Text className="text-gray-600 text-sm mt-1">
                        {bookmark.note}
                      </Text>
                    )}
                    <Text className="text-gray-500 text-xs mt-1">
                      Saved on {bookmark.createdAt.toLocaleDateString()}
                    </Text>
                  </SafeAreaView>

                  {/* Verse Content */}
                  <TouchableOpacity
                    onPress={() => handleBookmarkPress(bookmark)}
                  >
                    {verse ? (
                      <VerseCard verse={verse} showReference={true} />
                    ) : (
                      <SafeAreaView className="p-4">
                        <Text className="text-gray-600">
                          Loading verse {bookmark.bookNumber}:{bookmark.chapter}
                          :{bookmark.verse}...
                        </Text>
                      </SafeAreaView>
                    )}
                  </TouchableOpacity>
                </SafeAreaView>
              );
            })}
          </SafeAreaView>
        )}
      </ScrollView>

      {/* Add Bookmark FAB */}
      {bookmarks.length > 0 && (
        <TouchableOpacity
          className="absolute bottom-6 right-6 bg-primary w-14 h-14 rounded-full justify-center items-center shadow-lg"
          onPress={handleAddBookmark}
        >
          <Text className="text-white text-2xl font-bold">+</Text>
        </TouchableOpacity>
      )}
    </SafeAreaView>
  );
}
