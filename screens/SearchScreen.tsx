import React, { useState, useCallback, useMemo, useRef } from "react";
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
  TextStyle,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { StackNavigationProp } from "@react-navigation/stack";
import { RootStackParamList, Verse, SearchOptions } from "../types";
import { useBibleDatabase } from "../context/BibleDatabaseContext";
import { useTheme } from "../context/ThemeContext";
import { VerseViewEnhanced } from "../components/VerseViewEnhanced";
import { Button } from "../components/Button";
import { getBookInfo } from "../utils/testamentUtils";
import {
  SCOPE_CATEGORIES,
  getScopeConfig,
  SearchScope,
  isBookScope,
  getBookNumberFromScope,
  SCOPE_RANGES,
  BOOK_COLORS,
} from "../components/Scope_Config";

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
  ({ onSearch, colors }: { onSearch: (term: string) => void; colors: any }) => {
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
            style={{
              backgroundColor: colors.card,
              borderColor: colors.primary + "30",
              borderWidth: 1,
            }}
            className="rounded-full px-3 py-1 m-1"
          >
            <Text className="text-xs" style={{ color: colors.primary }}>
              {term}
            </Text>
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
    colors,
  }: {
    isVisible: boolean;
    onPress: () => void;
    animatedValue: Animated.Value;
    colors: any;
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
          style={{
            backgroundColor: colors.primary,
            borderColor: colors.primary + "50",
            borderWidth: 1,
          }}
          className="rounded-full p-4 shadow-lg mb-2"
          activeOpacity={0.8}
        >
          <View className="items-center justify-center">
            <Text
              className="font-bold text-lg text-white"
            >
              ↑
            </Text>
            <Text className="text-xs mt-1 text-white">
              Top
            </Text>
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
    colors,
  }: {
    hasSearched: boolean;
    query: string;
    loading: boolean;
    onPopularSearch: (term: string) => void;
    colors: any;
  }) => {
    if (loading) return null;

    const commonStyle: TextStyle = {
      textAlign: "center",
      fontSize: 18,
      marginBottom: 8,
    };
    const subStyle: TextStyle = {
      textAlign: "center",
      fontSize: 14,
      marginBottom: 24,
    };
    const tipsStyle = {
      backgroundColor: colors.card,
      padding: 16,
      borderRadius: 8,
      marginHorizontal: 16,
    };
    const tipTitleStyle: TextStyle = {
      fontSize: 14,
      textAlign: "center",
      marginBottom: 8,
      fontWeight: "600",
    };
    const tipTextStyle: TextStyle = {
      fontSize: 12,
      textAlign: "center",
      lineHeight: 16,
    };

    if (hasSearched && !query) {
      return (
        <View className="flex-1 justify-center items-center py-8">
          <Text style={[commonStyle, { color: colors.text }]}>
            Search the Bible
          </Text>
          <Text style={[subStyle, { color: colors.muted }]}>
            Enter a word or phrase to find relevant verses
          </Text>
          <View
            style={{
              backgroundColor: colors.primary + "10",
              padding: 16,
              borderRadius: 8,
              width: "100%",
            }}
          >
            <Text style={[tipTitleStyle, { color: colors.primary }]}>
              Popular Search Terms
            </Text>
            <PopularSearchTerms onSearch={onPopularSearch} colors={colors} />
          </View>
        </View>
      );
    }

    if (hasSearched && query && !loading) {
      return (
        <View className="flex-1 justify-center py-8">
          <Text style={[commonStyle, { color: colors.text, marginBottom: 8 }]}>
            No results found for "{query}"
          </Text>
          <Text style={[subStyle, { color: colors.muted }]}>
            Try different keywords or check spelling
          </Text>
          <View style={tipsStyle}>
            <Text style={[tipTitleStyle, { color: colors.text }]}>
              Search tips:
            </Text>
            <Text style={[tipTextStyle, { color: colors.muted }]}>
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
          <Text style={[commonStyle, { color: colors.text }]}>
            Search the Bible
          </Text>
          <Text style={[subStyle, { color: colors.muted }]}>
            Enter a word or phrase to find relevant verses
          </Text>
          <View
            style={{
              backgroundColor: colors.primary + "10",
              padding: 16,
              borderRadius: 8,
              marginHorizontal: 16,
            }}
          >
            <Text style={[tipTitleStyle, { color: colors.primary }]}>
              Popular Search Terms
            </Text>
            <PopularSearchTerms onSearch={onPopularSearch} colors={colors} />
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
    colors,
  }: {
    scope: SearchScope;
    onScopeChange: (newScope: SearchScope) => void;
    isOpen: boolean;
    onToggle: () => void;
    colors: any;
  }) => {
    const currentConfig = getScopeConfig(scope);

    const headerStyle = {
      backgroundColor: colors.primary,
      borderColor: colors.primary + "60",
      borderBottomWidth: 1,
    };
    const categoryHeaderStyle = {
      backgroundColor: colors.primary,
      borderColor: colors.border,
      borderBottomWidth: 1,
    };
    const itemStyle = {
      borderBottomColor: colors.border,
      borderBottomWidth: 1,
      backgroundColor: colors.card,
    };
    const selectedItemStyle = {
      backgroundColor: colors.primary + "10",
    };
    const textStyle = {
      color: colors.text,
    };
    const selectedTextStyle = {
      color: colors.primary,
    };
    const descStyle = {
      color: colors.muted,
    };

    return (
      <View className="mb-4">
        <TouchableOpacity
          onPress={onToggle}
          style={{
            backgroundColor: colors.primary,
            borderColor: colors.border,
            borderWidth: 1,
          }}
          className="rounded-lg p-4 flex-row justify-between items-center"
        >
          <View className="flex-1">
            <Text
              className="font-semibold"
              style={{ color: colors.text }}
            >
              {currentConfig.label}
            </Text>
            <Text className="text-xs mt-1" style={{ color: colors.text }}>
              {currentConfig.description}
            </Text>
          </View>
          <Text className="text-lg" style={{ color: colors.text }}>
            {isOpen ? "↑" : "↓"}
          </Text>
        </TouchableOpacity>

        <Modal
          visible={isOpen}
          transparent
          animationType="fade"
          onRequestClose={onToggle}
        >
          <TouchableOpacity
            className="flex-1 justify-center p-4"
            activeOpacity={1}
            onPress={onToggle}
            style={{ backgroundColor: colors.background + "CC" }}
          >
            <View
              className="rounded-lg max-h-80"
              style={{ backgroundColor: colors.card }}
            >
              {/* Fixed Header - Not Scrollable */}
              <View style={headerStyle} className="px-4 py-3 sticky top-0 z-10">
                <Text
                  className="font-bold text-center text-base"
                  style={{ color: colors.text }}
                >
                  Select Search Scope
                </Text>
              </View>

              <ScrollView>
                {Object.entries(SCOPE_CATEGORIES).map(([category, scopes]) => (
                  <View key={category}>
                    <View style={categoryHeaderStyle} className="px-4 py-2">
                      <Text
                        className="font-semibold text-sm"
                        style={{ color: colors.text }}
                      >
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
                          style={[
                            itemStyle,
                            scope === scopeKey ? selectedItemStyle : null,
                          ]}
                          className="px-4 py-3"
                        >
                          <Text
                            className="font-medium"
                            style={[
                              textStyle,
                              scope === scopeKey ? selectedTextStyle : null,
                            ]}
                          >
                            {config.label}
                          </Text>
                          <Text className="text-xs mt-1" style={descStyle}>
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
  const { theme, colorScheme, navTheme } = useTheme();
  const isDark = theme === "dark";
  const primaryColor = navTheme.colors.primary;

  const colors = {
    primary: primaryColor,
    background: isDark ? "#0f172a" : "#f8fafc",
    text: isDark ? "#ffffff" : "#000000",
    muted: isDark ? "#9ca3af" : "#6b7280",
    card: isDark ? "#1e293b" : "#ffffff",
    border: isDark ? "#374151" : "#e5e7eb",
  };

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
          colors={colors}
        />

        {/* Search Input */}
        <View className="flex-row items-center mb-4">
          <View
            className="flex-1 rounded-lg shadow-sm border"
            style={{
              backgroundColor: colors.card,
              borderColor: colors.border,
            }}
          >
            <TextInput
              className="p-4 text-base"
              placeholder={`Search ${getScopeConfig(scope).label.toLowerCase()}...`}
              placeholderTextColor={colors.muted}
              value={query}
              onChangeText={handleQueryChange} // Use the new handler
              onSubmitEditing={() => handleSearch()}
              returnKeyType="search"
              style={{ color: colors.text }}
            />
          </View>
          {query.length > 0 && (
            <TouchableOpacity onPress={clearSearch} className="ml-2">
              <Text
                className="font-medium p-4"
                style={{ color: colors.primary }}
              >
                {"Clear"}
              </Text>
            </TouchableOpacity>
          )}
        </View>

        {/* Search Button */}
        <TouchableOpacity
          className="p-4 rounded-lg shadow-sm mb-4"
          onPress={() => handleSearch()}
          disabled={!query.trim()}
          style={{ backgroundColor: colors.primary }}
        >
          <Text
            className="font-semibold text-center"
            style={{ color: colors.text }}
          >
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
      colors,
    ]
  );

  // Loading state
  if (loading) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: colors.background }}>
        <View className="flex-1 justify-center items-center">
          <ActivityIndicator size="large" color={colors.primary} />
          <Text className="text-lg mt-4" style={{ color: colors.text }}>
            Searching {getScopeConfig(scope).label}...
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  // Error state
  if (error) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: colors.background }}>
        <View className="flex-1 justify-center items-center p-6">
          <Text
            className="text-lg text-center mb-4"
            style={{ color: colors.primary }}
          >
            {error}
          </Text>
          <Button title="Try Again" onPress={() => handleSearch()} />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.background }}>
      <View className="flex-1 px-4 -mt-8">
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
              colors={colors}
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
          colors={colors}
        />
      </View>
    </SafeAreaView>
  );
}
