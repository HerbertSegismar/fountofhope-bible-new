// screens/BookListScreen.tsx
import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  ScrollView,
  Alert,
  TouchableOpacity,
  Dimensions,
} from "react-native";
import { StackNavigationProp } from "@react-navigation/stack";
import { RootStackParamList } from "../types";
import { bibleDB, Book } from "../lib/database";
import { getTestament, verifyBookDistribution } from "../utils/testamentUtils";

type BookListScreenNavigationProp = StackNavigationProp<
  RootStackParamList,
  "BookList"
>;

interface Props {
  navigation: BookListScreenNavigationProp;
}

const { width } = Dimensions.get("window");
const BOOK_CARD_WIDTH = (width - 48) / 3; // 3 columns with padding

export default function BookListScreen({ navigation }: Props) {
  const [books, setBooks] = useState<Book[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadBooks();
  }, []);

  const loadBooks = async () => {
    try {
      setLoading(true);
      await bibleDB.init();
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

  const oldTestament = books.filter((book) => book.testament === "OT");
  const newTestament = books.filter((book) => book.testament === "NT");

  if (loading) {
    return (
      <View className="flex-1 justify-center items-center bg-gray-50">
        <Text className="text-lg text-gray-600">Loading books...</Text>
      </View>
    );
  }

  return (
    <View className="flex-1 bg-gray-50">
      <ScrollView
        className="flex-1"
        contentContainerStyle={{ padding: 16 }}
        showsVerticalScrollIndicator={false}
      >
        {/* Old Testament Section */}
        <View className="mb-6">
          <Text className="text-xl font-bold text-primary mb-3">
            Old Testament
          </Text>
          <View className="flex-row flex-wrap justify-between">
            {oldTestament.map((book) => (
              <TouchableOpacity
                key={book.book_number}
                className="bg-white p-3 rounded-lg shadow-sm mb-3"
                style={{ width: BOOK_CARD_WIDTH }}
                onPress={() => navigation.navigate("ChapterList", { book })}
              >
                <Text className="text-red-500 font-semibold text-center text-sm">
                  {book.long_name}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* New Testament Section */}
        <View className="mb-6">
          <Text className="text-xl font-bold text-primary mb-3">
            New Testament
          </Text>
          <View className="flex-row flex-wrap justify-between">
            {newTestament.map((book) => (
              <TouchableOpacity
                key={book.book_number}
                className="bg-white p-3 rounded-lg shadow-sm mb-3"
                style={{ width: BOOK_CARD_WIDTH }}
                onPress={() => navigation.navigate("ChapterList", { book })}
              >
                <Text className="text-green-500 font-semibold text-center text-sm">
                  {book.long_name}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>
      </ScrollView>
    </View>
  );
}
