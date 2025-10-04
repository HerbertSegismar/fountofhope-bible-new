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
  Modal,
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

// Updated SearchScope type with refined categories
type SearchScope =
  | "whole"
  | "old-testament"
  | "new-testament"
  | "law"
  | "historical"
  | "poetic"
  | "major-prophets"
  | "minor-prophets"
  | "gospels"
  | "historical-nt"
  | "letters"
  | "vision";

// Book ranges for each category based on your BIBLE_BOOKS_MAP
const SCOPE_RANGES = {
  whole: null,
  "old-testament": { start: 10, end: 460 },
  "new-testament": { start: 470, end: 730 },
  law: { start: 10, end: 50 }, // Genesis to Deuteronomy
  historical: { start: 60, end: 190 }, // Joshua to Esther
  poetic: { start: 220, end: 260 }, // Job to Song of Solomon
  "major-prophets": { start: 290, end: 340 }, // Isaiah to Daniel
  "minor-prophets": { start: 350, end: 460 }, // Hosea to Malachi
  gospels: { start: 470, end: 500 }, // Matthew to John
  "historical-nt": { start: 510, end: 510 }, // Acts only
  letters: { start: 520, end: 720 }, // Romans to Jude
  vision: { start: 730, end: 730 }, // Revelation only
};

const SCOPE_CONFIG = {
  whole: {
    label: "Whole Bible",
    description: "Search all books (Genesis - Revelation)",
    category: "All",
  },
  "old-testament": {
    label: "Old Testament",
    description: "Genesis - Malachi",
    category: "Old Testament",
  },
  "new-testament": {
    label: "New Testament",
    description: "Matthew - Revelation",
    category: "New Testament",
  },
  law: {
    label: "The Law",
    description: "Genesis, Exodus, Leviticus, Numbers, Deuteronomy",
    category: "Old Testament",
  },
  historical: {
    label: "Historical Books",
    description:
      "Joshua, Judges, Ruth, Samuel, Kings, Chronicles, Ezra, Nehemiah, Esther",
    category: "Old Testament",
  },
  poetic: {
    label: "Poetic Books",
    description: "Job, Psalms, Proverbs, Ecclesiastes, Song of Solomon",
    category: "Old Testament",
  },
  "major-prophets": {
    label: "Major Prophets",
    description: "Isaiah, Jeremiah, Lamentations, Ezekiel, Daniel",
    category: "Old Testament",
  },
  "minor-prophets": {
    label: "Minor Prophets",
    description:
      "Hosea, Joel, Amos, Obadiah, Jonah, Micah, Nahum, Habakkuk, Zephaniah, Haggai, Zechariah, Malachi",
    category: "Old Testament",
  },
  gospels: {
    label: "The Gospels",
    description: "Matthew, Mark, Luke, John",
    category: "New Testament",
  },
  "historical-nt": {
    label: "Historical Book",
    description: "Acts",
    category: "New Testament",
  },
  letters: {
    label: "The Letters",
    description: "Romans to Jude",
    category: "New Testament",
  },
  vision: {
    label: "The Book of Vision",
    description: "Revelation",
    category: "New Testament",
  },
};

// Group scopes by category for the dropdown
const SCOPE_CATEGORIES = {
  All: ["whole"],
  "Old Testament": [
    "old-testament",
    "law",
    "historical",
    "poetic",
    "major-prophets",
    "minor-prophets",
  ],
  "New Testament": [
    "new-testament",
    "gospels",
    "historical-nt",
    "letters",
    "vision",
  ],
};

// Memoized components remain the same until the main component...
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

// New Scope Dropdown Component
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
    const currentConfig = SCOPE_CONFIG[scope];

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
              <ScrollView>
                {Object.entries(SCOPE_CATEGORIES).map(([category, scopes]) => (
                  <View key={category}>
                    <View className="bg-blue-500 px-4 py-2 border-b border-gray-200">
                      <Text className="font-bold text-white text-sm">
                        {category}
                      </Text>
                    </View>
                    {scopes.map((scopeKey) => {
                      const config = SCOPE_CONFIG[scopeKey as SearchScope];
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
          bookRange: SCOPE_RANGES[scope] || undefined,
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

  const handleScopeChange = useCallback((newScope: SearchScope) => {
    setScope(newScope);
    setShowScopeDropdown(false);
    // Clear results when scope changes to avoid confusion
    setResults([]);
    setHasSearched(false);
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
    setShowBackToTop(false);
    backToTopAnimation.setValue(0);
  }, [backToTopAnimation]);

  const getResultStats = useCallback(() => {
    if (!hasSearched || loading) return null;

    if (results.length === 0) {
      return `No results found for "${query}" in ${SCOPE_CONFIG[scope].label}`;
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
              className="p-4 text-base"
              placeholder={`Search ${SCOPE_CONFIG[scope].label.toLowerCase()}...`}
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
            {resultStats || `Search ${SCOPE_CONFIG[scope].label}`}
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
    ]
  );

  // Loading state
  if (loading) {
    return (
      <SafeAreaView className="flex-1 bg-gray-50">
        <View className="flex-1 justify-center items-center">
          <ActivityIndicator size="large" color="#3B82F6" />
          <Text className="text-lg text-gray-600 mt-4">
            Searching {SCOPE_CONFIG[scope].label}...
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
