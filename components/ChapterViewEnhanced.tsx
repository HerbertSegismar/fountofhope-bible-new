import React from "react";
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  StyleProp,
  ViewStyle,
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
  style?: StyleProp<ViewStyle>;
}

// Render verse text and remove XML tags (returns strings and Text nodes)
const renderVerseTextWithXmlHighlight = (
  text: string,
  baseFontSize: number
) => {
  if (!text) return [];

  const elements: Array<string | React.ReactNode> = [];
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
          // IMPORTANT: don't set flexWrap here
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

  if (lastIndex < text.length) elements.push(text.slice(lastIndex));
  return elements
    .map((el) => (typeof el === "string" ? el.replace(/<[^>]+>/g, "") : el))
    .filter(Boolean);
};

export const ChapterViewEnhanced: React.FC<ChapterViewProps> = ({
  verses,
  bookName,
  chapterNumber,
  onPress,
  showVerseNumbers = true,
  fontSize = 16,
  onVersePress,
  style,
}) => {
  const { currentVersion } = useBibleDatabase();
  const sortedVerses = [...verses].sort((a, b) => a.verse - b.verse);

  const renderVerses = () => {
    if (!sortedVerses.length) {
      return (
        <Text style={{ color: "#6b7280", textAlign: "center" }}>
          No verses available
        </Text>
      );
    }

    return (
      <ScrollView
        style={{ flex: 1 }}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 20 }}
      >
        <View style={{ gap: 2 }}>
          {sortedVerses.map((verse) => (
            <TouchableOpacity
              key={verse.verse}
              activeOpacity={onVersePress ? 0.7 : 1}
              onPress={() => onVersePress?.(verse)}
            >
              {/* Row with fixed-width verse-number and shrinkable text container */}
              <View
                style={{
                  flexDirection: "row",
                  marginBottom: 8,
                  alignItems: "flex-start",
                }}
              >
                {showVerseNumbers && (
                  <Text
                    style={{
                      width: 22,
                      marginRight: 4,
                      fontSize: Math.max(12, fontSize - 2),
                      color: "#1e40af",
                      textAlign: "right",
                      includeFontPadding: false,
                    }}
                  >
                    {verse.verse}
                  </Text>
                )}

                {/* This container must be able to shrink: flex:1 + minWidth:0 */}
                <View style={{ flex: 1, minWidth: 0 }}>
                  <Text
                    style={{
                      fontSize,
                      lineHeight: fontSize * 1.6,
                      textAlign: "left", // try left to avoid justify issues; change to "justify" if desired
                    }}
                  >
                    {renderVerseTextWithXmlHighlight(verse.text, fontSize).map(
                      (el, idx) =>
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
              </View>
            </TouchableOpacity>
          ))}
        </View>
      </ScrollView>
    );
  };

  const chapterContent = (
    <View
      style={[
        {
          backgroundColor: "#fff",
          padding: 16,
          borderRadius: 12,
          minHeight: 400,
          alignSelf: "stretch",
          width: "100%",
        },
        verses[0]?.book_color
          ? { borderLeftWidth: 4, borderLeftColor: verses[0].book_color }
          : {},
        style,
      ]}
    >
      <Text
        style={{
          fontSize: 20,
          fontWeight: "700",
          textAlign: "center",
          marginBottom: 12,
          color: "#0f172a",
        }}
        numberOfLines={2}
        adjustsFontSizeToFit
        minimumFontScale={0.8}
      >
        {bookName} Chapter {chapterNumber}
      </Text>

      {renderVerses()}

      <Text
        style={{
          textAlign: "center",
          color: "#6b7280",
          marginTop: 12,
          fontSize: 12,
        }}
      >
        End of Chapter {chapterNumber}
        {currentVersion && (
          <> • {currentVersion.replace(".sqlite3", "").toUpperCase()}</>
        )}
      </Text>
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
