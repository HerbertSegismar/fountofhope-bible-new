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
import { Verse } from "../types";
import { useBibleDatabase } from "../context/BibleDatabaseContext";

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
  style?: StyleProp<ViewStyle>;
  bookId?: number;
  isFullScreen?: boolean;
}

interface VerseTextElement {
  type: "text" | "xml";
  content: string;
  isNumber?: boolean;
}

// Parse verse text and extract XML tags
const parseVerseText = (text: string): VerseTextElement[] => {
  if (!text) return [];

  const elements: VerseTextElement[] = [];
  let currentText = text;
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
            color: "#ff5722",
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
  style,
}) => {
  const { currentVersion } = useBibleDatabase();

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

  // Handle verse ref callback with null check
  const handleVerseRef = (verseNumber: number, ref: View | null) => {
    if (ref) {
      onVerseRef?.(verseNumber, ref);
    }
  };

  const handleVersePress = (verse: Verse) => {
    onVersePress?.(verse);
  };

  // Base style for verse numbers with proper typing
  const getBaseVerseNumberStyle = (): TextStyle => ({
    width: 20,
    marginRight: 2,
    fontSize: Math.max(12, fontSize - 2),
    textAlign: "left" as const,
    includeFontPadding: false,
  });

  // UPDATED: Enhanced getVerseStyle to handle highlighted verses
  const getVerseStyle = (verseNumber: number): ViewStyle => {
    const baseStyle: ViewStyle = {
      flexDirection: "row" as const,
      alignItems: "flex-start" as const,
      padding: 4,
      borderRadius: 8,
    };

    const isHighlighted = highlightedVerses.has(verseNumber);
    const isTargetVerse = highlightVerse === verseNumber;

    if (isTargetVerse && isHighlighted) {
      // Combined style for both target and highlighted
      return {
        ...baseStyle,
        backgroundColor: "#fff9e6", // Target verse background
        borderLeftWidth: 4,
        borderLeftColor: "#ffd700", // Target verse border
        borderRightWidth: 4,
        borderRightColor: "#3b82f6", // Highlight border
      };
    } else if (isTargetVerse) {
      // Only target verse
      return {
        ...baseStyle,
        backgroundColor: "#fff9e6",
        borderLeftWidth: 4,
        borderLeftColor: "#ffd700",
      };
    } else if (isHighlighted) {
      // Only highlighted verse
      return {
        ...baseStyle,
        backgroundColor: "#eff6ff", // Light blue background for highlights
        borderLeftWidth: 4,
        borderLeftColor: "#3b82f6", // Blue border for highlights
      };
    }

    return baseStyle;
  };

  // UPDATED: Enhanced verse number style for highlighted verses with proper typing
  const getVerseNumberStyle = (verseNumber: number): TextStyle => {
    const baseStyle = getBaseVerseNumberStyle();
    const isHighlighted = highlightedVerses.has(verseNumber);
    const isTargetVerse = highlightVerse === verseNumber;

    if (isTargetVerse && isHighlighted) {
      return {
        ...baseStyle,
        color: "#dc2626", // Red for target verse
        fontWeight: "bold" as const,
      };
    } else if (isTargetVerse) {
      return {
        ...baseStyle,
        color: "#dc2626", // Red for target verse
        fontWeight: "bold" as const,
      };
    } else if (isHighlighted) {
      return {
        ...baseStyle,
        color: "#1e40af", // Blue for highlighted verses
        fontWeight: "bold" as const,
      };
    } else {
      return {
        ...baseStyle,
        color: "#1e40af", // Default blue
        fontWeight: "normal" as const,
      };
    }
  };

  // Base style for verse text with proper typing
  const getBaseVerseTextStyle = (): TextStyle => ({
    fontSize,
    lineHeight: fontSize * 1.6,
    textAlign: "left" as const,
  });

  // UPDATED: Enhanced verse text style for highlighted verses with proper typing
  const getVerseTextStyle = (verseNumber: number): TextStyle => {
    const baseStyle = getBaseVerseTextStyle();
    const isHighlighted = highlightedVerses.has(verseNumber);
    const isTargetVerse = highlightVerse === verseNumber;

    if (isTargetVerse && isHighlighted) {
      return {
        ...baseStyle,
        color: "#1f2937", // Dark gray for target verse
        fontWeight: "600" as const,
      };
    } else if (isTargetVerse) {
      return {
        ...baseStyle,
        color: "#1f2937", // Dark gray for target verse
        fontWeight: "600" as const,
      };
    } else if (isHighlighted) {
      return {
        ...baseStyle,
        color: "#1e40af", // Blue text for highlighted verses
        fontWeight: "500" as const,
      };
    } else {
      return {
        ...baseStyle,
        color: "#374151", // Default gray
        fontWeight: "normal" as const,
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

        <View style={{ flex: 1, minWidth: 0 }}>
          <Text style={getVerseTextStyle(verse.verse)}>
            {renderVerseText(verse.elements, fontSize)}
          </Text>
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
              color: "#6b7280",
              textAlign: "center" as const,
              fontSize: fontSize,
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

  // UPDATED: Enhanced header to show highlight count
  const getHeaderTitle = () => {
    let title = `${bookName} ${chapterNumber}`;
    if (highlightVerse) {
      title += ` : ${highlightVerse}`;
    }
    return title;
  };

  // Fixed container style with proper typing
  const containerStyle: ViewStyle = {
    backgroundColor: "#fff",
    padding: 16,
    borderRadius: 12,
    minHeight: 400,
    alignSelf: "stretch" as const,
    width: "100%" as DimensionValue,
  };

  // Apply border color if available
  const containerWithBorder = verses[0]?.book_color
    ? {
        ...containerStyle,
        borderLeftWidth: 4,
        borderLeftColor: verses[0].book_color,
      }
    : containerStyle;

  const chapterContent = (
    <View style={[containerWithBorder, style]}>
      <Text
        style={{
          fontSize: 20,
          fontWeight: "700" as const,
          textAlign: "center" as const,
          marginBottom: 16,
          color: "#0f172a",
        }}
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
          borderTopColor: "#e5e7eb",
        }}
      >
        <Text
          style={{
            textAlign: "center" as const,
            color: "#6b7280",
            fontSize: 12,
          }}
        >
          {verseElements.length} verse{verseElements.length !== 1 ? "s" : ""}
          {highlightedVerses.size > 0 &&
            ` • ${highlightedVerses.size} highlighted`}
          {currentVersion && (
            <> • {currentVersion.replace(".sqlite3", "").toUpperCase()}</>
          )}
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
