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
}

const removeXmlTags = (text: string): string => {
  if (!text) return "";
  return text
    .replace(/<[^>]*>/g, "")
    .replace(/\s+/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&nbsp;/g, " ")
    .trim();
};

export const ChapterViewEnhanced: React.FC<ChapterViewProps> = ({
  verses,
  bookName,
  chapterNumber,
  onPress,
  showVerseNumbers = true,
  fontSize = 16,
  onVersePress,
}) => {
  const { currentVersion } = useBibleDatabase();

  const sortedVerses = [...verses].sort((a, b) => a.verse - b.verse);

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
                  textBreakStrategy="highQuality"
                  allowFontScaling
                  adjustsFontSizeToFit={false}
                  minimumFontScale={0.85}
                >
                  {showVerseNumbers && (
                    <Text
                      className="text-blue-600 font-semibold italic"
                      style={{
                        fontSize: fontSize - 2,
                        lineHeight: fontSize * 1.6,
                      }}
                    >
                      {verse.verse}{" "}
                    </Text>
                  )}
                  {removeXmlTags(verse.text)}
                </Text>
              </View>
            </TouchableOpacity>
          ))}
        </View>
      </ScrollView>
    );
  };

  const chapterContent = (
    <View
      className="bg-white p-6 rounded-lg shadow-sm min-h-[400px] mb-40"
      style={
        verses[0]?.book_color
          ? { borderLeftWidth: 4, borderLeftColor: verses[0].book_color }
          : {}
      }
    >
      <Text className="text-xl font-bold text-center mb-6 text-primary">
        {bookName} Chapter {chapterNumber}
      </Text>

      {renderVerses()}

      <Text className="text-center text-gray-500 mt-6 text-sm">
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
