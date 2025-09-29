import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
} from "react-native";
import { StackNavigationProp } from "@react-navigation/stack";
import { RootStackParamList } from "../types";
import { Button } from "../components/Button";
import { BibleDatabaseError, Verse, Book } from "../services/BibleDatabase";
import { useBibleDatabase } from "../context/BibleDatabaseContext";

type HomeScreenNavigationProp = StackNavigationProp<RootStackParamList, "Home">;

interface Props {
  navigation: HomeScreenNavigationProp;
}

export default function HomeScreen({ navigation }: Props) {
  const { bibleDB, currentVersion, isInitializing } = useBibleDatabase();

  const [verseOfTheDay, setVerseOfTheDay] = useState<Verse | null>(null);
  const [bookLongName, setBookLongName] = useState<string>("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (bibleDB && !isInitializing) {
      loadRandomVerse();
    } else {
      // While DB is loading, show loading spinner
      setLoading(true);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [bibleDB, currentVersion, isInitializing]);

  const getRandomBookChapter = async (): Promise<{
    bookId: number;
    chapter: number;
  }> => {
    if (!bibleDB) {
      throw new Error("Database not available");
    }

    try {
      const books = await bibleDB.getBooks();
      if (books.length === 0) throw new Error("No books found");

      const randomBook = books[Math.floor(Math.random() * books.length)];
      const chapterCount = await bibleDB.getChapterCount(
        randomBook.book_number
      );

      const chapter =
        chapterCount > 0
          ? Math.floor(Math.random() * chapterCount) + 1
          : Math.floor(Math.random() * 50) + 1;

      return { bookId: randomBook.book_number, chapter };
    } catch (err) {
      console.warn("Error getting random book/chapter:", err);

      // Fallback popular books
      const popularBooks = [
        { id: 19, chapters: 150 }, // Psalms
        { id: 20, chapters: 31 }, // Proverbs
        { id: 40, chapters: 28 }, // Matthew
        { id: 43, chapters: 21 }, // John
        { id: 1, chapters: 50 }, // Genesis
      ];

      const book =
        popularBooks[Math.floor(Math.random() * popularBooks.length)];
      const chapter = Math.floor(Math.random() * book.chapters) + 1;

      return { bookId: book.id, chapter };
    }
  };

  const loadRandomVerse = async () => {
    if (!bibleDB) {
      setError("Database not available");
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError(null);

      const { bookId, chapter } = await getRandomBookChapter();
      const verses = await bibleDB.getVerses(bookId, chapter);

      if (verses.length === 0) {
        setError("Could not load a verse. Please try again.");
        setLoading(false);
        return;
      }

      const randomVerse = verses[Math.floor(Math.random() * verses.length)];
      setVerseOfTheDay(randomVerse);

      try {
        const bookInfo = await bibleDB.getBook(bookId);
        setBookLongName(
          bookInfo?.long_name ?? randomVerse.book_name ?? "Unknown Book"
        );
      } catch {
        setBookLongName(randomVerse.book_name ?? "Unknown Book");
      }
    } catch (err) {
      console.error("Failed to load random verse:", err);
      if (err instanceof BibleDatabaseError) {
        setError(`Database error: ${err.message}`);
      } else {
        setError("Failed to load content. Please try again.");
      }
    } finally {
      setLoading(false);
    }
  };

  const handleVersePress = async () => {
    if (!verseOfTheDay || !bibleDB) return;

    try {
      const bookInfo = await bibleDB.getBook(verseOfTheDay.book_number);

      navigation.navigate("VerseList", {
        book: bookInfo ?? {
          book_number: verseOfTheDay.book_number,
          short_name: verseOfTheDay.book_name ?? "Unknown",
          long_name: bookLongName || verseOfTheDay.book_name || "Unknown Book",
          book_color: verseOfTheDay.book_color || "#3B82F6",
        },
        chapter: verseOfTheDay.chapter,
      });
    } catch {
      navigation.navigate("VerseList", {
        book: {
          book_number: verseOfTheDay.book_number,
          short_name: verseOfTheDay.book_name ?? "Unknown",
          long_name: bookLongName || verseOfTheDay.book_name || "Unknown Book",
          book_color: verseOfTheDay.book_color || "#3B82F6",
        },
        chapter: verseOfTheDay.chapter,
      });
    }
  };

  const cleanVerseText = (text: string) => {
    if (!text) return "";
    return text
      .replace(/<[^>]*>/g, "")
      .replace(/\s+/g, " ")
      .replace(/&amp;/g, "&")
      .replace(/&lt;/g, "<")
      .replace(/&gt;/g, ">")
      .replace(/&quot;/g, '"')
      .replace(/&#39;/g, "'")
      .replace(/&nbsp;/g, " ")
      .trim();
  };

  const formattedReference = verseOfTheDay
    ? `${bookLongName} ${verseOfTheDay.chapter}:${verseOfTheDay.verse}`
    : "";

  // Show loading if DB or verses are loading
  if (loading || isInitializing || !bibleDB) {
    return (
      <View className="flex-1 justify-center items-center bg-gray-50">
        <ActivityIndicator size="large" color="#3B82F6" />
        <Text className="text-lg text-gray-600 mt-4">Loading Bible App...</Text>
      </View>
    );
  }

  if (error) {
    return (
      <View className="flex-1 justify-center items-center bg-gray-50 p-6">
        <Text className="text-lg text-red-600 text-center mb-4">{error}</Text>
        <Button title="Try Again" onPress={loadRandomVerse} />
      </View>
    );
  }

  return (
    <ScrollView
      className="flex-1 bg-gray-50"
      contentContainerStyle={{ padding: 16 }}
      showsVerticalScrollIndicator={false}
    >
      {/* Header */}
      <View className="items-center mb-6">
        <Text className="text-2xl font-bold text-primary text-center">
          Bible App
        </Text>
        <Text className="text-gray-600 text-center mt-2 capitalize">
          Your daily source of Inspiration
        </Text>
      </View>

      {/* Verse of the Day */}
      <View className="mb-6">
        <View className="flex-row justify-between items-center mb-4">
          <View>
            <Text className="text-lg font-semibold text-gray-800">
              Fresh Revelation
            </Text>
            <Text className="text-sm text-gray-500">
              Version: {currentVersion.replace(".sqlite3", "").toUpperCase()}
            </Text>
          </View>
          <TouchableOpacity
            onPress={loadRandomVerse}
            className="bg-blue-500 px-4 py-2 rounded-lg"
          >
            <Text className="text-white text-sm font-medium">New Verse</Text>
          </TouchableOpacity>
        </View>

        {verseOfTheDay ? (
          <TouchableOpacity onPress={handleVersePress} activeOpacity={0.7}>
            <View
              className="bg-white rounded-lg shadow-sm border-l-4 min-h-[140px]"
              style={{ borderLeftColor: verseOfTheDay.book_color || "#3B82F6" }}
            >
              <View className="flex-1 p-5 justify-between">
                <View className="flex-1 mb-4">
                  <Text
                    className="text-gray-800 text-lg leading-7 text-justify"
                    textBreakStrategy="highQuality"
                    allowFontScaling={true}
                    adjustsFontSizeToFit={false}
                    minimumFontScale={0.85}
                  >
                    "{cleanVerseText(verseOfTheDay.text)}"
                  </Text>
                </View>

                <View>
                  <View className="border-t border-gray-100 pt-3">
                    <Text className="text-blue-600 font-semibold text-sm text-right">
                      {formattedReference}
                    </Text>
                  </View>
                  <Text className="text-gray-500 text-xs text-center mt-2">
                    Tap to read full chapter
                  </Text>
                </View>
              </View>
            </View>
          </TouchableOpacity>
        ) : (
          <View className="bg-white p-4 rounded-lg border border-gray-200">
            <Text className="text-gray-600 text-center">
              No verse available
            </Text>
          </View>
        )}
      </View>

      {/* Daily Inspiration */}
      <View className="bg-blue-50 p-4 rounded-lg mb-6 border border-blue-200">
        <Text className="text-blue-800 text-sm text-center font-medium">
          📖 Start your day with God's Word
        </Text>
      </View>

      {/* Main Actions */}
      <View className="space-y-4 mb-6 gap-2">
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
      {verseOfTheDay && (
        <View className="bg-white p-4 rounded-lg border border-gray-200">
          <Text className="text-gray-600 text-center text-sm">
            ✨ Tap "New Verse" for fresh inspiration anytime
          </Text>
        </View>
      )}
    </ScrollView>
  );
}
