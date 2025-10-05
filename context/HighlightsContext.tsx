// context/HighlightsContext.tsx
import React, { createContext, useState, useContext, ReactNode } from "react";
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
}

const HighlightsContext = createContext<HighlightsContextType | undefined>(
  undefined
);

export const HighlightsProvider: React.FC<{ children: ReactNode }> = ({
  children,
}) => {
  const [highlightedVerses, setHighlightedVerses] = useState<
    Map<string, HighlightedVerse>
  >(new Map());

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
