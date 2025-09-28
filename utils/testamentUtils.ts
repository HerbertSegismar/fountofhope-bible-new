// utils/testamentUtils.ts

export const getTestament = (
  bookNumber: number,
  bookName: string
): "OT" | "NT" => {
  // Books 10-460 are OT, 470-730 are NT
  if (bookNumber >= 10 && bookNumber <= 460) return "OT";
  if (bookNumber >= 470 && bookNumber <= 730) return "NT";

  // Fallback for any outliers
  console.warn(
    `Unexpected book number: ${bookNumber}. Using fallback testament detection.`
  );
  return bookNumber <= 460 ? "OT" : "NT";
};

export const getBookByNumber = (bookNumber: number) => {
  // Convert your database number to standard number (divide by 10, but handle the gap)
  let standardNumber: number;

  if (bookNumber <= 460) {
    // OT books: 10-460 -> standard 1-46 (but there are only 39 OT books)
    // This suggests some numbers might be skipped or used for different purposes
    standardNumber = Math.floor(bookNumber / 10);
  } else {
    // NT books: 470-730 -> standard 47-73 (but there are only 27 NT books)
    standardNumber = Math.floor(bookNumber / 10);
  }

  return { number: standardNumber };
};

// Utility to verify book distribution
export const verifyBookDistribution = (books: any[]) => {
  const otBooks = books.filter(
    (book) => book.book_number >= 10 && book.book_number <= 460
  );
  const ntBooks = books.filter(
    (book) => book.book_number >= 470 && book.book_number <= 730
  );
  const otherBooks = books.filter(
    (book) =>
      book.book_number < 10 ||
      (book.book_number > 460 && book.book_number < 470) ||
      book.book_number > 730
  );

  console.log(
    `Book Distribution: OT=${otBooks.length}, NT=${ntBooks.length}, Other=${otherBooks.length}, Total=${books.length}`
  );
  console.log("Expected: OT=39, NT=27, Total=66");

  if (otherBooks.length > 0) {
    console.warn(
      "Unexpected book numbers found:",
      otherBooks.map((b) => b.book_number)
    );
  }

  if (otBooks.length === 39 && ntBooks.length === 27) {
    console.log("✅ Book distribution is correct!");
  } else {
    console.warn("❌ Book distribution doesn't match expected counts!");
  }
};

// Optional: Map specific book numbers to standard book information
export const BIBLE_BOOKS_MAP: {
  [key: number]: { short: string; long: string; standardNumber: number };
} = {
  // Old Testament (10-460)
  10: { short: "Gen", long: "Genesis", standardNumber: 1 },
  20: { short: "Exo", long: "Exodus", standardNumber: 2 },
  30: { short: "Lev", long: "Leviticus", standardNumber: 3 },
  40: { short: "Num", long: "Numbers", standardNumber: 4 },
  50: { short: "Deu", long: "Deuteronomy", standardNumber: 5 },
  60: { short: "Jos", long: "Joshua", standardNumber: 6 },
  70: { short: "Jdg", long: "Judges", standardNumber: 7 },
  80: { short: "Rut", long: "Ruth", standardNumber: 8 },
  90: { short: "1Sa", long: "1 Samuel", standardNumber: 9 },
  100: { short: "2Sa", long: "2 Samuel", standardNumber: 10 },
  110: { short: "1Ki", long: "1 Kings", standardNumber: 11 },
  120: { short: "2Ki", long: "2 Kings", standardNumber: 12 },
  130: { short: "1Ch", long: "1 Chronicles", standardNumber: 13 },
  140: { short: "2Ch", long: "2 Chronicles", standardNumber: 14 },
  150: { short: "Ezr", long: "Ezra", standardNumber: 15 },
  160: { short: "Neh", long: "Nehemiah", standardNumber: 16 },
  190: { short: "Est", long: "Esther", standardNumber: 17 },
  220: { short: "Job", long: "Job", standardNumber: 18 },
  230: { short: "Psa", long: "Psalms", standardNumber: 19 },
  240: { short: "Pro", long: "Proverbs", standardNumber: 20 },
  250: { short: "Ecc", long: "Ecclesiastes", standardNumber: 21 },
  260: { short: "Son", long: "Song of Solomon", standardNumber: 22 },
  290: { short: "Isa", long: "Isaiah", standardNumber: 23 },
  300: { short: "Jer", long: "Jeremiah", standardNumber: 24 },
  310: { short: "Lam", long: "Lamentations", standardNumber: 25 },
  330: { short: "Eze", long: "Ezekiel", standardNumber: 26 },
  340: { short: "Dan", long: "Daniel", standardNumber: 27 },
  350: { short: "Hos", long: "Hosea", standardNumber: 28 },
  360: { short: "Joe", long: "Joel", standardNumber: 29 },
  370: { short: "Amo", long: "Amos", standardNumber: 30 },
  380: { short: "Oba", long: "Obadiah", standardNumber: 31 },
  390: { short: "Jon", long: "Jonah", standardNumber: 32 },
  400: { short: "Mic", long: "Micah", standardNumber: 33 },
  410: { short: "Nah", long: "Nahum", standardNumber: 34 },
  420: { short: "Hab", long: "Habakkuk", standardNumber: 35 },
  430: { short: "Zep", long: "Zephaniah", standardNumber: 36 },
  440: { short: "Hag", long: "Haggai", standardNumber: 37 },
  450: { short: "Zec", long: "Zechariah", standardNumber: 38 },
  460: { short: "Mal", long: "Malachi", standardNumber: 39 },

  // New Testament (470-730)
  470: { short: "Mat", long: "Matthew", standardNumber: 40 },
  480: { short: "Mar", long: "Mark", standardNumber: 41 },
  490: { short: "Luk", long: "Luke", standardNumber: 42 },
  500: { short: "Joh", long: "John", standardNumber: 43 },
  510: { short: "Act", long: "Acts", standardNumber: 44 },
  520: { short: "Rom", long: "Romans", standardNumber: 45 },
  530: { short: "1Co", long: "1 Corinthians", standardNumber: 46 },
  540: { short: "2Co", long: "2 Corinthians", standardNumber: 47 },
  550: { short: "Gal", long: "Galatians", standardNumber: 48 },
  560: { short: "Eph", long: "Ephesians", standardNumber: 49 },
  570: { short: "Phi", long: "Philippians", standardNumber: 50 },
  580: { short: "Col", long: "Colossians", standardNumber: 51 },
  590: { short: "1Th", long: "1 Thessalonians", standardNumber: 52 },
  600: { short: "2Th", long: "2 Thessalonians", standardNumber: 53 },
  610: { short: "1Ti", long: "1 Timothy", standardNumber: 54 },
  620: { short: "2Ti", long: "2 Timothy", standardNumber: 55 },
  630: { short: "Tit", long: "Titus", standardNumber: 56 },
  640: { short: "Phlm", long: "Philemon", standardNumber: 57 },
  650: { short: "Heb", long: "Hebrews", standardNumber: 58 },
  660: { short: "Jam", long: "James", standardNumber: 59 },
  670: { short: "1Pe", long: "1 Peter", standardNumber: 60 },
  680: { short: "2Pe", long: "2 Peter", standardNumber: 61 },
  690: { short: "1Jo", long: "1 John", standardNumber: 62 },
  700: { short: "2Jo", long: "2 John", standardNumber: 63 },
  710: { short: "3Jo", long: "3 John", standardNumber: 64 },
  720: { short: "Jud", long: "Jude", standardNumber: 65 },
  730: { short: "Rev", long: "Revelation", standardNumber: 66 },
};

// Enhanced getBookByNumber that returns proper book info
export const getBookInfo = (bookNumber: number) => {
  return BIBLE_BOOKS_MAP[bookNumber] || null;
};
