// components/VerseCard.tsx - Enhanced version with better text rendering
import React from "react";
import { View, Text } from "react-native";
import { Verse } from "../lib/database";

interface VerseCardProps {
  verse: Verse;
  showReference?: boolean;
  compact?: boolean;
  onPress?: () => void;
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

export const VerseCard: React.FC<VerseCardProps> = ({
  verse,
  showReference = true,
  compact = false,
  onPress,
}) => {
  const cleanText = removeXmlTags(verse.text);

  const CardContent = () => (
    <View
      className={`bg-white rounded-lg border border-gray-200 ${
        compact ? "p-4" : "p-5 mb-3"
      }`}
      style={
        verse.book_color && !compact
          ? { borderLeftWidth: 4, borderLeftColor: verse.book_color }
          : {}
      }
    >
      {/* Verse Reference */}
      {showReference && (
        <View
          className={`${compact ? "mb-2" : "mb-3 pb-2 border-b border-gray-100"}`}
        >
          <Text className="text-blue-600 font-semibold text-sm">
            {verse.book_name} {verse.chapter}:{verse.verse}
          </Text>
        </View>
      )}

      {/* Verse Text - Multiple fixes for text clipping */}
      <View className="flex-1">
        <Text
          className={`text-gray-800 text-justify ${
            compact ? "text-sm leading-6" : "text-base leading-8"
          }`}
          textBreakStrategy="highQuality"
          allowFontScaling={true}
          adjustsFontSizeToFit={false}
          minimumFontScale={0.8}
        >
          {cleanText}
        </Text>
      </View>
    </View>
  );

  if (onPress) {
    const TouchableOpacity = require("react-native").TouchableOpacity;
    return (
      <TouchableOpacity onPress={onPress} activeOpacity={0.7}>
        <CardContent />
      </TouchableOpacity>
    );
  }

  return <CardContent />;
};
