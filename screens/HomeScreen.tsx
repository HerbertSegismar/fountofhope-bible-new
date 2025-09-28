// screens/HomeScreen.tsx - Updated to display long book names in verse reference
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
import { bibleDB, BibleDatabaseError, Verse, Book } from "../lib/database";

type HomeScreenNavigationProp = StackNavigationProp<RootStackParamList, "Home">;

interface Props {
  navigation: HomeScreenNavigationProp;
}

export default function HomeScreen({ navigation }: Props) {
  const [verseOfTheDay, setVerseOfTheDay] = useState<Verse | null>(null);
  const [bookLongName, setBookLongName] = useState<string>("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadRandomVerse();
  }, []);

  const getRandomBookChapter = async (): Promise<{
    bookId: number;
    chapter: number;
  }> => {
    try {
      // Get all books from the database
      const books = await bibleDB.getBooks();

      if (books.length === 0) {
        throw new Error("No books found in database");
      }

      // Pick a random book
      const randomBook = books[Math.floor(Math.random() * books.length)];

      // Get chapter count for this book
      const chapterCount = await bibleDB.getChapterCount(
        randomBook.book_number
      );

      if (chapterCount === 0) {
        // Fallback to a random chapter between 1-50 if chapter count is 0
        return {
          bookId: randomBook.book_number,
          chapter: Math.floor(Math.random() * 50) + 1,
        };
      }

      const randomChapter = Math.floor(Math.random() * chapterCount) + 1;

      return { bookId: randomBook.book_number, chapter: randomChapter };
    } catch (error) {
      console.error("Error getting random book/chapter:", error);
      // Fallback to popular books if there's an error
      const popularBooks = [
        { id: 19, chapters: 150 }, // Psalms
        { id: 20, chapters: 31 }, // Proverbs
        { id: 40, chapters: 28 }, // Matthew
        { id: 43, chapters: 21 }, // John
        { id: 1, chapters: 50 }, // Genesis
      ];

      const randomBook =
        popularBooks[Math.floor(Math.random() * popularBooks.length)];
      const randomChapter = Math.floor(Math.random() * randomBook.chapters) + 1;

      return { bookId: randomBook.id, chapter: randomChapter };
    }
  };

  const loadRandomVerse = async () => {
    try {
      setLoading(true);
      setError(null);

      // Ensure database is initialized
      await bibleDB.init();

      const { bookId, chapter } = await getRandomBookChapter();
      const verses = await bibleDB.getVerses(bookId, chapter);

      if (verses.length > 0) {
        // Pick a random verse from the chapter
        const randomIndex = Math.floor(Math.random() * verses.length);
        const randomVerse = verses[randomIndex];
        setVerseOfTheDay(randomVerse);

        // Get the book's long name for the reference
        try {
          const bookInfo = await bibleDB.getBook(bookId);
          if (bookInfo && bookInfo.long_name) {
            setBookLongName(bookInfo.long_name);
          } else {
            // Fallback to the book_name from the verse if available
            setBookLongName(randomVerse.book_name || "Unknown Book");
          }
        } catch (bookError) {
          console.error("Failed to get book info:", bookError);
          setBookLongName(randomVerse.book_name || "Unknown Book");
        }
      } else {
        setError("Could not load a verse. Please try again.");
      }
    } catch (error) {
      console.error("Failed to load random verse:", error);

      if (error instanceof BibleDatabaseError) {
        setError(`Database error: ${error.message}`);
      } else {
        setError("Failed to load content. Please try again.");
      }
    } finally {
      setLoading(false);
    }
  };

  const handleVersePress = async () => {
    if (verseOfTheDay) {
      try {
        // Get the full book information to ensure we have all required properties
        const bookInfo = await bibleDB.getBook(verseOfTheDay.book_number);

        if (bookInfo) {
          navigation.navigate("VerseList", {
            book: bookInfo,
            chapter: verseOfTheDay.chapter,
          });
        } else {
          // Fallback: create a Book object with required properties
          const fallbackBook: Book = {
            book_number: verseOfTheDay.book_number,
            short_name: verseOfTheDay.book_name || "Unknown",
            long_name:
              bookLongName || verseOfTheDay.book_name || "Unknown Book",
            book_color: verseOfTheDay.book_color || "#3B82F6",
          };

          navigation.navigate("VerseList", {
            book: fallbackBook,
            chapter: verseOfTheDay.chapter,
          });
        }
      } catch (error) {
        console.error("Failed to get book info:", error);
        // Ultimate fallback
        const fallbackBook: Book = {
          book_number: verseOfTheDay.book_number,
          short_name: verseOfTheDay.book_name || "Unknown",
          long_name: bookLongName || verseOfTheDay.book_name || "Unknown Book",
          book_color: verseOfTheDay.book_color || "#3B82F6",
        };

        navigation.navigate("VerseList", {
          book: fallbackBook,
          chapter: verseOfTheDay.chapter,
        });
      }
    }
  };

  const removeXmlTags = (text: string): string => {
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

  const getFormattedReference = (): string => {
    if (!verseOfTheDay) return "";
    return `${bookLongName} ${verseOfTheDay.chapter}:${verseOfTheDay.verse}`;
  };

  if (loading) {
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
              {/* Main content with proper flex layout */}
              <View className="flex-1 p-5 justify-between">
                {/* Verse Text Container */}
                <View className="flex-1 mb-4">
                  <Text
                    className="text-gray-800 text-lg leading-7 text-justify"
                    textBreakStrategy="highQuality"
                    allowFontScaling={true}
                    adjustsFontSizeToFit={false}
                    minimumFontScale={0.85}
                  >
                    "{removeXmlTags(verseOfTheDay.text)}"
                  </Text>
                </View>

                {/* Reference Section */}
                <View>
                  <View className="border-t border-gray-100 pt-3">
                    <Text className="text-blue-600 font-semibold text-sm text-right">
                      {getFormattedReference()}
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

      {/* Quick Stats */}
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
