// components/ChapterView.tsx
import React from "react";
import { View, Text, TouchableOpacity } from "react-native";
import { Verse } from "../lib/database";

interface ChapterViewProps {
  verses: Verse[];
  bookName: string;
  chapterNumber: number;
  onPress?: () => void;
}

// Function to remove XML tags from verse text
const removeXmlTags = (text: string): string => {
  if (!text) return "";

  return text
    .replace(/<[^>]*>/g, "") // Remove all XML tags
    .replace(/\s+/g, " ") // Normalize whitespace
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&nbsp;/g, " ")
    .trim();
};

export const ChapterView: React.FC<ChapterViewProps> = ({
  verses,
  bookName,
  chapterNumber,
  onPress,
}) => {
  // Sort verses by verse number to ensure proper order
  const sortedVerses = [...verses].sort((a, b) => a.verse - b.verse);

  // Create continuous text with verse numbers
  const renderContinuousText = () => {
    if (sortedVerses.length === 0) {
      return <Text className="text-gray-600">No verses available</Text>;
    }

    return (
      <Text className="text-gray-800 text-base leading-7">
        <Text className="font-bold text-lg mb-2 block">
          {bookName} Chapter {chapterNumber}
        </Text>
        {"\n"}
        {sortedVerses.map((verse, index) => (
          <Text key={verse.verse}>
            <Text className="text-blue-600 font-semibold text-sm">
              {verse.verse}
            </Text>
            <Text> {removeXmlTags(verse.text)} </Text>
          </Text>
        ))}
      </Text>
    );
  };

  const chapterContent = (
    <View
      className="bg-white p-4 rounded-lg shadow-sm mb-3"
      style={
        verses[0]?.book_color
          ? { borderLeftWidth: 4, borderLeftColor: verses[0].book_color }
          : {}
      }
    >
      {renderContinuousText()}
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
