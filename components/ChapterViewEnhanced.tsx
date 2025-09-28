// components/ChapterViewEnhanced.tsx - Updated to support fontSize
import React from "react";
import { View, Text, TouchableOpacity, ScrollView } from "react-native";
import { Verse } from "../lib/database";

interface ChapterViewProps {
  verses: Verse[];
  bookName: string;
  chapterNumber: number;
  onPress?: () => void;
  showVerseNumbers?: boolean;
  fontSize?: number;
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
}) => {
  const sortedVerses = [...verses].sort((a, b) => a.verse - b.verse);

  const renderFormattedChapter = () => {
    if (sortedVerses.length === 0) {
      return <Text className="text-gray-600">No verses available</Text>;
    }

    return (
      <View>
        {/* Chapter Header with Long Book Name */}
        <Text className="text-xl font-bold text-center mb-6 text-primary">
          {bookName} Chapter {chapterNumber}
        </Text>

        {/* Continuous Text with Separate Lines and Increased Line Height */}
        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{ paddingBottom: 20 }}
        >
          <View className="space-y-4">
            {sortedVerses.map((verse) => (
              <View key={verse.verse} className="flex-row mb-2">
                <Text
                  className="text-gray-800 flex-1 text-justify"
                  style={{
                    fontSize: fontSize,
                    lineHeight: fontSize * 1.6,
                  }}
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
            ))}
          </View>
        </ScrollView>

        {/* Chapter Footer */}
        <Text className="text-center text-gray-500 mt-6 text-sm">
          End of Chapter {chapterNumber}
        </Text>
      </View>
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
      {renderFormattedChapter()}
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
