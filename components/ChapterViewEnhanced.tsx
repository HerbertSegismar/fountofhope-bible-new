import React, { useMemo, useState, useCallback, useEffect } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  StyleProp,
  ViewStyle,
  LayoutChangeEvent,
  DimensionValue,
  Modal,
  ScrollView,
  ActivityIndicator,
  TextStyle,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { Verse } from "../types";
import {
  useTheme,
  type ColorScheme,
  type Theme,
  type FontFamily,
} from "../context/ThemeContext";
import { Platform } from "react-native";
import { BIBLE_BOOKS_MAP } from "../utils/testamentUtils";
import { useBibleDatabase } from "../context/BibleDatabaseContext";
import { BOOK_ABBREVS } from "../utils/bookAbbrevs";
import { getTestament } from "../utils/testamentUtils";

const primaryColors: Record<ColorScheme, { light: string; dark: string }> = {
  purple: { light: "#A855F7", dark: "#9333EA" },
  green: { light: "#10B981", dark: "#059669" },
  red: { light: "#EF4444", dark: "#DC2626" },
  yellow: { light: "#F59E0B", dark: "#D97706" },
};

const BASE_LIGHT_THEME_COLORS = {
  card: "#FFFFFF",
  background: "#FFFFFF",
  surface: "#F8F9FA",
  textPrimary: "#1F2937",
  textSecondary: "#374151",
  textMuted: "#6C757D",
  highlightBg: "#FFF3CD",
  highlightBorder: "#FFD700",
  highlightText: "#8B4513",
  highlightIcon: "#B8860B",
  tagBg: "rgba(0,255,0,0.1)",
  searchHighlightBg: "#FFFF99",
  border: "#E9ECEF",
} as const;

const BASE_DARK_THEME_COLORS = {
  card: "#111827",
  background: "#111827",
  surface: "#1F2937",
  textPrimary: "#F9FAFB",
  textSecondary: "#D1D5DB",
  textMuted: "#9CA3AF",
  highlightBg: "#1F2937",
  highlightBorder: "#FCD34D",
  highlightText: "#FECACA",
  highlightIcon: "#FCD34D",
  tagBg: "rgba(255,255,0.1)",
  searchHighlightBg: "#374151",
  border: "#374151",
} as const;

type BaseThemeColors =
  | typeof BASE_LIGHT_THEME_COLORS
  | typeof BASE_DARK_THEME_COLORS;

const getThemeColors = (
  theme: Theme,
  colorScheme: ColorScheme
): ThemeColors => {
  const primary =
    primaryColors[colorScheme][theme === "dark" ? "dark" : "light"];
  const baseColors =
    theme === "dark" ? BASE_DARK_THEME_COLORS : BASE_LIGHT_THEME_COLORS;

  const getLighterColor = (hex: string, amount: number = 50): string => {
    const num = parseInt(hex.replace("#", ""), 16);
    const amt = Math.round(2.55 * amount);
    const R = (num >> 16) + amt;
    const G = ((num >> 8) & 0x00ff) + amt;
    const B = (num & 0x0000ff) + amt;
    return (
      "#" +
      (
        0x1000000 +
        (R < 255 ? (R < 1 ? 0 : R) : 255) * 0x10000 +
        (G < 255 ? (G < 1 ? 0 : G) : 255) * 0x100 +
        (B < 255 ? (B < 1 ? 0 : B) : 255)
      )
        .toString(16)
        .slice(1)
    );
  };

  const lighterPrimary = getLighterColor(primary, theme === "dark" ? 40 : -10);

  return {
    ...baseColors,
    primary,
    verseNumber: lighterPrimary,
    tagColor: primary,
  } as const;
};

type ThemeColors = BaseThemeColors & {
  primary: string;
  verseNumber: string;
  tagColor: string;
};

const commentaryDBMap: Record<string, string> = {
  AMPC: "ampccom.sqlite3",
  ESVGSB: "esvgsbcom.sqlite3",
  NKJV: "nkjvcom.sqlite3",
  CSB17: "csb17com.sqlite3",
  ESV: "esvcom.sqlite3",
  NIV11: "niv11com.sqlite3",
  NLT15: "nlt15com.sqlite3",
  RV1895: "rv1895com.sqlite3",
} as const;

// Reverse mapping from display names to stems (e.g., "CSB (2017)" -> "csb17")
const DISPLAY_TO_STEM_MAP: Record<string, string> = {
  AMPC: "ampc",
  NIV11: "niv11",
  CSB17: "csb17",
  YLT: "ylt",
  NLT15: "nlt15",
  NKJV: "nkjv",
  NASB: "nasb",
  Logos: "logos",
  KJ2: "kj2",
  ESV: "esv",
  ESVGSB: "esvgsb",
  IESV: "iesvth",
  RV1895: "rv1895",
  CEBB: "cebB",
  MBB05: "mbb05",
  TAGAB01: "tagab01",
  TAGMB12: "tagmb12",
  HILAB82: "hilab82",
} as const;

// Normalization helper to handle displayVersion variations to map key
const getVersionKey = (
  displayVersion: string | undefined
): string | undefined => {
  if (!displayVersion) return undefined;

  // First, try exact match in reverse map
  let stem = DISPLAY_TO_STEM_MAP[displayVersion];
  if (stem) {
    return stem.toUpperCase();
  }

  // Fallback: Uppercase and remove year in parentheses, e.g., "CSB (2017)" -> "CSB"
  let normalized = displayVersion
    .toUpperCase()
    .replace(/\s*\(\d{4}\)/g, "")
    .trim();

  // Manual mapping for common normalized forms
  const normalizedToStem: Record<string, string> = {
    CSB: "csb17",
    NLT: "nlt15",
    NIV: "niv11",
    RV: "rv1895",
  } as const;

  const normKey = normalized.replace(/\s+/g, "");
  stem = normalizedToStem[normKey];
  return stem ? stem.toUpperCase() : undefined;
};

const stripTags = (text: string): string => {
  // Remove entire <script> blocks to filter out JavaScript code
  let cleaned = text.replace(
    /<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script\s*>/gi,
    ""
  );
  // Remove other HTML tags
  cleaned = cleaned.replace(/<[^>]*>/g, "");
  // Filter out arrow HTML entities (e.g., &larr;, &rarr;, etc.)
  cleaned = cleaned.replace(
    /&(?:larr|rarr|uarr|darr|harr|laquo|raquo|lt|gt);/gi,
    ""
  );
  // Normalize whitespace
  cleaned = cleaned.replace(/\s+/g, " ").trim();
  return cleaned;
};

const useDictionary = (displayVersion: string | undefined) => {
  const { getDatabase } = useBibleDatabase();

  const loadDictionaryDefinition = useCallback(
    async (verse: Verse | null, tagContent: string): Promise<string> => {
      if (!verse || !tagContent) {
        return `Strong's: "${tagContent}"`;
      }

      // Check if this is NASB version
      const versionKey = getVersionKey(displayVersion);
      if (versionKey !== "NASB") {
        return `Strong's: "${tagContent}" (Dictionary only available for NASB)`;
      }

      // Only handle numeric tags for Strong's numbers
      if (!/^\d+$/.test(tagContent)) {
        return `Strong's: "${tagContent}" (Not a valid Strong's number)`;
      }

      try {
        // Load dictionary database
        const dictionaryDB = await getDatabase("secedictionary.sqlite3");
        if (!dictionaryDB) {
          return `Strong's: "${tagContent}" (Dictionary database not loaded)`;
        }

        // Determine prefix based on testament using your testamentUtils
        const testament = getTestament(
          verse.book_number,
          verse.book_name || ""
        );
        const isNewTestament = testament === "NT";
        const prefix = isNewTestament ? "G" : "H";
        const strongNumber = `${prefix}${tagContent}`;

        console.log(
          `Looking up Strong's number in dictionary: ${strongNumber} for ${verse.book_name} (${testament})`
        );

        const definition =
          await dictionaryDB.getDictionaryDefinition(strongNumber);

        if (definition) {
          // Clean up the definition text - remove HTML tags and extra whitespace but preserve line breaks
          let cleanedDefinition = stripTags(definition)
            .replace(/\u200e/g, "") // remove LRM
            .replace(/&#x200e;/gi, "") // remove entity if present
            .replace(/\.\s+/g, ".\n\n")
            .trim();

          cleanedDefinition = cleanedDefinition.replace(
            /LN:\s*\d+(?:\.\d+)?(?:\s*,\s*\d+(?:\.\d+)?)*\s*(?:;)?\s*(?=[A-Za-z]|$)/gi,
            ""
          );

          cleanedDefinition = cleanedDefinition
            .replace(/([a-zA-Z])(KJV)/gi, "$1 KJV")
            .replace(/([a-zA-Z])(Derivation)/gi, "$1 Derivation");

          return `Strong's ${strongNumber} (${isNewTestament ? "Greek" : "Hebrew"}):\n\n${cleanedDefinition}`;
        } else {
          console.log(`No definition found for Strong's ${strongNumber}`);
          return `No definition found for Strong's ${strongNumber} (${isNewTestament ? "Greek" : "Hebrew"})`;
        }
      } catch (error) {
        console.error(`[Dictionary] Error loading definition:`, error);
        return `Error loading definition for Strong's "${tagContent}". Please try again.`;
      }
    },
    [displayVersion, getDatabase]
  );

  return { loadDictionaryDefinition };
};

const useCommentary = (displayVersion: string | undefined) => {
  const { getDatabase } = useBibleDatabase();
  const { loadDictionaryDefinition } = useDictionary(displayVersion);

  const loadCommentaryForVerse = useCallback(
    async (verse: Verse | null, tagContent: string): Promise<string> => {
      if (!verse || !tagContent) {
        return `Marker: "${tagContent}"`;
      }

      const versionKey = getVersionKey(displayVersion);

      // For NASB, check if this is a Strong's number (numeric tag)
      if (versionKey === "NASB" && /^\d+$/.test(tagContent)) {
        return await loadDictionaryDefinition(verse, tagContent);
      }

      // Original commentary logic for other versions
      const dbName = versionKey
        ? commentaryDBMap[versionKey as keyof typeof commentaryDBMap]
        : undefined;

      if (!dbName) {
        return `Marker: "${tagContent}" (Commentary not available for ${displayVersion})`;
      }

      try {
        const commentaryDB = await getDatabase(dbName);
        if (!commentaryDB) {
          return `Marker: "${tagContent}" (Commentary database not loaded)`;
        }

        const commentaryText = await commentaryDB.getCommentary(
          verse.book_number,
          verse.chapter,
          verse.verse,
          tagContent
        );

        if (commentaryText) {
          return stripTags(commentaryText);
        } else {
          const availableMarkers: string[] =
            await commentaryDB.getAvailableCommentaryMarkers(
              verse.book_number,
              verse.chapter,
              verse.verse
            );

          if (availableMarkers.length > 0) {
            return `No commentary found for marker "${tagContent}" in ${displayVersion}. Available markers: ${availableMarkers.join(", ")}`;
          } else {
            return `No commentary found for marker "${tagContent}" in ${displayVersion}.`;
          }
        }
      } catch (error) {
        console.error(`[Commentary] Error loading commentary:`, error);
        return `Error loading commentary for marker "${tagContent}".`;
      }
    },
    [displayVersion, getDatabase, loadDictionaryDefinition]
  );

  return { loadCommentaryForVerse };
};

type ParsedNode = {
  type: "text" | "opening-tag" | "closing-tag" | "self-closing-tag";
  content?: string;
  tag?: string;
  fullTag?: string;
};

type TreeNode = {
  type: "text" | "element" | "self-closing-tag";
  content?: string;
  tag?: string;
  fullTag?: string;
  children?: TreeNode[];
};

// Build a tree structure from parsed nodes to handle nesting
const buildTree = (nodes: ParsedNode[]): TreeNode[] => {
  const root: TreeNode[] = [];
  let current: TreeNode[] = root;
  const stack: TreeNode[][] = [];

  for (const node of nodes) {
    if (node.type === "opening-tag") {
      const element: TreeNode = {
        type: "element",
        tag: node.tag,
        fullTag: node.fullTag,
        children: [],
      };
      current.push(element);
      stack.push(current);
      current = element.children!;
    } else if (node.type === "closing-tag") {
      if (stack.length > 0) {
        current = stack.pop()!;
      }
    } else if (node.type === "self-closing-tag" || node.type === "text") {
      current.push(node as TreeNode);
    }
  }

  return root;
};

const parseXmlTags = (text: string): ParsedNode[] => {
  if (!text) return [];

  const nodes: ParsedNode[] = [];
  let currentText = "";
  let i = 0;

  while (i < text.length) {
    if (text[i] === "<") {
      // Push any accumulated text before the tag
      if (currentText) {
        nodes.push({ type: "text", content: currentText });
        currentText = "";
      }

      // Find the end of the tag
      const tagEnd = text.indexOf(">", i);
      if (tagEnd === -1) {
        currentText += text.substring(i);
        break;
      }

      const fullTag = text.substring(i, tagEnd + 1);

      if (fullTag.startsWith("</")) {
        // Closing tag
        nodes.push({ type: "closing-tag", tag: fullTag });
      } else if (fullTag.endsWith("/>")) {
        // Self-closing tag
        const tagName = fullTag.slice(1, -2).trim();
        nodes.push({ type: "self-closing-tag", tag: tagName, fullTag });
      } else {
        // Opening tag
        const tagName = fullTag.slice(1, -1).trim().split(" ")[0];
        nodes.push({ type: "opening-tag", tag: tagName, fullTag });
      }

      i = tagEnd + 1;
    } else {
      currentText += text[i];
      i++;
    }
  }

  // Push any remaining text
  if (currentText) {
    nodes.push({ type: "text", content: currentText });
  }

  return nodes;
};

// Render the tree to React elements
const renderTree = (
  tree: TreeNode[],
  baseFontSize: number,
  themeColors: ThemeColors,
  highlight?: string,
  fontFamily?: string,
  onTagPress?: (content: string) => void,
  textColor?: string
): React.ReactNode[] => {
  const elements: React.ReactNode[] = [];
  let key = 0;

  const renderNode = (
    node: TreeNode,
    overrideTextColor?: string
  ): React.ReactNode => {
    key++;

    if (node.type === "text") {
      return renderTextWithHighlight(
        node.content || "",
        themeColors,
        highlight,
        `text-${key}`,
        fontFamily,
        overrideTextColor || textColor
      );
    } else if (node.type === "self-closing-tag") {
      const content = extractContentFromTag(node.fullTag || "");
      const isNumber = /^\d+$/.test(content.trim());
      const tagContent = content.trim();
      return (
        <Text
          key={`self-${key}`}
          onPress={() => onTagPress?.(tagContent)}
          style={{
            fontSize: isNumber ? baseFontSize * 0.5 : baseFontSize * 0.95,
            color: themeColors.tagColor,
            backgroundColor: themeColors.tagBg,
            fontFamily,
          }}
        >
          {content}
        </Text>
      );
    } else if (node.type === "element") {
      const ch = node.children || [];
      const isTextContainer = node.tag === "t";
      const isNumber =
        node.tag === "S" &&
        ch.length === 1 &&
        ch[0].type === "text" &&
        /^\d+$/.test((ch[0].content || "").trim());

      const tagContent = ch
        .map((child: TreeNode) =>
          child.type === "text" ? child.content || "" : ""
        )
        .join("")
        .trim();

      if (isTextContainer) {
        // For text containers like <t>, do not colorize plain text, render children with outer textColor
        const children = ch.map((child: TreeNode) =>
          renderNode(child, textColor)
        );
        return (
          <Text
            key={`elem-${key}`}
            style={{
              fontSize: baseFontSize * 0.95,
              fontFamily,
            }}
          >
            {children}
          </Text>
        );
      } else {
        // For marker elements, colorize and make clickable
        const children = ch.map((child: TreeNode) =>
          renderNode(child, themeColors.tagColor)
        );
        return (
          <Text
            key={`elem-${key}`}
            onPress={() => onTagPress?.(tagContent)}
            style={{
              fontSize: isNumber ? baseFontSize * 0.5 : baseFontSize * 0.95,
              color: themeColors.tagColor,
              fontFamily,
            }}
          >
            {children}
          </Text>
        );
      }
    }

    return null;
  };

  for (const node of tree) {
    elements.push(renderNode(node));
  }

  return elements;
};

// Extract content from between tags
const extractContentFromTag = (tag: string): string => {
  const match = tag.match(/<[^>]+>([^<]*)<\/[^>]+>/);
  return match ? match[1] : "";
};

// Render text with highlighting
const renderTextWithHighlight = (
  text: string,
  themeColors: ThemeColors,
  highlight?: string,
  keyPrefix?: string,
  fontFamily?: string,
  textColor?: string
): React.ReactNode => {
  const innerStyle = { fontFamily, color: textColor };

  if (!highlight || !text)
    return (
      <Text key={keyPrefix} style={innerStyle}>
        {text}
      </Text>
    );

  const cleanText = text.replace(/<[^>]+>/g, "");
  if (!cleanText)
    return (
      <Text key={keyPrefix} style={innerStyle}>
        {text}
      </Text>
    );

  const regex = new RegExp(`(${escapeRegex(highlight)})`, "gi");
  const parts = cleanText.split(regex);

  return (
    <Text key={keyPrefix} style={innerStyle}>
      {parts.map((part, i) =>
        part.toLowerCase() === highlight.toLowerCase() ? (
          <Text
            key={`${keyPrefix}-${i}`}
            style={{
              ...innerStyle,
              backgroundColor: themeColors.searchHighlightBg,
            }}
          >
            {part}
          </Text>
        ) : (
          <Text key={`${keyPrefix}-${i}`} style={innerStyle}>
            {part}
          </Text>
        )
      )}
    </Text>
  );
};

// Helper to escape regex special characters
const escapeRegex = (string: string) => {
  return string.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
};

// Improved verse text rendering
const renderVerseTextWithXmlHighlight = (
  text: string,
  baseFontSize: number,
  themeColors: ThemeColors,
  highlight?: string,
  fontFamily?: string,
  onTagPress?: (content: string) => void,
  textColor?: string
): React.ReactNode[] => {
  if (!text) return [];

  try {
    const nodes = parseXmlTags(text);
    const tree = buildTree(nodes);
    return renderTree(
      tree,
      baseFontSize,
      themeColors,
      highlight,
      fontFamily,
      onTagPress,
      textColor
    );
  } catch (error) {
    console.error("Error parsing XML tags:", error);
    return [
      renderTextWithHighlight(
        text,
        themeColors,
        highlight,
        "fallback",
        fontFamily,
        textColor
      ),
    ];
  }
};

// Helper function to find book number with exact match or normalization for abbreviations and variations
const findBookNumber = (
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

const parseVerseList = (verseStr: string): { start: number; end: number }[] => {
  if (!verseStr) return [];
  const parts = verseStr.split(",").map((p) => p.trim());
  const ranges: { start: number; end: number }[] = [];
  const rangeRegex = /(\d+)(?:\s*(?:[-–—]|\s*to\s*)\s*(\d+))?/gi;
  parts.forEach((part) => {
    rangeRegex.lastIndex = 0;
    const match = rangeRegex.exec(part);
    if (match) {
      const start = parseInt(match[1], 10);
      const end = match[2] ? parseInt(match[2], 10) : start;
      ranges.push({ start, end });
    }
  });
  return ranges;
};

// Render commentary text with clickable verse references
const renderCommentaryWithVerseLinks = (
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

// Map fontFamily to actual font family string
const getFontFamily = (fontFamily: FontFamily): string | undefined => {
  switch (fontFamily) {
    case "serif":
      return Platform.OS === "ios" ? "Georgia" : "serif";
    case "sans-serif":
      return Platform.OS === "ios" ? "Helvetica Neue" : "sans-serif";
    case "system":
    default:
      return undefined;
  }
};

const STYLES = {
  container: {
    borderRadius: 8,
    shadowOpacity: 0.1,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 2 },
    elevation: 2,
    minHeight: 400,
    alignSelf: "stretch" as const,
    width: "100%" as DimensionValue,
    overflow: "hidden",
  },
  verse: {
    flexDirection: "row" as const,
    alignItems: "flex-start" as const,
  },
  verseNumber: {
    includeFontPadding: false,
  },
  verseText: {
    textAlign: "left" as const,
    flex: 1,
    minWidth: 0,
  },
} as const;

interface ChapterViewProps {
  verses: Verse[];
  bookName: string;
  chapterNumber: number;
  onPress?: () => void;
  showVerseNumbers?: boolean;
  fontSize?: number;
  onVersePress?: (verse: Verse) => void;
  onVerseLayout?: (verseNumber: number, event: LayoutChangeEvent) => void;
  onVerseRef?: (verseNumber: number, ref: View | null) => void;
  highlightVerse?: number;
  highlightedVerses?: Set<number>;
  bookmarkedVerses?: Set<number>;
  style?: StyleProp<ViewStyle>;
  bookId?: number;
  isFullScreen?: boolean;
  displayVersion?: string;
  colors?: any;
  onNavigateToVerse?: (
    bookNumber: number,
    chapter: number,
    verse: number
  ) => void;
}

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

type VerseState = {
  view: "verse";
  currentVerseRef: {
    bookNum: number;
    chapter: number;
    ranges: { start: number; end: number }[];
  };
  verseVerses: Verse[];
};

type ModalState = CommentaryState | VerseState;

export const ChapterViewEnhanced: React.FC<ChapterViewProps> = ({
  verses,
  bookName,
  chapterNumber,
  onPress,
  showVerseNumbers = true,
  fontSize = 16,
  onVersePress,
  onVerseLayout,
  onVerseRef,
  highlightVerse,
  highlightedVerses = new Set(),
  bookmarkedVerses = new Set(),
  style,
  isFullScreen,
  displayVersion,
}) => {
  const { theme, colorScheme, fontFamily } = useTheme();
  const themeColors = getThemeColors(theme, colorScheme);
  const actualFontFamily = getFontFamily(fontFamily);
  const { loadCommentaryForVerse } = useCommentary(displayVersion);
  const { bibleDB } = useBibleDatabase();

  const bookToNumber = useMemo(() => {
    const map: Record<string, number> = {};
    Object.entries(BIBLE_BOOKS_MAP).forEach(([dbNumStr, { long, short }]) => {
      const dbNum = parseInt(dbNumStr, 10);
      // Add full name
      map[long] = dbNum;
      // Add standard short
      map[short] = dbNum;
      // Add additional abbreviations
      const abbrevs = BOOK_ABBREVS[long] || [];
      abbrevs.forEach((abb) => {
        if (!map[abb]) {
          map[abb] = dbNum;
        }
      });
    });
    return map;
  }, []);

  const getBookName = useCallback((bookNum: number) => {
    const entry = Object.entries(BIBLE_BOOKS_MAP).find(
      ([key, value]) => parseInt(key) === bookNum
    );
    return entry ? entry[1].long : "Unknown Book";
  }, []);

  const [showTagModal, setShowTagModal] = useState(false);
  const [modalStack, setModalStack] = useState<ModalState[]>([]);
  const [modalView, setModalView] = useState<"commentary" | "verse">(
    "commentary"
  );
  const [tagContent, setTagContent] = useState("");
  const [selectedVerse, setSelectedVerse] = useState<Verse | null>(null);
  const [commentaryLoading, setCommentaryLoading] = useState(false);
  const [commentaryText, setCommentaryText] = useState("");
  const [currentVerseRef, setCurrentVerseRef] = useState<{
    bookNum: number;
    chapter: number;
    ranges: { start: number; end: number }[];
  } | null>(null);
  const [verseLoading, setVerseLoading] = useState(false);
  const [verseVerses, setVerseVerses] = useState<Verse[]>([]);
  const [dictHistory, setDictHistory] = useState<DictHistoryEntry[]>([]);
  const [currentDictIndex, setCurrentDictIndex] = useState<number>(-1);

  // Sync states from top of stack
  useEffect(() => {
    if (modalStack.length === 0) {
      setShowTagModal(false);
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
      setVerseVerses([]);
    } else {
      setCurrentVerseRef(top.currentVerseRef);
      setVerseVerses(top.verseVerses);
      setTagContent("");
      setSelectedVerse(null);
    }
  }, [modalStack]);

  const testament = selectedVerse
    ? getTestament(selectedVerse.book_number, selectedVerse.book_name || "")
    : null;
  const isNewTestament = testament === "NT";
  const language = isNewTestament ? "Greek" : "Hebrew";

  // Load commentary when modal opens or changes
  useEffect(() => {
    if (!showTagModal || modalView !== "commentary") return;

    if (!selectedVerse || !tagContent) {
      setCommentaryLoading(false);
      return;
    }

    const versionKey = getVersionKey(displayVersion);
    const isDict = versionKey === "NASB" && /^\d+$/.test(tagContent);

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
        const prefix =
          getTestament(
            selectedVerse.book_number,
            selectedVerse.book_name || ""
          ) === "NT"
            ? "G"
            : "H";
        const full = `${prefix}${tagContent}`;
        const entry: DictHistoryEntry = { digits: tagContent, text, full };

        let newHistory: DictHistoryEntry[] = dictHistory;
        let newIndex = currentDictIndex;
        if (
          currentDictIndex < 0 ||
          dictHistory[currentDictIndex]?.digits !== tagContent
        ) {
          newHistory = [...dictHistory.slice(0, currentDictIndex + 1), entry];
          newIndex = currentDictIndex < 0 ? 0 : currentDictIndex + 1;
        } else {
          newHistory = dictHistory.map((item, idx) =>
            idx === currentDictIndex ? entry : item
          );
          newIndex = currentDictIndex;
        }
        updates.dictHistory = newHistory;
        updates.dictIndex = newIndex;
      }

      setModalStack((prev) => {
        if (prev.length === 0 || prev[prev.length - 1].view !== "commentary") {
          return prev;
        }
        const last = prev[prev.length - 1] as CommentaryState;
        const newTop: CommentaryState = { ...last, ...updates };
        return [...prev.slice(0, -1), newTop];
      });
    };

    loadAsync();
  }, [
    showTagModal,
    selectedVerse,
    tagContent,
    modalView,
    displayVersion,
    loadCommentaryForVerse,
    currentDictIndex,
    dictHistory,
  ]);

  const currentTitle = useMemo(() => {
    const isDictMode = displayVersion === "NASB" && /^\d+$/.test(tagContent);
    if (!isDictMode) return `Commentary for marker "${tagContent}"`;

    const prefix = isNewTestament ? "G" : "H";
    const full =
      currentDictIndex >= 0
        ? dictHistory[currentDictIndex]?.full
        : `${prefix}${tagContent}`;
    return `Strong's ${full} (${language})`;
  }, [
    tagContent,
    displayVersion,
    isNewTestament,
    currentDictIndex,
    dictHistory,
    language,
  ]);

  const handleTagPress = useCallback((content: string, verse: Verse) => {
    const initialState: CommentaryState = {
      view: "commentary",
      tagContent: content,
      selectedVerse: verse,
      dictHistory: [],
      dictIndex: -1,
      commentaryText: "",
    };
    setModalStack([initialState]);
    setShowTagModal(true);
  }, []);

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

  const handleStrongPress = useCallback((digits: string) => {
    setTagContent(digits);
    setModalStack((prev) => {
      if (prev.length === 0 || prev[prev.length - 1].view !== "commentary") {
        return prev;
      }
      const last = prev[prev.length - 1] as CommentaryState;
      const newTop: CommentaryState = { ...last, tagContent: digits };
      return [...prev.slice(0, -1), newTop];
    });
  }, []);

  const handleBack = useCallback(() => {
    if (currentDictIndex > 0) {
      const newIndex = currentDictIndex - 1;
      const entry = dictHistory[newIndex];
      setCurrentDictIndex(newIndex);
      setTagContent(entry.digits);
      setCommentaryText(entry.text);
      setModalStack((prev) => {
        if (prev.length === 0 || prev[prev.length - 1].view !== "commentary") {
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

  const handleVerseLinkPress = useCallback(
    async (
      bookNum: number,
      ch: number,
      ranges: { start: number; end: number }[]
    ) => {
      const newState: VerseState = {
        view: "verse",
        currentVerseRef: { bookNum, chapter: ch, ranges },
        verseVerses: [],
      };
      setModalStack((prev) => [...prev, newState]);
      setVerseLoading(true);
      if (bibleDB) {
        try {
          const loadedVerses = await bibleDB.getVerses(bookNum, ch);
          const targetVerses = loadedVerses.filter((verse) =>
            ranges.some((r) => verse.verse >= r.start && verse.verse <= r.end)
          );
          setVerseLoading(false);
          setModalStack((prev) => {
            if (prev.length === 0 || prev[prev.length - 1].view !== "verse") {
              return prev;
            }
            const last = prev[prev.length - 1] as VerseState;
            const newTop: VerseState = { ...last, verseVerses: targetVerses };
            return [...prev.slice(0, -1), newTop];
          });
        } catch (e) {
          console.error("Error loading verses:", e);
          setVerseVerses([]);
          setVerseLoading(false);
        }
      } else {
        setVerseVerses([]);
        setVerseLoading(false);
      }
    },
    [bibleDB]
  );

  const handleCloseModal = useCallback(() => {
    setModalStack([]);
  }, []);

  // Sort verses by verse number
  const sortedVerses = useMemo(
    () => [...verses].sort((a, b) => a.verse - b.verse),
    [verses]
  );

  const handleVerseLayout = (verseNumber: number, event: LayoutChangeEvent) => {
    onVerseLayout?.(verseNumber, event);
  };

  const handleVerseRef = (verseNumber: number, ref: View | null) => {
    if (ref) {
      onVerseRef?.(verseNumber, ref);
    }
  };

  const handleVersePress = (verse: Verse) => {
    onVersePress?.(verse);
  };

  const getHeaderTitle = () => {
    let title = `${bookName} ${chapterNumber}`;
    if (highlightVerse) {
      title += ` : ${highlightVerse}`;
    }
    return title;
  };

  const versionText = useMemo(
    () => (displayVersion ? ` • ${displayVersion.toUpperCase()}` : ""),
    [displayVersion]
  );

  // Get book color and calculate contrast text color
  const bookColor = sortedVerses[0]?.book_color || themeColors.primary;

  const modalVerseTextColor =
    theme === "dark" ? "#FFFFFF" : themeColors.textPrimary;

  const commentaryModalStyle: TextStyle = {
    color: themeColors.textPrimary,
    fontSize: 16,
    lineHeight: 24,
    fontFamily: actualFontFamily,
  };

  const isDictMode = displayVersion === "NASB" && /^\d+$/.test(tagContent);

  const hasViewBack = modalStack.length > 1;
  const hasDictBack =
    modalView === "commentary" && isDictMode && currentDictIndex > 0;

  if (sortedVerses.length === 0) {
    return (
      <View
        style={[
          {
            backgroundColor: themeColors.card,
            padding: isFullScreen ? 8 : 16,
            borderRadius: 8,
            borderWidth: 1,
            borderColor: themeColors.border,
          },
          style,
        ]}
      >
        <Text
          style={{
            textAlign: "center",
            color: themeColors.textMuted,
            fontSize: isFullScreen ? 14 : 16,
            fontFamily: actualFontFamily,
          }}
        >
          No verses available
        </Text>
      </View>
    );
  }

  const renderVerseItem = (verse: Verse) => {
    const isHighlighted =
      highlightedVerses.has(verse.verse) || verse.verse === highlightVerse;
    const verseTextColor = isHighlighted
      ? themeColors.highlightText
      : themeColors.textPrimary;

    const localOnTagPress = useCallback(
      (content: string) => {
        handleTagPress(content, verse);
      },
      [handleTagPress, verse]
    );

    const renderedText = useMemo(
      () =>
        renderVerseTextWithXmlHighlight(
          verse.text,
          fontSize,
          themeColors,
          undefined,
          actualFontFamily,
          localOnTagPress,
          verseTextColor
        ),
      [
        verse.text,
        fontSize,
        themeColors,
        actualFontFamily,
        localOnTagPress,
        verseTextColor,
      ]
    );

    return (
      <TouchableOpacity
        key={verse.verse}
        activeOpacity={onVersePress ? 0.7 : 1}
        onPress={() => handleVersePress(verse)}
      >
        <View
          style={[
            STYLES.verse,
            {
              backgroundColor: isHighlighted
                ? themeColors.highlightBg
                : "transparent",
              borderRadius: 6,
              padding: isHighlighted ? (isFullScreen ? 4 : 8) : 0,
              borderWidth: isHighlighted ? 1 : 0,
              borderColor: isHighlighted
                ? themeColors.highlightBorder
                : "transparent",
              marginBottom: isFullScreen ? 4 : 8,
            },
          ]}
          onLayout={(event) => handleVerseLayout(verse.verse, event)}
          ref={(ref) => handleVerseRef(verse.verse, ref)}
        >
          <View style={{ flexDirection: "row", alignItems: "flex-start" }}>
            {showVerseNumbers && (
              <View
                style={{
                  flexDirection: "row",
                  alignItems: "center",
                  minWidth: isFullScreen ? 18 : 20,
                  marginRight: isFullScreen ? 0 : 2,
                  ...STYLES.verseNumber,
                }}
              >
                <Text
                  style={{
                    fontSize: isFullScreen ? fontSize - 6 : fontSize - 4,
                    fontWeight: "600",
                    color: isHighlighted
                      ? themeColors.highlightIcon
                      : themeColors.verseNumber,
                    fontFamily: actualFontFamily,
                  }}
                >
                  {verse.verse}
                </Text>
                {isHighlighted && (
                  <Ionicons
                    name="star"
                    size={isFullScreen ? 10 : 12}
                    color={themeColors.highlightIcon}
                    style={{ marginLeft: 2 }}
                  />
                )}
              </View>
            )}
            <View
              style={{
                ...STYLES.verseText,
                flexDirection: "row",
                alignItems: "flex-start",
              }}
            >
              <Text
                style={{
                  fontSize,
                  lineHeight: fontSize * 1.4,
                  flexShrink: 1,
                  flexWrap: "wrap",
                  color: verseTextColor,
                  fontFamily: actualFontFamily,
                }}
                numberOfLines={0}
              >
                {renderedText}
              </Text>
              {bookmarkedVerses.has(verse.verse) && (
                <Ionicons
                  name="bookmark"
                  size={isFullScreen ? 14 : 16}
                  color={themeColors.primary}
                  style={{ marginLeft: 8, marginTop: 2 }}
                />
              )}
            </View>
          </View>
        </View>
      </TouchableOpacity>
    );
  };

  const renderVerses = () => {
    return (
      <View style={{ gap: isFullScreen ? 4 : 12 }}>
        {sortedVerses.map(renderVerseItem)}
      </View>
    );
  };

  // Container style
  const containerStyle: ViewStyle = {
    ...STYLES.container,
    backgroundColor: themeColors.card,
  };

  // Adjust padding for full screen mode
  const adjustedStyle = isFullScreen
    ? { ...containerStyle, paddingHorizontal: 8 }
    : containerStyle;

  const chapterContent = (
    <View style={[adjustedStyle, style]}>
      {/* Colored Header */}
      <View
        style={{
          backgroundColor: bookColor,
          paddingHorizontal: isFullScreen ? 8 : 12,
          paddingVertical: isFullScreen ? 6 : 8,
          borderTopLeftRadius: 8,
          borderTopRightRadius: 8,
        }}
      >
        <View
          style={{
            flexDirection: "row",
            justifyContent: "space-between",
            alignItems: "center",
          }}
        >
          <View style={{ flex: 1 }}>
            <Text
              style={{
                color: "#41315eff",
                fontSize: isFullScreen ? 10 : 14,
                fontWeight: "600",
                fontFamily: actualFontFamily,
              }}
              numberOfLines={2}
            >
              {getHeaderTitle()}
            </Text>
          </View>

          {versionText && (
            <Text
              style={{
                color: "#654f74ff",
                fontSize: isFullScreen ? 10 : 12,
                opacity: 0.9,
                marginLeft: 8,
                fontFamily: actualFontFamily,
              }}
            >
              {versionText.replace(" • ", "")}
            </Text>
          )}
        </View>
      </View>

      {/* Verse Content */}
      <View
        style={{
          padding: isFullScreen ? 8 : 16,
          paddingTop: isFullScreen ? 6 : 12,
        }}
      >
        {renderVerses()}

        {/* Footer */}
        <View
          style={{
            marginTop: isFullScreen ? 8 : 16,
            paddingTop: isFullScreen ? 6 : 12,
            borderTopWidth: 1,
            borderTopColor: themeColors.border,
          }}
        >
          <Text
            style={{
              textAlign: "center",
              color: themeColors.textMuted,
              fontSize: 10,
              fontFamily: actualFontFamily,
            }}
            numberOfLines={1}
            ellipsizeMode="tail"
          >
            {sortedVerses.length} verse{sortedVerses.length !== 1 ? "s" : ""}
            {highlightedVerses.size > 0 &&
              ` • ${highlightedVerses.size} highlighted`}
            {bookmarkedVerses.size > 0 &&
              ` • ${bookmarkedVerses.size} bookmarked`}
          </Text>
        </View>
      </View>
    </View>
  );

  if (onPress) {
    return (
      <TouchableOpacity onPress={onPress} activeOpacity={0.7}>
        {chapterContent}
      </TouchableOpacity>
    );
  }

  const verseTitle = currentVerseRef
    ? `${getBookName(currentVerseRef.bookNum)} ${currentVerseRef.chapter}:${currentVerseRef.ranges
        .map((r) =>
          r.start === r.end ? r.start.toString() : `${r.start}-${r.end}`
        )
        .join(",")}`
    : "";

  return (
    <>
      {chapterContent}
      <Modal
        visible={showTagModal}
        transparent
        animationType="fade"
        onRequestClose={handleCloseModal}
      >
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
                      color: themeColors.textPrimary,
                      fontSize: 18,
                      fontWeight: "bold",
                      flex: 1,
                      textAlign: "center",
                    }}
                  >
                    {verseTitle}
                  </Text>
                  <View style={{ width: 20 }} />
                </View>
                {verseLoading ? (
                  <ActivityIndicator size="small" color={themeColors.primary} />
                ) : (
                  <ScrollView
                    contentContainerStyle={{ padding: 16 }}
                    style={{ maxHeight: 300 }}
                  >
                    {verseVerses.map((verse) => (
                      <View key={verse.verse} style={{ marginBottom: 8 }}>
                        <View
                          style={{
                            flexDirection: "row",
                            alignItems: "flex-start",
                          }}
                        >
                          <View
                            style={{
                              flexDirection: "row",
                              alignItems: "center",
                              minWidth: 20,
                              marginRight: 2,
                            }}
                          >
                            <Text
                              style={{
                                fontSize: 12,
                                fontWeight: "600",
                                color: themeColors.verseNumber,
                                fontFamily: actualFontFamily,
                              }}
                            >
                              {verse.verse}
                            </Text>
                          </View>
                          <View style={{ flex: 1, minWidth: 0 }}>
                            <Text
                              style={{
                                fontSize: 16,
                                lineHeight: 24,
                                flexShrink: 1,
                                flexWrap: "wrap",
                                color: modalVerseTextColor,
                                fontFamily: actualFontFamily,
                              }}
                              numberOfLines={0}
                            >
                              {renderVerseTextWithXmlHighlight(
                                verse.text,
                                16,
                                themeColors,
                                undefined,
                                actualFontFamily,
                                (content: string) =>
                                  handleTagPressFromModal(content, verse),
                                modalVerseTextColor
                              )}
                            </Text>
                          </View>
                        </View>
                      </View>
                    ))}
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
                      color: "#FFFFFF",
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
                    alignItems: "center",
                    marginBottom: 10,
                  }}
                >
                  {hasViewBack && (
                    <TouchableOpacity
                      onPress={handleViewBack}
                      style={{ padding: 5, marginRight: 10 }}
                      activeOpacity={0.7}
                    >
                      <Ionicons
                        name="arrow-back"
                        size={20}
                        color={themeColors.primary}
                      />
                    </TouchableOpacity>
                  )}
                  {hasDictBack && !hasViewBack && (
                    <TouchableOpacity
                      onPress={handleBack}
                      style={{ padding: 5, marginRight: 10 }}
                      activeOpacity={0.7}
                    >
                      <Ionicons
                        name="arrow-back"
                        size={20}
                        color={themeColors.primary}
                      />
                    </TouchableOpacity>
                  )}
                  <Text
                    style={{
                      flex: 1,
                      textAlign: "center",
                      fontSize: 18,
                      fontWeight: "bold",
                      color: themeColors.textPrimary,
                      fontFamily: actualFontFamily,
                    }}
                  >
                    {currentTitle}
                  </Text>
                  {!(hasViewBack || hasDictBack) && (
                    <View style={{ width: 30 }} />
                  )}
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
                      // Dictionary content - with colored non-alphabets and numbers
                      <Text style={commentaryModalStyle}>
                        {renderDictionaryText(
                          commentaryText,
                          commentaryModalStyle,
                          themeColors,
                          actualFontFamily,
                          handleStrongPress
                        )}
                      </Text>
                    ) : (
                      // Commentary content - with verse links
                      <Text style={commentaryModalStyle}>
                        {renderCommentaryWithVerseLinks(
                          commentaryText,
                          themeColors,
                          actualFontFamily,
                          bookToNumber,
                          handleVerseLinkPress,
                          selectedVerse?.book_number
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
                      color: "#FFFFFF",
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
      </Modal>
    </>
  );
};
