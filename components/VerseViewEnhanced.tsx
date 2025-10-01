import React from "react";
import { View, Text, TouchableOpacity, ScrollView } from "react-native";
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
  style?: object; // Add this
}


// Function to render verse text with XML tags removed
// Numbers inside tags get half font size
const renderVerseTextWithXmlHighlight = (
  text: string,
  baseFontSize: number
) => {
  if (!text) return [];

  const elements: React.ReactNode[] = [];
  let lastIndex = 0;
  const regex = /<[^/>]+>([^<]*)<\/[^>]+>|<[^>]+\/>|<\/[^>]+>/g;
  let match;

  while ((match = regex.exec(text)) !== null) {
    // Plain text before this tag
    if (match.index > lastIndex) {
      elements.push(text.slice(lastIndex, match.index));
    }

    // Inner text inside <tag>content</tag>
    if (match[1] && match[1].trim()) {
      const isNumber = /^\d+$/.test(match[1].trim());
      elements.push(
        <Text
          key={match.index}
          className="italic"
          style={{
            fontSize: isNumber ? baseFontSize * 0.5 : baseFontSize * 0.95,
            color: "#ff5722",
            flexWrap: "wrap",
          }}
        >
          {match[1]}
        </Text>
      );
    }

    lastIndex = regex.lastIndex;
  }

  // Remaining plain text after last tag
  if (lastIndex < text.length) {
    elements.push(text.slice(lastIndex));
  }

  // Remove leftover empty tags
  return elements
    .map((el) => {
      if (typeof el === "string") return el.replace(/<[^>]+>/g, "");
      return el;
    })
    .filter(Boolean);
};

export const VerseViewEnhanced: React.FC<ChapterViewProps> = ({
  verses,
  bookName,
  chapterNumber,
  onPress,
  showVerseNumbers = true,
  fontSize = 16,
  onVersePress,
  style, // <-- destructure it
}) => {
  const { currentVersion } = useBibleDatabase();
  const sortedVerses = [...verses].sort((a, b) => a.verse - b.verse);

  // Render individual verses
  const renderVerses = () => {
    if (sortedVerses.length === 0) {
      return (
        <Text className="text-gray-600 text-center">No verses available</Text>
      );
    }

    return (
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 20 }}
      >
        <View className="space-y-4">
          {sortedVerses.map((verse) => (
            <TouchableOpacity
              key={verse.verse}
              activeOpacity={onVersePress ? 0.7 : 1}
              onPress={() => onVersePress?.(verse)}
            >
              <View className="flex-row mb-2">
                <Text
                  className="text-gray-800 flex-1 text-justify"
                  style={{
                    fontSize,
                    lineHeight: fontSize * 1.6,
                    flexShrink: 1,
                    flexWrap: "wrap",
                  }}
                  textBreakStrategy="simple"
                  allowFontScaling
                  adjustsFontSizeToFit={false}
                  minimumFontScale={0.85}
                >
                  {showVerseNumbers && (
                    <Text
                      className="italic font-semibold text-blue-800"
                      style={{ fontSize: fontSize - 2, flexWrap: "wrap" }}
                    >
                      {verse.verse}{" "}
                    </Text>
                  )}

                  {renderVerseTextWithXmlHighlight(verse.text, fontSize).map(
                    (el, idx) => {
                      const key = `${verse.verse}-${idx}`;
                      if (typeof el === "string") {
                        return (
                          <Text key={key} className="flex-wrap">
                            {el}
                          </Text>
                        );
                      }
                      return React.cloneElement(el as React.ReactElement, {
                        key,
                      });
                    }
                  )}
                </Text>
              </View>
            </TouchableOpacity>
          ))}
        </View>
      </ScrollView>
    );
  };

  // Generate verse reference string
  const referenceText =
    sortedVerses.length > 0
      ? `${bookName} ${chapterNumber}:${sortedVerses[0].verse}${
          sortedVerses.length > 1
            ? `-${sortedVerses[sortedVerses.length - 1].verse}`
            : ""
        }`
      : "";

  // Card content
  const verseContent = (
    <View
      className="bg-white p-6 rounded-lg shadow-sm min-h-[20px]"
      style={{
        ...(sortedVerses[0]?.book_color
          ? { borderLeftWidth: 4, borderLeftColor: sortedVerses[0].book_color }
          : {}),
        ...style, // <-- apply custom style
      }}
    >
      {renderVerses()}
      {/* Reference below */}
      <View>
        {referenceText ? (
          <Text className="text-blue-800 text-base italic font-medium mb-2">
            {referenceText}
          </Text>
        ) : null}
      </View>
    </View>
  );

  if (onPress) {
    return (
      <TouchableOpacity onPress={onPress} activeOpacity={0.7}>
        {verseContent}
      </TouchableOpacity>
    );
  }

  return verseContent;
};
