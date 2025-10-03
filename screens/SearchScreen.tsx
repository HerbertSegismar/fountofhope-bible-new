import React, { useState, useEffect, useCallback, useMemo } from "react";
import {
  Text,
  TextInput,
  ScrollView,
  TouchableOpacity,
  View,
  ActivityIndicator,
  FlatList,
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

// Memoized verse item component to prevent unnecessary re-renders
const SearchResultItem = React.memo(
  ({
    verse,
    query,
    onVersePress,
  }: {
    verse: Verse;
    query: string;
    onVersePress: (verse: Verse) => void;
  }) => {
    const getBookDisplayName = useCallback(
      (bookNumber: number, fallbackName?: string) => {
        const bookInfo = getBookInfo(bookNumber);
        return bookInfo?.long || fallbackName || "Unknown Book";
      },
      []
    );

    const longName = getBookDisplayName(verse.book_number, verse.book_name);

    return (
      <View style={{ marginBottom: 8 }}>
        <VerseViewEnhanced
          verses={[verse]}
          bookName={longName}
          chapterNumber={verse.chapter}
          showVerseNumbers={true}
          fontSize={16}
          onVersePress={onVersePress}
          highlight={query}
        />
      </View>
    );
  }
);

// Memoized popular search terms
const PopularSearchTerms = React.memo(
  ({ onSearch }: { onSearch: (term: string) => void }) => {
    const terms = [
      "faith",
      "love",
      "hope",
      "grace",
      "peace",
      "joy",
      "forgiveness",
      "salvation",
    ];

    return (
      <View className="flex-row flex-wrap justify-center">
        {terms.map((term) => (
          <TouchableOpacity
            key={term}
            onPress={() => onSearch(term)}
            className="bg-white border border-blue-200 rounded-full px-3 py-1 m-1"
          >
            <Text className="text-blue-600 text-xs">{term}</Text>
          </TouchableOpacity>
        ))}
      </View>
    );
  }
);

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

  // Memoized scope configuration
  const scopeEntries = useMemo(
    () => Object.entries(scopeConfig) as [SearchScope, any][],
    []
  );

  // Handle search with debouncing and cancellation
  const handleSearch = useCallback(
    async (searchQuery?: string) => {
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
      } catch (err) {
        console.error("Search error:", err);
        setError("Failed to search. Please try again.");
      } finally {
        setLoading(false);
      }
    },
    [query, scope, searchVerses]
  );

  // Handle popular search term selection
  const handlePopularSearch = useCallback(
    (term: string) => {
      setQuery(term);
      // Small timeout to ensure UI responsiveness
      setTimeout(() => {
        handleSearch(term);
      }, 50);
    },
    [handleSearch]
  );

  const getBookDisplayName = useCallback(
    (bookNumber: number, fallbackName?: string) => {
      const bookInfo = getBookInfo(bookNumber);
      return bookInfo?.long || fallbackName || "Unknown Book";
    },
    []
  );

  const handleScopeChange = useCallback(
    (newScope: SearchScope) => {
      setScope(newScope);
      // Clear results when scope changes to avoid confusion
      if (hasSearched) {
        setResults([]);
        setHasSearched(false);
      }
    },
    [hasSearched]
  );

  const handleVersePress = useCallback(
    (verse: Verse) => {
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
    },
    [navigation, getBookDisplayName]
  );

  const clearSearch = useCallback(() => {
    setQuery("");
    setResults([]);
    setHasSearched(false);
  }, []);

  const getResultStats = useCallback(() => {
    if (!hasSearched || loading) return null;

    if (results.length === 0) {
      return `No results found for "${query}" in ${scopeConfig[scope].label}`;
    }

    const bookCount = new Set(results.map((r) => r.book_number)).size;
    return `Found ${results.length} result${results.length !== 1 ? "s" : ""} in ${bookCount} book${bookCount !== 1 ? "s" : ""} for "${query}"`;
  }, [hasSearched, loading, results, query, scope]);

  // Memoized search stats
  const resultStats = useMemo(() => getResultStats(), [getResultStats]);

  // Memoized key extractor for FlatList
  const keyExtractor = useCallback(
    (item: Verse, index: number) =>
      `${item.book_number}-${item.chapter}-${item.verse}-${index}`,
    []
  );

  // Memoized render item for FlatList
  const renderItem = useCallback(
    ({ item }: { item: Verse }) => (
      <SearchResultItem
        verse={item}
        query={query}
        onVersePress={handleVersePress}
      />
    ),
    [query, handleVersePress]
  );

  // Loading state
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

  // Error state
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
      <View className="p-4 flex-1">
        {/* Scope Selection */}
        <View className="mb-2">
          <View className="flex-row justify-between">
            {scopeEntries.map(([value, config]) => (
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
            ))}
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
            {resultStats || `Search ${scopeConfig[scope].label}`}
          </Text>
        </TouchableOpacity>

        {/* Search Results with FlatList for virtualization */}
        {hasSearched && results.length > 0 ? (
          <FlatList
            data={results}
            keyExtractor={keyExtractor}
            renderItem={renderItem}
            showsVerticalScrollIndicator={false}
            initialNumToRender={15}
            maxToRenderPerBatch={20}
            windowSize={10}
            removeClippedSubviews={true}
            updateCellsBatchingPeriod={50}
            contentContainerStyle={{ paddingBottom: 20 }}
            className="flex-1"
          />
        ) : (
          <ScrollView
            showsVerticalScrollIndicator={false}
            contentContainerStyle={{ paddingBottom: 20, flexGrow: 1 }}
          >
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
                  <PopularSearchTerms onSearch={handlePopularSearch} />
                </View>
              </View>
            )}
          </ScrollView>
        )}
      </View>
    </SafeAreaView>
  );
}
