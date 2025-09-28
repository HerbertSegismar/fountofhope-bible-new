// components/VerseCard.tsx - Updated with XML tag filtering
import React from "react";
import { View, Text, TouchableOpacity } from "react-native";
import { Verse } from "../lib/database";

interface VerseCardProps {
  verse: Verse;
  showReference?: boolean;
  onPress?: () => void;
}

// Function to remove XML tags from verse text
const removeXmlTags = (text: string): string => {
  if (!text) return "";

  // Remove XML tags while preserving the text content
  return text
    .replace(/<[^>]*>/g, "") // Remove all XML tags
    .replace(/\s+/g, " ") // Normalize whitespace
    .trim(); // Remove leading/trailing whitespace
};

// Function to clean and format verse text
const cleanVerseText = (text: string): string => {
  const cleaned = removeXmlTags(text);

  // Additional cleanup for common XML artifacts
  return cleaned
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&nbsp;/g, " ");
};

export const VerseCard: React.FC<VerseCardProps> = ({
  verse,
  showReference = true,
  onPress,
}) => {
  const cleanText = cleanVerseText(verse.text);

  const cardContent = (
    <View
      className="bg-white p-4 rounded-lg shadow-sm mb-3"
      style={
        verse.book_color
          ? { borderLeftWidth: 4, borderLeftColor: verse.book_color }
          : {}
      }
    >
      {showReference && (
        <Text className="text-primary font-bold mb-2">
          {verse.book_name || "Unknown Book"} {verse.chapter}:{verse.verse}
        </Text>
      )}
      <Text className="text-gray-800 text-base leading-6">{cleanText}</Text>
    </View>
  );

  if (onPress) {
    return (
      <TouchableOpacity onPress={onPress} activeOpacity={0.7}>
        {cardContent}
      </TouchableOpacity>
    );
  }

  return cardContent;
};
