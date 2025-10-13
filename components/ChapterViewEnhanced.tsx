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
  tagBg: "rgba(255,255,255,0.1)",
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

// Updated useCommentary hook using the main BibleDatabase context
const useCommentary = (displayVersion: string | undefined) => {
  const { getDatabase } = useBibleDatabase();

  const loadCommentaryForVerse = useCallback(
    async (verse: Verse | null, tagContent: string): Promise<string> => {
      if (!verse || !tagContent) {
        return `Marker: "${tagContent}"`;
      }

      const versionKey = getVersionKey(displayVersion);
      const dbName = versionKey
        ? commentaryDBMap[versionKey as keyof typeof commentaryDBMap]
        : undefined;

      if (!dbName) {
        return `Marker: "${tagContent}" (Commentary not available for ${displayVersion})`;
      }

      try {
        const commentaryDB = getDatabase(dbName);
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
          // Get available markers for better error message
          const availableMarkers =
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
    [displayVersion, getDatabase]
  );

  return { loadCommentaryForVerse };
};

const parseXmlTags = (text: string): any[] => {
  if (!text) return [];

  const nodes = [];
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

// Build a tree structure from parsed nodes to handle nesting
const buildTree = (nodes: any[]): any[] => {
  const stack: any[] = [];
  const root: any[] = [];
  let currentParent = { children: root };

  for (const node of nodes) {
    if (node.type === "opening-tag") {
      const element = {
        type: "element",
        tag: node.tag,
        fullTag: node.fullTag,
        children: [],
      };
      currentParent.children.push(element);
      stack.push(currentParent);
      currentParent = element;
    } else if (node.type === "closing-tag") {
      if (stack.length > 0) {
        currentParent = stack.pop()!;
      }
    } else if (node.type === "self-closing-tag") {
      currentParent.children.push(node);
    } else if (node.type === "text") {
      currentParent.children.push(node);
    }
  }

  return root;
};

// Render the tree to React elements
const renderTree = (
  tree: any[],
  baseFontSize: number,
  themeColors: ThemeColors,
  highlight?: string,
  fontFamily?: string,
  onTagPress?: (content: string) => void
): React.ReactNode[] => {
  const elements: React.ReactNode[] = [];
  let key = 0;

  const renderNode = (node: any): React.ReactNode => {
    key++;

    if (node.type === "text") {
      return renderTextWithHighlight(
        node.content,
        themeColors,
        highlight,
        `text-${key}`,
        fontFamily
      );
    } else if (node.type === "self-closing-tag") {
      const content = extractContentFromTag(node.fullTag);
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
      const children = node.children.map((child: any, idx: number) =>
        renderNode({ ...child, key: `${key}-${idx}` })
      );

      const isNumber =
        node.tag === "S" &&
        node.children.length === 1 &&
        node.children[0].type === "text" &&
        /^\d+$/.test(node.children[0].content.trim());

      const tagContent = node.children
        .map((child: any) => (child.type === "text" ? child.content : ""))
        .join("")
        .trim();

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
  fontFamily?: string
): React.ReactNode => {
  if (!highlight || !text)
    return (
      <Text key={keyPrefix} style={{ fontFamily }}>
        {text}
      </Text>
    );

  const cleanText = text.replace(/<[^>]+>/g, "");
  if (!cleanText)
    return (
      <Text key={keyPrefix} style={{ fontFamily }}>
        {text}
      </Text>
    );

  const regex = new RegExp(`(${escapeRegex(highlight)})`, "gi");
  const parts = cleanText.split(regex);

  return (
    <Text key={keyPrefix} style={{ fontFamily }}>
      {parts.map((part, i) =>
        part.toLowerCase() === highlight.toLowerCase() ? (
          <Text
            key={`${keyPrefix}-${i}`}
            style={{ backgroundColor: themeColors.searchHighlightBg }}
          >
            {part}
          </Text>
        ) : (
          <Text key={`${keyPrefix}-${i}`}>{part}</Text>
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
  onTagPress?: (content: string) => void
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
      onTagPress
    );
  } catch (error) {
    console.error("Error parsing XML tags:", error);
    return [
      renderTextWithHighlight(
        text,
        themeColors,
        highlight,
        "fallback",
        fontFamily
      ),
    ];
  }
};

// Render commentary text with clickable verse references
const renderCommentaryWithVerseLinks = (
  text: string,
  themeColors: ThemeColors,
  fontFamily: string | undefined,
  bookToNumber: Record<string, number>,
  onNavigate: (bookNum: number, chapter: number, verse: number) => void
): React.ReactNode[] => {
  if (!text) return [];

  const bookKeys = Object.keys(bookToNumber);
  const escapedKeys = bookKeys.map(escapeRegex);
  const bookPattern = escapedKeys.join("|");
  const verseRegex = new RegExp(
    `\\b(${bookPattern})\\s+(\\d+)\\s*:\\s*(\\d+)(?:\\s*-\\s*(\\d+))?\\b`,
    "gi"
  );

  const parts: React.ReactNode[] = [];
  let lastIndex = 0;
  let match: RegExpExecArray | null;

  while ((match = verseRegex.exec(text)) !== null) {
    if (match.index > lastIndex) {
      const plainText = text.slice(lastIndex, match.index);
      parts.push(
        <Text
          key={parts.length}
          style={{
            color: themeColors.textPrimary,
            fontSize: 16,
            lineHeight: 24,
            fontFamily,
          }}
        >
          {plainText}
        </Text>
      );
    }

    const bookStr = match[1];
    const chapter = parseInt(match[2], 10);
    const verseStart = parseInt(match[3], 10);
    const refText = text.slice(match.index, verseRegex.lastIndex);

    const bookNum = bookToNumber[bookStr];
    if (bookNum !== undefined) {
      parts.push(
        <TouchableOpacity
          key={parts.length}
          onPress={() => onNavigate(bookNum, chapter, verseStart)}
          activeOpacity={0.7}
        >
          <Text
            style={{
              color: themeColors.primary,
              textDecorationLine: "underline",
              fontSize: 16,
              lineHeight: 24,
              fontFamily,
            }}
          >
            {refText}
          </Text>
        </TouchableOpacity>
      );
    } else {
      parts.push(
        <Text
          key={parts.length}
          style={{
            color: themeColors.textPrimary,
            fontSize: 16,
            lineHeight: 24,
            fontFamily,
          }}
        >
          {refText}
        </Text>
      );
    }

    lastIndex = verseRegex.lastIndex;
  }

  if (lastIndex < text.length) {
    const plainText = text.slice(lastIndex);
    parts.push(
      <Text
        key={parts.length}
        style={{
          color: themeColors.textPrimary,
          fontSize: 16,
          lineHeight: 24,
          fontFamily,
        }}
      >
        {plainText}
      </Text>
    );
  }

  return parts;
};

// Helper function to determine text color based on background color
const getContrastColor = (
  backgroundColor: string,
  themeColors: ThemeColors
): string => {
  if (!backgroundColor) return themeColors.textPrimary;

  const hex = backgroundColor.replace("#", "");
  const r = parseInt(hex.substr(0, 2), 16);
  const g = parseInt(hex.substr(2, 2), 16);
  const b = parseInt(hex.substr(4, 2), 16);

  const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
  return luminance > 0.5 ? themeColors.textSecondary : themeColors.textPrimary;
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
  onNavigateToVerse,
}) => {
  const { theme, colorScheme, fontFamily } = useTheme();
  const themeColors = getThemeColors(theme, colorScheme);
  const actualFontFamily = getFontFamily(fontFamily);
  const { loadCommentaryForVerse } = useCommentary(displayVersion);

  const bookToNumber = useMemo(() => {
    const map: Record<string, number> = {};
    Object.entries(BIBLE_BOOKS_MAP).forEach(([dbNumStr, { long, short }]) => {
      const dbNum = parseInt(dbNumStr, 10);
      map[long] = dbNum;
      map[short] = dbNum;
    });
    return map;
  }, []);

  const [showTagModal, setShowTagModal] = useState(false);
  const [tagContent, setTagContent] = useState("");
  const [selectedVerse, setSelectedVerse] = useState<Verse | null>(null);
  const [commentaryLoading, setCommentaryLoading] = useState(false);
  const [commentaryText, setCommentaryText] = useState("");

  // Load commentary when modal opens
  useEffect(() => {
    if (showTagModal && selectedVerse && tagContent) {
      const load = async () => {
        setCommentaryLoading(true);
        const text = await loadCommentaryForVerse(selectedVerse, tagContent);
        setCommentaryText(text);
        setCommentaryLoading(false);
      };
      load();
    } else if (showTagModal) {
      setCommentaryText(`Marker: "${tagContent}"`);
      setCommentaryLoading(false);
    }
  }, [showTagModal, selectedVerse, tagContent, loadCommentaryForVerse]);

  const handleTagPress = useCallback((content: string, verse: Verse) => {
    setTagContent(content);
    setSelectedVerse(verse);
    setShowTagModal(true);
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
  const headerTextColor = getContrastColor(bookColor, themeColors);

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
          localOnTagPress
        ),
      [verse.text, fontSize, themeColors, actualFontFamily, localOnTagPress]
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
                  color: isHighlighted
                    ? themeColors.highlightText
                    : themeColors.textPrimary,
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

  return (
    <>
      {chapterContent}
      <Modal
        visible={showTagModal}
        transparent
        animationType="fade"
        onRequestClose={() => setShowTagModal(false)}
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
            <Text
              style={{
                color: themeColors.textPrimary,
                fontSize: 18,
                fontWeight: "bold",
                marginBottom: 10,
                textAlign: "center",
                fontFamily: actualFontFamily,
              }}
            >
              Commentary for marker "{tagContent}"
            </Text>
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
              <ScrollView style={{ maxHeight: 400 }}>
                <Text
                  style={{
                    color: themeColors.textPrimary,
                    fontSize: 16,
                    lineHeight: 24,
                    fontFamily: actualFontFamily,
                  }}
                >
                  {commentaryText}
                </Text>
              </ScrollView>
            )}
            <TouchableOpacity
              onPress={() => setShowTagModal(false)}
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
          </View>
        </View>
      </Modal>
    </>
  );
};
