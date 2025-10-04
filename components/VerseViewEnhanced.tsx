import React, { useMemo } from "react";
import { View, Text, TouchableOpacity, ScrollView } from "react-native";
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
      // Handle self-closing tags like <t/>
      const content = extractContentFromTag(node.fullTag);
      const isNumber = /^\d+$/.test(content.trim());
      return (
        <Text
          key={`self-${key}`}
          style={{
            fontSize: isNumber ? baseFontSize * 0.5 : baseFontSize * 0.95,
            color: "#ff5722",
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
        node.tag === "t" &&
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

// Memoized verse text component
const VerseText = React.memo(
  ({
    verse,
    fontSize,
    highlight,
    showVerseNumbers,
    onVersePress,
    isHighlighted = false,
  }: {
    verse: Verse;
    fontSize: number;
    highlight?: string;
    showVerseNumbers: boolean;
    onVersePress?: (verse: Verse) => void;
    isHighlighted?: boolean;
  }) => {
    const renderedText = useMemo(
      () => renderVerseTextWithXmlHighlight(verse.text, fontSize, highlight),
      [verse.text, fontSize, highlight]
    );

    return (
      <TouchableOpacity
        activeOpacity={onVersePress ? 0.7 : 1}
        onPress={() => onVersePress?.(verse)}
        style={{
          backgroundColor: isHighlighted ? "#FFF3CD" : "transparent",
          borderRadius: 8,
          padding: isHighlighted ? 8 : 0,
          borderWidth: isHighlighted ? 1 : 0,
          borderColor: isHighlighted ? "#FFD700" : "transparent",
        }}
      >
        <View style={{ flexDirection: "row", alignItems: "flex-start" }}>
          {showVerseNumbers && (
            <View className="flex-row items-center">
              <Text
                style={{
                  fontSize: fontSize - 4,
                  fontWeight: "600",
                  color: isHighlighted ? "#B8860B" : "#1e40af",
                  marginRight: 6,
                }}
              >
                {verse.verse}
              </Text>
              {isHighlighted && (
                <Ionicons name="star" size={12} color="#B8860B" />
              )}
            </View>
          )}
          <Text
            style={{
              fontSize,
              lineHeight: fontSize * 1.4,
              flexShrink: 1,
              flexWrap: "wrap",
              color: isHighlighted ? "#8B6914" : "#000000",
            }}
            numberOfLines={0}
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

    if (sortedVerses.length === 0) {
      return (
        <View
          style={[
            style,
            { backgroundColor: "white", padding: 16, borderRadius: 8 },
          ]}
        >
          <Text style={{ textAlign: "center", color: "#666" }}>
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
            padding: 16,
            borderRadius: 8,
            shadowOpacity: 0.1,
            shadowRadius: 4,
            minHeight: 40,
            borderLeftWidth: sortedVerses[0]?.book_color ? 4 : 0,
            borderLeftColor: sortedVerses[0]?.book_color || "transparent",
          },
          style,
        ]}
      >
        <View style={{ gap: 12 }}>
          {sortedVerses.map((verse) => (
            <VerseText
              key={verse.verse}
              verse={verse}
              fontSize={fontSize}
              highlight={highlight}
              showVerseNumbers={showVerseNumbers}
              onVersePress={onVersePress}
              isHighlighted={highlight === verse.verse.toString()}
            />
          ))}
        </View>

        <View className="flex-row items-center justify-between mt-3">
          <Text
            style={{
              color: "#1e40af",
              fontSize: 13,
              fontStyle: "italic",
            }}
          >
            {bookName} {chapterNumber}:{verseRangeText}
            {versionText}
          </Text>

          {onVersePress && (
            <TouchableOpacity
              onPress={() => onVersePress?.(sortedVerses[0])}
              className="flex-row items-center"
            >
              <Ionicons name="navigate" size={14} color="#3B82F6" />
              <Text className="text-blue-500 text-xs font-medium ml-1">
                Navigate
              </Text>
            </TouchableOpacity>
          )}
        </View>
      </View>
    );
  }
);
