// types/index.ts
export interface Verse {
  book_number: number;
  chapter: number;
  verse: number;
  text: string;
  book_name?: string;
  book_color?: string;
  testament?: "OT" | "NT";
}

export interface Book {
  book_number: number;
  short_name: string;
  long_name: string;
  book_color: string;
  is_present?: boolean;
  testament?: "OT" | "NT";
  chapters?: number;
}

export type RootStackParamList = {
  Home: undefined;
  BookList: undefined;
  Search: undefined;
  Bookmarks: undefined;
  Reader: {
    bookId: number;
    chapter: number;
    bookName: string;
  };
  ChapterList: {
    book: Book;
  };
  VerseList: {
    book: Book;
    chapter: number;
    bookName?: string;
  };
};

// Additional interfaces for your 6-table structure
export interface Story {
  book_number: number;
  chapter: number;
  verse: number;
  order_if_several: number;
  title: string;
}

export interface SearchOptions {
  limit?: number;
  bookNumber?: number;
  chapter?: number;
  bookRange?: {
    start: number;
    end: number;
  };
}

export interface Introduction {
  book_number: number;
  introduction: string;
}

export interface DatabaseInfo {
  name: string;
  value: string;
}

// Search-related types
export interface SearchOptions {
  limit?: number;
  exactMatch?: boolean;
  caseSensitive?: boolean;
  wholeWords?: boolean;
  bookNumbers?: number[];
}

export interface VerseRange {
  bookNumber: number;
  chapter: number;
  startVerse: number;
  endVerse: number;
}

// Navigation helper types
export type ScreenNames = keyof RootStackParamList;

// Utility types for component props
export type NavigationProps<T extends keyof RootStackParamList> = {
  navigation: {
    navigate: (screen: T, params?: RootStackParamList[T]) => void;
    goBack: () => void;
    // Add other navigation methods as needed
  };
  route: {
    params: RootStackParamList[T];
  };
};

// Bible reference type for parsing and displaying references
export interface BibleReference {
  bookNumber: number;
  bookName: string;
  chapter: number;
  startVerse?: number;
  endVerse?: number;
}

export interface DatabaseMigration {
  version: number;
  name: string;
  sql: string;
}

export interface DatabaseStats {
  bookCount: number;
  verseCount: number;
  storyCount: number;
  introductionCount: number;
  lastUpdated?: Date;
}

// Reading progress type
export interface ReadingProgress {
  bookNumber: number;
  chapter: number;
  verse: number;
  timestamp: Date;
  percentage: number;
}

// Bookmark type
export interface Bookmark {
  id: string;
  bookNumber: number;
  chapter: number;
  verse: number;
  title: string;
  note?: string;
  createdAt: Date;
  color?: string;
}

// Note type
export interface Note {
  id: string;
  bookNumber: number;
  chapter: number;
  verse: number;
  content: string;
  createdAt: Date;
  updatedAt: Date;
}

// Highlight type
export interface Highlight {
  id: string;
  bookNumber: number;
  chapter: number;
  verse: number;
  color: string;
  createdAt: Date;
}

// Theme types
export interface Theme {
  primary: string;
  secondary: string;
  background: string;
  text: string;
  textSecondary: string;
  border: string;
  card: string;
}

// Settings types
export interface Settings {
  fontSize: number;
  fontFamily: string;
  theme: "light" | "dark" | "auto";
  defaultTranslation: string;
  swipeGestures: boolean;
  nightMode: boolean;
  lineSpacing: number;
}

// API response types (if you add API features later)
export interface ApiResponse<T> {
  data: T;
  success: boolean;
  message?: string;
}

// Error boundary types
export interface ErrorInfo {
  componentStack: string;
}

// Custom hook return types
export interface UseBibleDataResult {
  books: Book[];
  loading: boolean;
  error: string | null;
  refresh: () => void;
}

export interface UseVerseResult {
  verse: Verse | null;
  loading: boolean;
  error: string | null;
}

export interface UseSearchResult {
  results: Verse[];
  loading: boolean;
  error: string | null;
  search: (query: string, options?: SearchOptions) => void;
  clear: () => void;
}

// Component prop types for reusability
export interface VerseListProps {
  verses: Verse[];
  loading?: boolean;
  onVersePress?: (verse: Verse) => void;
  onVerseLongPress?: (verse: Verse) => void;
  showBookName?: boolean;
  showVerseNumbers?: boolean;
  highlightColor?: string;
}

export interface BookListProps {
  books: Book[];
  onBookPress: (book: Book) => void;
  filter?: "all" | "ot" | "nt";
  showTestamentHeaders?: boolean;
  grid?: boolean;
}

export interface ChapterGridProps {
  book: Book;
  onChapterPress: (chapter: number) => void;
  onChapterLongPress?: (chapter: number) => void;
  chaptersPerRow?: number;
  showVerseCounts?: boolean;
}

// Event types
export interface BibleEvent {
  type: "verse_click" | "chapter_change" | "search" | "bookmark_add";
  data: any;
  timestamp: Date;
}

// Analytics types (if you add analytics)
export interface AnalyticsEvent {
  name: string;
  properties?: Record<string, any>;
}
