import React, { useEffect, useState } from "react";
import { View, Text, ScrollView, Alert, TouchableOpacity } from "react-native";
import { StackNavigationProp } from "@react-navigation/stack";
import { RootStackParamList } from "../types";
import { bibleDB, Book } from "../lib/database";

type BookListScreenNavigationProp = StackNavigationProp<
  RootStackParamList,
  "BookList"
>;

interface Props {
  navigation: BookListScreenNavigationProp;
}

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
      setBooks(bookList);
    } catch (error) {
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
        <Text className="text-lg">Loading books...</Text>
      </View>
    );
  }

  return (
    <ScrollView className="flex-1 bg-gray-50">
      <View className="p-4">
        <Text className="text-2xl font-bold text-primary mb-4">
          Old Testament
        </Text>
        <View className="flex-row flex-wrap gap-2 mb-6">
          {oldTestament.map((book) => (
            <TouchableOpacity
              key={book.id}
              className="bg-white p-4 rounded-lg shadow-sm min-w-[100px]"
              onPress={() => navigation.navigate("ChapterList", { book })}
            >
              <Text className="text-primary font-semibold text-center">
                {book.name}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        <Text className="text-2xl font-bold text-primary mb-4">
          New Testament
        </Text>
        <View className="flex-row flex-wrap gap-2">
          {newTestament.map((book) => (
            <TouchableOpacity
              key={book.id}
              className="bg-white p-4 rounded-lg shadow-sm min-w-[100px]"
              onPress={() => navigation.navigate("ChapterList", { book })}
            >
              <Text className="text-primary font-semibold text-center">
                {book.name}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>
    </ScrollView>
  );
}
