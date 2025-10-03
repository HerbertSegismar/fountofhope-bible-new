import React, { useMemo } from "react";
import { View, Text, TouchableOpacity, ScrollView } from "react-native";
import { Verse } from "../types";
import { useBibleDatabase } from "../context/BibleDatabaseContext";

interface VerseViewProps {
  verses: Verse[];
  bookName: string;
  chapterNumber: number;
  onPress?: () => void;
  showVerseNumbers?: boolean;
  fontSize?: number;
  onVersePress?: (verse: Verse) => void;
  style?: object;
  highlight?: string;
}

// Optimized highlighting function
const renderVerseTextWithXmlHighlight = (
  text: string,
  baseFontSize: number,
  highlight?: string
): React.ReactNode[] => {
  if (!text) return [];

  const elements: React.ReactNode[] = [];
  let lastIndex = 0;
  const regex = /<[^/>]+>([^<]*)<\/[^>]+>|<[^>]+\/>|<\/[^>]+>/g;
  let match;

  // Process XML tags first
  while ((match = regex.exec(text)) !== null) {
    // Add text before match
    if (match.index > lastIndex) {
      const beforeText = text.slice(lastIndex, match.index);
      if (beforeText) {
        elements.push(...highlightText(beforeText, highlight));
      }
    }

    // Process matched XML content
    if (match[1] && match[1].trim()) {
      const isNumber = /^\d+$/.test(match[1].trim());
      elements.push(
        <Text
          key={match.index}
          style={{
            fontSize: isNumber ? baseFontSize * 0.5 : baseFontSize * 0.95,
            color: "#ff5722",
          }}
        >
          {match[1]}
        </Text>
      );
    }
    lastIndex = regex.lastIndex;
  }

  // Add remaining text after last match
  if (lastIndex < text.length) {
    const remainingText = text.slice(lastIndex);
    if (remainingText) {
      elements.push(...highlightText(remainingText, highlight));
    }
  }

  return elements;
};

// Separate function for text highlighting to avoid nested complexity
const highlightText = (text: string, highlight?: string): React.ReactNode[] => {
  if (!highlight) return [text];

  const cleanText = text.replace(/<[^>]+>/g, "");
  if (!cleanText) return [];

  const regex = new RegExp(`(${escapeRegex(highlight)})`, "gi");
  const parts = cleanText.split(regex);

  return parts.map((part, i) =>
    part.toLowerCase() === highlight.toLowerCase() ? (
      <Text key={`hl-${i}`} style={{ backgroundColor: "yellow" }}>
        {part}
      </Text>
    ) : (
      <Text key={`txt-${i}`}>{part}</Text>
    )
  );
};

// Helper to escape regex special characters
const escapeRegex = (string: string) => {
  return string.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
};

// Memoized verse text component
const VerseText = React.memo(
  ({
    verse,
    fontSize,
    highlight,
    showVerseNumbers,
    onVersePress,
  }: {
    verse: Verse;
    fontSize: number;
    highlight?: string;
    showVerseNumbers: boolean;
    onVersePress?: (verse: Verse) => void;
  }) => {
    const renderedText = useMemo(
      () => renderVerseTextWithXmlHighlight(verse.text, fontSize, highlight),
      [verse.text, fontSize, highlight]
    );

    return (
      <TouchableOpacity
        activeOpacity={onVersePress ? 0.7 : 1}
        onPress={() => onVersePress?.(verse)}
      >
        <View style={{ flexDirection: "row", alignItems: "flex-start" }}>
          {showVerseNumbers && (
            <Text
              style={{
                fontSize: fontSize - 4,
                fontWeight: "600",
                color: "#1e40af",
                marginRight: 4,
              }}
            >
              {verse.verse}
            </Text>
          )}
          <Text
            style={{
              fontSize,
              lineHeight: fontSize * 1.4,
              flexShrink: 1,
              flexWrap: "wrap",
            }}
            numberOfLines={0}
          >
            {renderedText.map((el, idx) =>
              typeof el === "string" ? (
                <Text key={`${verse.verse}-${idx}`}>{el}</Text>
              ) : (
                React.cloneElement(el as React.ReactElement, {
                  key: `${verse.verse}-${idx}`,
                })
              )
            )}
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
            />
          ))}
        </View>

        <Text
          style={{
            color: "#1e40af",
            fontSize: 13,
            fontStyle: "italic",
            marginTop: 8,
          }}
        >
          {bookName} {chapterNumber}:{verseRangeText}
          {versionText}
        </Text>
      </View>
    );
  }
);
