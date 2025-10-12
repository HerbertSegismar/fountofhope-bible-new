import { useState, useCallback, useRef, useEffect } from "react";
import { LayoutChangeEvent, View, Alert, ScrollView } from "react-native";
import { Verse } from "../types";
import { useBibleDatabase } from "../context/BibleDatabaseContext";

export const useChapterLoader = (
  bookId: number,
  chapter: number,
  targetVerse: number | undefined
) => {
  const { bibleDB } = useBibleDatabase();
  const [verses, setVerses] = useState<Verse[]>([]);
  const [book, setBook] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [hasScrolledToVerse, setHasScrolledToVerse] = useState(false);
  const [verseMeasurements, setVerseMeasurements] = useState<
    Record<number, number>
  >({});
  const [chapterContainerY, setChapterContainerY] = useState(0);
  const [contentHeight, setContentHeight] = useState(1);
  const [scrollViewHeight, setScrollViewHeight] = useState(0);
  const [scrollViewReady, setScrollViewReady] = useState(false);
  const isMounted = useRef(true);
  const abortController = useRef<AbortController | null>(null); // REFACTOR: For aborting retries on unmount
  const scrollViewRef = useRef<ScrollView>(null); // Ensure typed
  const chapterContainerRef = useRef<View>(null);
  const defaultVerseHeight = 80;

  const loadChapter = useCallback(async () => {
    if (!bibleDB || !isMounted.current) return;
    abortController.current = new AbortController(); // REFACTOR: New signal for this load
    const signal = abortController.current.signal;
    setLoading(true);
    setHasScrolledToVerse(false);
    setScrollViewReady(false);
    setVerseMeasurements({});
    setChapterContainerY(0);

    const maxRetries = 3;
    let lastError: unknown;

    for (let attempt = 0; attempt < maxRetries; attempt++) {
      if (signal.aborted) {
        console.log("Load aborted");
        return;
      }
      try {
        // REFACTOR: Granular retries - separate for book and verses
        // Book caching: Skip if already loaded for this bookId
        if (!book || book.book_number !== bookId) {
          const bookDetails = await Promise.race([
            bibleDB.getBook(bookId),
            new Promise<never>((_, reject) =>
              setTimeout(() => reject(new Error("Query timeout")), 10000)
            ),
          ]);
          if (signal.aborted) return;
          setBook(bookDetails);
        }

        const chapterVerses = await Promise.race([
          bibleDB.getVerses(bookId, chapter),
          new Promise<never>((_, reject) =>
            setTimeout(() => reject(new Error("Query timeout")), 10000)
          ),
        ]);
        if (signal.aborted) return;
        setVerses(chapterVerses);
        if (isMounted.current) setLoading(false);
        return;
      } catch (error: any) {
        if (signal.aborted) {
          console.log("Query aborted");
          return;
        }
        lastError = error;
        if (error.message === "Query timeout") {
          console.log("Query timed out");
          // Continue to retry on timeout
        }
        if (attempt < maxRetries - 1) {
          const delay = 500 * Math.pow(2, attempt);
          await new Promise((resolve) => {
            const timeout = setTimeout(resolve, delay);
            return () => clearTimeout(timeout);
          });
        }
      }
    }
    if (isMounted.current) setLoading(false);
    if (lastError) {
      Alert.alert(
        "Error",
        `Failed to load chapter after ${maxRetries} attempts.`
      );
    }
  }, [bibleDB, bookId, chapter, book]); // REFACTOR: Added 'book' dep for caching logic

  useEffect(() => {
    isMounted.current = true;
    return () => {
      isMounted.current = false;
      abortController.current?.abort(); // REFACTOR: Abort pending loads on unmount
    };
  }, []);

  useEffect(() => {
    if (bibleDB) loadChapter();
  }, [bibleDB, bookId, chapter, loadChapter]); // REFACTOR: Stable deps

  const handleContentSizeChange = useCallback(
    (w: number, h: number) => setContentHeight(h),
    []
  );
  const handleScrollViewLayout = useCallback((event: LayoutChangeEvent) => {
    const { height } = event.nativeEvent.layout;
    setScrollViewHeight(height);
    setScrollViewReady(true);
  }, []);
  const handleChapterContainerLayout = useCallback(
    (event: LayoutChangeEvent) => {
      const { y } = event.nativeEvent.layout;
      setChapterContainerY(y);
    },
    []
  );
  const handleVerseLayout = useCallback(
    (verseNumber: number, event: LayoutChangeEvent) => {
      const { height } = event.nativeEvent.layout;
      if (height > 0) {
        setVerseMeasurements((prev) =>
          prev[verseNumber] === height
            ? prev
            : { ...prev, [verseNumber]: height }
        );
      }
    },
    []
  );

  const scrollToTargetVerse = useCallback(() => {
    if (!targetVerse || verses.length === 0 || !scrollViewRef.current)
      return false;
    const verseIndex = verses.findIndex((v) => v.verse === targetVerse);
    if (verseIndex === -1) return false;
    let cumulative = 0;
    for (let i = 0; i < verseIndex; i++) {
      cumulative += verseMeasurements[verses[i].verse] || defaultVerseHeight;
    }
    const verseHeight = verseMeasurements[targetVerse] || defaultVerseHeight;
    const scrollPosition = Math.max(
      0,
      cumulative - scrollViewHeight / 2 + verseHeight / 2
    );
    scrollViewRef.current.scrollTo({ y: scrollPosition, animated: true });
    setHasScrolledToVerse(true);
    return true;
  }, [verses, verseMeasurements, scrollViewHeight, targetVerse]);

  // REFACTOR: Stabilized deps (removed redundant ones if any)
  useEffect(() => {
    const ready =
      targetVerse &&
      verses.length > 0 &&
      scrollViewReady &&
      verses.findIndex((v) => v.verse === targetVerse) !== -1 &&
      verses
        .slice(0, verses.findIndex((v) => v.verse === targetVerse) + 1)
        .every((v) => verseMeasurements[v.verse]);
    if (ready && !hasScrolledToVerse) {
      requestAnimationFrame(() => {
        if (!hasScrolledToVerse && isMounted.current) scrollToTargetVerse();
      });
    }
  }, [
    verses,
    verseMeasurements,
    scrollViewReady,
    targetVerse,
    hasScrolledToVerse,
    scrollToTargetVerse,
  ]);

  return {
    verses,
    book,
    loading,
    hasScrolledToVerse,
    setHasScrolledToVerse,
    verseMeasurements,
    chapterContainerY,
    chapterContainerRef,
    contentHeight,
    scrollViewHeight,
    scrollViewReady,
    scrollViewRef,
    handleContentSizeChange,
    handleScrollViewLayout,
    handleChapterContainerLayout,
    handleVerseLayout,
    scrollToTargetVerse,
    loadChapter,
  };
};
