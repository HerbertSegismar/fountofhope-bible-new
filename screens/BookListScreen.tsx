// screens/BookListScreen.tsx
import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  ScrollView,
  Alert,
  TouchableOpacity,
  Dimensions,
  ActivityIndicator,
} from "react-native";
import { StackNavigationProp } from "@react-navigation/stack";
import { RootStackParamList } from "../types";
import { Book } from "../services/BibleDatabase"; // Updated import path
import { getTestament, verifyBookDistribution } from "../utils/testamentUtils";
import { useBibleDatabase } from "../context/BibleDatabaseContext"; // Import the context

type BookListScreenNavigationProp = StackNavigationProp<
  RootStackParamList,
  "BookList"
>;

interface Props {
  navigation: BookListScreenNavigationProp;
}

const { width } = Dimensions.get("window");
const BOOK_CARD_WIDTH = (width - 48) / 3; // 3 columns with padding

// Utility to lighten color by converting hex to rgba with alpha
const lightenColor = (color: string, amount = 0.15) => {
  if (!color) return undefined;
  if (color.startsWith("#") && (color.length === 7 || color.length === 4)) {
    let r, g, b;
    if (color.length === 7) {
      r = parseInt(color.slice(1, 3), 16);
      g = parseInt(color.slice(3, 5), 16);
      b = parseInt(color.slice(5, 7), 16);
    } else {
      r = parseInt(color[1] + color[1], 16);
      g = parseInt(color[2] + color[2], 16);
      b = parseInt(color[3] + color[3], 16);
    }
    return `rgba(${r}, ${g}, ${b}, ${amount})`;
  }
  return color; // fallback if not hex format
};

export default function BookListScreen({ navigation }: Props) {
  const [books, setBooks] = useState<Book[]>([]);
  const [loading, setLoading] = useState(true);

  // Use the context
  const { bibleDB, currentVersion } = useBibleDatabase();

  useEffect(() => {
    loadBooks();
  }, [bibleDB, currentVersion]); // Reload when database or version changes

  const loadBooks = async () => {
    if (!bibleDB) {
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      const bookList = await bibleDB.getBooks();

      const booksWithTestament = bookList.map((book) => ({
        ...book,
        testament: getTestament(book.book_number, book.long_name),
      }));

      setBooks(booksWithTestament);
      verifyBookDistribution(booksWithTestament);
    } catch (error) {
      console.error("Failed to load books:", error);
      Alert.alert("Error", "Failed to load books");
    } finally {
      setLoading(false);
    }
  };

  const handleBookPress = (book: Book) => {
    navigation.navigate("ChapterList", { book });
  };

  const oldTestament = books.filter((book) => book.testament === "OT");
  const newTestament = books.filter((book) => book.testament === "NT");

  if (loading) {
    return (
      <View className="flex-1 justify-center items-center bg-gray-50">
        <ActivityIndicator size="large" color="#3B82F6" />
        <Text className="text-lg text-gray-600 mt-4">Loading books...</Text>
        <Text className="text-sm text-gray-500 mt-2">
          Version: {currentVersion.replace(".sqlite3", "").toUpperCase()}
        </Text>
      </View>
    );
  }

  if (!bibleDB) {
    return (
      <View className="flex-1 justify-center items-center bg-gray-50 p-6">
        <Text className="text-lg text-red-600 text-center mb-4">
          Database not available
        </Text>
        <TouchableOpacity
          onPress={loadBooks}
          className="bg-blue-500 px-4 py-2 rounded-lg"
        >
          <Text className="text-white font-medium">Try Again</Text>
        </TouchableOpacity>
      </View>
    );
  }

  // Updated BookCard with soft background colors and dark text for readability
  const BookCard = ({ book, color }: { book: Book; color: string }) => {
    const borderColor = book.book_color || color;
    const backgroundColor = lightenColor(borderColor, 0.15) || "#fff"; // light translucent background

    return (
      <TouchableOpacity
        key={book.book_number}
        className="p-3 rounded-lg shadow-sm mb-3 border-l-4"
        style={{
          width: BOOK_CARD_WIDTH,
          borderLeftColor: borderColor,
          backgroundColor,
        }}
        onPress={() => handleBookPress(book)}
        activeOpacity={0.7}
      >
        <Text
          className="font-semibold text-center text-sm"
          style={{ color: "#1F2937" }} // dark gray text for readability
          numberOfLines={2}
          adjustsFontSizeToFit
          minimumFontScale={0.8}
        >
          {book.short_name}
        </Text>
        <Text
          className="text-xs text-gray-500 text-center mt-1"
          numberOfLines={1}
        >
          {book.long_name}
        </Text>
      </TouchableOpacity>
    );
  };

  return (
    <View className="flex-1 bg-gray-50">
      {/* Header with version info */}
      <View className="bg-white px-4 py-3 border-b border-gray-200">
        <Text className="text-lg font-bold text-gray-800 text-center">
          Bible Books
        </Text>
        <Text className="text-sm text-gray-500 text-center mt-1">
          {currentVersion.replace(".sqlite3", "").toUpperCase()} Version
        </Text>
      </View>

      <ScrollView
        className="flex-1"
        contentContainerStyle={{ padding: 16 }}
        showsVerticalScrollIndicator={false}
      >
        {/* Old Testament Section */}
        <View className="mb-6">
          <View className="flex-row items-center justify-between mb-3">
            <Text className="text-xl font-bold text-primary">
              Old Testament
            </Text>
            <Text className="text-sm text-gray-500">
              {oldTestament.length} books
            </Text>
          </View>
          <View className="flex-row flex-wrap justify-between">
            {oldTestament.map((book) => (
              <BookCard
                key={book.book_number}
                book={book}
                color="#DC2626" // Fallback red for OT
              />
            ))}
          </View>
        </View>

        {/* New Testament Section */}
        <View className="mb-6">
          <View className="flex-row items-center justify-between mb-3">
            <Text className="text-xl font-bold text-primary">
              New Testament
            </Text>
            <Text className="text-sm text-gray-500">
              {newTestament.length} books
            </Text>
          </View>
          <View className="flex-row flex-wrap justify-between">
            {newTestament.map((book) => (
              <BookCard
                key={book.book_number}
                book={book}
                color="#059669" // Fallback green for NT
              />
            ))}
          </View>
        </View>

        {/* Summary */}
        <View className="bg-blue-50 p-4 rounded-lg border border-blue-200">
          <Text className="text-blue-800 text-sm text-center">
            📚 Total: {books.length} books • OT: {oldTestament.length} • NT:{" "}
            {newTestament.length}
          </Text>
        </View>
      </ScrollView>
    </View>
  );
}
