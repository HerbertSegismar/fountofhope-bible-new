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
import { Ionicons } from "@expo/vector-icons";
import { StackNavigationProp } from "@react-navigation/stack";
import { RootStackParamList } from "../types";
import { Book } from "../services/BibleDatabase";
import { getTestament } from "../utils/testamentUtils";
import { useBibleDatabase } from "../context/BibleDatabaseContext";
import { useTheme } from "../context/ThemeContext";
import { lightenColor } from "../utils/themeUtils";
import { SafeAreaView } from "react-native-safe-area-context";

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

  const { bibleDB, currentVersion } = useBibleDatabase();
  const { theme, navTheme } = useTheme();
  const primaryColor = navTheme.colors.primary;
  const lightPrimaryBg = lightenColor(primaryColor, 0.95);
  const primaryBorder = lightenColor(primaryColor, 0.5);

  useEffect(() => {
    loadBooks();
  }, [bibleDB, currentVersion]);

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
  const textSecondaryClass =
    theme === "dark" ? "text-gray-400" : "text-gray-500";
  const textTertiaryClass =
    theme === "dark" ? "text-gray-300" : "text-gray-600";

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

  const BookCard = ({ book, color }: { book: Book; color: string }) => {
    const borderColor = book.book_color ?? color;

    const getButtonStyles = (bookColor: string, currentTheme: string) => {
      let bgColor: string;
      let textColor: string;
      if (currentTheme === "dark") {
        bgColor = bookColor;
        textColor = "#ffffff";
      } else {
        const lightened = lightenColor(bookColor, 0.85);
        bgColor = lightened ?? bookColor;
        textColor = "#111827";
      }
      return { bgColor, textColor };
    };

    const { bgColor } = getButtonStyles(borderColor, theme);

    return (
      <TouchableOpacity
        key={book.book_number}
        className="relative p-3 rounded-lg shadow-sm mb-3"
        style={{
          width: BOOK_CARD_WIDTH,
          backgroundColor: bgColor,
        }}
        onPress={() => handleBookPress(book)}
        activeOpacity={0.7}
      >
        <Text
          className="font-semibold text-center text-sm"
          style={{ color: "#30415bff" }}
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
    <SafeAreaView className={`flex-1 ${bgClass}`}>
      <ScrollView
        className="flex-1 mb-20"
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
                color="#DC2626"
              />
            ))}
          </View>
        </View>

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
                color="#059669"
              />
            ))}
          </View>
        </View>

        <View
          className={`p-4 rounded-lg border`}
          style={{
            backgroundColor: lightPrimaryBg,
            borderColor: primaryBorder,
          }}
        >
          <Ionicons
            name="book"
            size={20}
            color="white"
            style={{ textAlign: "center", marginBottom: 8 }}
          />
          <Text className="text-sm text-center text-white">
            Total: {books.length} books • OT: {oldTestament.length} • NT:{" "}
            {newTestament.length}
          </Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
