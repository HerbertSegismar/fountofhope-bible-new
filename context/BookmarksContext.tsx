// context/BookmarksContext.tsx
import React, {
  createContext,
  useState,
  useEffect,
  ReactNode,
  useCallback,
} from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { Verse } from "../types";

interface Bookmark extends Verse {
  id: string;
  title?: string;
  note?: string;
  createdAt: string;
  color?: string;
}

interface BookmarksContextType {
  bookmarks: Bookmark[];
  addBookmark: (verse: Verse) => void;
  removeBookmark: (id: string) => void;
  updateBookmark: (id: string, updates: Partial<Bookmark>) => void;
  isBookmarked: (verse: Verse) => boolean;
  getBookmarkId: (verse: Verse) => string;
  loadBookmarks: () => Promise<void>;
}

export const BookmarksContext = createContext<BookmarksContextType>({
  bookmarks: [],
  addBookmark: () => {},
  removeBookmark: () => {},
  updateBookmark: () => {},
  isBookmarked: () => false,
  getBookmarkId: () => "",
  loadBookmarks: async () => {},
});

export const BookmarksProvider = ({ children }: { children: ReactNode }) => {
  const [bookmarks, setBookmarks] = useState<Bookmark[]>([]);
  const STORAGE_KEY = "@bible_app_bookmarks";

  // Generate consistent bookmark ID
  const getBookmarkId = useCallback((verse: Verse): string => {
    return `${verse.book_number}-${verse.chapter}-${verse.verse}`;
  }, []);

  // Check if verse is bookmarked
  const isBookmarked = useCallback(
    (verse: Verse): boolean => {
      const id = getBookmarkId(verse);
      return bookmarks.some((bookmark) => bookmark.id === id);
    },
    [bookmarks, getBookmarkId]
  );

  // Load bookmarks from storage
  const loadBookmarks = useCallback(async (): Promise<void> => {
    try {
      const json = await AsyncStorage.getItem(STORAGE_KEY);
      if (json) {
        const storedBookmarks = JSON.parse(json);
        setBookmarks(storedBookmarks);
      }
    } catch (err) {
      console.error("Failed to load bookmarks:", err);
    }
  }, []);

  // Save bookmarks to storage
  const saveBookmarks = useCallback(
    async (newBookmarks: Bookmark[]): Promise<void> => {
      try {
        setBookmarks(newBookmarks);
        await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(newBookmarks));
      } catch (err) {
        console.error("Failed to save bookmarks:", err);
        throw err; // Re-throw to handle in calling functions
      }
    },
    []
  );

  // Add a new bookmark
  const addBookmark = useCallback(
    (verse: Verse): void => {
      const exists = isBookmarked(verse);
      if (exists) return;

      const newBookmark: Bookmark = {
        ...verse,
        id: getBookmarkId(verse),
        title: verse.text.slice(0, 50) + (verse.text.length > 50 ? "..." : ""),
        createdAt: new Date().toISOString(),
        color: "#3B82F6", // Changed to a more pleasant blue
      };

      saveBookmarks([...bookmarks, newBookmark]);
    },
    [bookmarks, getBookmarkId, isBookmarked, saveBookmarks]
  );

  // Remove a bookmark
  const removeBookmark = useCallback(
    (id: string): void => {
      const updated = bookmarks.filter((b) => b.id !== id);
      saveBookmarks(updated);
    },
    [bookmarks, saveBookmarks]
  );

  // Update an existing bookmark
  const updateBookmark = useCallback(
    (id: string, updates: Partial<Bookmark>): void => {
      const updated = bookmarks.map((bookmark) =>
        bookmark.id === id ? { ...bookmark, ...updates } : bookmark
      );
      saveBookmarks(updated);
    },
    [bookmarks, saveBookmarks]
  );

  // Load bookmarks on mount
  useEffect(() => {
    loadBookmarks();
  }, [loadBookmarks]);

  const contextValue: BookmarksContextType = {
    bookmarks,
    addBookmark,
    removeBookmark,
    updateBookmark,
    isBookmarked,
    getBookmarkId,
    loadBookmarks,
  };

  return (
    <BookmarksContext.Provider value={contextValue}>
      {children}
    </BookmarksContext.Provider>
  );
};
