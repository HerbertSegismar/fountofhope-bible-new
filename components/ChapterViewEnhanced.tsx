import React from "react";
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  StyleProp,
  ViewStyle,
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
  highlightVerse?: number;
  style?: StyleProp<ViewStyle>;
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
  highlightVerse,
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

  const handleVersePress = (verse: Verse) => {
    onVersePress?.(verse);
  };

  const getVerseStyle = (verseNumber: number): ViewStyle => {
    const baseStyle: ViewStyle = {
      flexDirection: "row",
      alignItems: "flex-start",
      padding: 4,
      borderRadius: 8,
    };

    if (highlightVerse === verseNumber) {
      return {
        ...baseStyle,
        backgroundColor: "#fff9e6",
        borderLeftWidth: 4,
        borderLeftColor: "#ffd700",
      };
    }

    return baseStyle;
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
      >
        {showVerseNumbers && (
          <Text
            style={{
              width: 20,
              marginRight: 2,
              fontSize: Math.max(12, fontSize - 2),
              color: highlightVerse === verse.verse ? "#dc2626" : "#1e40af",
              textAlign: "left",
              includeFontPadding: false,
              fontWeight: highlightVerse === verse.verse ? "bold" : "normal",
            }}
          >
            {verse.verse}
          </Text>
        )}

        <View style={{ flex: 1, minWidth: 0 }}>
          <Text
            style={{
              fontSize,
              lineHeight: fontSize * 1.6,
              textAlign: "left",
              color: highlightVerse === verse.verse ? "#1f2937" : "#374151",
            }}
          >
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
              textAlign: "center",
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

  // Fixed container style with proper typing
  const containerStyle: ViewStyle = {
    backgroundColor: "#fff",
    padding: 16,
    borderRadius: 12,
    minHeight: 400,
    alignSelf: "stretch",
    width: "100%" as DimensionValue, // Fix the type issue here
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
          fontWeight: "700",
          textAlign: "center",
          marginBottom: 16,
          color: "#0f172a",
        }}
        numberOfLines={2}
        adjustsFontSizeToFit
        minimumFontScale={0.8}
      >
        {bookName} {chapterNumber}
        {highlightVerse && ` : ${highlightVerse}`}
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
            textAlign: "center",
            color: "#6b7280",
            fontSize: 12,
          }}
        >
          {verseElements.length} verse{verseElements.length !== 1 ? "s" : ""}
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
