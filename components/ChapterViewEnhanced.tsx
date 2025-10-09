import React from "react";
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  StyleProp,
  ViewStyle,
  TextStyle,
  LayoutChangeEvent,
  DimensionValue,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { Verse } from "../types";

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
}

interface VerseTextElement {
  type: "text" | "xml";
  content: string;
  isNumber?: boolean;
}

// Constants for better maintainability
const COLORS = {
  primary: "#3B82F6",
  secondary: "#1E40AF",
  accent: "#FF6B6B",
  background: {
    target: "#FFF9E6",
    highlight: "#EFF6FF",
    default: "#FFFFFF",
  },
  border: {
    target: "#FFD700",
    highlight: "#3B82F6",
    default: "#E5E7EB",
  },
  text: {
    primary: "#1F2937",
    secondary: "#374151",
    verseNumber: "#1E40AF",
    target: "#DC2626",
  },
} as const;

const STYLES = {
  container: {
    backgroundColor: "#fff",
    padding: 16,
    borderRadius: 12,
    minHeight: 400,
    alignSelf: "stretch" as const,
    width: "100%" as DimensionValue,
  },
  header: {
    fontSize: 20,
    fontWeight: "700" as const,
    textAlign: "center" as const,
    marginBottom: 16,
    color: "#0F172A",
  },
  verse: {
    flexDirection: "row" as const,
    alignItems: "flex-start" as const,
    padding: 4,
    borderRadius: 8,
  },
  verseNumber: {
    width: 20,
    marginRight: 2,
    textAlign: "left" as const,
    includeFontPadding: false,
  },
  verseText: {
    textAlign: "left" as const,
    flex: 1,
    minWidth: 0,
  },
} as const;

// Parse verse text and extract XML tags
const parseVerseText = (text: string): VerseTextElement[] => {
  if (!text) return [];

  const elements: VerseTextElement[] = [];
  let lastIndex = 0;
  const regex = /<([^>]+)>([^<]*)<\/\1>|<([^>]+)\/>/g;
  let match;

  while ((match = regex.exec(text)) !== null) {
    // Add text before the XML tag
    if (match.index > lastIndex) {
      elements.push({
        type: "text",
        content: text.slice(lastIndex, match.index),
      });
    }

    // Handle XML tags with content
    if (match[1] && match[2] !== undefined) {
      elements.push({
        type: "xml",
        content: match[2],
        isNumber: /^\d+$/.test(match[2].trim()),
      });
    }
    // Handle self-closing XML tags
    else if (match[3]) {
      elements.push({
        type: "xml",
        content: "",
        isNumber: false,
      });
    }

    lastIndex = regex.lastIndex;
  }

  // Add remaining text after last XML tag
  if (lastIndex < text.length) {
    elements.push({
      type: "text",
      content: text.slice(lastIndex),
    });
  }

  return elements.length > 0 ? elements : [{ type: "text", content: text }];
};

// Render verse text with XML highlighting
const renderVerseText = (
  elements: VerseTextElement[],
  baseFontSize: number
) => {
  return elements.map((element, index) => {
    if (element.type === "text") {
      return <Text key={index}>{element.content.replace(/<[^>]+>/g, "")}</Text>;
    } else {
      return (
        <Text
          key={index}
          style={{
            fontSize: element.isNumber
              ? baseFontSize * 0.5
              : baseFontSize * 0.95,
            color: COLORS.accent,
          }}
        >
          {element.content}
        </Text>
      );
    }
  });
};

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
  // Sort verses by verse number
  const sortedVerses = React.useMemo(
    () => [...verses].sort((a, b) => a.verse - b.verse),
    [verses]
  );

  // Memoize parsed verse elements to avoid re-parsing on every render
  const verseElements = React.useMemo(
    () =>
      sortedVerses.map((verse) => ({
        ...verse,
        elements: parseVerseText(verse.text),
      })),
    [sortedVerses]
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

  // Enhanced getVerseStyle to handle highlighted and bookmarked verses
  const getVerseStyle = (verseNumber: number): ViewStyle => {
    const baseStyle: ViewStyle = STYLES.verse;
    const isHighlighted = highlightedVerses.has(verseNumber);
    const isTargetVerse = highlightVerse === verseNumber;

    if (isTargetVerse && isHighlighted) {
      return {
        ...baseStyle,
        backgroundColor: COLORS.background.target,
        borderLeftWidth: 4,
        borderLeftColor: COLORS.border.target,
        borderRightWidth: 4,
        borderRightColor: COLORS.border.highlight,
      };
    } else if (isTargetVerse) {
      return {
        ...baseStyle,
        backgroundColor: COLORS.background.target,
        borderLeftWidth: 4,
        borderLeftColor: COLORS.border.target,
      };
    } else if (isHighlighted) {
      return {
        ...baseStyle,
        backgroundColor: COLORS.background.highlight,
        borderLeftWidth: 4,
        borderLeftColor: COLORS.border.highlight,
      };
    }

    return baseStyle;
  };

  // Enhanced verse number style
  const getVerseNumberStyle = (verseNumber: number): TextStyle => {
    const baseStyle: TextStyle = {
      ...STYLES.verseNumber,
      fontSize: Math.max(12, fontSize - 2),
    };

    const isHighlighted = highlightedVerses.has(verseNumber);
    const isTargetVerse = highlightVerse === verseNumber;

    if (isTargetVerse) {
      return {
        ...baseStyle,
        color: COLORS.text.target,
        fontWeight: "bold",
      };
    } else if (isHighlighted) {
      return {
        ...baseStyle,
        color: COLORS.secondary,
        fontWeight: "bold",
      };
    } else {
      return {
        ...baseStyle,
        color: COLORS.text.verseNumber,
        fontWeight: "normal",
      };
    }
  };

  // Enhanced verse text style
  const getVerseTextStyle = (verseNumber: number): TextStyle => {
    const baseStyle: TextStyle = {
      ...STYLES.verseText,
      fontSize,
      lineHeight: fontSize * 1.6,
    };

    const isHighlighted = highlightedVerses.has(verseNumber);
    const isTargetVerse = highlightVerse === verseNumber;

    if (isTargetVerse) {
      return {
        ...baseStyle,
        color: COLORS.text.primary,
        fontWeight: "600",
      };
    } else if (isHighlighted) {
      return {
        ...baseStyle,
        color: COLORS.secondary,
        fontWeight: "500",
      };
    } else {
      return {
        ...baseStyle,
        color: COLORS.text.secondary,
        fontWeight: "normal",
      };
    }
  };

  const renderVerseItem = (verse: (typeof verseElements)[0]) => (
    <TouchableOpacity
      key={verse.verse}
      activeOpacity={onVersePress ? 0.7 : 1}
      onPress={() => handleVersePress(verse)}
    >
      <View
        style={getVerseStyle(verse.verse)}
        onLayout={(event) => handleVerseLayout(verse.verse, event)}
        ref={(ref) => handleVerseRef(verse.verse, ref)}
      >
        {showVerseNumbers && (
          <Text style={getVerseNumberStyle(verse.verse)}>{verse.verse}</Text>
        )}

        <View
          style={{
            flex: 1,
            minWidth: 0,
            flexDirection: "row",
            alignItems: "flex-start",
          }}
        >
          <Text style={getVerseTextStyle(verse.verse)}>
            {renderVerseText(verse.elements, fontSize)}
          </Text>

          {/* Bookmark Icon */}
          {bookmarkedVerses.has(verse.verse) && (
            <Ionicons
              name="bookmark"
              size={16}
              color={COLORS.primary}
              style={{ marginLeft: 8, marginTop: 2 }}
            />
          )}
        </View>
      </View>
    </TouchableOpacity>
  );

  const renderVerses = () => {
    if (!verseElements.length) {
      return (
        <View style={{ padding: 20 }}>
          <Text
            style={{
              color: "#6B7280",
              textAlign: "center",
              fontSize,
              lineHeight: fontSize * 1.6,
            }}
          >
            No verses available for {bookName} {chapterNumber}
          </Text>
        </View>
      );
    }

    return <View style={{ gap: 4 }}>{verseElements.map(renderVerseItem)}</View>;
  };

  const getHeaderTitle = () => {
    let title = `${bookName} ${chapterNumber}`;
    if (highlightVerse) {
      title += ` : ${highlightVerse}`;
    }
    return title;
  };

  // Container style with book color border
  const containerStyle: ViewStyle = verses[0]?.book_color
    ? {
        ...STYLES.container,
        borderLeftWidth: 4,
        borderLeftColor: verses[0].book_color,
      }
    : STYLES.container;

  // Adjust padding for full screen mode
  const adjustedStyle = isFullScreen
    ? { ...containerStyle, paddingHorizontal: 8 }
    : containerStyle;

  const chapterContent = (
    <View style={[adjustedStyle, style]}>
      <Text
        style={STYLES.header}
        numberOfLines={2}
        adjustsFontSizeToFit
        minimumFontScale={0.8}
      >
        {getHeaderTitle()}
      </Text>

      {renderVerses()}

      <View
        style={{
          marginTop: 16,
          paddingTop: 12,
          borderTopWidth: 1,
          borderTopColor: "#E5E7EB",
        }}
      >
        <Text
          style={{
            textAlign: "center",
            color: "#6B7280",
            fontSize: 12,
          }}
        >
          {verseElements.length} verse{verseElements.length !== 1 ? "s" : ""}
          {highlightedVerses.size > 0 &&
            ` • ${highlightedVerses.size} highlighted`}
          {bookmarkedVerses.size > 0 &&
            ` • ${bookmarkedVerses.size} bookmarked`}
          {displayVersion && <> • {displayVersion}</>}
        </Text>
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

  return chapterContent;
};
