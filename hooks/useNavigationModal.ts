// Updated hooks/useNavigationModal.ts
import { useState, useCallback, useEffect, useRef } from "react";
import { ScrollView, View, Alert } from "react-native";
import { Book, ChapterInfo } from "../types";
import { useBibleDatabase } from "../context/BibleDatabaseContext";
import { getTestament } from "../utils/testamentUtils";

export const useNavigationModal = (
  bookId: number,
  chapter: number,
  targetVerse: number | null,
  navigation: any,
  _route: any
) => {
  const { bibleDB } = useBibleDatabase();
  const [showNavigation, setShowNavigation] = useState(false);
  const [books, setBooks] = useState<Book[]>([]);
  const [oldTestament, setOldTestament] = useState<Book[]>([]);
  const [newTestament, setNewTestament] = useState<Book[]>([]);
  const [chapters, setChapters] = useState<ChapterInfo[]>([]);
  const [versesList, setVersesList] = useState<number[]>([]);
  const [selectedBook, setSelectedBook] = useState<Book | null>(null);
  const [selectedChapter, setSelectedChapter] = useState(chapter);
  const [selectedVerse, setSelectedVerse] = useState(targetVerse);
  const [hasTappedChapter, setHasTappedChapter] = useState(false);
  const [isLoadingNavigation, setIsLoadingNavigation] = useState(false);
  const [isLoadingChapters, setIsLoadingChapters] = useState(false);
  const [shouldScrollToChapters, setShouldScrollToChapters] = useState(false);
  const [chaptersCache, setChaptersCache] = useState<
    Record<number, ChapterInfo[]>
  >({});
  const modalScrollViewRef = useRef<ScrollView>(null);
  const chaptersSectionRef = useRef<View>(null);
  const versesSectionRef = useRef<View>(null);

  const loadBooks = useCallback(async () => {
    if (!bibleDB) return;
    try {
      setIsLoadingNavigation(true);
      const bookList = await bibleDB.getBooks();
      const booksWithTestament = bookList.map((book) => ({
        ...book,
        testament: getTestament(book.book_number, book.long_name),
      }));
      setBooks(booksWithTestament);
      setOldTestament(booksWithTestament.filter((b) => b.testament === "OT"));
      setNewTestament(booksWithTestament.filter((b) => b.testament === "NT"));
    } catch (error) {
      console.error("Failed to load books:", error);
      Alert.alert("Error", "Failed to load books");
    } finally {
      setIsLoadingNavigation(false);
    }
  }, [bibleDB]);

  const loadChaptersForBook = useCallback(
    async (bookNumber: number) => {
      if (!bibleDB || chaptersCache[bookNumber]) {
        if (chaptersCache[bookNumber]) {
          setChapters(chaptersCache[bookNumber]);
          setShouldScrollToChapters(true);
        }
        return;
      }
      try {
        setIsLoadingChapters(true);
        const chapterCount = await bibleDB.getChapterCount(bookNumber);
        const chapterPromises = Array.from(
          { length: chapterCount },
          (_, i) => i + 1
        ).map(async (ch) => {
          try {
            const verseCount = await bibleDB.getVerseCount(bookNumber, ch);
            return { chapter: ch, verseCount };
          } catch {
            return { chapter: ch, verseCount: 0 };
          }
        });
        const chapterData = await Promise.all(chapterPromises);
        setChapters(chapterData);
        setChaptersCache((prev) => ({ ...prev, [bookNumber]: chapterData }));
        setShouldScrollToChapters(true);
      } catch (error) {
        console.error("Failed to load chapters:", error);
        setChapters([]);
      } finally {
        setIsLoadingChapters(false);
      }
    },
    [bibleDB, chaptersCache]
  );

  const handleBookSelect = useCallback(
    async (book: Book) => {
      setSelectedBook(book);
      setSelectedChapter(1);
      setSelectedVerse(null);
      setHasTappedChapter(false);
      await loadChaptersForBook(book.book_number);
    },
    [loadChaptersForBook]
  );

  const handleChapterSelect = useCallback((ch: number) => {
    setSelectedChapter(ch);
    setSelectedVerse(null);
    setHasTappedChapter(true);
  }, []);

  const handleVerseSelect = useCallback(
    (verse: number) => {
      setSelectedVerse(verse);
      if (selectedBook) {
        setShowNavigation(false);
        navigation.navigate("Reader", {
          bookId: selectedBook.book_number,
          chapter: selectedChapter,
          verse,
          bookName: selectedBook.long_name,
          testament: selectedBook.testament,
        });
      }
    },
    [selectedBook, selectedChapter, navigation]
  );

  const handleNavigateToLocation = useCallback(() => {
    if (!selectedBook) return;
    setShowNavigation(false);
    navigation.navigate("Reader", {
      bookId: selectedBook.book_number,
      chapter: selectedChapter,
      verse: selectedVerse || undefined,
      bookName: selectedBook.long_name,
      bookColor: selectedBook.book_color,
      testament: selectedBook.testament,
    });
  }, [selectedBook, selectedChapter, selectedVerse, navigation]);

  const resetModalState = useCallback(() => {
    const currentBook = books.find((b) => b.book_number === bookId);
    if (currentBook) {
      setSelectedBook(currentBook);
      setSelectedChapter(chapter);
      setSelectedVerse(targetVerse || null);
    }
  }, [books, bookId, chapter, targetVerse]);

  useEffect(() => {
    if (bibleDB && books.length === 0) loadBooks();
  }, [bibleDB, loadBooks]);

  useEffect(() => {
    resetModalState();
  }, [bookId, chapter, targetVerse, resetModalState]);

  useEffect(() => {
    if (showNavigation) resetModalState();
  }, [showNavigation, resetModalState]);

  useEffect(() => {
    if (
      showNavigation &&
      selectedBook &&
      !chaptersCache[selectedBook.book_number]
    ) {
      loadChaptersForBook(selectedBook.book_number);
    }
  }, [showNavigation, selectedBook, chaptersCache, loadChaptersForBook]);

  useEffect(() => {
    if (selectedBook && selectedChapter && chapters.length > 0) {
      const chapterInfo = chapters.find((c) => c.chapter === selectedChapter);
      setVersesList(
        chapterInfo && chapterInfo.verseCount > 0
          ? Array.from({ length: chapterInfo.verseCount }, (_, i) => i + 1)
          : []
      );
    }
  }, [selectedBook, selectedChapter, chapters]);

  useEffect(() => {
    if (versesList.length > 0) setHasTappedChapter(true);
  }, [versesList.length]);

  const scrollToChaptersSection = useCallback(() => {
    if (modalScrollViewRef.current && chaptersSectionRef.current) {
      setTimeout(() => {
        chaptersSectionRef.current?.measure((x, y, w, h, px, py) => {
          modalScrollViewRef.current?.scrollTo({ y: py - 100, animated: true });
        });
      }, 100);
    }
  }, []);

  useEffect(() => {
    if (shouldScrollToChapters && !isLoadingNavigation) {
      scrollToChaptersSection();
      setShouldScrollToChapters(false);
    }
  }, [shouldScrollToChapters, isLoadingNavigation, scrollToChaptersSection]);

  return {
    showNavigation,
    setShowNavigation,
    books,
    oldTestament,
    newTestament,
    chapters,
    versesList,
    selectedBook,
    selectedChapter,
    selectedVerse,
    hasTappedChapter,
    setHasTappedChapter, // Added this line to fix the error
    isLoadingNavigation,
    isLoadingChapters,
    modalScrollViewRef,
    chaptersSectionRef,
    versesSectionRef,
    handleBookSelect,
    handleChapterSelect,
    handleVerseSelect,
    handleNavigateToLocation,
    resetModalState,
    loadBooks,
    loadChaptersForBook,
  };
};
