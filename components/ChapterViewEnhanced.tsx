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
import { useTheme } from "../context/ThemeContext";
import { BIBLE_BOOKS_MAP } from "../utils/testamentUtils";
import { useBibleDatabase } from "../context/BibleDatabaseContext";
import { BOOK_ABBREVS } from "../utils/bookAbbrevs";
import { getTestament } from "../utils/testamentUtils";
import {
  getVersionKey,
  getDatabaseFilename,
} from "../utils/bibleDatabaseUtils";
import { parseVerseList } from "../utils/verseUtils";
import { getThemeColors, type ThemeColors } from "../utils/themeUtils";
import { useCommentary } from "../hooks/useCommentary";
import { BackgroundTexture } from "../components/BackgroundTexture";
import { useBackgroundTexture } from "../hooks/useBackgroundTexture";
import { Fonts } from "../utils/fonts";
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
type RenderResult = {
  header: React.ReactNode[];
  body: React.ReactNode[];
};
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
      if (currentText) {
        nodes.push({ type: "text", content: currentText });
        currentText = "";
      }
      const tagEnd = text.indexOf(">", i);
      if (tagEnd === -1) {
        currentText += text.substring(i);
        break;
      }
      const fullTag = text.substring(i, tagEnd + 1);
      if (fullTag.startsWith("</")) {
        nodes.push({ type: "closing-tag", tag: fullTag });
      } else if (fullTag.endsWith("/>")) {
        const tagName = fullTag.slice(1, -2).trim();
        nodes.push({ type: "self-closing-tag", tag: tagName, fullTag });
      } else {
        const tagName = fullTag.slice(1, -1).trim().split(" ")[0];
        nodes.push({ type: "opening-tag", tag: tagName, fullTag });
      }
      i = tagEnd + 1;
    } else {
      currentText += text[i];
      i++;
    }
  }
  if (currentText) {
    nodes.push({ type: "text", content: currentText });
  }
  return nodes;
};
const renderTree = (
  tree: TreeNode[],
  baseFontSize: number,
  themeColors: ThemeColors,
  highlight?: string,
  fontFamily?: string,
  onTagPress?: (content: string) => void,
  textColor?: string
): RenderResult => {
  const result: RenderResult = { header: [], body: [] };
  let key = 0;
  const renderNode = (
    node: TreeNode,
    overrideTextColor?: string
  ): RenderResult => {
    key++;
    if (node.type === "text") {
      return {
        header: [],
        body: [
          renderTextWithHighlight(
            node.content || "",
            themeColors,
            highlight,
            `text-${key}`,
            fontFamily,
            overrideTextColor || textColor
          ),
        ],
      };
    } else if (node.type === "self-closing-tag") {
      const content = extractContentFromTag(node.fullTag || "");
      const isNumber = /^\d+$/.test(content.trim());
      const tagContent = content.trim();
      return {
        header: [],
        body: [
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
          </Text>,
        ],
      };
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
      const overrideTextColorForChildren = isTextContainer
        ? textColor
        : themeColors.tagColor;
      const childResults = ch.map((child: TreeNode) =>
        renderNode(child, overrideTextColorForChildren)
      );
      let allHeaders: React.ReactNode[] = [];
      let allBodies: React.ReactNode[] = [];
      if (node.tag === "n") {
        childResults.forEach((res) => {
          allHeaders.push(...res.header, ...res.body);
        });
        return { header: allHeaders, body: [] };
      } else {
        childResults.forEach((res) => {
          allHeaders.push(...res.header);
          allBodies.push(...res.body);
        });
        const renderedChildren = allBodies;
        const elemStyle = isTextContainer
          ? {
              fontSize: baseFontSize * 0.95,
              fontFamily,
            }
          : {
              fontSize: isNumber ? baseFontSize * 0.5 : baseFontSize * 0.95,
              color: themeColors.tagColor,
              fontFamily,
            };
        const bodyNode = (
          <Text
            key={`elem-${key}`}
            style={elemStyle}
            onPress={
              !isTextContainer ? () => onTagPress?.(tagContent) : undefined
            }
          >
            {renderedChildren}
          </Text>
        );
        return { header: allHeaders, body: [bodyNode] };
      }
    }
    return { header: [], body: [] };
  };
  for (const node of tree) {
    const res = renderNode(node);
    result.header.push(...res.header);
    result.body.push(...res.body);
  }
  return result;
};
const extractContentFromTag = (tag: string): string => {
  const match = tag.match(/<[^>]+>([^<]*)<\/[^>]+>/);
  return match ? match[1] : "";
};
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
const escapeRegex = (string: string) => {
  return string.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
};
const renderVerseTextWithXmlHighlight = (
  text: string,
  baseFontSize: number,
  themeColors: ThemeColors,
  highlight?: string,
  fontFamily?: string,
  onTagPress?: (content: string) => void,
  textColor?: string
): RenderResult => {
  if (!text) return { header: [], body: [] };
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
    return {
      header: [],
      body: [
        renderTextWithHighlight(
          text,
          themeColors,
          highlight,
          "fallback",
          fontFamily,
          textColor
        ),
      ],
    };
  }
};
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
const SINGLE_CHAPTER_BOOKS = new Set([380, 640, 700, 710, 720]);
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
  currentChapterNum?: number
): React.ReactNode[] => {
  if (!text) return [];
  const bookKeys = Object.keys(bookToNumber);
  const escapedKeys = bookKeys.map(escapeRegex);
  const bookPattern = escapedKeys.map((key) => `\\b${key}`).join("|");
  const DASH_PATTERN = "[-–—]";
  const VERSE_RANGE = `\\d+(?:\\s*(?:${DASH_PATTERN}|\\s*to\\s*)\s*\\d+(?::\\d+)?)?`;
  const VERSE_LIST = `(${VERSE_RANGE}(?:\\s*,\\s*${VERSE_RANGE})*)`;
  const fullRefRegex = new RegExp(
    `(?:(${bookPattern})\\s+)?(\\d+)\\s*:\\s*${VERSE_LIST}\\b`,
    "gi"
  );
  const continuationRegex = new RegExp(/[,;]\s*(${VERSE_LIST})\\b/gi);
  const chapterOnlyRegex = /(?:ch\\.|chs\\.|chapter)\\.\\s+(\\d+)\\b/gi;
  const verseOnlyRegex = new RegExp(
    `(?:v\\.|vv?\\.?|ver\\.|verse)s?\\s+${VERSE_LIST}\\b`,
    "gi"
  );
  const chapVerseRegex = new RegExp(
    `(?:(${bookPattern})\\s+)?(\\d+)(?:\\s*${DASH_PATTERN}\\s*(\\d+))?\\b`,
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
    let minPos = Infinity;
    let selectedType: "full" | "cont" | "chap" | "verse" | "chapVerse" | null =
      null;
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
        default:
          return null as never;
      }
    })();
    const matchEnd = minPos + refText.length;
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
            // Multiple ranges; assume single-chapter for now (no cross-chapter support in multi-range)
            ranges = parseVerseList(verseListStr);
          } else {
            // Single range; check for cross-chapter
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
                  ranges = [{ start: startV, end: endV }];
                }
              }
            } else {
              // Single verse
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
        if (bookNum === undefined) {
          parts.push(
            <Text key={parts.length} style={plainStyle}>
              {refText}
            </Text>
          );
        } else {
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
              onPressCallback = () =>
                onNavigate(bookNum, num1, undefined, num2);
              tempCurrentChapter = num2;
            } else {
              onPressCallback = () => onNavigate(bookNum, num1);
              tempCurrentChapter = num1;
            }
          }
          currentChapter = tempCurrentChapter;
          parts.push(
            <Text
              key={parts.length}
              onPress={onPressCallback}
              style={linkStyle}
            >
              {refText}
            </Text>
          );
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
  bgImageIndex?: number;
  bgTextureOpacity?: number;
  noBackground?: boolean;
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
  colors,
  onNavigateToVerse,
  bgImageIndex: propBgImageIndex,
  bgTextureOpacity: propBgTextureOpacity,
  noBackground,
}) => {
  const { theme, colorScheme, fontFamily, customColor } = useTheme();
  const themeColors = getThemeColors(theme, colorScheme, customColor);
  const actualFontFamily = useMemo((): string | undefined => {
    switch (fontFamily) {
      case "system":
        return undefined;
      case "oswald":
        return Fonts.OswaldVariable;
      case "rubik-glitch":
        return Fonts.RubikGlitchRegular;
      case "poppins":
        return Fonts.PoppinsRegular;
      default:
        return undefined;
    }
  }, [fontFamily]);
  const { loadCommentaryForVerse } = useCommentary(displayVersion);
  const { bibleDB, getDatabase } = useBibleDatabase();
  const effectiveNoBg = noBackground ?? false;
  const bgHook = useBackgroundTexture({
    index: propBgImageIndex,
    opacity: propBgTextureOpacity,
    noBackground: effectiveNoBg,
  });
  const hasBg = !effectiveNoBg && bgHook.hasSource;
  const [showTagModal, setShowTagModal] = useState(false);
  const [modalStack, setModalStack] = useState<ModalState[]>([]);
  const [modalView, setModalView] = useState<"commentary" | "verse">(
    "commentary"
  );
  const [tagContent, setTagContent] = useState("");
  const [selectedVerse, setSelectedVerse] = useState<Verse | null>(null);
  const [commentaryLoading, setCommentaryLoading] = useState(false);
  const [commentaryText, setCommentaryText] = useState("");
  const [currentVerseRef, setCurrentVerseRef] = useState<VerseRef | null>(null);
  const [verseLoading, setVerseLoading] = useState(false);
  const [verseVerses, setVerseVerses] = useState<Verse[]>([]);
  const [dictHistory, setDictHistory] = useState<DictHistoryEntry[]>([]);
  const [currentDictIndex, setCurrentDictIndex] = useState<number>(-1);
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
  useEffect(() => {
    if (!showTagModal || modalView !== "commentary") return;
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
  const handleStrongPress = useCallback(
    async (digits: string) => {
      if (!selectedVerse) return;
      setCommentaryLoading(true);
      const text = await loadCommentaryForVerse(selectedVerse, digits);
      setCommentaryLoading(false);
      const prefix =
        getTestament(
          selectedVerse.book_number,
          selectedVerse.book_name || ""
        ) === "NT"
          ? "G"
          : "H";
      const full = `${prefix}${digits}`;
      const entry: DictHistoryEntry = { digits, text, full };
      let newHistory: DictHistoryEntry[] = dictHistory;
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
      setTagContent(digits);
      setDictHistory(newHistory);
      setCurrentDictIndex(newIndex);
      setCommentaryText(text);
      setModalStack((prev) => {
        if (prev.length === 0 || prev[prev.length - 1].view !== "commentary") {
          return prev;
        }
        const last = prev[prev.length - 1] as CommentaryState;
        const newTop: CommentaryState = {
          ...last,
          tagContent: digits,
          dictHistory: newHistory,
          dictIndex: newIndex,
          commentaryText: text,
        };
        return [...prev.slice(0, -1), newTop];
      });
    },
    [
      selectedVerse,
      loadCommentaryForVerse,
      dictHistory,
      currentDictIndex,
      getTestament,
    ]
  );
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
      chapterStart: number,
      ranges?: { start: number; end: number }[],
      chapterEnd?: number,
      startVerse?: number,
      endVerse?: number
    ) => {
      const isMultiChapter =
        chapterEnd !== undefined && chapterEnd > chapterStart;
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
      };
      setModalStack((prev) => [...prev, newState]);
      setModalView("verse");
      setCurrentVerseRef(newRef);
      setVerseVerses([]);
      setVerseLoading(true);
      let allVerses: Verse[] = [];
      const chapters = isMultiChapter
        ? Array.from(
            { length: chapterEnd! - chapterStart + 1 },
            (_, i) => chapterStart + i
          )
        : [chapterStart];
      try {
        for (const ch of chapters) {
          let loadedVerses: Verse[] = [];
          if (displayVersion) {
            const dbFilename = getDatabaseFilename(displayVersion);
            if (dbFilename) {
              const secondaryDB = await getDatabase(dbFilename);
              if (secondaryDB) {
                loadedVerses = await secondaryDB.getVerses(bookNum, ch);
              } else {
                console.warn(
                  `Secondary DB not available for ${displayVersion}, falling back to primary`
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
      let targetVerses = allVerses;
      if (isMultiChapter) {
        const sv = startVerse || 1;
        const ev = endVerse || 999; // Arbitrary large number for "all"
        targetVerses = allVerses.filter((verse) => {
          if (verse.chapter === chapterStart) {
            return verse.verse >= sv;
          } else if (verse.chapter === chapterEnd) {
            return verse.verse <= ev;
          }
          return true; // Include all verses in middle chapters
        });
      } else if (ranges && ranges.length > 0) {
        targetVerses = allVerses.filter((verse) =>
          ranges.some((r) => verse.verse >= r.start && verse.verse <= r.end)
        );
      }
      // If no ranges or multi-chapter without specific verses, show all loaded verses
      setVerseLoading(false);
      setVerseVerses(targetVerses);
      setModalStack((prev) => {
        if (prev.length === 0 || prev[prev.length - 1].view !== "verse") {
          return prev;
        }
        const last = prev[prev.length - 1] as VerseState;
        const newTop: VerseState = { ...last, verseVerses: targetVerses };
        return [...prev.slice(0, -1), newTop];
      });
    },
    [bibleDB, getDatabase, displayVersion]
  );
  const handleCloseModal = useCallback(() => {
    setModalStack([]);
  }, []);
  const bookToNumber = useMemo(() => {
    const map: Record<string, number> = {};
    Object.entries(BIBLE_BOOKS_MAP).forEach(([dbNumStr, { long, short }]) => {
      const dbNum = parseInt(dbNumStr, 10);
      map[long] = dbNum;
      map[short] = dbNum;
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
  const verseTitle = useMemo(() => {
    if (!currentVerseRef) return "";
    const { bookNum, chapterStart, chapterEnd, ranges, startVerse, endVerse } =
      currentVerseRef;
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
  }, [currentVerseRef, getBookName]);
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
  const modalVerseTextColor = themeColors.textPrimary;
  const commentaryModalStyle: TextStyle = {
    color: themeColors.textPrimary,
    fontSize: 16,
    lineHeight: 24,
    fontFamily: actualFontFamily,
  };
  const isDictMode = displayVersion?.includes("+") && /^\d+$/.test(tagContent);
  const hasViewBack = modalStack.length > 1;
  const hasDictBack =
    modalView === "commentary" && isDictMode && currentDictIndex > 0;
  if (sortedVerses.length === 0) {
    return (
      <View
        style={[
          {
            backgroundColor: effectiveNoBg ? "transparent" : themeColors.card,
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
    const rendered = useMemo(
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
    const { header, body } = rendered;
    const indicatorSize = isFullScreen ? fontSize * 0.7 : fontSize * 0.8;
    const numberStyle = {
      fontSize: indicatorSize,
      fontWeight: "600" as const,
      color: isHighlighted
        ? themeColors.highlightIcon
        : themeColors.verseNumber,
      fontFamily: actualFontFamily,
    };
    const starStyle = {
      fontSize: indicatorSize * 0.9,
      color: themeColors.highlightIcon,
      fontFamily: actualFontFamily,
    };
    const headerStyle = {
      fontSize: fontSize * 0.9,
      fontWeight: "bold" as const,
      color: verseTextColor,
      marginBottom: 4,
      fontFamily: actualFontFamily,
    };
    return (
      <TouchableOpacity
        key={verse.verse}
        activeOpacity={1}
        onLongPress={() => handleVersePress(verse)}
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
          <View style={{ ...STYLES.verseText }}>
            {header.length > 0 && (
              <Text style={headerStyle} numberOfLines={0}>
                {header}
              </Text>
            )}
            <Text
              className="fontfamily"
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
              {showVerseNumbers && (
                <Text style={numberStyle}>{verse.verse}</Text>
              )}
              {bookmarkedVerses.has(verse.verse) && (
                <Ionicons
                  name="bookmark-sharp"
                  size={20}
                  color={themeColors.primary}
                />
              )}
              {isHighlighted && <Text style={starStyle}>★</Text>}
              {showVerseNumbers ||
              bookmarkedVerses.has(verse.verse) ||
              isHighlighted
                ? " "
                : ""}
              {body}
            </Text>
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
  const wrapperStyle = useMemo<ViewStyle>(
    () => ({
      ...STYLES.container,
      flex: isFullScreen ? 1 : undefined,
      backgroundColor: effectiveNoBg
        ? "transparent"
        : hasBg
          ? undefined
          : themeColors.card,
      shadowOpacity: effectiveNoBg || hasBg ? 0 : 0.1,
      shadowRadius: effectiveNoBg || hasBg ? 0 : 4,
      shadowOffset:
        effectiveNoBg || hasBg
          ? { width: 0, height: 0 }
          : { width: 0, height: 2 },
      elevation: effectiveNoBg || hasBg ? 0 : 2,
    }),
    [isFullScreen, effectiveNoBg, hasBg, themeColors.card]
  );
  const contentContainerStyle = useMemo(
    () => ({
      padding: isFullScreen ? 8 : 16,
      paddingTop: isFullScreen ? 6 : 12,
    }),
    [isFullScreen]
  );
  const footerStyle = useMemo(
    () => ({
      marginTop: isFullScreen ? 8 : 16,
      paddingTop: isFullScreen ? 6 : 12,
      borderTopWidth: 1,
      borderTopColor: themeColors.border,
    }),
    [isFullScreen, themeColors.border]
  );
  const innerContent = (
    <>
      {renderVerses()}
      <View style={footerStyle}>
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
    </>
  );
  const scrollOrView = effectiveNoBg ? (
    <View style={contentContainerStyle}>{innerContent}</View>
  ) : (
    <ScrollView
      style={{ flex: 1 }}
      contentContainerStyle={contentContainerStyle}
      showsVerticalScrollIndicator={false}
    >
      {innerContent}
    </ScrollView>
  );
  const chapterContent = (
    <BackgroundTexture
      source={bgHook.source}
      hasBg={hasBg}
      overlayStyle={bgHook.overlayStyle}
      overlayKey={bgHook.overlayKey}
      style={[wrapperStyle, style]}
    >
      {scrollOrView}
    </BackgroundTexture>
  );
  if (onPress) {
    return (
      <TouchableOpacity onPress={onPress} activeOpacity={0.7}>
        {chapterContent}
      </TouchableOpacity>
    );
  }
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
                      fontFamily: actualFontFamily,
                    }}
                  >
                    {verseTitle}
                  </Text>
                  <View style={{ width: 30 }} />
                </View>
                {verseLoading ? (
                  <ActivityIndicator size="small" color={themeColors.primary} />
                ) : (
                  <ScrollView
                    contentContainerStyle={{ padding: 16 }}
                    style={{ maxHeight: 300 }}
                  >
                    {verseVerses.map((verse) => {
                      const rendered = renderVerseTextWithXmlHighlight(
                        verse.text,
                        16,
                        themeColors,
                        undefined,
                        actualFontFamily,
                        (content: string) =>
                          handleTagPressFromModal(content, verse),
                        modalVerseTextColor
                      );
                      const { header, body } = rendered;
                      const headerStyle: TextStyle = {
                        fontSize: 16 * 0.9,
                        fontWeight: "bold" as const,
                        color: modalVerseTextColor,
                        marginBottom: 4,
                        fontFamily: actualFontFamily,
                      };
                      return (
                        <View
                          key={`${verse.chapter}-${verse.verse}`}
                          style={{ marginBottom: 8 }}
                        >
                          {header.length > 0 && (
                            <Text style={headerStyle} numberOfLines={0}>
                              {header}
                            </Text>
                          )}
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
                            <Text
                              style={{
                                fontSize: 12,
                                fontWeight: "600",
                                color: themeColors.verseNumber,
                                fontFamily: actualFontFamily,
                              }}
                            >
                              {verse.chapter}:{verse.verse}
                            </Text>{" "}
                            {body}
                          </Text>
                        </View>
                      );
                    })}
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
                      fontSize: 18,
                      fontWeight: "bold",
                      color: themeColors.textPrimary,
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
                              seeContents.push(content);
                            }
                            lastEnd = contentEnd;
                            if (nextSeeIndex === -1) break;
                            searchPos = nextSeeIndex;
                          }
                          if (seeContents.length > 0) {
                            const joinedSeeContent = seeContents.join(", ");
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
                                <Text style={commentaryModalStyle}>
                                  {renderDictionaryText(
                                    joinedSeeContent,
                                    commentaryModalStyle,
                                    themeColors,
                                    actualFontFamily,
                                    handleStrongPress
                                  )}
                                </Text>
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
                          selectedVerse?.chapter
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
      </Modal>
    </>
  );
};
