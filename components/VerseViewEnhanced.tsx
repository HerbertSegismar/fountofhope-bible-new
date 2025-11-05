import React, { useMemo } from "react";
import { View, Text, TouchableOpacity, Platform } from "react-native";
import { Verse } from "../types";
import { useBibleDatabase } from "../context/BibleDatabaseContext";
import { useTheme, type FontFamily } from "../context/ThemeContext";
import { getBookInfo } from "../utils/testamentUtils";
import { getThemeColors, type ThemeColors } from "../utils/themeUtils";
import { getAccessibleTextColor } from "../utils/themeUtils";
import { Fonts } from "../utils/fonts";

interface VerseViewProps {
  verses: Verse[];
  bookName: string;
  bookNumber?: number;
  chapterNumber: number;
  onPress?: () => void;
  showVerseNumbers?: boolean;
  fontSize?: number;
  onVersePress?: (verse: Verse) => void;
  style?: object;
  highlight?: string;
  compact?: boolean;
  bookColor?: string;
}

const parseXmlTags = (text: string): any[] => {
  if (!text) return [];

  const nodes = [];
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
const extractContentFromTag = (tag: string): string => {
  const match = tag.match(/<[^>]+>([^<]*)<\/[^>]+>/);
  return match ? match[1] : "";
};
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
const escapeRegex = (string: string) => {
  return string.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
};
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
const getFontFamily = (fontFamily: FontFamily): string | undefined => {
  switch (fontFamily) {
    case "system":
      return undefined;
    case "serif":
      return "Georgia, Times New Roman, serif";
    case "sans-serif":
      return "Helvetica, Arial, sans-serif";
    case "oswald":
      return Fonts.OswaldVariable;
    case "rubik-glitch":
      return Fonts.RubikGlitchRegular;
    case "poppins":
      return Fonts.PoppinsRegular;
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
    const indicatorSize = compact
      ? adjustedFontSize * 0.7
      : adjustedFontSize * 0.8;
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

    const verseTextColor = isHighlighted
      ? themeColors.highlightText
      : themeColors.textPrimary;

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
          <View style={{ flex: 1, minWidth: 0 }}>
            <Text
              style={{
                fontSize: compact ? fontSize - 2 : fontSize,
                lineHeight: adjustedFontSize * 1.4,
                flexShrink: 1,
                flexWrap: "wrap",
                color: verseTextColor,
                fontFamily: actualFontFamily,
              }}
              numberOfLines={compact ? 7 : 0}
              ellipsizeMode="tail"
            >
              {showVerseNumbers && (
                <Text style={numberStyle}>{verse.verse}</Text>
              )}
              {isHighlighted && <Text style={starStyle}>★</Text>}
              {(showVerseNumbers || isHighlighted) && " "}
              {renderedText}
            </Text>
          </View>
        </View>
      </TouchableOpacity>
    );
  }
);

export const VerseViewEnhanced: React.FC<VerseViewProps> = React.memo(
  ({
    verses,
    bookName,
    bookNumber,
    chapterNumber,
    showVerseNumbers = true,
    fontSize = 16,
    onVersePress = undefined,
    style = {},
    highlight = undefined,
    compact = false,
  }) => {
    const bookInfo = bookNumber ? getBookInfo(Number(bookNumber)) : null;
    const longName = bookInfo?.long || bookName;
    const { theme, colorScheme, fontFamily, customColor } = useTheme();
    const defaultColors = getThemeColors(theme, colorScheme, customColor);

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
    const bookColor = sortedVerses[0]?.book_color || defaultColors.primary;
    const headerTextColor = getAccessibleTextColor(bookColor);

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
            overflow: "hidden",
          },
          style,
        ]}
      >
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
                  color: headerTextColor,
                  fontSize: compact ? 12 : 14,
                  fontWeight: "600" as const,
                  fontFamily: actualFontFamily,
                }}
                numberOfLines={2}
              >
                {longName} {chapterNumber}:{verseRangeText}
              </Text>
            </View>

            {!compact && versionText && (
              <Text
                style={{
                  color: headerTextColor + "80",
                  fontSize: 14,
                  marginLeft: 8,
                  fontFamily: actualFontFamily,
                }}
              >
                {versionText.replace(" • ", "")}
              </Text>
            )}
          </View>
        </View>
        <View
          style={{
            padding: compact ? 8 : 16,
            paddingTop: compact ? 6 : 12,
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
