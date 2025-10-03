import React, {
  useState,
  useEffect,
  useCallback,
  useMemo,
  useRef,
} from "react";
import {
  Text,
  TextInput,
  ScrollView,
  TouchableOpacity,
  View,
  ActivityIndicator,
  FlatList,
  Animated,
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

// Back to Top Button Component
const BackToTopButton = React.memo(
  ({
    isVisible,
    onPress,
    animatedValue,
  }: {
    isVisible: boolean;
    onPress: () => void;
    animatedValue: Animated.Value;
  }) => {
    const translateY = animatedValue.interpolate({
      inputRange: [0, 1],
      outputRange: [100, 0],
    });

    const opacity = animatedValue.interpolate({
      inputRange: [0, 1],
      outputRange: [0, 1],
    });

    if (!isVisible) return null;

    return (
      <Animated.View
        style={{
          position: "absolute",
          bottom: 0,
          right: 20,
          transform: [{ translateY }],
          opacity,
          zIndex: 1000,
        }}
      >
        <TouchableOpacity
          onPress={onPress}
          className="bg-blue-500 rounded-full p-4 shadow-lg border border-blue-300"
          activeOpacity={0.8}
        >
          <View className="items-center justify-center">
            <Text className="text-white font-bold text-lg">↑</Text>
            <Text className="text-white text-xs mt-1">Top</Text>
          </View>
        </TouchableOpacity>
      </Animated.View>
    );
  }
);

// Empty states component
const EmptyStates = React.memo(
  ({
    hasSearched,
    query,
    loading,
    onPopularSearch,
  }: {
    hasSearched: boolean;
    query: string;
    loading: boolean;
    onPopularSearch: (term: string) => void;
  }) => {
    if (loading) return null;

    if (hasSearched && !query) {
      return (
        <View className="flex-1 justify-center items-center py-8">
          <Text className="text-center text-gray-600 text-lg mb-2">
            Search the Bible
          </Text>
          <Text className="text-center text-gray-500 text-sm mb-6">
            Enter a word or phrase to find relevant verses
          </Text>
          <View className="bg-blue-50 p-4 rounded-lg w-full">
            <Text className="text-blue-800 text-sm text-center font-medium mb-2">
              Popular Search Terms
            </Text>
            <PopularSearchTerms onSearch={onPopularSearch} />
          </View>
        </View>
      );
    }

    if (hasSearched && query && !loading) {
      return (
        <View className="flex-1 justify-center py-8">
          <Text className="text-center text-gray-600 text-lg mb-2">
            No results found for "{query}"
          </Text>
          <Text className="text-center text-gray-500 text-sm mb-4">
            Try different keywords or check spelling
          </Text>
          <View className="bg-gray-50 p-4 rounded-lg mx-4">
            <Text className="text-gray-600 text-sm text-center mb-2">
              Search tips:
            </Text>
            <Text className="text-gray-500 text-xs text-center">
              • Try simpler or more common words{"\n"}• Check for typos
              {"\n"}• Search for single words first
            </Text>
          </View>
        </View>
      );
    }

    if (!query && !hasSearched) {
      return (
        <View className="flex-1 justify-center py-8">
          <Text className="text-center text-gray-600 text-lg mb-2">
            Search the Bible
          </Text>
          <Text className="text-center text-gray-500 text-sm mb-6">
            Enter a word or phrase to find relevant verses
          </Text>
          <View className="bg-blue-50 p-4 rounded-lg mx-4">
            <Text className="text-blue-800 text-sm text-center font-medium mb-2">
              Popular Search Terms
            </Text>
            <PopularSearchTerms onSearch={onPopularSearch} />
          </View>
        </View>
      );
    }

    return null;
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
  const [showBackToTop, setShowBackToTop] = useState(false);

  // Refs and animations
  const flatListRef = useRef<FlatList>(null);
  const scrollY = useRef(new Animated.Value(0)).current;
  const backToTopAnimation = useRef(new Animated.Value(0)).current;

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

  // Handle scroll to show/hide back to top button
  const handleScroll = useCallback(
    (event: any) => {
      const currentScrollY = event.nativeEvent.contentOffset.y;
      scrollY.setValue(currentScrollY);

      // Show back to top button after scrolling down 300 pixels
      if (currentScrollY > 300 && !showBackToTop) {
        setShowBackToTop(true);
        Animated.timing(backToTopAnimation, {
          toValue: 1,
          duration: 300,
          useNativeDriver: true,
        }).start();
      } else if (currentScrollY <= 300 && showBackToTop) {
        setShowBackToTop(false);
        Animated.timing(backToTopAnimation, {
          toValue: 0,
          duration: 300,
          useNativeDriver: true,
        }).start();
      }
    },
    [showBackToTop, scrollY, backToTopAnimation]
  );

  // Scroll to top function
  const scrollToTop = useCallback(() => {
    flatListRef.current?.scrollToOffset({ offset: 0, animated: true });
    setShowBackToTop(false);
    Animated.timing(backToTopAnimation, {
      toValue: 0,
      duration: 300,
      useNativeDriver: true,
    }).start();
  }, [backToTopAnimation]);

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

        // Reset scroll position when new search is performed
        setTimeout(() => {
          scrollToTop();
        }, 100);
      } catch (err) {
        console.error("Search error:", err);
        setError("Failed to search. Please try again.");
      } finally {
        setLoading(false);
      }
    },
    [query, scope, searchVerses, scrollToTop]
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
    setShowBackToTop(false);
    backToTopAnimation.setValue(0);
  }, [backToTopAnimation]);

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

  // List header component
  const ListHeader = useMemo(
    () => (
      <View className="pb-4">
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
      </View>
    ),
    [
      scopeEntries,
      scope,
      query,
      resultStats,
      handleScopeChange,
      handleSearch,
      clearSearch,
    ]
  );

  // Loading state
  if (loading) {
    return (
      <SafeAreaView className="flex-1 bg-gray-50">
        <View className="flex-1 justify-center items-center">
          <ActivityIndicator size="large" color="#3B82F6" />
          <Text className="text-lg text-gray-600 mt-4">
            Searching {scopeConfig[scope].label}...
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  // Error state
  if (error) {
    return (
      <SafeAreaView className="flex-1 bg-gray-50">
        <View className="flex-1 justify-center items-center p-6">
          <Text className="text-lg text-red-600 text-center mb-4">{error}</Text>
          <Button title="Try Again" onPress={() => handleSearch()} />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView className="flex-1 bg-gray-50">
      <View className="flex-1 px-4">
        {/* Use FlatList for both results and empty states to utilize full height */}
        <FlatList
          ref={flatListRef}
          data={results}
          keyExtractor={keyExtractor}
          renderItem={renderItem}
          ListHeaderComponent={ListHeader}
          ListEmptyComponent={
            <EmptyStates
              hasSearched={hasSearched}
              query={query}
              loading={loading}
              onPopularSearch={handlePopularSearch}
            />
          }
          onScroll={handleScroll}
          scrollEventThrottle={16}
          showsVerticalScrollIndicator={false}
          initialNumToRender={15}
          maxToRenderPerBatch={20}
          windowSize={10}
          removeClippedSubviews={true}
          updateCellsBatchingPeriod={50}
          contentContainerStyle={{
            flexGrow: 1,
            paddingBottom: 20,
          }}
          style={{ flex: 1 }}
          keyboardShouldPersistTaps="handled"
        />

        {/* Back to Top Button */}
        <BackToTopButton
          isVisible={showBackToTop && results.length > 10}
          onPress={scrollToTop}
          animatedValue={backToTopAnimation}
        />
      </View>
    </SafeAreaView>
  );
}
