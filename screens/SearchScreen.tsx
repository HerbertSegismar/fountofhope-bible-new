// screens/SearchScreen.tsx
import React, { useState, useEffect } from "react";
import {
  Text,
  TextInput,
  ScrollView,
  TouchableOpacity,
  View,
  ActivityIndicator,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { StackNavigationProp } from "@react-navigation/stack";
import { RootStackParamList, Verse, SearchOptions } from "../types";
import { useBibleDatabase } from "../context/BibleDatabaseContext";
import { VerseViewEnhanced } from "../components/VerseViewEnhanced";
import { Button } from "../components/Button";
import { getBookInfo, BIBLE_BOOKS_MAP } from "../utils/testamentUtils";

type SearchScreenNavigationProp = StackNavigationProp<
  RootStackParamList,
  "Search"
>;

interface Props {
  navigation: SearchScreenNavigationProp;
}

type SearchScope = "whole" | "ot" | "nt";

export default function SearchScreen({ navigation }: Props) {
  const { searchVerses, bibleDB } = useBibleDatabase();
  const [hasSearched, setHasSearched] = useState(false);
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<Verse[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [scope, setScope] = useState<SearchScope>("whole");

  // Use the correct book ranges for your database
  const otRange = { start: 10, end: 460 };
  const ntRange = { start: 470, end: 730 };

  const scopeConfig = {
    whole: {
      label: "Whole Bible",
      description: "Search all books (1-66)",
      range: null,
    },
    ot: {
      label: "Old Testament",
      description: "Genesis - Malachi",
      range: otRange,
    },
    nt: {
      label: "New Testament",
      description: "Matthew - Revelation",
      range: ntRange,
    },
  };

  // Handle search with an optional query parameter
  const handleSearch = async (searchQuery?: string) => {
    const actualQuery = searchQuery || query;

    setHasSearched(true);
    if (!actualQuery.trim()) {
      setResults([]);
      return;
    }

    try {
      setLoading(true);
      setError(null);

      // Prepare search options based on scope
      const searchOptions: SearchOptions = {
        bookRange: scopeConfig[scope].range || undefined,
      };

      console.log(
        `Searching for "${actualQuery}" in ${scope} with range:`,
        searchOptions.bookRange
      );

      // Search with scope filtering
      const searchResults = await searchVerses(actualQuery, searchOptions);
      setResults(searchResults);

      console.log(`Found ${searchResults.length} results`);

      // Log the books found for verification
      if (searchResults.length > 0) {
        const foundBooks = [
          ...new Set(searchResults.map((v) => v.book_number)),
        ].sort((a, b) => a - b);
        const bookNames = foundBooks.map((num) => {
          const info = getBookInfo(num);
          return `${num} (${info?.long || "Unknown"})`;
        });
        console.log("Books in results:", bookNames);
      }
    } catch (err) {
      console.error("Search error:", err);
      setError("Failed to search. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  // Handle popular search term selection
  const handlePopularSearch = async (term: string) => {
    setQuery(term); // Update the input field

    // Use a small timeout to ensure the state is updated and UI is responsive
    setTimeout(() => {
      handleSearch(term); // Pass the term directly to handleSearch
    }, 50);
  };

  // Get book name using the mapping
  const getBookDisplayName = (bookNumber: number, fallbackName?: string) => {
    const bookInfo = getBookInfo(bookNumber);
    return bookInfo?.long || fallbackName || "Unknown Book";
  };

  const handleScopeChange = (newScope: SearchScope) => {
    setScope(newScope);
    // Clear results when scope changes to avoid confusion
    if (hasSearched) {
      setResults([]);
      setHasSearched(false);
    }
  };

  const handleVersePress = (verse: Verse) => {
    const longName = getBookDisplayName(verse.book_number, verse.book_name);
    const tabNavigation = navigation.getParent();
    tabNavigation?.navigate("Bible", {
      screen: "Reader",
      params: {
        bookId: verse.book_number,
        chapter: verse.chapter,
        bookName: longName,
      },
    });
  };

  const clearSearch = () => {
    setQuery("");
    setResults([]);
    setHasSearched(false);
  };

  const getResultStats = () => {
    if (!hasSearched || loading) return null;

    if (results.length === 0) {
      return `No results found for "${query}" in ${scopeConfig[scope].label}`;
    }

    const bookCount = new Set(results.map((r) => r.book_number)).size;
    return `Found ${results.length} result${results.length !== 1 ? "s" : ""} in ${bookCount} book${bookCount !== 1 ? "s" : ""} for "${query}"`;
  };

  if (loading) {
    return (
      <View className="flex-1 justify-center items-center bg-gray-50">
        <ActivityIndicator size="large" color="#3B82F6" />
        <Text className="text-lg text-gray-600 mt-4">
          Searching {scopeConfig[scope].label}...
        </Text>
      </View>
    );
  }

  if (error) {
    return (
      <View className="flex-1 justify-center items-center bg-gray-50 p-6">
        <Text className="text-lg text-red-600 text-center mb-4">{error}</Text>
        <Button title="Try Again" onPress={() => handleSearch()} />
      </View>
    );
  }

  return (
    <SafeAreaView className="flex-1 bg-gray-50 -top-10 mb-5">
      <View className="p-4">
        {/* Scope Selection */}
        <View className="mb-2">
          <View className="flex-row justify-between">
            {(Object.entries(scopeConfig) as [SearchScope, any][]).map(
              ([value, config]) => (
                <TouchableOpacity
                  key={value}
                  className={`flex-1 p-2 mx-1 rounded-lg border-2 ${
                    scope === value
                      ? "border-blue-300 bg-blue-100"
                      : "border-green-300 bg-green-100"
                  }`}
                  onPress={() => handleScopeChange(value)}
                >
                  <Text
                    className={`font-medium text-center text-sm ${
                      scope === value ? "text-blue-600" : "text-green-700"
                    }`}
                  >
                    {config.label}
                  </Text>
                </TouchableOpacity>
              )
            )}
          </View>
        </View>

        {/* Search Input */}
        <View className="flex-row items-center mb-4">
          <View className="flex-1 bg-white rounded-lg shadow-sm border border-gray-200">
            <TextInput
              className="p-2 text-base"
              placeholder={`Search ${scopeConfig[scope].label.toLowerCase()}...`}
              value={query}
              onChangeText={setQuery}
              onSubmitEditing={() => handleSearch()}
              returnKeyType="search"
            />
          </View>
          {query.length > 0 && (
            <TouchableOpacity onPress={clearSearch} className="ml-2">
              <Text className="text-blue-500 font-medium p-4">Clear</Text>
            </TouchableOpacity>
          )}
        </View>

        {/* Search Button */}
        <TouchableOpacity
          className="bg-blue-500 p-4 rounded-lg shadow-sm mb-4"
          onPress={() => handleSearch()}
          disabled={!query.trim()}
        >
          <Text className="text-white font-semibold text-center">
            {getResultStats()
              ? getResultStats()
              : `Search ${scopeConfig[scope].label}`}
          </Text>
        </TouchableOpacity>

        {/* Search Results */}
        <ScrollView
          showsVerticalScrollIndicator={false}
          className="mb-10"
          contentContainerStyle={{ paddingBottom: 20 }}
        >
          <View className="space-y-3">
            {results.map((verse, idx) => {
              const longName = getBookDisplayName(
                verse.book_number,
                verse.book_name
              );

              return (
                <View
                  key={`${verse.book_number}-${verse.chapter}-${verse.verse}-${idx}`}
                >
                  <VerseViewEnhanced
                    verses={[verse]}
                    bookName={longName}
                    chapterNumber={verse.chapter}
                    showVerseNumbers={true}
                    fontSize={16}
                    onVersePress={handleVersePress}
                    highlight={query}
                    style={{ marginBottom: 8 }}
                  />
                </View>
              );
            })}
          </View>

          {/* Empty states */}
          {hasSearched && results.length === 0 && !loading && (
            <View className="py-8">
              <Text className="text-center text-gray-600 text-lg mb-2">
                No results found for "{query}"
              </Text>
              <Text className="text-center text-gray-500 text-sm">
                Try different keywords or check spelling
              </Text>
              <View className="mt-4 bg-gray-50 p-4 rounded-lg">
                <Text className="text-gray-600 text-sm text-center mb-2">
                  Search tips:
                </Text>
                <Text className="text-gray-500 text-xs text-center">
                  • Try simpler or more common words{"\n"}• Check for typos
                  {"\n"}• Search for single words first
                </Text>
              </View>
            </View>
          )}

          {!query && !hasSearched && (
            <View className="py-8">
              <Text className="text-center text-gray-600 text-lg mb-2">
                Search the Bible
              </Text>
              <Text className="text-center text-gray-500 text-sm">
                Enter a word or phrase to find relevant verses
              </Text>
              <View className="mt-4 bg-blue-50 p-4 rounded-lg">
                <Text className="text-blue-800 text-sm text-center font-medium mb-2">
                  Popular Search Terms
                </Text>
                <View className="flex-row flex-wrap justify-center">
                  {[
                    "faith",
                    "love",
                    "hope",
                    "grace",
                    "peace",
                    "joy",
                    "forgiveness",
                    "salvation",
                  ].map((term) => (
                    <TouchableOpacity
                      key={term}
                      onPress={() => handlePopularSearch(term)}
                      className="bg-white border border-blue-200 rounded-full px-3 py-1 m-1"
                    >
                      <Text className="text-blue-600 text-xs">{term}</Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>
            </View>
          )}
        </ScrollView>
      </View>
    </SafeAreaView>
  );
}
