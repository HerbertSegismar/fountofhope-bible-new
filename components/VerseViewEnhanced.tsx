import React, { useMemo } from "react";
import { View, Text, TouchableOpacity } from "react-native";
import { Verse } from "../types";
import { useBibleDatabase } from "../context/BibleDatabaseContext";
import Ionicons from "react-native-vector-icons/Ionicons";

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
  highlight?: string
): React.ReactNode[] => {
  const elements: React.ReactNode[] = [];
  let key = 0;

  const renderNode = (node: any): React.ReactNode => {
    key++;

    if (node.type === "text") {
      return renderTextWithHighlight(node.content, highlight, `text-${key}`);
    } else if (node.type === "self-closing-tag") {

      const content = extractContentFromTag(node.fullTag);
      const isNumber = /^\d+$/.test(content.trim());
      return (
        <Text
          key={`self-${key}`}
          style={{
            fontSize: isNumber ? baseFontSize * 0.5 : baseFontSize * 0.95,
            color: "#ff5722",
            backgroundColor: "rgba(0,255,0,0.2)",
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
            color: "#ff5722",
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
  highlight?: string,
  keyPrefix?: string
): React.ReactNode => {
  if (!highlight || !text) return text;

  const cleanText = text.replace(/<[^>]+>/g, "");
  if (!cleanText) return text;

  const regex = new RegExp(`(${escapeRegex(highlight)})`, "gi");
  const parts = cleanText.split(regex);

  return (
    <Text key={keyPrefix}>
      {parts.map((part, i) =>
        part.toLowerCase() === highlight.toLowerCase() ? (
          <Text key={`${keyPrefix}-${i}`} style={{ backgroundColor: "yellow" }}>
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
  highlight?: string
): React.ReactNode[] => {
  if (!text) return [];

  try {
    const nodes = parseXmlTags(text);
    const tree = buildTree(nodes);
    return renderTree(tree, baseFontSize, highlight);
  } catch (error) {
    console.error("Error parsing XML tags:", error);
    // Fallback to simple text rendering
    return [renderTextWithHighlight(text, highlight, "fallback")];
  }
};

// Helper function to determine text color based on background color
const getContrastColor = (backgroundColor: string): string => {
  // Default to white text if no background color
  if (!backgroundColor) return "#ffffff";

  // Convert hex color to RGB
  const hex = backgroundColor.replace("#", "");
  const r = parseInt(hex.substr(0, 2), 16);
  const g = parseInt(hex.substr(2, 2), 16);
  const b = parseInt(hex.substr(4, 2), 16);

  // Calculate luminance
  const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255;

  // Return black for light colors, white for dark colors
  return luminance > 0.5 ? "#505455ff" : "#ffffff";
};

const VerseText = React.memo(
  ({
    verse,
    fontSize,
    highlight,
    showVerseNumbers,
    onVersePress,
    isHighlighted = false,
    compact = false,
  }: {
    verse: Verse;
    fontSize: number;
    highlight?: string;
    showVerseNumbers: boolean;
    onVersePress?: (verse: Verse) => void;
    isHighlighted?: boolean;
    compact?: boolean;
  }) => {
    const adjustedFontSize = compact ? fontSize - 2 : fontSize;

    const renderedText = useMemo(
      () =>
        renderVerseTextWithXmlHighlight(
          verse.text,
          adjustedFontSize,
          highlight
        ),
      [verse.text, adjustedFontSize, highlight]
    );

    return (
      <TouchableOpacity
        activeOpacity={onVersePress ? 0.7 : 1}
        onPress={() => onVersePress?.(verse)}
        style={{
          backgroundColor: isHighlighted
            ? "#FFF3CD"
            : compact
              ? "#f8f9fa"
              : "transparent",
          borderRadius: 6,
          padding: compact ? 6 : isHighlighted ? 8 : 0,
          borderWidth: isHighlighted ? 1 : 0,
          borderColor: isHighlighted ? "#FFD700" : "transparent",
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
                  color: isHighlighted ? "#B8860B" : "#1e40af",
                }}
              >
                {verse.verse}
              </Text>
              {isHighlighted && (
                <Ionicons
                  name="star"
                  size={compact ? 10 : 12}
                  color="#B8860B"
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
              color: isHighlighted ? "#8B6914" : "#000000",
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
    onVersePress,
    style,
    highlight,
    compact = false,
  }) => {
    const { currentVersion } = useBibleDatabase();

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
    const bookColor = sortedVerses[0]?.book_color || "#3B82F6"; // Default blue if no color
    const headerTextColor = getContrastColor(bookColor);

    if (sortedVerses.length === 0) {
      return (
        <View
          style={[
            style,
            {
              backgroundColor: "white",
              padding: compact ? 8 : 16,
              borderRadius: 8,
              borderWidth: 1,
              borderColor: "#e9ecef",
            },
          ]}
        >
          <Text
            style={{
              textAlign: "center",
              color: "#666",
              fontSize: compact ? 12 : 14,
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
            backgroundColor: "white",
            borderRadius: 8,
            shadowOpacity: compact ? 0.05 : 0.1,
            shadowRadius: compact ? 2 : 4,
            shadowOffset: { width: 0, height: compact ? 1 : 2 },
            elevation: compact ? 1 : 2,
            minHeight: compact ? 20 : 40,
            borderWidth: compact ? 1 : 0,
            borderColor: compact ? "#e9ecef" : "transparent",
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
                  color: headerTextColor,
                  fontSize: compact ? 12 : 14,
                  fontWeight: "600",
                }}
                numberOfLines={2}
              >
                {bookName} {chapterNumber}:{verseRangeText}
              </Text>
            </View>

            {!compact && versionText && (
              <Text
                style={{
                  color: headerTextColor,
                  fontSize: 11,
                  opacity: 0.9,
                  marginLeft: 8,
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
                highlight={highlight}
                showVerseNumbers={showVerseNumbers}
                onVersePress={onVersePress}
                isHighlighted={highlight === verse.verse.toString()}
                compact={compact}
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
                borderTopColor: "#dee2e6",
              }}
            >
              <Text
                style={{
                  color: "#6c757d",
                  fontSize: 10,
                  textAlign: "center",
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
