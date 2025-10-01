import React, { useState } from "react";
import {
  Text,
  TextInput,
  ScrollView,
  Alert,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { StackNavigationProp } from "@react-navigation/stack";
import { RootStackParamList, Verse } from "../types";
import { VerseViewEnhanced } from "../components/VerseViewEnhanced";
import { useBibleDatabase } from "../context/BibleDatabaseContext";

type SearchScreenNavigationProp = StackNavigationProp<
  RootStackParamList,
  "Search"
>;

interface Props {
  navigation: SearchScreenNavigationProp;
}

export default function SearchScreen({ navigation }: Props) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<Verse[]>([]);
  const [searching, setSearching] = useState(false);

  const { currentVersion, searchVerses } = useBibleDatabase();

  const handleSearch = async () => {
    if (!query.trim()) {
      setResults([]);
      return;
    }

    try {
      setSearching(true);
      const searchResults = await searchVerses(query);
      setResults(searchResults);
    } catch (error) {
      console.error("Search error:", error);
      Alert.alert("Error", "Search failed. Please try again.");
    } finally {
      setSearching(false);
    }
  };

  const handleVersePress = (verse: Verse) => {
    navigation.navigate("Reader", {
      bookId: verse.book_number,
      chapter: verse.chapter,
      bookName: verse.book_name || "Unknown",
    });
  };

  const clearSearch = () => {
    setQuery("");
    setResults([]);
  };

  return (
    <SafeAreaView className="flex-1 bg-gray-50">
      <View className="p-4">
        {/* Search Input */}
        <View className="flex-row items-center mb-4">
          <TextInput
            className="flex-1 bg-white p-4 rounded-lg shadow-sm"
            placeholder="Search Bible verses..."
            value={query}
            onChangeText={setQuery}
            onSubmitEditing={handleSearch}
            returnKeyType="search"
          />
          {query.length > 0 && (
            <TouchableOpacity onPress={clearSearch} className="ml-2">
              <Text className="text-blue-500 p-4">Clear</Text>
            </TouchableOpacity>
          )}
        </View>

        {/* Search Button */}
        <TouchableOpacity
          className="bg-primary p-4 rounded-lg mb-4"
          onPress={handleSearch}
          disabled={searching}
        >
          <Text className="text-white font-semibold text-center">
            {searching ? "Searching..." : "Search"}
          </Text>
        </TouchableOpacity>

        {/* Results Count */}
        {results.length > 0 && !searching && (
          <View className="mb-3">
            <Text className="text-gray-600 text-sm">
              Found {results.length} result{results.length !== 1 ? "s" : ""} for
              "{query}"
            </Text>
          </View>
        )}

        {/* Search Results */}
        {searching ? (
          <View className="flex-1 justify-center items-center py-8">
            <Text className="text-gray-600">Searching...</Text>
          </View>
        ) : (
          <ScrollView showsVerticalScrollIndicator={false} className="mb-28">
            <View className="space-y-3">
              {results.map((verse, idx) => (
                <VerseViewEnhanced
                  key={`${verse.book_number}-${verse.chapter}-${verse.verse}-${idx}`}
                  verses={[verse]}
                  bookName={verse.book_name || "Unknown"}
                  chapterNumber={verse.chapter}
                  showVerseNumbers={true}
                  fontSize={16}
                  onVersePress={handleVersePress}
                  style={{ marginBottom: 5 }} // remove extra bottom margin
                />
              ))}
            </View>

            {/* No results */}
            {results.length === 0 && query && !searching && (
              <View className="py-8">
                <Text className="text-center text-gray-600">
                  No results found for "{query}"
                </Text>
                <Text className="text-center text-gray-500 text-sm mt-2">
                  Try different keywords or check spelling
                </Text>
              </View>
            )}

            {/* Empty state */}
            {!query && (
              <View className="py-8">
                <Text className="text-center text-gray-600">
                  Enter a search term to find Bible verses
                </Text>
                <Text className="text-center text-gray-500 text-sm mt-2">
                  Try searching for words like "love", "faith", or "peace"
                </Text>
              </View>
            )}
          </ScrollView>
        )}
      </View>
    </SafeAreaView>
  );
}
