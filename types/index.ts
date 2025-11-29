export interface Verse {
  book_number: number;
  chapter: number;
  verse: number;
  text: string;
  book_name?: string;
  book_color?: string;
  testament?: "OT" | "NT";
  yPos: number;
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

export interface ChapterInfo {
  chapter: number;
  verseCount: number;
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
    verse?: number;
    bookColor?: string;
    testament?: string;
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

export type ScreenNames = keyof RootStackParamList;

export type NavigationProps<T extends keyof RootStackParamList> = {
  navigation: {
    navigate: (screen: T, params?: RootStackParamList[T]) => void;
    goBack: () => void;
  };
  route: {
    params: RootStackParamList[T];
  };
};
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
export interface ReadingProgress {
  bookNumber: number;
  chapter: number;
  verse: number;
  timestamp: Date;
  percentage: number;
}
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
export interface Note {
  id: string;
  bookNumber: number;
  chapter: number;
  verse: number;
  content: string;
  createdAt: Date;
  updatedAt: Date;
}
export interface Highlight {
  id: string;
  bookNumber: number;
  chapter: number;
  verse: number;
  color: string;
  createdAt: Date;
}
export interface Theme {
  primary: string;
  secondary: string;
  background: string;
  text: string;
  textSecondary: string;
  border: string;
  card: string;
}
export interface Settings {
  fontSize: number;
  fontFamily: string;
  theme: "light" | "dark" | "auto";
  defaultTranslation: string;
  swipeGestures: boolean;
  nightMode: boolean;
  lineSpacing: number;
}
export interface ApiResponse<T> {
  data: T;
  success: boolean;
  message?: string;
}
export interface ErrorInfo {
  componentStack: string;
}
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
export interface BibleEvent {
  type: "verse_click" | "chapter_change" | "search" | "bookmark_add";
  data: any;
  timestamp: Date;
}
export interface AnalyticsEvent {
  name: string;
  properties?: Record<string, any>;
}
