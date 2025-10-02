import React from "react";
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

// Helper
const renderVerseTextWithXmlHighlight = (
  text: string,
  baseFontSize: number,
  highlight?: string
) => {
  if (!text) return [];

  const elements: React.ReactNode[] = [];
  let lastIndex = 0;
  const regex = /<[^/>]+>([^<]*)<\/[^>]+>|<[^>]+\/>|<\/[^>]+>/g;
  let match;

  while ((match = regex.exec(text)) !== null) {
    if (match.index > lastIndex)
      elements.push(text.slice(lastIndex, match.index));

    if (match[1] && match[1].trim()) {
      const isNumber = /^\d+$/.test(match[1].trim());
      elements.push(
        <Text
          key={match.index}
          style={{
            fontSize: isNumber ? baseFontSize * 0.5 : baseFontSize * 0.95,
            color: "#ff5722",
            fontStyle: "italic",
          }}
        >
          {match[1]}
        </Text>
      );
    }
    lastIndex = regex.lastIndex;
  }

  if (lastIndex < text.length) elements.push(text.slice(lastIndex));

  return elements
    .map((el) => {
      if (typeof el === "string") {
        const cleanText = el.replace(/<[^>]+>/g, "");
        if (!highlight) return cleanText;

        const regex = new RegExp(`(${highlight})`, "gi");
        return cleanText.split(regex).map((part, i) =>
          part.toLowerCase() === highlight.toLowerCase() ? (
            <Text key={`hl-${i}-${part}`} style={{ backgroundColor: "yellow" }}>
              {part}
            </Text>
          ) : (
            <Text key={`txt-${i}-${part}`}>{part}</Text>
          )
        );
      }
      return el;
    })
    .flat()
    .filter(Boolean);
};

export const VerseViewEnhanced: React.FC<VerseViewProps> = ({
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
  const sortedVerses = [...verses].sort((a, b) => a.verse - b.verse);

  const renderVerses = () => {
    if (sortedVerses.length === 0) {
      return (
        <Text style={{ textAlign: "center", color: "#666" }}>
          No verses available
        </Text>
      );
    }

    return (
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 20 }}
      >
        <View style={{ gap: 12 }}>
          {sortedVerses.map((verse) => (
            <TouchableOpacity
              key={verse.verse}
              activeOpacity={onVersePress ? 0.7 : 1}
              onPress={() => onVersePress?.(verse)}
            >
              <View style={{ flexDirection: "row", alignItems: "flex-start" }}>
                {showVerseNumbers && (
                  <Text
                    style={{
                      fontSize: fontSize - 2,
                      fontWeight: "600",
                      fontStyle: "italic",
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
                    lineHeight: fontSize * 1.6,
                    flexShrink: 1,
                    flexWrap: "wrap",
                    width: "100%",
                  }}
                  numberOfLines={0}
                >
                  {renderVerseTextWithXmlHighlight(
                    verse.text,
                    fontSize,
                    highlight
                  ).map((el, idx) =>
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
          ))}
        </View>
      </ScrollView>
    );
  };

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
      {renderVerses()}
      {sortedVerses.length > 0 && (
        <Text
          style={{
            color: "#1e40af",
            fontSize: 14,
            fontStyle: "italic",
            marginTop: 8,
          }}
        >
          {bookName} {chapterNumber}:{sortedVerses[0].verse}
          {sortedVerses.length > 1
            ? `-${sortedVerses[sortedVerses.length - 1].verse}`
            : ""}
          {currentVersion &&
            ` • ${currentVersion.replace(".sqlite3", "").toUpperCase()}`}
        </Text>
      )}
    </View>
  );
};
