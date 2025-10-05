// context/HighlightsContext.tsx
import React, {
  createContext,
  useState,
  useContext,
  ReactNode,
  useEffect,
} from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { Verse } from "../types";

export interface HighlightedVerse {
  bookId: number;
  chapter: number;
  verse: number;
  timestamp: number;
}

interface HighlightsContextType {
  highlightedVerses: Map<string, HighlightedVerse>;
  toggleVerseHighlight: (verse: Verse) => void;
  isVerseHighlighted: (
    bookId: number,
    chapter: number,
    verse: number
  ) => boolean;
  clearHighlights: () => void;
  getChapterHighlights: (bookId: number, chapter: number) => number[];
  loading: boolean;
}

const HighlightsContext = createContext<HighlightsContextType | undefined>(
  undefined
);

const HIGHLIGHTS_STORAGE_KEY = "bible_highlights";

export const HighlightsProvider: React.FC<{ children: ReactNode }> = ({
  children,
}) => {
  const [highlightedVerses, setHighlightedVerses] = useState<
    Map<string, HighlightedVerse>
  >(new Map());
  const [loading, setLoading] = useState(true);

  // Load highlights from storage on app start
  useEffect(() => {
    loadHighlightsFromStorage();
  }, []);

  // Save highlights to storage whenever they change
  useEffect(() => {
    if (!loading) {
      saveHighlightsToStorage();
    }
  }, [highlightedVerses, loading]);

  const loadHighlightsFromStorage = async () => {
    try {
      const storedHighlights = await AsyncStorage.getItem(
        HIGHLIGHTS_STORAGE_KEY
      );
      if (storedHighlights) {
        const parsedHighlights = JSON.parse(storedHighlights);
        const highlightsMap = new Map<string, HighlightedVerse>();

        // Convert array back to Map
        parsedHighlights.forEach(([key, value]: [string, HighlightedVerse]) => {
          highlightsMap.set(key, value);
        });

        setHighlightedVerses(highlightsMap);
      }
    } catch (error) {
      console.error("Failed to load highlights from storage:", error);
    } finally {
      setLoading(false);
    }
  };

  const saveHighlightsToStorage = async () => {
    try {
      // Convert Map to array for storage
      const highlightsArray = Array.from(highlightedVerses.entries());
      await AsyncStorage.setItem(
        HIGHLIGHTS_STORAGE_KEY,
        JSON.stringify(highlightsArray)
      );
    } catch (error) {
      console.error("Failed to save highlights to storage:", error);
    }
  };

  const getVerseKey = (
    bookId: number,
    chapter: number,
    verse: number
  ): string => {
    return `${bookId}-${chapter}-${verse}`;
  };

  const toggleVerseHighlight = (verse: Verse) => {
    const key = getVerseKey(verse.book_number, verse.chapter, verse.verse);

    setHighlightedVerses((prev) => {
      const newHighlights = new Map(prev);

      if (newHighlights.has(key)) {
        newHighlights.delete(key);
      } else {
        newHighlights.set(key, {
          bookId: verse.book_number,
          chapter: verse.chapter,
          verse: verse.verse,
          timestamp: Date.now(),
        });
      }

      return newHighlights;
    });
  };

  const isVerseHighlighted = (
    bookId: number,
    chapter: number,
    verse: number
  ): boolean => {
    const key = getVerseKey(bookId, chapter, verse);
    return highlightedVerses.has(key);
  };

  const clearHighlights = () => {
    setHighlightedVerses(new Map());
  };

  const getChapterHighlights = (bookId: number, chapter: number): number[] => {
    const highlights: number[] = [];

    highlightedVerses.forEach((value, key) => {
      if (value.bookId === bookId && value.chapter === chapter) {
        highlights.push(value.verse);
      }
    });

    return highlights.sort((a, b) => a - b);
  };

  return (
    <HighlightsContext.Provider
      value={{
        highlightedVerses,
        toggleVerseHighlight,
        isVerseHighlighted,
        clearHighlights,
        getChapterHighlights,
        loading,
      }}
    >
      {children}
    </HighlightsContext.Provider>
  );
};

export const useHighlights = (): HighlightsContextType => {
  const context = useContext(HighlightsContext);
  if (context === undefined) {
    throw new Error("useHighlights must be used within a HighlightsProvider");
  }
  return context;
};
