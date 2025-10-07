import { getBookInfo ,BIBLE_BOOKS_MAP } from "../utils/testamentUtils";

// Updated SearchScope type with refined categories and individual books
export type SearchScope =
  | "whole"
  | "old-testament"
  | "new-testament"
  | "law"
  | "historical"
  | "poetic"
  | "major-prophets"
  | "minor-prophets"
  | "gospels"
  | "historical-nt"
  | "letters"
  | "vision"
  | `book-${number}`; // Add individual book scope

// Book ranges for each category based on your BIBLE_BOOKS_MAP
export const SCOPE_RANGES = {
  whole: null,
  "old-testament": { start: 10, end: 460 },
  "new-testament": { start: 470, end: 730 },
  law: { start: 10, end: 50 }, // Genesis to Deuteronomy
  historical: { start: 60, end: 190 }, // Joshua to Esther
  poetic: { start: 220, end: 260 }, // Job to Song of Solomon
  "major-prophets": { start: 290, end: 340 }, // Isaiah to Daniel
  "minor-prophets": { start: 350, end: 460 }, // Hosea to Malachi
  gospels: { start: 470, end: 500 }, // Matthew to John
  "historical-nt": { start: 510, end: 510 }, // Acts only
  letters: { start: 520, end: 720 }, // Romans to Jude
  vision: { start: 730, end: 730 }, // Revelation only
};

// Helper function to check if a scope is a book scope
export const isBookScope = (scope: SearchScope): scope is `book-${number}` => {
  return scope.startsWith("book-");
};

// Get book number from book scope
export const getBookNumberFromScope = (scope: SearchScope): number | null => {
  if (isBookScope(scope)) {
    return parseInt(scope.replace("book-", ""), 10);
  }
  return null;
};

// Dynamic scope config that handles individual books
export const getScopeConfig = (scope: SearchScope) => {
  // Handle book scopes dynamically
  if (isBookScope(scope)) {
    const bookNumber = getBookNumberFromScope(scope);
    if (bookNumber) {
      const bookInfo = getBookInfo(bookNumber);
      if (bookInfo) {
        return {
          label: bookInfo.long,
          description: `Search only ${bookInfo.long}`,
          category: "Individual Books",
        };
      }
    }
    return {
      label: "Unknown Book",
      description: "Search this book",
      category: "Individual Books",
    };
  }

  // Return existing config for non-book scopes
  return SCOPE_CONFIG[scope];
};

export const SCOPE_CONFIG = {
  whole: {
    label: "Whole Bible",
    description: "Search all books (Genesis - Revelation)",
    category: "All",
  },
  "old-testament": {
    label: "Old Testament",
    description: "Genesis - Malachi",
    category: "Old Testament",
  },
  "new-testament": {
    label: "New Testament",
    description: "Matthew - Revelation",
    category: "New Testament",
  },
  law: {
    label: "The Law",
    description: "Genesis, Exodus, Leviticus, Numbers, Deuteronomy",
    category: "Old Testament",
  },
  historical: {
    label: "Historical Books",
    description:
      "Joshua, Judges, Ruth, Samuel, Kings, Chronicles, Ezra, Nehemiah, Esther",
    category: "Old Testament",
  },
  poetic: {
    label: "Poetic Books",
    description: "Job, Psalms, Proverbs, Ecclesiastes, Song of Solomon",
    category: "Old Testament",
  },
  "major-prophets": {
    label: "Major Prophets",
    description: "Isaiah, Jeremiah, Lamentations, Ezekiel, Daniel",
    category: "Old Testament",
  },
  "minor-prophets": {
    label: "Minor Prophets",
    description:
      "Hosea, Joel, Amos, Obadiah, Jonah, Micah, Nahum, Habakkuk, Zephaniah, Haggai, Zechariah, Malachi",
    category: "Old Testament",
  },
  gospels: {
    label: "The Gospels",
    description: "Matthew, Mark, Luke, John",
    category: "New Testament",
  },
  "historical-nt": {
    label: "Historical Book",
    description: "Acts",
    category: "New Testament",
  },
  letters: {
    label: "The Letters",
    description: "Romans to Jude",
    category: "New Testament",
  },
  vision: {
    label: "The Book of Vision",
    description: "Revelation",
    category: "New Testament",
  },
};

// Generate individual book scopes from BIBLE_BOOKS_MAP
const INDIVIDUAL_BOOK_SCOPES: SearchScope[] = Object.keys(BIBLE_BOOKS_MAP).map(
  (bookNumber) => `book-${bookNumber}` as SearchScope
);

// Group scopes by category for the dropdown - now including Individual Books
export const SCOPE_CATEGORIES = {
  All: ["whole"],
  "Old Testament": [
    "old-testament",
    "law",
    "historical",
    "poetic",
    "major-prophets",
    "minor-prophets",
  ],
  "New Testament": [
    "new-testament",
    "gospels",
    "historical-nt",
    "letters",
    "vision",
  ],
  "Individual Books": INDIVIDUAL_BOOK_SCOPES,
};

// Book color mapping for fallback colors
export const BOOK_COLORS: { [key: string]: string } = {
  genesis: "#8B4513",
  exodus: "#FF8C00",
  leviticus: "#DC143C",
  numbers: "#32CD32",
  deuteronomy: "#1E90FF",
  joshua: "#FFD700",
  judges: "#8A2BE2",
  ruth: "#FF69B4",
  "1 samuel": "#4682B4",
  "2 samuel": "#5F9EA0",
  "1 kings": "#DA70D6",
  "2 kings": "#CD5C5C",
  "1 chronicles": "#F0E68C",
  "2 chronicles": "#90EE90",
  ezra: "#87CEEB",
  nehemiah: "#D2691E",
  esther: "#FF6347",
  job: "#40E0D0",
  psalms: "#FFA500",
  proverbs: "#9ACD32",
  ecclesiastes: "#808080",
  "song of solomon": "#FF1493",
  isaiah: "#4B0082",
  jeremiah: "#008000",
  lamentations: "#696969",
  ezekiel: "#8FBC8F",
  daniel: "#DAA520",
  hosea: "#FF4500",
  joel: "#2E8B57",
  amos: "#A0522D",
  obadiah: "#800000",
  jonah: "#FFDAB9",
  micah: "#778899",
  nahum: "#BDB76B",
  habakkuk: "#8B008B",
  zephaniah: "#FF00FF",
  haggai: "#DCDCDC",
  zechariah: "#F5DEB3",
  malachi: "#F4A460",
  matthew: "#0000FF",
  mark: "#FF0000",
  luke: "#008000",
  john: "#800080",
  acts: "#FFA500",
  romans: "#800000",
  "1 corinthians": "#808000",
  "2 corinthians": "#00FFFF",
  galatians: "#FF00FF",
  ephesians: "#C0C0C0",
  philippians: "#36454F",
  colossians: "#E6E6FA",
  "1 thessalonians": "#FFB6C1",
  "2 thessalonians": "#F0FFF0",
  "1 timothy": "#FFFACD",
  "2 timothy": "#ADD8E6",
  titus: "#F08080",
  philemon: "#E0FFFF",
  hebrews: "#FFA07A",
  james: "#20B2AA",
  "1 peter": "#FFE4B5",
  "2 peter": "#F5F5DC",
  "1 john": "#FF69B4",
  "2 john": "#CD853F",
  "3 john": "#FFEBCD",
  jude: "#DEB887",
  revelation: "#DC143C",
};