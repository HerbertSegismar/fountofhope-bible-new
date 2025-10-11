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
import { Book } from "../services/BibleDatabase";
import { getTestament, verifyBookDistribution } from "../utils/testamentUtils";
import { useBibleDatabase } from "../context/BibleDatabaseContext";
import { useTheme } from "../context/ThemeContext";
import { lightenColor } from "../utils/colorUtils";

type BookListScreenNavigationProp = StackNavigationProp<
  RootStackParamList,
  "BookList"
>;

interface Props {
  navigation: BookListScreenNavigationProp;
}

const { width } = Dimensions.get("window");
const BOOK_CARD_WIDTH = (width - 48) / 6;

export default function BookListScreen({ navigation }: Props) {
  const [books, setBooks] = useState<Book[]>([]);
  const [loading, setLoading] = useState(true);

  // Use the context
  const { bibleDB, currentVersion } = useBibleDatabase();
  const { theme, navTheme } = useTheme();
  const primaryColor = navTheme.colors.primary;
  const lightPrimaryBg = lightenColor(primaryColor, 0.95);
  const primaryBorder = lightenColor(primaryColor, 0.5);

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

  const bgClass = theme === "dark" ? "bg-gray-900" : "bg-gray-50";
  const cardBgClass = theme === "dark" ? "bg-gray-800" : "bg-white";
  const textPrimaryClass = theme === "dark" ? "text-gray-100" : "text-gray-800";
  const textSecondaryClass =
    theme === "dark" ? "text-gray-400" : "text-gray-500";
  const textTertiaryClass =
    theme === "dark" ? "text-gray-300" : "text-gray-600";
  const borderClass = theme === "dark" ? "border-gray-700" : "border-gray-200";
  const headerBgClass = theme === "dark" ? "bg-gray-800" : "bg-white";

  if (loading) {
    return (
      <View className={`flex-1 justify-center items-center ${bgClass}`}>
        <ActivityIndicator size="large" color={primaryColor} />
        <Text className={`text-lg ${textTertiaryClass} mt-4`}>
          Loading books...
        </Text>
        <Text className={`text-sm ${textSecondaryClass} mt-2`}>
          Version: {currentVersion.replace(".sqlite3", "").toUpperCase()}
        </Text>
      </View>
    );
  }

  if (!bibleDB) {
    return (
      <View className={`flex-1 justify-center items-center ${bgClass} p-6`}>
        <Text className="text-lg text-red-500 text-center mb-4">
          Database not available
        </Text>
        <TouchableOpacity
          onPress={loadBooks}
          className="px-4 py-2 rounded-lg"
          style={{ backgroundColor: primaryColor }}
        >
          <Text className="text-white font-medium">Try Again</Text>
        </TouchableOpacity>
      </View>
    );
  }

  // Updated BookCard with soft background colors and dynamic text for readability
  const BookCard = ({ book, color }: { book: Book; color: string }) => {
    const borderColor = book.book_color || color;
    const backgroundColor =
      lightenColor(borderColor, 0.15) ||
      (theme === "dark" ? "#374151" : "#fff"); // Adjust fallback for dark mode

    const textColor = theme === "dark" ? "#F3F4F6" : "#1F2937";

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
          style={{ color: textColor }}
          numberOfLines={2}
          adjustsFontSizeToFit
          minimumFontScale={0.8}
        >
          {book.short_name}
        </Text>
      </TouchableOpacity>
    );
  };

  return (
    <View className={`flex-1 ${bgClass}`}>
      {/* Header with version info */}
      <View className={`${headerBgClass} px-4 py-3 border-b ${borderClass}`}>
        <Text className={`text-lg font-bold ${textPrimaryClass} text-center`}>
          Bible Books
        </Text>
        <Text className={`text-sm ${textSecondaryClass} text-center mt-1`}>
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
            <Text className="text-xl font-bold" style={{ color: primaryColor }}>
              Old Testament
            </Text>
            <Text className={`text-sm ${textSecondaryClass}`}>
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
            <Text className="text-xl font-bold" style={{ color: primaryColor }}>
              New Testament
            </Text>
            <Text className={`text-sm ${textSecondaryClass}`}>
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
        <View
          className={`p-4 rounded-lg border`}
          style={{
            backgroundColor: lightPrimaryBg,
            borderColor: primaryBorder,
          }}
        >
          <Text className="text-sm text-center text-white">
            📚 Total: {books.length} books • OT: {oldTestament.length} • NT:{" "}
            {newTestament.length}
          </Text>
        </View>
      </ScrollView>
    </View>
  );
}
