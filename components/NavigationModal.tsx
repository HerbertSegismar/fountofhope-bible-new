import { useEffect, useState, useCallback, useRef } from "react";
import {
  Modal,
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  Dimensions,
  Alert,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { Book, ChapterInfo } from "../types";
import { BibleDatabase } from "../services/BibleDatabase";
import { lightenColor } from "../utils/themeUtils";
import { getTestament } from "../utils/testamentUtils";
import { useTheme } from "../context/ThemeContext";

const { width } = Dimensions.get("window");
const BOOK_CARD_WIDTH = (width - 48) / 6;

interface NavigationModalProps {
  visible: boolean;
  onClose: () => void;
  colors: any;
  primaryTextColor: string;
  navigationTarget: "primary" | "secondary";
  currentVersion: string;
  onLocationSelect: (location: {
    book: Book;
    chapter: number;
    verse?: number;
  }) => void;
  bibleDB: BibleDatabase;
  secondaryDB?: React.RefObject<BibleDatabase | null>;
}

export const NavigationModal: React.FC<NavigationModalProps> = ({
  visible,
  onClose,
  colors,
  primaryTextColor,
  navigationTarget,
  currentVersion,
  onLocationSelect,
  bibleDB,
  secondaryDB,
}) => {
  const [, setBooks] = useState<Book[]>([]);
  const [oldTestament, setOldTestament] = useState<Book[]>([]);
  const [newTestament, setNewTestament] = useState<Book[]>([]);
  const [isLoadingNavigation, setIsLoadingNavigation] = useState(true);
  const [isDataLoaded, setIsDataLoaded] = useState(false);
  const [selectedBook, setSelectedBook] = useState<Book | null>(null);
  const [selectedChapter, setSelectedChapter] = useState(1);
  const [selectedVerse, setSelectedVerse] = useState<number | null>(null);
  const [hasTappedChapter, setHasTappedChapter] = useState(false);
  const [chapters, setChapters] = useState<ChapterInfo[]>([]);
  const [versesList, setVersesList] = useState<number[]>([]);
  const [isLoadingChapters, setIsLoadingChapters] = useState(false);
  const [chaptersY, setChaptersY] = useState<number | null>(null);
  const [versesY, setVersesY] = useState<number | null>(null);

  const effectiveDB =
    navigationTarget === "secondary" && secondaryDB?.current
      ? secondaryDB.current
      : bibleDB;
  const effectiveVersion =
    navigationTarget === "secondary" && secondaryDB?.current
      ? secondaryDB.current.getDatabaseName()
      : currentVersion;

  const { theme, navTheme } = useTheme();
  const primaryColor = navTheme.colors.primary;
  const modalScrollViewRef = useRef<ScrollView | null>(null);

  const bgClass = theme === "dark" ? "bg-gray-900" : "bg-gray-50";
  const textSecondaryClass =
    theme === "dark" ? "text-gray-400" : "text-gray-500";
  const textTertiaryClass =
    theme === "dark" ? "text-gray-300" : "text-gray-600";

  useEffect(() => {
    if (visible) {
      resetInternalState();
      loadBooks();
      setTimeout(() => {
        modalScrollViewRef.current?.scrollTo({ y: 0, animated: false });
      }, 100);
    }
  }, [visible, effectiveDB, effectiveVersion]);

  const resetInternalState = useCallback(() => {
    setSelectedBook(null);
    setSelectedChapter(1);
    setSelectedVerse(null);
    setHasTappedChapter(false);
    setChapters([]);
    setVersesList([]);
    setIsLoadingChapters(false);
    setChaptersY(null);
    setVersesY(null);
    setIsDataLoaded(false);
  }, []);

  useEffect(() => {
    if (selectedBook && chapters.length > 0 && chaptersY !== null) {
      setTimeout(() => {
        modalScrollViewRef.current?.scrollTo({
          y: chaptersY - 100,
          animated: true,
        });
      }, 100);
    }
  }, [selectedBook, chapters, chaptersY]);

  useEffect(() => {
    if (hasTappedChapter && versesList.length > 0 && versesY !== null) {
      setTimeout(() => {
        modalScrollViewRef.current?.scrollTo({
          y: versesY - 80,
          animated: true,
        });
      }, 200);
    }
  }, [hasTappedChapter, versesList, versesY]);

  useEffect(() => {
    if (selectedVerse && selectedBook && selectedChapter) {
      setTimeout(() => {
        handleNavigateToLocation();
      }, 300);
    }
  }, [selectedVerse, selectedBook, selectedChapter]);

  const loadBooks = useCallback(async () => {
    if (!effectiveDB) {
      setIsLoadingNavigation(false);
      return;
    }

    try {
      setIsLoadingNavigation(true);
      setIsDataLoaded(false);

      const bookList = await effectiveDB.getBooks();

      const booksWithTestament = bookList.map((book) => ({
        ...book,
        testament: getTestament(book.book_number, book.long_name),
      }));

      setBooks(booksWithTestament);

      const ot = booksWithTestament.filter((book) => book.testament === "OT");
      const nt = booksWithTestament.filter((book) => book.testament === "NT");
      setOldTestament(ot);
      setNewTestament(nt);
      setIsDataLoaded(true);
    } catch (error) {
      console.error("Failed to load books:", error);
      Alert.alert("Error", "Failed to load books");
    } finally {
      setIsLoadingNavigation(false);
    }
  }, [effectiveDB]);

  const handleBookSelect = useCallback(
    async (book: Book) => {
      setSelectedBook(book);
      setSelectedChapter(1);
      setSelectedVerse(null);
      setHasTappedChapter(false);
      setVersesList([]);
      setChaptersY(null);
      setVersesY(null);

      if (!effectiveDB) return;

      setIsLoadingChapters(true);
      try {
        const chapterCount = await effectiveDB.getChapterCount(
          book.book_number
        );
        const chapterInfos: ChapterInfo[] = [];
        for (let ch = 1; ch <= chapterCount; ch++) {
          const verseCount = await effectiveDB.getVerseCount(
            book.book_number,
            ch
          );
          chapterInfos.push({ chapter: ch, verseCount });
        }
        setChapters(chapterInfos);
      } catch (error) {
        console.error("Failed to load chapters:", error);
        Alert.alert("Error", "Failed to load chapters");
      } finally {
        setIsLoadingChapters(false);
      }
    },
    [effectiveDB]
  );

  const handleChapterSelect = useCallback(
    async (chapter: number) => {
      setSelectedChapter(chapter);
      setHasTappedChapter(true);
      setSelectedVerse(null);
      setVersesY(null);

      if (!selectedBook || !effectiveDB) return;

      try {
        const verseCount = await effectiveDB.getVerseCount(
          selectedBook.book_number,
          chapter
        );
        setVersesList(Array.from({ length: verseCount }, (_, i) => i + 1));
      } catch (error) {
        console.error("Failed to load verses list:", error);
      }
    },
    [selectedBook, effectiveDB]
  );

  const handleVerseSelect = useCallback((verse: number) => {
    setSelectedVerse(verse);
  }, []);

  const handleNavigateToLocation = useCallback(() => {
    if (!selectedBook) return;

    onLocationSelect({
      book: selectedBook,
      chapter: selectedChapter,
      verse: selectedVerse || undefined,
    });

    onClose();
  }, [selectedBook, selectedChapter, selectedVerse, onLocationSelect, onClose]);

  const handleClose = useCallback(() => {
    resetInternalState();
    onClose();
  }, [resetInternalState, onClose]);

  const BookCard = useCallback(
    ({ book, color }: { book: Book; color: string }) => {
      const getButtonStyles = (bookColor: string, currentTheme: string) => {
        let bgColor: string;
        let textColor: string;
        if (currentTheme === "dark") {
          bgColor = bookColor;
          textColor = "#ffffff";
        } else {
          const lightened = lightenColor(bookColor, 0.85);
          bgColor = lightened ?? bookColor;
          textColor = "#111827";
        }
        return { bgColor, textColor };
      };

      const { bgColor } = getButtonStyles(book.book_color || color, theme);

      return (
        <TouchableOpacity
          key={book.book_number}
          className="relative p-3 rounded-lg shadow-sm mb-3"
          style={{
            width: BOOK_CARD_WIDTH,
            backgroundColor: bgColor,
          }}
          onPress={() => handleBookSelect(book)}
          activeOpacity={0.7}
        >
          <Text
            className="font-semibold text-center text-sm"
            style={{ color: "#30415bff" }}
            numberOfLines={2}
            adjustsFontSizeToFit
            minimumFontScale={0.8}
          >
            {book.short_name}
          </Text>
        </TouchableOpacity>
      );
    },
    [handleBookSelect, theme]
  );

  if (isLoadingNavigation) {
    return (
      <Modal
        visible={visible}
        transparent
        animationType="slide"
        onRequestClose={handleClose}
      >
        <SafeAreaView style={{ flex: 1, backgroundColor: colors.card }}>
          <View className={`flex-1 justify-center items-center ${bgClass}`}>
            <ActivityIndicator size="large" color={primaryColor} />
            <Text className={`text-lg ${textTertiaryClass} mt-4`}>
              Loading books...
            </Text>
            <Text className={`text-sm ${textSecondaryClass} mt-2`}>
              Version: {effectiveVersion.replace(".sqlite3", "").toUpperCase()}
            </Text>
          </View>
        </SafeAreaView>
      </Modal>
    );
  }

  if (!effectiveDB) {
    return (
      <Modal
        visible={visible}
        transparent
        animationType="slide"
        onRequestClose={handleClose}
      >
        <SafeAreaView style={{ flex: 1, backgroundColor: colors.card }}>
          <View className={`flex-1 justify-center items-center ${bgClass} p-6`}>
            <Text className="text-lg text-red-500 text-center mb-4">
              Database not available
            </Text>
            <TouchableOpacity
              onPress={loadBooks}
              className="px-4 py-2 rounded-lg"
              style={{ backgroundColor: primaryColor }}
            >
              <Text className="text-white font-medium">Try Again</Text>
            </TouchableOpacity>
          </View>
        </SafeAreaView>
      </Modal>
    );
  }

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={handleClose}
    >
      <SafeAreaView style={{ flex: 1, backgroundColor: colors.card }}>
        <View
          style={{
            backgroundColor: colors.primary,
            paddingHorizontal: 16,
            paddingVertical: 16,
          }}
        >
          <View className="flex-row justify-between items-center">
            <TouchableOpacity onPress={handleClose} className="p-2">
              <Ionicons name="arrow-back" size={24} color={primaryTextColor} />
            </TouchableOpacity>
            <Text
              style={{
                color: primaryTextColor,
                fontWeight: "bold",
                fontSize: 18,
              }}
            >
              Choose Passage to Read
            </Text>
            <View style={{ width: 24 }} />
          </View>
        </View>

        {isDataLoaded ? (
          <ScrollView
            ref={modalScrollViewRef}
            className={`flex-1 p-4 ${bgClass}`}
            showsVerticalScrollIndicator
            style={{ backgroundColor: colors.background?.default }}
          >
            <View className="mb-6">
              <Text
                style={{
                  color: colors.text?.primary,
                  fontSize: 18,
                  fontWeight: "600",
                  marginBottom: 12,
                }}
              >
                Select Book
              </Text>

              {oldTestament.length > 0 && (
                <View className="mb-6">
                  <View className="flex-row items-center justify-between mb-3">
                    <Text
                      style={{
                        color: colors.primary,
                        fontSize: 20,
                        fontWeight: "bold",
                      }}
                    >
                      Old Testament
                    </Text>
                    <Text style={{ color: colors.muted, fontSize: 12 }}>
                      {oldTestament.length} books
                    </Text>
                  </View>
                  <View className="flex-row flex-wrap justify-between">
                    {oldTestament.map((book) => (
                      <BookCard
                        key={book.book_number}
                        book={book}
                        color="#DC2626"
                      />
                    ))}
                  </View>
                </View>
              )}

              {newTestament.length > 0 && (
                <View className="mb-6">
                  <View className="flex-row items-center justify-between mb-3">
                    <Text
                      style={{
                        color: colors.primary,
                        fontSize: 20,
                        fontWeight: "bold",
                      }}
                    >
                      New Testament
                    </Text>
                    <Text style={{ color: colors.muted, fontSize: 12 }}>
                      {newTestament.length} books
                    </Text>
                  </View>
                  <View className="flex-row flex-wrap justify-between">
                    {newTestament.map((book) => (
                      <BookCard
                        key={book.book_number}
                        book={book}
                        color="#059669"
                      />
                    ))}
                  </View>
                </View>
              )}
            </View>

            {selectedBook && (
              <View
                style={{
                  backgroundColor: colors.primary,
                  borderRadius: 8,
                  padding: 8,
                  marginBottom: 16,
                }}
              >
                <Text
                  style={{
                    color: "white",
                    fontWeight: "600",
                    textAlign: "center",
                    fontSize: 16,
                  }}
                >
                  {`${selectedBook.long_name} ${selectedChapter}${selectedVerse ? `:${selectedVerse}` : ""}`}
                </Text>
                <Text
                  style={{
                    color: "white",
                    fontSize: 12,
                    textAlign: "center",
                    marginTop: 4,
                  }}
                >
                  {`${chapters.length} ${chapters.length > 1 ? "chapters available" : "chapter available"}`}
                </Text>
              </View>
            )}

            {selectedBook && chapters.length > 0 && (
              <View
                onLayout={(event) => {
                  const { y } = event.nativeEvent.layout;
                  setChaptersY(y);
                }}
                className="mb-6"
              >
                <Text
                  style={{
                    color: colors.text?.primary,
                    fontSize: 18,
                    fontWeight: "600",
                    marginBottom: 12,
                  }}
                >
                  Select Chapter
                </Text>
                {isLoadingChapters ? (
                  <View className="flex-row justify-center py-4">
                    <ActivityIndicator size="small" color={colors.primary} />
                  </View>
                ) : (
                  <View className="flex-row flex-wrap gap-2 justify-center">
                    {chapters.map((chapterInfo) => (
                      <TouchableOpacity
                        key={chapterInfo.chapter}
                        onPress={() => handleChapterSelect(chapterInfo.chapter)}
                        className={`rounded-lg border items-center justify-center`}
                        style={{
                          width: 40,
                          height: 40,
                          borderColor: colors.muted,
                          backgroundColor:
                            selectedChapter === chapterInfo.chapter
                              ? colors.primary
                              : colors.card,
                        }}
                      >
                        <Text
                          style={{
                            fontWeight: "bold",
                            fontSize: 12,
                            color:
                              selectedChapter === chapterInfo.chapter
                                ? primaryTextColor
                                : colors.primary,
                          }}
                        >
                          {chapterInfo.chapter}
                        </Text>
                        <Text
                          style={{
                            fontSize: 10,
                            color:
                              selectedChapter === chapterInfo.chapter
                                ? primaryTextColor + "80"
                                : colors.muted,
                          }}
                        >
                          {chapterInfo.verseCount} v
                          {chapterInfo.verseCount > 1 ? "s" : ""}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                )}
              </View>
            )}

            {!hasTappedChapter && selectedBook && (
              <View className="mb-6">
                <Text
                  style={{
                    color: colors.muted,
                    fontSize: 12,
                    marginBottom: 12,
                  }}
                >
                  Choose a chapter to reveal verse selection
                </Text>
              </View>
            )}
            {hasTappedChapter &&
              selectedBook &&
              selectedChapter &&
              versesList.length > 0 && (
                <View
                  onLayout={(event) => {
                    const { y } = event.nativeEvent.layout;
                    setVersesY(y);
                  }}
                  className="mb-6"
                >
                  <Text
                    style={{
                      color: colors.text?.primary,
                      fontSize: 18,
                      fontWeight: "600",
                      marginBottom: 12,
                    }}
                  >
                    Select Verse{" "}
                    {selectedVerse && `- Selected: ${selectedVerse}`}
                  </Text>
                  <Text
                    style={{
                      color: colors.muted,
                      fontSize: 12,
                      marginBottom: 12,
                    }}
                  >
                    "Choose any verse to navigate directly"
                  </Text>
                  <View className="flex-row flex-wrap gap-1">
                    {versesList.map((verse) => (
                      <TouchableOpacity
                        key={verse}
                        onPress={() => handleVerseSelect(verse)}
                        className={`size-10 rounded-lg items-center justify-center border ${
                          selectedVerse === verse ? "border-2" : "border"
                        }`}
                        style={{
                          borderColor: colors.primary,
                          backgroundColor:
                            selectedVerse === verse
                              ? lightenColor(colors.primary, 0.8)
                              : colors.card,
                        }}
                      >
                        <Text
                          style={{
                            color: selectedVerse === verse ? "white" : colors.text?.primary,
                            fontSize: 12,
                            fontWeight:
                              selectedVerse === verse ? "bold" : "500",
                          }}
                        >
                          {verse}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                </View>
              )}

            {!selectedVerse && selectedBook && (
              <TouchableOpacity
                onPress={handleNavigateToLocation}
                disabled={!selectedBook}
                className={`p-4 rounded-lg mt-4 mb-20`}
                style={{
                  backgroundColor: colors.primary,
                  opacity: !selectedBook ? 0.5 : 1,
                }}
              >
                <Text
                  style={{
                    color: "white",
                    fontWeight: "600",
                    textAlign: "center",
                    fontSize: 16,
                  }}
                >
                  {`Go to ${selectedBook.long_name} ${selectedChapter}`}
                </Text>
                <Text
                  style={{
                    color: "white",
                    fontSize: 12,
                    textAlign: "center",
                    marginTop: 4,
                  }}
                >
                  Navigate to chapter {selectedChapter}
                </Text>
              </TouchableOpacity>
            )}
          </ScrollView>
        ) : (
          <View className={`flex-1 justify-center items-center ${bgClass}`}>
            <ActivityIndicator size="large" color={primaryColor} />
            <Text className={`text-lg ${textTertiaryClass} mt-4`}>
              Preparing books...
            </Text>
          </View>
        )}
      </SafeAreaView>
    </Modal>
  );
};
