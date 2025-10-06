import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Image,
  Dimensions,
} from "react-native";
import { StackNavigationProp } from "@react-navigation/stack";
import { RootStackParamList } from "../types";
import { Button } from "../components/Button";
import { BibleDatabaseError, Verse } from "../services/BibleDatabase";
import { useBibleDatabase } from "../context/BibleDatabaseContext";
import { VerseViewEnhanced } from "../components/VerseViewEnhanced";
// import MatrixRN from "../components/MatrixRN";
// import MatrixGPT from "../components/MatrixGPT";

type HomeScreenNavigationProp = StackNavigationProp<RootStackParamList, "Home">;

interface Props {
  navigation: HomeScreenNavigationProp;
}

const { width: screenWidth, height: screenHeight } = Dimensions.get("window");

export default function HomeScreen({ navigation }: Props) {
  const { bibleDB, currentVersion, isInitializing } = useBibleDatabase();

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
        const newIsLandscape = newWidth > newHeight;
  
        // Always update landscape state
        setIsLandscape(newIsLandscape);
      };
  
      // Initial check
      updateLayout();
  
      const subscription = Dimensions.addEventListener("change", updateLayout);
  
      return () => {
        subscription?.remove();
      };
    }, []);

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

      // Random start index
      const startIndex = Math.floor(Math.random() * verses.length);
      // Random range length between 1-5, ensure we don't exceed chapter
      const maxRange = Math.min(5, verses.length - startIndex);
      const rangeLength = Math.floor(Math.random() * maxRange) + 1;

      const range = verses.slice(startIndex, startIndex + rangeLength);
      setVerseRange(range);

      // Load book long name
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
        <Image
          source={require("../assets/fohs-512x512.png")} // Update path as needed
          className="size-40 mb-4 rounded-lg"
          resizeMode="contain"
        />
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
              Fresh Revelations
            </Text>
            <Text className="text-sm text-gray-500">
              Version: {currentVersion.replace(".sqlite3", "").toUpperCase()}
            </Text>
          </View>
          <TouchableOpacity
            onPress={loadRandomVerse}
            className={`bg-blue-500 px-4 py-2 rounded-lg ${isLandscape ? "mr-12" : "mr-0"}`}
          >
            <Text className="text-white text-sm font-medium">Refresh</Text>
          </TouchableOpacity>
        </View>

        <View className={`${isLandscape ? "mr-12" : "mr-0"}`}>
          {verseRange && verseRange.length > 0 && (
            <VerseViewEnhanced
              verses={verseRange} // show the full range
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
        className={`bg-blue-50 p-4 rounded-lg mb-6 border border-blue-200 ${isLandscape ? "mr-12" : "mr-0"}`}
      >
        <Text className="text-blue-800 text-sm text-center font-medium">
          📖 Start your day with God's Word
        </Text>
      </View>

      {/* Main Actions */}
      <View
        className={`space-y-4 mb-6 gap-2 ${isLandscape ? "mr-12" : "mr-0"}`}
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
          className={`bg-white p-4 rounded-lg border border-gray-200 ${isLandscape ? "mr-12" : "mr-0"}`}
        >
          <Text className="text-gray-600 text-center text-sm">
            ✨ Tap "Refresh" for fresh inspiration anytime
          </Text>
        </View>
      )}

      {/* <View>
        <MatrixRN/>
      </View> */}
    </ScrollView>
  );
}
