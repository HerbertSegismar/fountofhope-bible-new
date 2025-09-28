// screens/VerseListScreen.tsx - Updated to display long book names
import React, { useEffect, useState } from "react";
import {
  Text,
  ScrollView,
  Alert,
  TouchableOpacity,
  View,
  ActivityIndicator,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { StackNavigationProp } from "@react-navigation/stack";
import { RouteProp } from "@react-navigation/native";
import { RootStackParamList } from "../types";
import { bibleDB, Verse } from "../lib/database";
import { ChapterViewEnhanced } from "../components/ChapterViewEnhanced";

type VerseListScreenNavigationProp = StackNavigationProp<
  RootStackParamList,
  "VerseList"
>;
type VerseListScreenRouteProp = RouteProp<RootStackParamList, "VerseList">;

interface Props {
  navigation: VerseListScreenNavigationProp;
  route: VerseListScreenRouteProp;
}

export default function VerseListScreen({ navigation, route }: Props) {
  const { book, chapter } = route.params;
  const [verses, setVerses] = useState<Verse[]>([]);
  const [loading, setLoading] = useState(true);
  const [verseCount, setVerseCount] = useState(0);

  useEffect(() => {
    loadVerses();
  }, [book.book_number, chapter]);

  const loadVerses = async () => {
    try {
      setLoading(true);
      const versesList = await bibleDB.getVerses(
        Number(book.book_number),
        Number(chapter)
      );
      setVerses(versesList);
      setVerseCount(versesList.length);
    } catch (error) {
      console.error("Failed to load verses:", error);
      Alert.alert("Error", "Failed to load verses");
    } finally {
      setLoading(false);
    }
  };

  const handleChapterPress = () => {
    navigation.navigate("Reader", {
      bookId: book.book_number,
      chapter: chapter,
      bookName: book.long_name, // Use long name for Reader screen
    });
  };

  if (loading) {
    return (
      <SafeAreaView className="flex-1 justify-center items-center bg-gray-50">
        <ActivityIndicator size="large" color="#3B82F6" />
        <Text className="text-lg text-gray-600 mt-4">Loading chapter...</Text>
      </SafeAreaView>
    );
  }

  return (
    <ScrollView
      className="flex-1 bg-gray-50"
      showsVerticalScrollIndicator={false}
      contentContainerStyle={{ flexGrow: 1 }}
    >
      <SafeAreaView className="flex-1">
        {/* Chapter Header with Long Book Name */}
        <View className="bg-white rounded-lg p-6 mx-4 mt-4 shadow-sm">
          <Text className="text-2xl font-bold text-primary text-center">
            {book.long_name}
          </Text>
        </View>

        {/* Continuous Chapter Display */}
        <View className="flex-1 mx-4 my-4">
          {verses.length > 0 ? (
            <ChapterViewEnhanced
              verses={verses}
              bookName={''}
              chapterNumber={chapter}
              onPress={handleChapterPress}
              showVerseNumbers={true}
            />
          ) : (
            <View className="bg-yellow-50 p-4 rounded-lg">
              <Text className="text-yellow-800 text-center">
                No verses found for {book.long_name} {chapter}
              </Text>
            </View>
          )}
        </View>

        {/* Chapter Navigation */}
        <View className="flex-row justify-between mx-4 mb-6">
          <TouchableOpacity
            className={`px-4 py-3 rounded-lg ${
              chapter <= 1 ? "bg-gray-300" : "bg-primary"
            }`}
            onPress={() => {
              if (chapter > 1) {
                navigation.navigate("VerseList", {
                  book,
                  chapter: chapter - 1,
                });
              }
            }}
            disabled={chapter <= 1}
          >
            <Text
              className={`font-semibold ${
                chapter <= 1 ? "text-gray-500" : "text-white"
              }`}
            >
              Previous Chapter
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            className="bg-primary px-4 py-3 rounded-lg"
            onPress={() => {
              navigation.navigate("VerseList", {
                book,
                chapter: chapter + 1,
              });
            }}
          >
            <Text className="text-white font-semibold">Next Chapter</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    </ScrollView>
  );
}
