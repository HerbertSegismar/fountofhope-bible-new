import { useState, useCallback, useRef, useEffect } from "react";
import {
  LayoutChangeEvent,
  View,
  Alert,
  FlatList,
  Dimensions,
} from "react-native";
import { Verse } from "../types";
import { useBibleDatabase } from "../context/BibleDatabaseContext";
const { height: SCREEN_HEIGHT } = Dimensions.get("window");
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
  const [contentHeight, setContentHeight] = useState(1);
  const [scrollViewHeight, setScrollViewHeight] = useState(0);
  const [scrollViewReady, setScrollViewReady] = useState(false);
  const isMounted = useRef(true);
  const abortController = useRef<AbortController | null>(null);
  const flatListRef = useRef<FlatList<Verse>>(null);
  const chapterContainerRef = useRef<View>(null);
  const scrollAttemptsRef = useRef(0);
  const maxScrollAttempts = 5;
  const defaultVerseHeight = 80;
  const blankLineHeight = 12;
  const estimatedItemSize = defaultVerseHeight + blankLineHeight;
  const loadChapter = useCallback(async () => {
    if (!bibleDB || !isMounted.current) return;
    abortController.current = new AbortController();
    const signal = abortController.current.signal;
    setLoading(true);
    setHasScrolledToVerse(false);
    setScrollViewReady(false);
    setVerseMeasurements({});
    scrollAttemptsRef.current = 0;
    const maxRetries = 3;
    let lastError: unknown;
    for (let attempt = 0; attempt < maxRetries; attempt++) {
      if (signal.aborted) {
        return;
      }
      try {
        if (!book || book.book_number !== bookId) {
          const bookDetails = await bibleDB.getBook(bookId);
          if (signal.aborted) return;
          setBook(bookDetails);
        }
        const chapterVerses = await bibleDB.getVerses(bookId, chapter);
        if (signal.aborted) return;
        setVerses(chapterVerses);
        if (isMounted.current) setLoading(false);
        return;
      } catch (error: any) {
        if (signal.aborted) return;
        lastError = error;
        if (attempt < maxRetries - 1) {
          await new Promise((resolve) => setTimeout(resolve, 500));
        }
      }
    }
    if (isMounted.current) setLoading(false);
    if (lastError) {
      Alert.alert("Error", "Failed to load chapter");
    }
  }, [bibleDB, bookId, chapter, book]);
  useEffect(() => {
    isMounted.current = true;
    return () => {
      isMounted.current = false;
      abortController.current?.abort();
    };
  }, []);
  useEffect(() => {
    if (bibleDB) loadChapter();
  }, [bibleDB, bookId, chapter, loadChapter]);
  useEffect(() => {
    if (targetVerse) {
      setHasScrolledToVerse(false);
      scrollAttemptsRef.current = 0;
    }
  }, [targetVerse, bookId, chapter]);
  const handleContentSizeChange = useCallback((_w: number, h: number) => {
    setContentHeight(h);
  }, []);
  const handleScrollViewLayout = useCallback((event: LayoutChangeEvent) => {
    const { height } = event.nativeEvent.layout;
    setScrollViewHeight(height);
    setScrollViewReady(true);
  }, []);
  const handleVerseLayout = useCallback(
    (verseNumber: number, event: LayoutChangeEvent) => {
      const { height } = event.nativeEvent.layout;
      if (height > 0) {
        setVerseMeasurements((prev) => ({
          ...prev,
          [verseNumber]: height,
        }));
      }
    },
    []
  );
  const getItemLayout = useCallback(
    (data: Verse[] | null, index: number) => {
      if (!data || index > data.length - 1) {
        return { length: defaultVerseHeight, offset: 0, index };
      }
      let offset = 0;
      for (let i = 0; i < index; i++) {
        offset += verseMeasurements[data[i].verse] || defaultVerseHeight;
        if (i < index - 1) {
          offset += blankLineHeight;
        }
      }
      const length = verseMeasurements[data[index].verse] || defaultVerseHeight;
      return { length, offset, index };
    },
    [verseMeasurements]
  );
  const scrollToTargetVerse = useCallback(() => {
    if (!targetVerse || verses.length === 0 || !flatListRef.current) {
      return false;
    }
    const verseIndex = verses.findIndex((v) => v.verse === targetVerse);
    if (verseIndex === -1) return false;
    if (scrollAttemptsRef.current >= maxScrollAttempts) {
      setHasScrolledToVerse(true);
      return false;
    }
    scrollAttemptsRef.current += 1;
    flatListRef.current.scrollToIndex({
      animated: true,
      index: verseIndex,
      viewPosition: 0,
      viewOffset: -SCREEN_HEIGHT / 2,
    });
    setHasScrolledToVerse(true);
    return true;
  }, [verses, targetVerse]);
  useEffect(() => {
    if (
      !targetVerse ||
      hasScrolledToVerse ||
      !scrollViewReady ||
      verses.length === 0
    ) {
      return;
    }
    const verseIndex = verses.findIndex((v) => v.verse === targetVerse);
    if (verseIndex === -1) return;
    const timeoutId = setTimeout(() => {
      if (isMounted.current && !hasScrolledToVerse) {
        scrollToTargetVerse();
      }
    }, 100);
    return () => clearTimeout(timeoutId);
  }, [
    verses,
    scrollViewReady,
    targetVerse,
    hasScrolledToVerse,
    scrollToTargetVerse,
  ]);
  useEffect(() => {
    if (
      targetVerse &&
      !hasScrolledToVerse &&
      scrollViewReady &&
      verses.length > 0 &&
      verseMeasurements[targetVerse]
    ) {
      setTimeout(() => {
        if (isMounted.current && !hasScrolledToVerse) {
          scrollToTargetVerse();
        }
      }, 100);
    }
  }, [
    verseMeasurements,
    targetVerse,
    hasScrolledToVerse,
    scrollViewReady,
    verses.length,
  ]);
  return {
    verses,
    book,
    loading,
    hasScrolledToVerse,
    verseMeasurements,
    contentHeight,
    scrollViewHeight,
    scrollViewReady,
    flatListRef,
    chapterContainerRef,
    handleContentSizeChange,
    handleScrollViewLayout,
    handleVerseLayout,
    scrollToTargetVerse,
    loadChapter,
    getItemLayout,
    estimatedItemSize,
    blankLineHeight,
  };
};
