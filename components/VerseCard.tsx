import React from "react";
import { View, Text } from "react-native";
import { Verse } from "../types";

interface VerseCardProps {
  verse: Verse;
  showReference?: boolean;
}

export const VerseCard: React.FC<VerseCardProps> = ({
  verse,
  showReference = true,
}) => {
  return (
    <View className="bg-white p-4 rounded-lg shadow-sm mb-3">
      {showReference && (
        <Text className="text-primary font-bold mb-2">
          {verse.book} {verse.chapter}:{verse.verse}
        </Text>
      )}
      <Text className="text-gray-800 text-base leading-6">{verse.text}</Text>
    </View>
  );
};
