import React, {
  useState,
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
  Modal,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { StackNavigationProp } from "@react-navigation/stack";
import { RootStackParamList, Verse, SearchOptions } from "../types";
import { useBibleDatabase } from "../context/BibleDatabaseContext";
import { VerseViewEnhanced } from "../components/VerseViewEnhanced";
import { Button } from "../components/Button";
import { getBookInfo } from "../utils/testamentUtils";
import { SCOPE_CATEGORIES, getScopeConfig, SearchScope, isBookScope, getBookNumberFromScope, SCOPE_RANGES, BOOK_COLORS } from "../components/Scope_Config";

type SearchScreenNavigationProp = StackNavigationProp<
  RootStackParamList,
  "Search"
>;

interface Props {
  navigation: SearchScreenNavigationProp;
}

// Helper function to get book color with fallbacks
const getBookColor = (bookName: string, verse?: Verse): string => {
  // Priority 1: book_color from verse object
  if (verse?.book_color) return verse.book_color;

  // Priority 2: Lookup in our color mapping
  const normalizedBookName = bookName.toLowerCase().trim();
  const color = BOOK_COLORS[normalizedBookName];
  if (color) return color;

  // Priority 3: Generate consistent color from book name
  return generateColorFromString(bookName);
};

// Generate consistent color from string (fallback)
const generateColorFromString = (str: string): string => {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = str.charCodeAt(i) + ((hash << 5) - hash);
  }

  const colors = [
    "#3B82F6",
    "#EF4444",
    "#10B981",
    "#F59E0B",
    "#8B5CF6",
    "#EC4899",
    "#06B6D4",
    "#84CC16",
    "#F97316",
    "#6366F1",
  ];

  return colors[Math.abs(hash) % colors.length];
};

// Helper function to enhance search results with colors
const enhanceSearchResultsWithColors = async (
  results: Verse[],
  bibleDB: any
): Promise<Verse[]> => {
  if (!results.length || !bibleDB) return results;

  try {
    // Get unique book numbers from results
    const uniqueBookNumbers = [...new Set(results.map((r) => r.book_number))];

    // Fetch book details for each unique book
    const bookPromises = uniqueBookNumbers.map(async (bookNumber) => {
      try {
        const book = await bibleDB.getBook(bookNumber);
        return {
          bookNumber,
          bookColor:
            book?.book_color || BOOK_COLORS[book?.long_name?.toLowerCase()],
        };
      } catch (error) {
        console.error(`Error fetching book ${bookNumber}:`, error);
        return {
          bookNumber,
          bookColor: generateColorFromString(bookNumber.toString()),
        };
      }
    });

    const bookColors = await Promise.all(bookPromises);
    const colorMap = Object.fromEntries(
      bookColors.map((bc) => [bc.bookNumber, bc.bookColor])
    );

    // Add colors to results
    return results.map((result) => ({
      ...result,
      book_color: colorMap[result.book_number],
    }));
  } catch (error) {
    console.error("Error enhancing search results with colors:", error);
    // Fallback: generate colors from book names
    return results.map((result) => ({
      ...result,
      book_color: getBookColor(result.book_name || "Unknown", result),
    }));
  }
};

// Memoized components
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
    const bookColor = getBookColor(longName, verse);

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
          compact={true}
          bookColor={bookColor} // Pass the book color explicitly
        />
      </View>
    );
  }
);

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

// Updated Scope Dropdown Component with Individual Books and Fixed Header
const ScopeDropdown = React.memo(
  ({
    scope,
    onScopeChange,
    isOpen,
    onToggle,
  }: {
    scope: SearchScope;
    onScopeChange: (newScope: SearchScope) => void;
    isOpen: boolean;
    onToggle: () => void;
  }) => {
    const currentConfig = getScopeConfig(scope);

    return (
      <View className="mb-4">
        <TouchableOpacity
          onPress={onToggle}
          className="bg-blue-500 border border-gray-300 rounded-lg p-4 flex-row justify-between items-center"
        >
          <View className="flex-1">
            <Text className="font-semibold text-white">
              {currentConfig.label}
            </Text>
            <Text className="text-white text-xs mt-1">
              {currentConfig.description}
            </Text>
          </View>
          <Text className="text-white text-lg">{isOpen ? "↑" : "↓"}</Text>
        </TouchableOpacity>

        <Modal
          visible={isOpen}
          transparent
          animationType="fade"
          onRequestClose={onToggle}
        >
          <TouchableOpacity
            className="flex-1 bg-black/50 justify-center p-4"
            activeOpacity={1}
            onPress={onToggle}
          >
            <View className="bg-white rounded-lg max-h-80">
              {/* Fixed Header - Not Scrollable */}
              <View className="bg-blue-500 px-4 py-3 border-b border-blue-400 sticky top-0 z-10">
                <Text className="font-bold text-white text-center text-base">
                  Select Search Scope
                </Text>
              </View>

              <ScrollView>
                {Object.entries(SCOPE_CATEGORIES).map(([category, scopes]) => (
                  <View key={category}>
                    <View className="bg-blue-500 px-4 py-2 border-b border-gray-200">
                      <Text className="font-semibold text-white text-sm">
                        {category}
                      </Text>
                    </View>
                    {scopes.map((scopeKey) => {
                      const config = getScopeConfig(scopeKey as SearchScope);
                      return (
                        <TouchableOpacity
                          key={scopeKey}
                          onPress={() => {
                            onScopeChange(scopeKey as SearchScope);
                            onToggle();
                          }}
                          className={`px-4 py-3 border-b border-gray-100 ${
                            scope === scopeKey ? "bg-blue-50" : "bg-white"
                          }`}
                        >
                          <Text
                            className={`font-medium ${
                              scope === scopeKey
                                ? "text-blue-600"
                                : "text-gray-800"
                            }`}
                          >
                            {config.label}
                          </Text>
                          <Text className="text-gray-500 text-xs mt-1">
                            {config.description}
                          </Text>
                        </TouchableOpacity>
                      );
                    })}
                  </View>
                ))}
              </ScrollView>
            </View>
          </TouchableOpacity>
        </Modal>
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
  const [showBackToTop, setShowBackToTop] = useState(false);
  const [showScopeDropdown, setShowScopeDropdown] = useState(false);
  const [showResultsStats, setShowResultsStats] = useState(false); // NEW: Track when to show results stats

  // Refs and animations
  const flatListRef = useRef<FlatList>(null);
  const scrollY = useRef(new Animated.Value(0)).current;
  const backToTopAnimation = useRef(new Animated.Value(0)).current;

  // Handle scroll to show/hide back to top button
  const handleScroll = useCallback(
    (event: any) => {
      const currentScrollY = event.nativeEvent.contentOffset.y;
      scrollY.setValue(currentScrollY);

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

  // Handle query change - reset stats when typing
  const handleQueryChange = useCallback((text: string) => {
    setQuery(text);
    setShowResultsStats(false); // Hide stats when user starts typing
  }, []);

  // Handle search with debouncing and cancellation
  const handleSearch = useCallback(
    async (searchQuery?: string) => {
      const actualQuery = searchQuery || query;

      setHasSearched(true);
      setShowResultsStats(false); // Hide stats when starting new search

      if (!actualQuery.trim()) {
        setResults([]);
        return;
      }

      try {
        setLoading(true);
        setError(null);

        // Prepare search options based on scope
        let searchOptions: SearchOptions = {};

        if (isBookScope(scope)) {
          // Handle individual book search
          const bookNumber = getBookNumberFromScope(scope);
          if (bookNumber) {
            searchOptions.bookRange = { start: bookNumber, end: bookNumber };
          }
        } else {
          // Handle category-based search
          searchOptions.bookRange = SCOPE_RANGES[scope] || undefined;
        }

        // Search with scope filtering
        const searchResults = await searchVerses(actualQuery, searchOptions);

        // Enhance search results with book colors
        const enhancedResults = await enhanceSearchResultsWithColors(
          searchResults,
          bibleDB
        );
        setResults(enhancedResults);
        setShowResultsStats(true); // Show stats only after search completes

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
    [query, scope, searchVerses, scrollToTop, bibleDB]
  );

  // Handle popular search term selection
  const handlePopularSearch = useCallback(
    (term: string) => {
      setQuery(term);
      setTimeout(() => {
        handleSearch(term);
      }, 50);
    },
    [handleSearch]
  );

  const handleScopeChange = useCallback((newScope: SearchScope) => {
    setScope(newScope);
    setShowScopeDropdown(false);
    // Clear results when scope changes to avoid confusion
    setResults([]);
    setHasSearched(false);
    setShowResultsStats(false); // Also reset stats
  }, []);

  const handleVersePress = useCallback(
    (verse: Verse) => {
      const bookInfo = getBookInfo(verse.book_number);
      const longName = bookInfo?.long || verse.book_name || "Unknown Book";
      const testament = verse.book_number >= 470 ? "NT" : "OT";

      // Use the same pattern as VerseListScreen
      const tabNavigation = navigation.getParent();
      tabNavigation?.navigate("Bible", {
        screen: "Reader",
        params: {
          bookId: verse.book_number,
          chapter: verse.chapter,
          verse: verse.verse,
          bookName: longName,
          testament: testament,
        },
      });
    },
    [navigation]
  );

  const clearSearch = useCallback(() => {
    setQuery("");
    setResults([]);
    setHasSearched(false);
    setShowResultsStats(false); // Also reset stats
    setShowBackToTop(false);
    backToTopAnimation.setValue(0);
  }, [backToTopAnimation]);

  const getResultStats = useCallback(() => {
    if (!hasSearched || loading || !showResultsStats) {
      const config = getScopeConfig(scope);
      return `Search ${config.label}`;
    }

    if (results.length === 0) {
      const config = getScopeConfig(scope);
      return `No results found for "${query}" in ${config.label}`;
    }

    const bookCount = new Set(results.map((r) => r.book_number)).size;
    const config = getScopeConfig(scope);

    if (isBookScope(scope)) {
      return `Found ${results.length} result${results.length !== 1 ? "s" : ""} in ${config.label}`;
    }

    return `Found ${results.length} result${results.length !== 1 ? "s" : ""} in ${bookCount} book${bookCount !== 1 ? "s" : ""} for "${query}"`;
  }, [hasSearched, loading, results, query, scope, showResultsStats]);

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
        {/* Scope Selection Dropdown */}
        <ScopeDropdown
          scope={scope}
          onScopeChange={handleScopeChange}
          isOpen={showScopeDropdown}
          onToggle={() => setShowScopeDropdown(!showScopeDropdown)}
        />

        {/* Search Input */}
        <View className="flex-row items-center mb-4">
          <View className="flex-1 bg-white rounded-lg shadow-sm border border-gray-200">
            <TextInput
              className="p-4 text-base placeholder:text-gray-400 text-blue-500"
              placeholder={`Search ${getScopeConfig(scope).label.toLowerCase()}...`}
              value={query}
              onChangeText={handleQueryChange} // Use the new handler
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
            {resultStats}
          </Text>
        </TouchableOpacity>
      </View>
    ),
    [
      scope,
      query,
      resultStats,
      showScopeDropdown,
      handleScopeChange,
      handleSearch,
      clearSearch,
      handleQueryChange, // Include the new handler
    ]
  );

  // Loading state
  if (loading) {
    return (
      <SafeAreaView className="flex-1 bg-gray-50">
        <View className="flex-1 justify-center items-center">
          <ActivityIndicator size="large" color="#3B82F6" />
          <Text className="text-lg text-gray-600 mt-4">
            Searching {getScopeConfig(scope).label}...
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
