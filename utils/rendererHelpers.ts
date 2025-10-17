// file: src/utils/rendererHelpers.ts
import { TextStyle } from "react-native";
import { ThemeColors } from "./themeUtils";
import { BIBLE_BOOKS_MAP, BOOK_ABBREVS } from "./testamentUtils";
import { parseVerseList } from "./verseUtils";

export const renderCommentaryWithVerseLinks = (
  text: string,
  themeColors: ThemeColors,
  fontFamily: string | undefined,
  bookToNumber: Record<string, number>,
  onNavigate: (
    bookNum: number,
    chapter: number,
    ranges: { start: number; end: number }[]
  ) => void,
  currentBookNum?: number
): React.ReactNode[] => {
  if (!text) return [];

  const bookKeys = Object.keys(bookToNumber);
  const escapedKeys = bookKeys.map(escapeRegex);
  const bookPattern = escapedKeys.join("|");
  const DASH_PATTERN = "[-–—]";

  const VERSE_RANGE = `\\d+(?:\\s*(?:${DASH_PATTERN}|\\s*to\s*)\s*\\d+)?`;
  const VERSE_LIST = `(${VERSE_RANGE}(?:\\s*,\\s*${VERSE_RANGE})*)`;

  const fullRefRegex = new RegExp(
    `(?:(${bookPattern})\\s+)?(\\d+)\\s*:\\s*${VERSE_LIST}\\b`,
    "gi"
  );

  const continuationRegex = new RegExp(/[,;]\s*(${VERSE_LIST})\b/gi);

  const chapterOnlyRegex = /(?:ch\.|chapter)\.\s+(\d+)\b/gi;

  const verseOnlyRegex = new RegExp(
    `(?:v\\.|vv?\\.?|verse)s?\\s+${VERSE_LIST}\\b`,
    "gi"
  );

  const plainStyle: TextStyle = {
    color: themeColors.textPrimary,
    fontSize: 16,
    lineHeight: 24,
    fontFamily,
  };

  const linkStyle: TextStyle = {
    ...plainStyle,
    color: themeColors.primary,
    textDecorationLine: "underline",
  };

  const parts: React.ReactNode[] = [];
  let lastIndex = 0;
  let currentBook: number | undefined = currentBookNum;
  let currentChapter: number | undefined = undefined;

  while (true) {
    fullRefRegex.lastIndex = lastIndex;
    const fullMatch = fullRefRegex.exec(text);
    const fullPos = fullMatch ? fullMatch.index : Infinity;

    continuationRegex.lastIndex = lastIndex;
    const contMatch = continuationRegex.exec(text);
    const contPos = contMatch ? contMatch.index : Infinity;

    chapterOnlyRegex.lastIndex = lastIndex;
    const chapMatch = chapterOnlyRegex.exec(text);
    const chapPos = chapMatch ? chapMatch.index : Infinity;

    verseOnlyRegex.lastIndex = lastIndex;
    const verseMatch = verseOnlyRegex.exec(text);
    const versePos = verseMatch ? verseMatch.index : Infinity;

    let minPos = Infinity;
    let selectedMatch: RegExpExecArray | null = null;
    let matchType = "";

    const candidates = [
      { match: fullMatch, type: "full", pos: fullPos },
      { match: contMatch, type: "cont", pos: contPos },
      { match: chapMatch, type: "chap", pos: chapPos },
      { match: verseMatch, type: "verse", pos: versePos },
    ];

    candidates.forEach(({ match, type, pos }) => {
      if (pos < minPos && match !== null) {
        minPos = pos;
        selectedMatch = match;
        matchType = type;
      }
    });

    if (minPos === Infinity || selectedMatch === null) {
      break;
    }

    const matchIndex = minPos;
    const fullMatchStr = (selectedMatch as RegExpExecArray)[0];
    const matchEnd = minPos + fullMatchStr.length;

    // Add plain text before the match
    if (lastIndex < matchIndex) {
      parts.push(
        <Text key={parts.length} style={plainStyle}>
          {text.slice(lastIndex, matchIndex)}
        </Text>
      );
    }

    if (matchType === "full") {
      // Full reference
      const bookStr = selectedMatch[1];
      let bookNum = currentBook;
      if (bookStr) {
        bookNum = findBookNumber(bookStr, bookToNumber);
        if (bookNum !== undefined) {
          currentBook = bookNum;
        }
      }
      const chapter = parseInt(selectedMatch[2] as string, 10);
      const verseListStr = selectedMatch[3] as string;
      const ranges = parseVerseList(verseListStr);
      const refText = fullMatchStr;

      if (bookNum !== undefined && ranges.length > 0) {
        currentChapter = chapter;
        parts.push(
          <Text
            key={parts.length}
            onPress={() => onNavigate(bookNum!, chapter, ranges)}
            style={linkStyle}
          >
            {refText}
          </Text>
        );
      } else {
        parts.push(
          <Text key={parts.length} style={plainStyle}>
            {refText}
          </Text>
        );
      }
    } else if (matchType === "cont") {
      // Continuation reference
      if (currentBook !== undefined && currentChapter !== undefined) {
        const verseListStr = selectedMatch[1] as string;
        const ranges = parseVerseList(verseListStr);
        const prefixMatch = fullMatchStr.match(/^[,;]\s*/);
        const prefix = prefixMatch ? prefixMatch[0] : "";
        const rangeText = fullMatchStr.slice(prefix.length);

        if (prefix) {
          parts.push(
            <Text key={parts.length} style={plainStyle}>
              {prefix}
            </Text>
          );
        }
        if (ranges.length > 0) {
          parts.push(
            <Text
              key={parts.length}
              onPress={() => onNavigate(currentBook!, currentChapter!, ranges)}
              style={linkStyle}
            >
              {rangeText}
            </Text>
          );
        } else {
          parts.push(
            <Text key={parts.length} style={plainStyle}>
              {rangeText}
            </Text>
          );
        }
      } else {
        // Treat as plain
        parts.push(
          <Text key={parts.length} style={plainStyle}>
            {fullMatchStr}
          </Text>
        );
      }
    } else if (matchType === "chap") {
      // Chapter only reference
      if (currentBook !== undefined) {
        const ch = parseInt(selectedMatch[1] as string, 10);
        const refText = fullMatchStr;
        parts.push(
          <Text
            key={parts.length}
            onPress={() =>
              onNavigate(currentBook!, ch, [{ start: 1, end: 9999 }])
            }
            style={linkStyle}
          >
            {refText}
          </Text>
        );
        currentChapter = ch;
      } else {
        // Treat as plain
        parts.push(
          <Text key={parts.length} style={plainStyle}>
            {fullMatchStr}
          </Text>
        );
      }
    } else if (matchType === "verse") {
      // Verse only reference
      if (currentBook !== undefined && currentChapter !== undefined) {
        const verseListStr = selectedMatch[1] as string;
        const ranges = parseVerseList(verseListStr);
        const refText = fullMatchStr;
        if (ranges.length > 0) {
          parts.push(
            <Text
              key={parts.length}
              onPress={() => onNavigate(currentBook!, currentChapter!, ranges)}
              style={linkStyle}
            >
              {refText}
            </Text>
          );
        } else {
          parts.push(
            <Text key={parts.length} style={plainStyle}>
              {refText}
            </Text>
          );
        }
      } else {
        // Treat as plain
        parts.push(
          <Text key={parts.length} style={plainStyle}>
            {fullMatchStr}
          </Text>
        );
      }
    }

    lastIndex = matchEnd;
  }

  // Add remaining plain text
  if (lastIndex < text.length) {
    parts.push(
      <Text key={parts.length} style={plainStyle}>
        {text.slice(lastIndex)}
      </Text>
    );
  }

  return parts;
};

// Render dictionary text with colored non-alphabets and numbers
export const renderDictionaryText = (
  text: string,
  baseStyle: TextStyle,
  themeColors: ThemeColors,
  fontFamily?: string,
  onStrongPress?: (number: string) => void
): React.ReactNode[] => {
  const parts: React.ReactNode[] = [];
  let i = 0;
  let key = 0;
  const excludeChars = new Set([
    "(",
    ")",
    ",",
    ":",
    ";",
    "-",
    "'",
    "[",
    "]",
    "|",
    ".",
    '"',
  ]);
  const noSpaceAfterPunctChars = new Set(["(", "'", "["]);
  let previousType: string | null = null;
  let lastPunctChar: string | null = null;

  const isAlpha = (char: string) => /[a-zA-Z\u00C0-\u00FF]/.test(char);

  const pushSpaceIfNeeded = () => {
    if (i < text.length && isAlpha(text[i])) {
      const needsSpace =
        previousType === "num" ||
        (previousType === "punct" &&
          !noSpaceAfterPunctChars.has(lastPunctChar || ""));
      if (needsSpace) {
        parts.push(
          <Text key={`space-${key++}`} style={baseStyle}>
            {" "}
          </Text>
        );
      }
    }
  };

  while (i < text.length) {
    const char = text[i];

    if (isAlpha(char)) {
      // Check for Strong's pattern: H or G followed by digits
      if (
        (char === "H" || char === "G") &&
        i + 1 < text.length &&
        /\d/.test(text[i + 1])
      ) {
        // Strong's number - treat like num for spacing
        let strong = char;
        i++; // move past H/G
        while (i < text.length && /\d/.test(text[i])) {
          strong += text[i];
          i++;
        }
        let content = strong;
        if (previousType === "alpha") {
          content = " " + content;
        }
        parts.push(
          <Text
            key={`strong-${key++}`}
            onPress={() => onStrongPress?.(strong.substring(1))}
            style={{
              ...baseStyle,
              color: themeColors.tagColor,
              fontWeight: "bold" as const,
              textDecorationLine: "underline",
              fontFamily,
            }}
          >
            {content}
          </Text>
        );
        // After strong/num, check if next is alpha and add space
        pushSpaceIfNeeded();
        previousType = "num";
        continue;
      } else {
        // Normal alphabetic word
        let word = char;
        i++; // move past current char
        while (i < text.length && isAlpha(text[i])) {
          word += text[i];
          i++;
        }
        // No prepend for alpha
        parts.push(
          <Text key={`alpha-${key++}`} style={{ ...baseStyle, fontFamily }}>
            {word}
          </Text>
        );
        previousType = "alpha";
      }
    } else if (/\d/.test(char)) {
      // Number sequence - treat like strong/num
      let num = char;
      i++; // move past current char
      while (i < text.length && /\d/.test(text[i])) {
        num += text[i];
        i++;
      }
      let content = num;
      if (previousType === "alpha") {
        content = " " + content;
      }
      parts.push(
        <Text
          key={`num-${key++}`}
          style={{
            ...baseStyle,
            color: themeColors.tagColor,
            fontWeight: "bold" as const,
            fontFamily,
          }}
        >
          {content}
        </Text>
      );
      // After num, check if next is alpha and add space
      pushSpaceIfNeeded();
      previousType = "num";
    } else if (/[^\s]/.test(char)) {
      // Non-space character (punctuation/symbols)
      let content = char;
      i++; // move past current char
      while (
        i < text.length &&
        /[^\s]/.test(text[i]) &&
        !isAlpha(text[i]) &&
        !/\d/.test(text[i])
      ) {
        content += text[i];
        i++;
      }
      const firstChar = char;
      const isExcluded = excludeChars.has(firstChar);
      let punctStyle = isExcluded
        ? { ...baseStyle, fontFamily }
        : {
            ...baseStyle,
            color: themeColors.tagColor,
            fontFamily,
          };
      // No prepend for punct (attaches to previous alpha)
      parts.push(
        <Text key={`punct-${key++}`} style={punctStyle}>
          {content}
        </Text>
      );
      // After punct, check if next is alpha and add space
      pushSpaceIfNeeded();
      previousType = "punct";
      lastPunctChar = content.length > 0 ? content[content.length - 1] : null;
    } else {
      // Whitespace including newlines
      let ws = char;
      i++; // move past current char
      while (i < text.length && /[\s\n\r]/.test(text[i])) {
        ws += text[i];
        i++;
      }
      parts.push(
        <Text key={`ws-${key++}`} style={{ ...baseStyle, fontFamily }}>
          {ws}
        </Text>
      );
      previousType = "ws";
    }
  }

  return parts;
};

// Helper function to find book number with exact match or normalization for abbreviations and variations
export const findBookNumber = (
  bookStr: string,
  bookToNumber: Record<string, number>
): number | undefined => {
  if (!bookStr) return undefined;

  // Try exact match first
  const trimmed = bookStr.trim();
  if (bookToNumber[trimmed]) {
    return bookToNumber[trimmed];
  }

  // Fallback: normalize by removing non-alphanumeric, uppercase
  const cleanQuery = trimmed.replace(/[^a-zA-Z0-9]/g, "").toUpperCase();

  // Iterate over map keys and normalize them similarly
  for (const [key, num] of Object.entries(bookToNumber)) {
    const cleanKey = key.replace(/[^a-zA-Z0-9]/g, "").toUpperCase();
    if (cleanQuery === cleanKey) {
      return num;
    }
  }

  return undefined;
};