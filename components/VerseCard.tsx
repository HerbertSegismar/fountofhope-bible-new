import React from "react";
import { View, Text, TouchableOpacity } from "react-native";
import { Verse } from "../lib/database";

interface VerseCardProps {
  verse: Verse;
  showReference?: boolean;
  onPress?: () => void;
}

export const VerseCard: React.FC<VerseCardProps> = ({
  verse,
  showReference = true,
  onPress,
}) => {
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
      <Text className="text-gray-800 text-base leading-6">{verse.text}</Text>

      {/* Optional: Show book color indicator */}
      {verse.book_color && (
        <View className="flex-row items-center mt-2">
          <View
            className="w-3 h-3 rounded-full mr-2"
            style={{ backgroundColor: verse.book_color }}
          />
          <Text className="text-gray-500 text-xs">
            {verse.book_name} •{" "}
            {verse.testament || (verse.book_number <= 39 ? "OT" : "NT")}
          </Text>
        </View>
      )}
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
