// context/BookmarksContext.tsx
import React, { createContext, useState, useEffect, ReactNode, useCallback } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { Verse } from "../types";

interface Bookmark extends Verse {
  id: string; // unique id for bookmark
  title?: string;
  note?: string;
  createdAt: string; // store as ISO string
  color?: string;
}

interface BookmarksContextType {
  bookmarks: Bookmark[];
  addBookmark: (verse: Verse) => void;
  removeBookmark: (id: string) => void;
  loadBookmarks: () => void;
}

export const BookmarksContext = createContext<BookmarksContextType>({
  bookmarks: [],
  addBookmark: () => {},
  removeBookmark: () => {},
  loadBookmarks: () => {},
});

export const BookmarksProvider = ({ children }: { children: ReactNode }) => {
  const [bookmarks, setBookmarks] = useState<Bookmark[]>([]);

  const STORAGE_KEY = "@bible_app_bookmarks";

  useEffect(() => {
    loadBookmarks();
  }, []);

  const loadBookmarks = async () => {
    try {
      const json = await AsyncStorage.getItem(STORAGE_KEY);
      if (json) setBookmarks(JSON.parse(json));
    } catch (err) {
      console.error("Failed to load bookmarks:", err);
    }
  };

  const saveBookmarks = async (newBookmarks: Bookmark[]) => {
    try {
      setBookmarks(newBookmarks);
      await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(newBookmarks));
    } catch (err) {
      console.error("Failed to save bookmarks:", err);
    }
  };

  const addBookmark = (verse: Verse) => {
    const exists = bookmarks.find(
      (b) =>
        b.book_number === verse.book_number &&
        b.chapter === verse.chapter &&
        b.verse === verse.verse
    );
    if (exists) return;

    const newBookmark: Bookmark = {
      ...verse,
      id: `${verse.book_number}-${verse.chapter}-${verse.verse}`,
      title: verse.text.slice(0, 50),
      createdAt: new Date().toISOString(),
      color: "#FF6B6B",
    };
    saveBookmarks([...bookmarks, newBookmark]);
  };

  const removeBookmark = (id: string) => {
    const updated = bookmarks.filter((b) => b.id !== id);
    saveBookmarks(updated);
  };

  return (
    <BookmarksContext.Provider
      value={{ bookmarks, addBookmark, removeBookmark, loadBookmarks }}
    >
      {children}
    </BookmarksContext.Provider>
  );
};
