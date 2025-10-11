import React, { useMemo } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  useColorScheme,
  Platform,
} from "react-native";
import { Verse } from "../types";
import { useBibleDatabase } from "../context/BibleDatabaseContext";
import Ionicons from "react-native-vector-icons/Ionicons";
import {
  useTheme,
  type ColorScheme,
  type Theme,
  type FontFamily,
} from "../context/ThemeContext"; // Adjust path as needed

interface VerseViewProps {
  verses: Verse[];
  bookName: string;
  chapterNumber: number;
  onPress?: () => void;
  showVerseNumbers?: boolean;
  fontSize?: number;
  onVersePress?: (verse: Verse) => void;
  style?: object;
  highlight?: string; // verse number to highlight
  compact?: boolean; // compact mode for search results
  bookColor?: string;
}

// Primary colors for each scheme and theme
const primaryColors: Record<ColorScheme, { light: string; dark: string }> = {
  purple: { light: "#A855F7", dark: "#9333EA" },
  green: { light: "#10B981", dark: "#059669" },
  red: { light: "#EF4444", dark: "#DC2626" },
  yellow: { light: "#F59E0B", dark: "#D97706" },
};

// Base light theme colors (adjust accents based on scheme)
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

// Base dark theme colors (adjust accents based on scheme)
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

// Dynamic theme colors function
const getThemeColors = (
  theme: Theme,
  colorScheme: ColorScheme
): ThemeColors => {
  const primary =
    primaryColors[colorScheme][theme === "dark" ? "dark" : "light"];
  const baseColors =
    theme === "dark" ? BASE_DARK_THEME_COLORS : BASE_LIGHT_THEME_COLORS;

  // Generate lighter/darker variants for verseNumber, tagColor, etc.
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

  const lighterPrimary = getLighterColor(primary, theme === "dark" ? 80 : 30);

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

// Improved XML parsing function that handles nested tags
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
        const tagName = fullTag.slice(1, -1).trim().split(" ")[0]; // Get just the tag name, not attributes
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
  fontFamily?: string
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
      return (
        <Text
          key={`self-${key}`}
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
      // Handle opening tags with children
      const children = node.children.map((child: any, idx: number) =>
        renderNode({ ...child, key: `${key}-${idx}` })
      );

      const isNumber =
        node.tag === "S" &&
        node.children.length === 1 &&
        node.children[0].type === "text" &&
        /^\d+$/.test(node.children[0].content.trim());

      return (
        <Text
          key={`elem-${key}`}
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
  // For self-closing tags, extract any potential content
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
  fontFamily?: string
): React.ReactNode[] => {
  if (!text) return [];

  try {
    const nodes = parseXmlTags(text);
    const tree = buildTree(nodes);
    return renderTree(tree, baseFontSize, themeColors, highlight, fontFamily);
  } catch (error) {
    console.error("Error parsing XML tags:", error);
    // Fallback to simple text rendering
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

// Helper function to determine text color based on background color
const getContrastColor = (
  backgroundColor: string,
  themeColors: ThemeColors
): string => {
  // Default to theme text primary if no background color
  if (!backgroundColor) return themeColors.textPrimary;

  // Convert hex color to RGB
  const hex = backgroundColor.replace("#", "");
  const r = parseInt(hex.substr(0, 2), 16);
  const g = parseInt(hex.substr(2, 2), 16);
  const b = parseInt(hex.substr(4, 2), 16);

  // Calculate luminance
  const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255;

  // Return dark text for light colors, light text for dark colors
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

const VerseText = React.memo(
  ({
    verse,
    fontSize,
    showVerseNumbers,
    themeColors,
    highlight,
    onVersePress,
    isHighlighted = false,
    compact = false,
    fontFamily,
  }: {
    verse: Verse;
    fontSize: number;
    showVerseNumbers: boolean;
    themeColors: ThemeColors;
    highlight?: string;
    onVersePress?: (verse: Verse) => void;
    isHighlighted?: boolean;
    compact?: boolean;
    fontFamily: FontFamily;
  }) => {
    const adjustedFontSize = compact ? fontSize - 2 : fontSize;
    const actualFontFamily = getFontFamily(fontFamily);

    const renderedText = useMemo(
      () =>
        renderVerseTextWithXmlHighlight(
          verse.text,
          adjustedFontSize,
          themeColors,
          highlight,
          actualFontFamily
        ),
      [verse.text, adjustedFontSize, highlight, themeColors, actualFontFamily]
    );

    return (
      <TouchableOpacity
        activeOpacity={onVersePress ? 0.7 : 1}
        onPress={() => onVersePress?.(verse)}
        style={{
          backgroundColor: isHighlighted
            ? themeColors.highlightBg
            : compact
              ? themeColors.surface
              : "transparent",
          borderRadius: 6,
          padding: compact ? 6 : isHighlighted ? 8 : 0,
          borderWidth: isHighlighted ? 1 : 0,
          borderColor: isHighlighted
            ? themeColors.highlightBorder
            : "transparent",
          marginBottom: compact ? 4 : 8,
        }}
      >
        <View style={{ flexDirection: "row", alignItems: "flex-start" }}>
          {showVerseNumbers && (
            <View
              style={{
                flexDirection: "row",
                alignItems: "center",
                minWidth: compact ? 18 : 20,
                marginRight: compact ? 0 : 2,
              }}
            >
              <Text
                style={{
                  fontSize: compact
                    ? adjustedFontSize - 6
                    : adjustedFontSize - 4,
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
                  size={compact ? 10 : 12}
                  color={themeColors.highlightIcon}
                  style={{ marginLeft: 2 }}
                />
              )}
            </View>
          )}
          {/* Remove fontSize from parent Text to allow children to control their sizes */}
          <Text
            style={{
              fontSize: compact ? fontSize - 2 : fontSize,
              lineHeight: adjustedFontSize * 1.4,
              flexShrink: 1,
              flexWrap: "wrap",
              color: isHighlighted
                ? themeColors.highlightText
                : themeColors.textPrimary,
              fontFamily: actualFontFamily,
            }}
            numberOfLines={compact ? 7 : 0}
            ellipsizeMode="tail"
          >
            {renderedText}
          </Text>
        </View>
      </TouchableOpacity>
    );
  }
);

export const VerseViewEnhanced: React.FC<VerseViewProps> = React.memo(
  ({
    verses,
    bookName,
    chapterNumber,
    showVerseNumbers = true,
    fontSize = 16,
    onVersePress = undefined,
    style = {},
    highlight = undefined,
    compact = false,
  }) => {
    const { theme, colorScheme, fontFamily } = useTheme();
    const defaultColors = getThemeColors(theme, colorScheme);
    const { currentVersion } = useBibleDatabase();
    const actualFontFamily = getFontFamily(fontFamily);

    const sortedVerses = useMemo(
      () => [...verses].sort((a, b) => a.verse - b.verse),
      [verses]
    );

    const verseRangeText = useMemo(() => {
      if (sortedVerses.length === 0) return "";

      return sortedVerses.length > 1
        ? `${sortedVerses[0].verse}-${sortedVerses[sortedVerses.length - 1].verse}`
        : `${sortedVerses[0].verse}`;
    }, [sortedVerses]);

    const versionText = useMemo(
      () =>
        currentVersion
          ? ` • ${currentVersion.replace(".sqlite3", "").toUpperCase()}`
          : "",
      [currentVersion]
    );

    // Get book color and calculate contrast text color
    const bookColor = sortedVerses[0]?.book_color || defaultColors.primary;
    const headerTextColor = getContrastColor(bookColor, defaultColors);

    if (sortedVerses.length === 0) {
      return (
        <View
          style={[
            style,
            {
              backgroundColor: defaultColors.card,
              padding: compact ? 8 : 16,
              borderRadius: 8,
              borderWidth: 1,
              borderColor: defaultColors.border,
            },
          ]}
        >
          <Text
            style={{
              textAlign: "center",
              color: defaultColors.textMuted,
              fontSize: compact ? 12 : 14,
              fontFamily: actualFontFamily,
            }}
          >
            No verses available
          </Text>
        </View>
      );
    }

    return (
      <View
        style={[
          {
            backgroundColor: defaultColors.card,
            borderRadius: 8,
            shadowOpacity: compact ? 0.05 : 0.1,
            shadowRadius: compact ? 2 : 4,
            shadowOffset: { width: 0, height: compact ? 1 : 2 },
            elevation: compact ? 1 : 2,
            minHeight: compact ? 20 : 40,
            borderWidth: compact ? 1 : 0,
            borderColor: compact ? defaultColors.border : "transparent",
            overflow: "hidden", // Important for header corners
          },
          style,
        ]}
      >
        {/* Colored Header */}
        <View
          style={{
            backgroundColor: bookColor,
            paddingHorizontal: compact ? 8 : 12,
            paddingVertical: compact ? 6 : 8,
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
                  fontSize: compact ? 12 : 14,
                  fontWeight: "600",
                  fontFamily: actualFontFamily,
                }}
                numberOfLines={2}
              >
                {bookName} {chapterNumber}:{verseRangeText}
              </Text>
            </View>

            {!compact && versionText && (
              <Text
                style={{
                  color: "#654f74ff",
                  fontSize: 11,
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
            padding: compact ? 8 : 16,
            paddingTop: compact ? 6 : 12, // Less padding on top since header is separate
          }}
        >
          <View style={{ gap: compact ? 4 : 12 }}>
            {sortedVerses.map((verse) => (
              <VerseText
                key={verse.verse}
                verse={verse}
                fontSize={fontSize}
                showVerseNumbers={showVerseNumbers}
                themeColors={defaultColors}
                highlight={highlight}
                onVersePress={onVersePress}
                isHighlighted={highlight === verse.verse.toString()}
                compact={compact}
                fontFamily={fontFamily}
              />
            ))}
          </View>

          {/* Footer - Only show in compact mode or if there's additional info */}
          {compact && (
            <View
              style={{
                marginTop: 6,
                paddingTop: 4,
                borderTopWidth: 0.5,
                borderTopColor: defaultColors.border,
              }}
            >
              <Text
                style={{
                  color: defaultColors.textMuted,
                  fontSize: 10,
                  textAlign: "center",
                  fontFamily: actualFontFamily,
                }}
                numberOfLines={1}
                ellipsizeMode="tail"
              >
                {versionText.replace(" • ", "")}
              </Text>
            </View>
          )}
        </View>
      </View>
    );
  }
);
