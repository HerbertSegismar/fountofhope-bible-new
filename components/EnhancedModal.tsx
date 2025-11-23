import React, {
  forwardRef,
  useImperativeHandle,
  useState,
  useCallback,
  useMemo,
  useEffect,
  Fragment,
} from "react";
import {
  View,
  Text,
  TouchableOpacity,
  Modal,
  ScrollView,
  ActivityIndicator,
  TextStyle,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { Verse } from "../types";
import { type ThemeColors } from "../utils/themeUtils";
import { useCommentary } from "../hooks/useCommentary";
import { useWordDictionary } from "../hooks/useWordDictionary";
import { useBibleDatabase } from "../context/BibleDatabaseContext";
import { getDatabaseFilename } from "../utils/bibleDatabaseUtils";
import { parseVerseList } from "../utils/verseUtils";
import { BIBLE_BOOKS_MAP, getTestament } from "../utils/testamentUtils";
import { VerseDisplay } from "./VerseDisplay";

type DictHistoryEntry = {
  digits: string;
  text: string;
  full: string;
};

type CommentaryState = {
  view: "commentary";
  tagContent: string;
  selectedVerse: Verse | null;
  dictHistory: DictHistoryEntry[];
  dictIndex: number;
  commentaryText: string;
};

type VerseRef = {
  bookNum: number;
  chapterStart: number;
  chapterEnd?: number;
  ranges?: { start: number; end: number }[];
  startVerse?: number;
  endVerse?: number;
};

type VerseState = {
  view: "verse";
  currentVerseRef: VerseRef;
  verseVerses: Verse[];
  loadedUpTo: number;
};

type WordState = {
  view: "word";
  word: string;
  definition: string;
  loading: boolean;
};

type ModalState = CommentaryState | VerseState | WordState;

interface EnhancedModalProps {
  themeColors: ThemeColors;
  actualFontFamily: string | undefined;
  displayVersion?: string;
  bookToNumber: Record<string, number>;
}

export type EnhancedModalRef = {
  openCommentary: (content: string, verse: Verse) => void;
  openWord: (word: string) => void;
};

const SINGLE_CHAPTER_BOOKS = new Set([380, 640, 700, 710, 720]);

const findBookNumber = (
  bookStr: string,
  bookToNumber: Record<string, number>
): number | undefined => {
  if (!bookStr) return undefined;
  const trimmed = bookStr.trim();
  if (bookToNumber[trimmed]) {
    return bookToNumber[trimmed];
  }
  const cleanQuery = trimmed.replace(/[^a-zA-Z0-9]/g, "").toUpperCase();
  for (const [key, num] of Object.entries(bookToNumber)) {
    const cleanKey = key.replace(/[^a-zA-Z0-9]/g, "").toUpperCase();
    if (cleanQuery === cleanKey) {
      return num;
    }
  }
  return undefined;
};

// NEW: Helper to get base version for verse loading (strips "+" for augmented versions)
const getVerseVersion = (version?: string): string | undefined => {
  if (!version) return undefined;
  // Assume "+" suffix indicates augmentation (e.g., "KJV+" -> "KJV")
  return version.includes("+") ? version.split("+")[0] : version;
};

const renderCommentaryWithVerseLinks = (
  text: string,
  themeColors: ThemeColors,
  fontFamily: string | undefined,
  bookToNumber: Record<string, number>,
  onNavigate: (
    bookNum: number,
    chapterStart: number,
    ranges?: { start: number; end: number }[],
    chapterEnd?: number,
    startVerse?: number,
    endVerse?: number
  ) => void,
  currentBookNum?: number,
  currentChapterNum?: number,
  onWordPress?: (word: string) => void
): React.ReactNode[] => {
  if (!text) return [];
  const bookKeys = Object.keys(bookToNumber);
  const escapedKeys = bookKeys.map((key) => escapeRegex(key));
  const bookPattern = escapedKeys.map((key) => `\\b${key}`).join("|");
  const DASH_PATTERN = "[-–—]";
  const VERSE_RANGE = `\\d+(?:\\s*(?:${DASH_PATTERN}|\\s*to\\s*)\s*\\d+(?::\\d+)?)?`;
  const VERSE_LIST = `(${VERSE_RANGE}(?:\\s*,\\s*${VERSE_RANGE})*)`;
  const fullRefRegex = new RegExp(
    `(?:(${bookPattern})\\.?\\s+)?(\\d+)\\s*:\\s*${VERSE_LIST}\\b`,
    "gi"
  );
  const continuationRegex = new RegExp(/[,;]\s*(${VERSE_LIST})\\b/gi);
  const chapterOnlyRegex = /(?:ch\\.|chs\\.|chapter)\\.\\s+(\\d+)\\b/gi;
  const verseOnlyRegex = new RegExp(
    `(?:v\\.|vv?\\.?|ver\\.|verse)s?\\s+${VERSE_LIST}\\b`,
    "gi"
  );
  const chapVerseRegex = new RegExp(
    `(?:(${bookPattern})\\.?\\s+)?(\\d+)(?:\\s*${DASH_PATTERN}\\s*(\\d+))?\\b`,
    "gi"
  );
  const seeRegex = /see\s+([A-Za-z\u00C0-\u00FF]{2,})/gi;
  const plainStyle: TextStyle = {
    color: themeColors.textPrimary,
    fontSize: 16,
    lineHeight: 24,
    fontFamily,
  };
  const linkStyle: TextStyle = {
    ...plainStyle,
    color: themeColors.primary,
  };
  const parts: React.ReactNode[] = [];
  let lastIndex = 0;
  let currentBook: number | undefined = currentBookNum;
  let currentChapter: number | undefined = currentChapterNum;
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
    chapVerseRegex.lastIndex = lastIndex;
    const chapVerseMatch = chapVerseRegex.exec(text);
    const chapVersePos = chapVerseMatch ? chapVerseMatch.index : Infinity;
    seeRegex.lastIndex = lastIndex;
    const seeRawMatch = seeRegex.exec(text);
    let seePos = Infinity;
    let seeMatchForUse: RegExpExecArray | null = null;
    if (seeRawMatch) {
      const word = seeRawMatch[1];
      const isAllUpper = word === word.toUpperCase();
      if (currentBookNum !== undefined ? isAllUpper : true) {
        seePos = seeRawMatch.index;
        seeMatchForUse = seeRawMatch;
      }
    }
    let minPos = Infinity;
    let selectedType:
      | "full"
      | "cont"
      | "chap"
      | "verse"
      | "chapVerse"
      | "see"
      | null = null;
    if (fullPos < minPos && fullMatch !== null) {
      minPos = fullPos;
      selectedType = "full";
    }
    if (contPos < minPos && contMatch !== null) {
      minPos = contPos;
      selectedType = "cont";
    }
    if (chapPos < minPos && chapMatch !== null) {
      minPos = chapPos;
      selectedType = "chap";
    }
    if (versePos < minPos && verseMatch !== null) {
      minPos = versePos;
      selectedType = "verse";
    }
    if (chapVersePos < minPos && chapVerseMatch !== null) {
      minPos = chapVersePos;
      selectedType = "chapVerse";
    }
    if (seePos < minPos && seePos !== Infinity) {
      minPos = seePos;
      selectedType = "see";
    }
    if (minPos === Infinity || selectedType === null) {
      break;
    }
    const matchIndex = minPos;
    const refText = (() => {
      switch (selectedType) {
        case "full":
          return fullMatch![0];
        case "cont":
          return contMatch![0];
        case "chap":
          return chapMatch![0];
        case "verse":
          return verseMatch![0];
        case "chapVerse":
          return chapVerseMatch![0];
        case "see":
          return seeMatchForUse![0];
        default:
          return "";
      }
    })();
    const theMatch = (() => {
      switch (selectedType) {
        case "full":
          return fullMatch!;
        case "cont":
          return contMatch!;
        case "chap":
          return chapMatch!;
        case "verse":
          return verseMatch!;
        case "chapVerse":
          return chapVerseMatch!;
        case "see":
          return seeMatchForUse!;
        default:
          return null as never;
      }
    })();
    let matchEnd = minPos + refText.length;
    if (lastIndex < matchIndex) {
      parts.push(
        <Text key={parts.length} style={plainStyle}>
          {text.slice(lastIndex, matchIndex)}
        </Text>
      );
    }
    switch (selectedType) {
      case "full": {
        const bookStr = theMatch[1] ?? "";
        let bookNum = currentBook;
        if (bookStr) {
          bookNum = findBookNumber(bookStr, bookToNumber);
          if (bookNum !== undefined) {
            currentBook = bookNum;
          }
        }
        const chapterStr = theMatch[2];
        const chapter = chapterStr ? parseInt(`${chapterStr}`, 10) : 0;
        const verseListStr = theMatch[3] ?? "";
        let ranges: { start: number; end: number }[] = [];
        let chapterEnd: number | undefined = undefined;
        let startVerseForRange: number | undefined = undefined;
        let endVerseForRange: number | undefined = undefined;
        if (verseListStr) {
          if (verseListStr.includes(",")) {
            ranges = parseVerseList(verseListStr);
          } else {
            const rangeRegex = new RegExp(
              `^(\\d+)\\s*(?:${DASH_PATTERN}|to)\\s*(\\d+(?::(\\d+))?)$`,
              "i"
            );
            const match = verseListStr.match(rangeRegex);
            if (match) {
              const startV = parseInt(match[1]);
              const endStr = match[2];
              if (endStr.includes(":")) {
                const endChStr = endStr.split(":")[0].trim();
                const endVStr = endStr.split(":")[1].trim();
                const endCh = parseInt(endChStr);
                const endV = parseInt(endVStr);
                if (!isNaN(endCh) && !isNaN(endV) && !isNaN(startV)) {
                  chapterEnd = endCh;
                  startVerseForRange = startV;
                  endVerseForRange = endV;
                }
              } else {
                const endV = parseInt(endStr);
                if (!isNaN(endV) && !isNaN(startV)) {
                  if (endV < startV) {
                    chapterEnd = endV;
                    startVerseForRange = startV;
                  } else {
                    ranges = [{ start: startV, end: endV }];
                  }
                }
              }
            } else {
              const v = parseInt(verseListStr);
              if (!isNaN(v)) {
                ranges = [{ start: v, end: v }];
              }
            }
          }
        }
        const hasValidRef =
          bookNum !== undefined &&
          (ranges.length > 0 || chapterEnd !== undefined);
        if (hasValidRef) {
          currentChapter = chapter;
          parts.push(
            <Text
              key={parts.length}
              onPress={() => {
                if (chapterEnd !== undefined) {
                  onNavigate(
                    bookNum!,
                    chapter,
                    undefined,
                    chapterEnd,
                    startVerseForRange,
                    endVerseForRange
                  );
                } else {
                  onNavigate(bookNum!, chapter, ranges);
                }
              }}
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
        break;
      }
      case "cont": {
        if (currentBook === undefined || currentChapter === undefined) {
          parts.push(
            <Text key={parts.length} style={plainStyle}>
              {refText}
            </Text>
          );
          break;
        }
        const _currentBook = currentBook;
        const _currentChapter = currentChapter;
        const verseListStr = theMatch[1] ?? "";
        const ranges = parseVerseList(verseListStr);
        const prefixMatch = refText.match(/^[,;]\s*/);
        const prefix = prefixMatch ? prefixMatch[0] : "";
        const rangeText = refText.slice(prefix.length);
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
              onPress={() => onNavigate(_currentBook, _currentChapter, ranges)}
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
        break;
      }
      case "chap": {
        const chStr = theMatch[1];
        if (chStr === undefined || currentBook === undefined) {
          parts.push(
            <Text key={parts.length} style={plainStyle}>
              {refText}
            </Text>
          );
          break;
        }
        const _currentBook = currentBook;
        const ch = parseInt(`${chStr}`, 10);
        parts.push(
          <Text
            key={parts.length}
            onPress={() => onNavigate(_currentBook, ch)}
            style={linkStyle}
          >
            {refText}
          </Text>
        );
        currentChapter = ch;
        break;
      }
      case "verse": {
        if (currentBook === undefined || currentChapter === undefined) {
          parts.push(
            <Text key={parts.length} style={plainStyle}>
              {refText}
            </Text>
          );
          break;
        }
        const _currentBook = currentBook;
        const _currentChapter = currentChapter;
        const verseListStr = theMatch[1] ?? "";
        const ranges = parseVerseList(verseListStr);
        if (ranges.length > 0) {
          parts.push(
            <Text
              key={parts.length}
              onPress={() => onNavigate(_currentBook, _currentChapter, ranges)}
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
        break;
      }
      case "chapVerse": {
        const bookStr = theMatch[1] ?? "";
        let bookNum = currentBook;
        if (bookStr) {
          bookNum = findBookNumber(bookStr, bookToNumber);
          if (bookNum !== undefined) {
            currentBook = bookNum;
          }
        }
        const num1Str = theMatch[2];
        const num2Str = theMatch[3];
        if (num1Str === undefined) {
          parts.push(
            <Text key={parts.length} style={plainStyle}>
              {refText}
            </Text>
          );
          break;
        }
        const num1 = parseInt(`${num1Str}`, 10);
        const num2 = num2Str ? parseInt(`${num2Str}`, 10) : undefined;
        const hasContext = !!bookStr || !!num2Str;
        if (bookNum === undefined || !hasContext) {
          parts.push(
            <Text key={parts.length} style={plainStyle}>
              {refText}
            </Text>
          );
          break;
        }
        const isSingleChapterBook = SINGLE_CHAPTER_BOOKS.has(bookNum);
        let onPressCallback;
        let tempCurrentChapter: number;
        if (isSingleChapterBook) {
          const verseStart = num1;
          const verseEnd = num2 !== undefined ? num2 : num1;
          onPressCallback = () =>
            onNavigate(bookNum, 1, [{ start: verseStart, end: verseEnd }]);
          tempCurrentChapter = 1;
        } else {
          if (num2 !== undefined) {
            onPressCallback = () => onNavigate(bookNum, num1, undefined, num2);
            tempCurrentChapter = num2;
          } else {
            onPressCallback = () => onNavigate(bookNum, num1);
            tempCurrentChapter = num1;
          }
        }
        currentChapter = tempCurrentChapter;
        parts.push(
          <Text key={parts.length} onPress={onPressCallback} style={linkStyle}>
            {refText}
          </Text>
        );
        break;
      }
      case "see": {
        const refText = theMatch[0];
        const word = theMatch[1];
        if (
          word.toLowerCase() === "the" ||
          word.toLowerCase() === "further" ||
          word.toLowerCase() === "also" ||
          word.toLowerCase() === "broad" ||
          word.toLowerCase() === "under"
        ) {
          // Do not make it clickable; treat as plain text
          parts.push(
            <Text key={parts.length} style={plainStyle}>
              {refText}
            </Text>
          );
        } else {
          const wordStart = refText.indexOf(word);
          const prefix = refText.substring(0, wordStart);
          parts.push(
            <Text key={parts.length} style={plainStyle}>
              {prefix}
            </Text>
          );
          parts.push(
            <Text
              key={parts.length}
              onPress={() => onWordPress?.(word)}
              style={{
                ...plainStyle,
                color: themeColors.primary,
                textDecorationLine: "underline",
                fontWeight: "600",
              }}
            >
              {word}
            </Text>
          );
          let trailingEnd = matchEnd;
          while (trailingEnd < text.length && /\s/.test(text[trailingEnd])) {
            trailingEnd++;
          }
          if (matchEnd < trailingEnd) {
            parts.push(
              <Text key={parts.length} style={plainStyle}>
                {text.slice(matchEnd, trailingEnd)}
              </Text>
            );
            matchEnd = trailingEnd;
          }
        }
        break;
      }
    }
    lastIndex = matchEnd;
  }
  if (lastIndex < text.length) {
    parts.push(
      <Text key={parts.length} style={plainStyle}>
        {text.slice(lastIndex)}
      </Text>
    );
  }
  return parts;
};

const renderDictionaryText = (
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
      if (
        (char === "H" || char === "G") &&
        i + 1 < text.length &&
        /\d/.test(text[i + 1])
      ) {
        let strong = char;
        i++;
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
        pushSpaceIfNeeded();
        previousType = "num";
        continue;
      } else {
        let word = char;
        i++;
        while (i < text.length && isAlpha(text[i])) {
          word += text[i];
          i++;
        }
        parts.push(
          <Text key={`alpha-${key++}`} style={{ ...baseStyle, fontFamily }}>
            {word}
          </Text>
        );
        previousType = "alpha";
      }
    } else if (/\d/.test(char)) {
      let num = char;
      i++;
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
      pushSpaceIfNeeded();
      previousType = "num";
    } else if (/[^\s]/.test(char)) {
      let content = char;
      i++;
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
      parts.push(
        <Text key={`punct-${key++}`} style={punctStyle}>
          {content}
        </Text>
      );
      pushSpaceIfNeeded();
      previousType = "punct";
      lastPunctChar = content.length > 0 ? content[content.length - 1] : null;
    } else {
      let ws = char;
      i++;
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

const escapeRegex = (string: string) =>
  string.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

const getBookName = (bookNum: number) => {
  const entry = Object.entries(BIBLE_BOOKS_MAP).find(
    ([key, _value]) => parseInt(key) === bookNum
  );
  return entry ? entry[1].long : "Unknown Book";
};

const EnhancedModalComp = forwardRef<EnhancedModalRef, EnhancedModalProps>(
  (props, ref) => {
    const { themeColors, actualFontFamily, displayVersion, bookToNumber } =
      props;
    const { loadCommentaryForVerse } = useCommentary(displayVersion);
    const { loadWordDefinition } = useWordDictionary(displayVersion);
    const { bibleDB, getDatabase } = useBibleDatabase();

    const [visible, setVisible] = useState(false);
    const [modalStack, setModalStack] = useState<ModalState[]>([]);
    const [modalView, setModalView] = useState<"commentary" | "verse" | "word">(
      "commentary"
    );
    const [tagContent, setTagContent] = useState("");
    const [selectedVerse, setSelectedVerse] = useState<Verse | null>(null);
    const [commentaryLoading, setCommentaryLoading] = useState(false);
    const [commentaryText, setCommentaryText] = useState("");
    const [currentVerseRef, setCurrentVerseRef] = useState<VerseRef | null>(
      null
    );
    const [verseLoading, setVerseLoading] = useState(false);
    const [verseVerses, setVerseVerses] = useState<Verse[]>([]);
    const [loadedUpTo, setLoadedUpTo] = useState(0);
    const [dictHistory, setDictHistory] = useState<DictHistoryEntry[]>([]);
    const [currentDictIndex, setCurrentDictIndex] = useState<number>(-1);
    const [selectedWord, setSelectedWord] = useState("");
    const [wordDefinition, setWordDefinition] = useState("");
    const [wordLoading, setWordLoading] = useState(false);

    useEffect(() => {
      if (modalStack.length === 0) {
        setVisible(false);
        setModalView("commentary");
        setTagContent("");
        setSelectedVerse(null);
        setCommentaryLoading(false);
        setCommentaryText("");
        setCurrentVerseRef(null);
        setVerseLoading(false);
        setVerseVerses([]);
        setLoadedUpTo(0);
        setDictHistory([]);
        setCurrentDictIndex(-1);
        setSelectedWord("");
        setWordDefinition("");
        setWordLoading(false);
        return;
      }
      const top = modalStack[modalStack.length - 1];
      setModalView(top.view);
      if (top.view === "commentary") {
        setTagContent(top.tagContent);
        setSelectedVerse(top.selectedVerse);
        setCurrentVerseRef(null);
        setDictHistory(top.dictHistory);
        setCurrentDictIndex(top.dictIndex);
        setCommentaryText(top.commentaryText);
        setSelectedWord("");
        setWordDefinition("");
        setWordLoading(false);
        setVerseVerses([]);
        setLoadedUpTo(0);
      } else if (top.view === "verse") {
        setCurrentVerseRef(top.currentVerseRef);
        setVerseVerses(top.verseVerses);
        setLoadedUpTo(top.loadedUpTo);
        setTagContent("");
        setSelectedVerse(null);
        setSelectedWord("");
        setWordDefinition("");
        setWordLoading(false);
      } else if (top.view === "word") {
        setSelectedWord(top.word);
        setWordDefinition(top.definition);
        setWordLoading(top.loading);
        setTagContent("");
        setSelectedVerse(null);
        setCurrentVerseRef(null);
        setDictHistory([]);
        setCurrentDictIndex(-1);
        setCommentaryText("");
        setVerseVerses([]);
        setLoadedUpTo(0);
      }
    }, [modalStack]);

    const getStrongPrefix = useCallback((verse: Verse): string => {
      const testament = getTestament(verse.book_number, verse.book_name || "");
      return testament === "NT" ? "G" : "H";
    }, []);

    const updateDictEntry = useCallback(
      (digits: string, text: string) => {
        if (!selectedVerse) {
          return { history: dictHistory, index: currentDictIndex };
        }
        const prefix = getStrongPrefix(selectedVerse);
        const full = `${prefix}${digits}`;
        const entry: DictHistoryEntry = { digits, text, full };
        let newHistory = dictHistory;
        let newIndex = currentDictIndex;
        if (
          currentDictIndex < 0 ||
          dictHistory[currentDictIndex]?.digits !== digits
        ) {
          newHistory = [...dictHistory.slice(0, currentDictIndex + 1), entry];
          newIndex = currentDictIndex < 0 ? 0 : currentDictIndex + 1;
        } else {
          newHistory = dictHistory.map((item, idx) =>
            idx === currentDictIndex ? entry : item
          );
          newIndex = currentDictIndex;
        }
        return { history: newHistory, index: newIndex, full };
      },
      [selectedVerse, dictHistory, currentDictIndex, getStrongPrefix]
    );

    const testament = selectedVerse
      ? getTestament(selectedVerse.book_number, selectedVerse.book_name || "")
      : null;
    const isNewTestament = testament === "NT";
    const language = isNewTestament ? "Greek" : "Hebrew";

    useEffect(() => {
      if (!visible || modalView !== "commentary") return;
      if (!selectedVerse || !tagContent) {
        setCommentaryLoading(false);
        return;
      }
      const isDict = displayVersion?.includes("+") && /^\d+$/.test(tagContent);
      if (
        isDict &&
        currentDictIndex >= 0 &&
        dictHistory[currentDictIndex]?.digits === tagContent
      ) {
        setCommentaryLoading(false);
        return;
      }
      const loadAsync = async () => {
        setCommentaryLoading(true);
        const text = await loadCommentaryForVerse(selectedVerse, tagContent);
        setCommentaryLoading(false);
        const updates: Partial<CommentaryState> = { commentaryText: text };
        if (isDict) {
          const { history, index } = updateDictEntry(tagContent, text);
          updates.dictHistory = history;
          updates.dictIndex = index;
        }
        setModalStack((prev) => {
          if (
            prev.length === 0 ||
            prev[prev.length - 1].view !== "commentary"
          ) {
            return prev;
          }
          const last = prev[prev.length - 1] as CommentaryState;
          const newTop: CommentaryState = { ...last, ...updates };
          return [...prev.slice(0, -1), newTop];
        });
      };
      loadAsync();
    }, [
      visible,
      selectedVerse,
      tagContent,
      modalView,
      displayVersion,
      loadCommentaryForVerse,
      currentDictIndex,
      dictHistory,
      updateDictEntry,
    ]);

    useEffect(() => {
      if (!visible || modalView !== "word") return;
      if (!selectedWord || !wordLoading) return;
      const loadAsync = async () => {
        try {
          const text = await loadWordDefinition(selectedWord);
          setWordDefinition(text);
          setWordLoading(false);
          setModalStack((prev) => {
            if (prev.length === 0 || prev[prev.length - 1].view !== "word") {
              return prev;
            }
            const last = prev[prev.length - 1] as WordState;
            const newTop: WordState = {
              ...last,
              definition: text,
              loading: false,
            };
            return [...prev.slice(0, -1), newTop];
          });
        } catch (error) {
          const errorText = `Error loading definition for "${selectedWord}"`;
          setWordDefinition(errorText);
          setWordLoading(false);
          setModalStack((prev) => {
            if (prev.length === 0 || prev[prev.length - 1].view !== "word") {
              return prev;
            }
            const last = prev[prev.length - 1] as WordState;
            const newTop: WordState = {
              ...last,
              definition: errorText,
              loading: false,
            };
            return [...prev.slice(0, -1), newTop];
          });
        }
      };
      loadAsync();
    }, [visible, modalView, selectedWord, wordLoading, loadWordDefinition]);

    const currentTitle = useMemo(() => {
      const isDictMode =
        displayVersion?.includes("+") && /^\d+$/.test(tagContent);
      if (!isDictMode) return `Commentary for "${tagContent}"`;
      const prefix = isNewTestament ? "G" : "H";
      const full =
        currentDictIndex >= 0
          ? dictHistory[currentDictIndex]?.full
          : `${prefix}${tagContent}`;
      return `Strong's ${full}`;
    }, [
      tagContent,
      displayVersion,
      isNewTestament,
      currentDictIndex,
      dictHistory,
      language,
    ]);

    const handleTagPressFromModal = useCallback(
      (content: string, verse: Verse) => {
        const newState: CommentaryState = {
          view: "commentary",
          tagContent: content,
          selectedVerse: verse,
          dictHistory: [],
          dictIndex: -1,
          commentaryText: "",
        };
        setModalStack((prev) => [...prev, newState]);
      },
      []
    );

    const handleWordPress = useCallback((word: string) => {
      const newState: WordState = {
        view: "word",
        word,
        definition: "",
        loading: true,
      };
      setModalStack((prev) => [...prev, newState]);
    }, []);

    const handleStrongPress = useCallback(
      async (digits: string) => {
        if (!selectedVerse) return;
        setCommentaryLoading(true);
        const text = await loadCommentaryForVerse(selectedVerse, digits);
        setCommentaryLoading(false);
        const { history, index, full } = updateDictEntry(digits, text);
        setTagContent(digits);
        setDictHistory(history);
        setCurrentDictIndex(index);
        setCommentaryText(text);
        setModalStack((prev) => {
          if (
            prev.length === 0 ||
            prev[prev.length - 1].view !== "commentary"
          ) {
            return prev;
          }
          const last = prev[prev.length - 1] as CommentaryState;
          const newTop: CommentaryState = {
            ...last,
            tagContent: digits,
            dictHistory: history,
            dictIndex: index,
            commentaryText: text,
          };
          return [...prev.slice(0, -1), newTop];
        });
      },
      [selectedVerse, loadCommentaryForVerse, updateDictEntry]
    );

    const handleBack = useCallback(() => {
      if (currentDictIndex > 0) {
        const newIndex = currentDictIndex - 1;
        const entry = dictHistory[newIndex];
        setCurrentDictIndex(newIndex);
        setTagContent(entry.digits);
        setCommentaryText(entry.text);
        setModalStack((prev) => {
          if (
            prev.length === 0 ||
            prev[prev.length - 1].view !== "commentary"
          ) {
            return prev;
          }
          const last = prev[prev.length - 1] as CommentaryState;
          const newTop: CommentaryState = {
            ...last,
            dictIndex: newIndex,
            tagContent: entry.digits,
            commentaryText: entry.text,
          };
          return [...prev.slice(0, -1), newTop];
        });
      }
    }, [currentDictIndex, dictHistory]);

    const handleViewBack = useCallback(() => {
      setModalStack((prev) => (prev.length > 1 ? prev.slice(0, -1) : prev));
    }, []);

    const batchSize = 3;
    const loadMore = useCallback(async () => {
      if (
        verseLoading ||
        !currentVerseRef?.chapterEnd ||
        loadedUpTo >= currentVerseRef.chapterEnd!
      )
        return;
      setVerseLoading(true);
      const bookNum = currentVerseRef.bookNum;
      const chapterStart = currentVerseRef.chapterStart;
      const chapterEnd = currentVerseRef.chapterEnd!;
      const nextStart = loadedUpTo + 1;
      const nextLoadEnd = Math.min(nextStart + batchSize - 1, chapterEnd);
      const nextChapters = Array.from(
        { length: nextLoadEnd - nextStart + 1 },
        (_, i) => nextStart + i
      );
      let newAllVerses: Verse[] = [];
      // MODIFIED: Use base version for verses (strips "+" if present)
      const verseVersion = getVerseVersion(displayVersion);
      try {
        for (const ch of nextChapters) {
          let loadedVerses: Verse[] = [];
          if (verseVersion) {
            const dbFilename = getDatabaseFilename(verseVersion);
            if (dbFilename) {
              const secondaryDB = await getDatabase(dbFilename);
              if (secondaryDB) {
                loadedVerses = await secondaryDB.getVerses(bookNum, ch);
              } else {
                console.warn(
                  `Secondary DB not available for ${verseVersion}, falling back to primary`
                );
              }
            }
          }
          if (loadedVerses.length === 0 && bibleDB) {
            loadedVerses = await bibleDB.getVerses(bookNum, ch);
          }
          newAllVerses.push(...loadedVerses);
        }
      } catch (e) {
        console.error("Error loading more verses:", e);
        setVerseLoading(false);
        return;
      }
      const sv = currentVerseRef.startVerse || 1;
      const ev = currentVerseRef.endVerse || 999;
      let newTargetVerses: Verse[] = [];
      for (const verse of newAllVerses) {
        let include = true;
        if (verse.chapter === chapterStart) {
          include = verse.verse >= sv;
        } else if (verse.chapter === chapterEnd) {
          include = verse.verse <= ev;
        }
        if (include) {
          newTargetVerses.push(verse);
        }
      }
      newTargetVerses.sort(
        (a, b) => a.chapter - b.chapter || a.verse - b.verse
      );
      const updatedVerses = [...verseVerses, ...newTargetVerses];
      const newLoadedUpTo = nextLoadEnd;
      setVerseVerses(updatedVerses);
      setLoadedUpTo(newLoadedUpTo);
      setVerseLoading(false);
      setModalStack((prev) => {
        if (prev.length === 0 || prev[prev.length - 1].view !== "verse") {
          return prev;
        }
        const last = prev[prev.length - 1] as VerseState;
        const newTop: VerseState = {
          ...last,
          verseVerses: updatedVerses,
          loadedUpTo: newLoadedUpTo,
        };
        return [...prev.slice(0, -1), newTop];
      });
    }, [
      currentVerseRef,
      loadedUpTo,
      verseVerses,
      verseLoading,
      displayVersion, // UPDATED: Include for getVerseVersion
      bibleDB,
      getDatabase,
      batchSize,
    ]);

    const handleVerseLinkPress = useCallback(
      async (
        bookNum: number,
        chapterStart: number,
        ranges?: { start: number; end: number }[],
        chapterEnd?: number,
        startVerse?: number,
        endVerse?: number
      ) => {
        const isMultiChapter = !!chapterEnd && chapterEnd > chapterStart;
        const newRef: VerseRef = {
          bookNum,
          chapterStart,
          ...(chapterEnd !== undefined && { chapterEnd }),
          ...(ranges && { ranges }),
          ...(startVerse !== undefined && { startVerse }),
          ...(endVerse !== undefined && { endVerse }),
        };
        const newState: VerseState = {
          view: "verse",
          currentVerseRef: newRef,
          verseVerses: [],
          loadedUpTo: chapterStart,
        };
        setModalStack((prev) => [...prev, newState]);
        setModalView("verse");
        setCurrentVerseRef(newRef);
        setVerseVerses([]);
        setLoadedUpTo(chapterStart);
        setVerseLoading(true);
        let loadEnd = chapterStart;
        if (isMultiChapter) {
          loadEnd = Math.min(chapterStart + batchSize - 1, chapterEnd!);
        }
        const chapters = Array.from(
          { length: loadEnd - chapterStart + 1 },
          (_, i) => chapterStart + i
        );
        let allVerses: Verse[] = [];
        // MODIFIED: Use base version for verses (strips "+" if present)
        const verseVersion = getVerseVersion(displayVersion);
        try {
          for (const ch of chapters) {
            let loadedVerses: Verse[] = [];
            if (verseVersion) {
              const dbFilename = getDatabaseFilename(verseVersion);
              if (dbFilename) {
                const secondaryDB = await getDatabase(dbFilename);
                if (secondaryDB) {
                  loadedVerses = await secondaryDB.getVerses(bookNum, ch);
                } else {
                  console.warn(
                    `Secondary DB not available for ${verseVersion}, falling back to primary`
                  );
                }
              }
            }
            if (loadedVerses.length === 0 && bibleDB) {
              loadedVerses = await bibleDB.getVerses(bookNum, ch);
            }
            allVerses.push(...loadedVerses);
          }
        } catch (e) {
          console.error("Error loading verses:", e);
        }
        allVerses.sort((a, b) => a.chapter - b.chapter || a.verse - b.verse);
        const sv = startVerse || 1;
        const ev = endVerse || 999;
        let targetVerses: Verse[] = [];
        for (const verse of allVerses) {
          let include = true;
          if (isMultiChapter) {
            if (verse.chapter === chapterStart) {
              include = verse.verse >= sv;
            } else if (verse.chapter === chapterEnd) {
              include = verse.verse <= ev;
            }
          } else if (ranges && ranges.length > 0) {
            include = ranges.some(
              (r) => verse.verse >= r.start && verse.verse <= r.end
            );
          }
          if (include) {
            targetVerses.push(verse);
          }
        }
        setVerseLoading(false);
        setVerseVerses(targetVerses);
        const newLoadedUpTo = loadEnd;
        setLoadedUpTo(newLoadedUpTo);
        setModalStack((prev) => {
          if (prev.length === 0 || prev[prev.length - 1].view !== "verse") {
            return prev;
          }
          const last = prev[prev.length - 1] as VerseState;
          const newTop: VerseState = {
            ...last,
            verseVerses: targetVerses,
            loadedUpTo: newLoadedUpTo,
          };
          return [...prev.slice(0, -1), newTop];
        });
      },
      [bibleDB, getDatabase, displayVersion, batchSize] // UPDATED: Include displayVersion for getVerseVersion
    );

    const handleCloseModal = useCallback(() => {
      setModalStack([]);
    }, []);

    const verseTitle = useMemo(() => {
      if (!currentVerseRef) return "";
      const {
        bookNum,
        chapterStart,
        chapterEnd,
        ranges,
        startVerse,
        endVerse,
      } = currentVerseRef;
      let chStr = `${chapterStart}`;
      if (startVerse !== undefined) {
        chStr += `:${startVerse}`;
      }
      if (chapterEnd && chapterEnd > chapterStart) {
        chStr += `-${chapterEnd}`;
        if (endVerse !== undefined) {
          chStr += `:${endVerse}`;
        }
      } else if (ranges && ranges.length > 0) {
        chStr += `:${ranges
          .map((r) => (r.start === r.end ? r.start : `${r.start}-${r.end}`))
          .join(",")}`;
      }
      return `${getBookName(bookNum)} ${chStr}`;
    }, [currentVerseRef]);

    const hasMore =
      !!currentVerseRef?.chapterEnd && loadedUpTo < currentVerseRef.chapterEnd!;

    const modalVerseTextColor = themeColors.textPrimary;
    const commentaryModalStyle: TextStyle = {
      color: themeColors.textPrimary,
      fontSize: 16,
      lineHeight: 24,
      fontFamily: actualFontFamily,
    };
    const isDictMode =
      displayVersion?.includes("+") && /^\d+$/.test(tagContent);
    const hasViewBack = modalStack.length > 1;
    const hasDictBack =
      modalView === "commentary" && isDictMode && currentDictIndex > 0;
    const showCommentaryBack = hasViewBack || hasDictBack;
    const commentaryBackOnPress = hasViewBack ? handleViewBack : handleBack;
    const commentaryLeftContent = showCommentaryBack ? (
      <TouchableOpacity
        onPress={commentaryBackOnPress}
        activeOpacity={0.7}
        style={{ padding: 5 }}
      >
        <Ionicons name="arrow-back" size={20} color={themeColors.primary} />
      </TouchableOpacity>
    ) : (
      <View style={{ width: 30 }} />
    );

    const openCommentary = useCallback((content: string, verse: Verse) => {
      const initialState: CommentaryState = {
        view: "commentary",
        tagContent: content,
        selectedVerse: verse,
        dictHistory: [],
        dictIndex: -1,
        commentaryText: "",
      };
      setModalStack([initialState]);
      setVisible(true);
    }, []);

    const openWord = useCallback((word: string) => {
      const newState: WordState = {
        view: "word",
        word,
        definition: "",
        loading: true,
      };
      setModalStack([newState]);
      setVisible(true);
    }, []);

    useImperativeHandle(ref, () => ({
      openCommentary,
      openWord,
    }));

    const modalContent = (
      <View
        style={{
          flex: 1,
          justifyContent: "center",
          alignItems: "center",
          backgroundColor: "rgba(0,0,0,0.5)",
        }}
      >
        <View
          style={{
            backgroundColor: themeColors.card,
            padding: 20,
            borderRadius: 10,
            width: "80%",
            maxHeight: "80%",
          }}
        >
          {modalView === "verse" && currentVerseRef ? (
            <>
              <View
                style={{
                  flexDirection: "row",
                  justifyContent: "space-between",
                  alignItems: "center",
                  marginBottom: 10,
                }}
              >
                <TouchableOpacity
                  onPress={handleViewBack}
                  activeOpacity={0.7}
                  style={{ padding: 5 }}
                >
                  <Ionicons
                    name="arrow-back"
                    size={20}
                    color={themeColors.primary}
                  />
                </TouchableOpacity>
                <Text
                  style={{
                    color: themeColors.primary,
                    fontSize: 16,
                    fontWeight: "bold",
                    flex: 1,
                    textAlign: "center",
                    fontFamily: actualFontFamily,
                  }}
                >
                  {verseTitle}
                </Text>
                <View style={{ width: 30 }} />
              </View>
              {verseLoading && verseVerses.length === 0 ? (
                <ActivityIndicator size="small" color={themeColors.primary} />
              ) : (
                <ScrollView
                  contentContainerStyle={{ padding: 16 }}
                  style={{ maxHeight: 300 }}
                >
                  {verseVerses.map((verse) => (
                    <View
                      key={`${verse.chapter}-${verse.verse}`}
                      style={{ marginBottom: 8 }}
                    >
                      <VerseDisplay
                        verse={verse}
                        fontSize={16}
                        themeColors={themeColors}
                        fontFamily={actualFontFamily}
                        onTagPress={handleTagPressFromModal}
                        onWordPress={handleWordPress}
                        textColor={modalVerseTextColor}
                        prefix={`${verse.chapter}:${verse.verse}`}
                        showVerseNumbers={false}
                        showHeader={true}
                        isHighlighted={false}
                      />
                    </View>
                  ))}
                  {hasMore && (
                    <View style={{ alignItems: "center", paddingVertical: 10 }}>
                      <TouchableOpacity
                        onPress={loadMore}
                        disabled={verseLoading}
                        style={{
                          backgroundColor: themeColors.primary,
                          paddingHorizontal: 20,
                          paddingVertical: 8,
                          borderRadius: 5,
                          opacity: verseLoading ? 0.5 : 1,
                        }}
                        activeOpacity={0.7}
                      >
                        {verseLoading ? (
                          <ActivityIndicator size="small" color="white" />
                        ) : (
                          <Text style={{ color: "white", fontWeight: "600" }}>
                            Load More (
                            {currentVerseRef.chapterEnd! - loadedUpTo} chapters)
                          </Text>
                        )}
                      </TouchableOpacity>
                    </View>
                  )}
                </ScrollView>
              )}
              <TouchableOpacity
                onPress={handleCloseModal}
                style={{
                  backgroundColor: themeColors.primary,
                  paddingHorizontal: 20,
                  paddingVertical: 10,
                  borderRadius: 5,
                  marginTop: 10,
                  alignSelf: "center",
                }}
                activeOpacity={0.7}
              >
                <Text
                  style={{
                    color: "white",
                    fontWeight: "600",
                  }}
                >
                  Close
                </Text>
              </TouchableOpacity>
            </>
          ) : modalView === "word" ? (
            <>
              <Text
                style={{
                  textAlign: "center",
                  fontSize: 14,
                  fontWeight: "bold",
                  color: themeColors.primary,
                  fontFamily: actualFontFamily,
                  marginBottom: 5,
                }}
              >
                American Tract Society Bible Dictionary
              </Text>
              <View
                style={{
                  flexDirection: "row",
                  justifyContent: "space-between",
                  alignItems: "center",
                  marginBottom: 10,
                }}
              >
                {hasViewBack ? (
                  <TouchableOpacity
                    onPress={handleViewBack}
                    activeOpacity={0.7}
                    style={{ padding: 5 }}
                  >
                    <Ionicons
                      name="arrow-back"
                      size={20}
                      color={themeColors.primary}
                    />
                  </TouchableOpacity>
                ) : (
                  <View style={{ width: 30 }} />
                )}
                <Text
                  style={{
                    flex: 1,
                    textAlign: "center",
                    fontSize: 14,
                    fontWeight: "bold",
                    color: themeColors.textPrimary,
                    fontFamily: actualFontFamily,
                  }}
                >
                  Definition for "{selectedWord}"
                </Text>
                <View style={{ width: 30 }} />
              </View>
              {wordLoading ? (
                <ActivityIndicator size="small" color={themeColors.primary} />
              ) : (
                <ScrollView
                  style={{ maxHeight: 400 }}
                  contentContainerStyle={{ paddingHorizontal: 8 }}
                >
                  <Text style={commentaryModalStyle}>
                    {renderCommentaryWithVerseLinks(
                      wordDefinition,
                      themeColors,
                      actualFontFamily,
                      bookToNumber,
                      handleVerseLinkPress,
                      undefined,
                      undefined,
                      handleWordPress
                    )}
                  </Text>
                </ScrollView>
              )}
              <TouchableOpacity
                onPress={handleCloseModal}
                style={{
                  backgroundColor: themeColors.primary,
                  paddingHorizontal: 20,
                  paddingVertical: 10,
                  borderRadius: 5,
                  marginTop: 10,
                  alignSelf: "center",
                }}
                activeOpacity={0.7}
              >
                <Text
                  style={{
                    color: "white",
                    fontWeight: "600",
                  }}
                >
                  Close
                </Text>
              </TouchableOpacity>
            </>
          ) : (
            <>
              <View
                style={{
                  flexDirection: "row",
                  justifyContent: "space-between",
                  alignItems: "center",
                  marginBottom: 10,
                }}
              >
                {commentaryLeftContent}
                <Text
                  style={{
                    flex: 1,
                    textAlign: "center",
                    fontSize: 16,
                    fontWeight: "bold",
                    color: themeColors.primary,
                    fontFamily: actualFontFamily,
                  }}
                >
                  {currentTitle}
                </Text>
                <View style={{ width: 30 }} />
              </View>
              {selectedVerse && (
                <Text
                  style={{
                    color: themeColors.textMuted,
                    fontSize: 14,
                    marginBottom: 10,
                    textAlign: "center",
                    fontFamily: actualFontFamily,
                  }}
                >
                  {selectedVerse.book_name} {selectedVerse.chapter}:
                  {selectedVerse.verse}
                </Text>
              )}
              {commentaryLoading ? (
                <ActivityIndicator size="small" color={themeColors.primary} />
              ) : (
                <ScrollView
                  style={{ maxHeight: 400 }}
                  contentContainerStyle={{ paddingHorizontal: 8 }}
                >
                  {isDictMode ? (
                    (() => {
                      let remainingText = commentaryText;
                      const sections: React.ReactNode[] = [];
                      const headers = ["Derivation:"];
                      let keyCounter = 0;
                      for (const header of headers) {
                        const lowerHeader = header.toLowerCase();
                        const index = remainingText
                          .toLowerCase()
                          .indexOf(lowerHeader);
                        if (index === -1) continue;
                        const before = remainingText.substring(0, index);
                        if (before.trim()) {
                          sections.push(
                            <View
                              key={`before-${keyCounter++}`}
                              style={{ marginBottom: 8 }}
                            >
                              <Text style={commentaryModalStyle}>
                                {renderDictionaryText(
                                  before,
                                  commentaryModalStyle,
                                  themeColors,
                                  actualFontFamily,
                                  handleStrongPress
                                )}
                              </Text>
                            </View>
                          );
                        }
                        const colonIndex = remainingText.indexOf(":", index);
                        const headerStart =
                          colonIndex !== -1
                            ? colonIndex + 1
                            : index + header.length;
                        const headerLabel = remainingText
                          .substring(index, headerStart)
                          .trim();
                        remainingText = remainingText
                          .substring(headerStart)
                          .trimStart();
                        sections.push(
                          <View
                            key={header}
                            style={{
                              borderTopWidth: 1,
                              borderTopColor: themeColors.border,
                              paddingTop: 12,
                              paddingBottom: 8,
                            }}
                          >
                            <Text
                              style={[
                                commentaryModalStyle,
                                { fontWeight: "bold", marginBottom: 4 },
                              ]}
                            >
                              {headerLabel}
                            </Text>
                          </View>
                        );
                      }
                      const lowerSee = "see:";
                      let seeStartIndex = remainingText
                        .toLowerCase()
                        .indexOf(lowerSee);
                      if (seeStartIndex !== -1) {
                        const beforeSee = remainingText.substring(
                          0,
                          seeStartIndex
                        );
                        if (beforeSee.trim()) {
                          sections.push(
                            <View
                              key={`before-see-${keyCounter++}`}
                              style={{ marginBottom: 8 }}
                            >
                              <Text style={commentaryModalStyle}>
                                {renderDictionaryText(
                                  beforeSee,
                                  commentaryModalStyle,
                                  themeColors,
                                  actualFontFamily,
                                  handleStrongPress
                                )}
                              </Text>
                            </View>
                          );
                        }
                        const seeContents: string[] = [];
                        let searchPos = seeStartIndex;
                        let lastEnd = seeStartIndex;
                        while (true) {
                          const colonIndex = remainingText.indexOf(
                            ":",
                            searchPos
                          );
                          if (colonIndex === -1) {
                            break;
                          }
                          const contentStart = colonIndex + 1;
                          const nextSeeIndex = remainingText
                            .toLowerCase()
                            .indexOf(lowerSee, contentStart);
                          const contentEnd =
                            nextSeeIndex !== -1
                              ? nextSeeIndex
                              : remainingText.length;
                          const content = remainingText
                            .substring(contentStart, contentEnd)
                            .trim();
                          if (content) {
                            const words = content
                              .split(/,\s*/)
                              .map((w) => w.trim())
                              .filter(Boolean);
                            seeContents.push(...words);
                          }
                          lastEnd = contentEnd;
                          if (nextSeeIndex === -1) break;
                          searchPos = nextSeeIndex;
                        }
                        if (seeContents.length > 0) {
                          sections.push(
                            <View
                              key="see"
                              style={{
                                borderTopWidth: 1,
                                borderTopColor: themeColors.border,
                                paddingTop: 12,
                                paddingBottom: 8,
                              }}
                            >
                              <Text
                                style={[
                                  commentaryModalStyle,
                                  { fontWeight: "bold", marginBottom: 4 },
                                ]}
                              >
                                See:
                              </Text>
                              <View
                                style={{
                                  flexDirection: "row",
                                  flexWrap: "wrap",
                                }}
                              >
                                {seeContents.map((word, idx) => (
                                  <Fragment key={idx}>
                                    {idx > 0 && (
                                      <Text style={commentaryModalStyle}>
                                        ,{" "}
                                      </Text>
                                    )}
                                    <Text
                                      onPress={() => {
                                        if (/^[HG]\d+$/i.test(word)) {
                                          handleStrongPress(word.substring(1));
                                        } else {
                                          handleWordPress(word);
                                        }
                                      }}
                                      style={[
                                        commentaryModalStyle,
                                        {
                                          color: themeColors.primary,
                                          textDecorationLine: "underline",
                                          fontWeight: "600",
                                        },
                                      ]}
                                    >
                                      {word}
                                    </Text>
                                  </Fragment>
                                ))}
                              </View>
                            </View>
                          );
                          remainingText = remainingText
                            .substring(lastEnd)
                            .trimStart();
                        } else {
                          const colonIndex = remainingText.indexOf(
                            ":",
                            seeStartIndex
                          );
                          if (colonIndex !== -1) {
                            remainingText = remainingText
                              .substring(colonIndex + 1)
                              .trimStart();
                          } else {
                            remainingText = remainingText
                              .substring(seeStartIndex + 4)
                              .trimStart();
                          }
                        }
                      }
                      if (remainingText.trim()) {
                        sections.push(
                          <View key="remaining">
                            <Text style={commentaryModalStyle}>
                              {renderDictionaryText(
                                remainingText,
                                commentaryModalStyle,
                                themeColors,
                                actualFontFamily,
                                handleStrongPress
                              )}
                            </Text>
                          </View>
                        );
                      }
                      return sections.length > 0 ? (
                        sections
                      ) : (
                        <Text style={commentaryModalStyle}>
                          {renderDictionaryText(
                            commentaryText,
                            commentaryModalStyle,
                            themeColors,
                            actualFontFamily,
                            handleStrongPress
                          )}
                        </Text>
                      );
                    })()
                  ) : (
                    <Text style={commentaryModalStyle}>
                      {renderCommentaryWithVerseLinks(
                        commentaryText,
                        themeColors,
                        actualFontFamily,
                        bookToNumber,
                        handleVerseLinkPress,
                        selectedVerse?.book_number,
                        selectedVerse?.chapter,
                        handleWordPress
                      )}
                    </Text>
                  )}
                </ScrollView>
              )}
              <TouchableOpacity
                onPress={handleCloseModal}
                style={{
                  backgroundColor: themeColors.primary,
                  paddingHorizontal: 20,
                  paddingVertical: 10,
                  borderRadius: 5,
                  marginTop: 10,
                  alignSelf: "center",
                }}
                activeOpacity={0.7}
              >
                <Text
                  style={{
                    color: "white",
                    fontWeight: "600",
                  }}
                >
                  Close
                </Text>
              </TouchableOpacity>
            </>
          )}
        </View>
      </View>
    );

    return (
      <Modal
        visible={visible}
        transparent
        animationType="fade"
        onRequestClose={handleCloseModal}
      >
        {modalContent}
      </Modal>
    );
  }
);

export const EnhancedModal = EnhancedModalComp;
