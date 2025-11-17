import React, { memo, useCallback } from "react";
import { View, Text, TouchableOpacity, LayoutChangeEvent } from "react-native";
import { VerseDisplay } from "./VerseDisplay";
import { Verse } from "../types";

interface VerseItemProps {
  verse: Verse;
  fontSize: number;
  themeColors: any; 
  fontFamily?: string;
  onTagPress: (content: string, verse: Verse) => void;
  onWordPress: (word: string) => void;
  textColor: string;
  showVerseNumbers: boolean;
  showHeader: boolean;
  isHighlighted: boolean;
  bookmarked: boolean;
  onVerseLayout: (verseNumber: number, event: LayoutChangeEvent) => void;
  onVerseRef: (verseNumber: number, ref: View | null) => void;
  onLongPress: (verse: Verse) => void;
  isFullScreen?: boolean;
}

export const VerseItem: React.FC<VerseItemProps> = memo(
  ({
    verse,
    fontSize,
    themeColors,
    fontFamily,
    onTagPress,
    onWordPress,
    textColor,
    showVerseNumbers,
    showHeader,
    isHighlighted,
    bookmarked,
    onVerseLayout,
    onVerseRef,
    onLongPress,
    isFullScreen,
  }) => {
    const localOnTagPress = useCallback(
      (content: string) => {
        onTagPress(content, verse);
      },
      [onTagPress, verse]
    );

    const indicatorSize = isFullScreen ? fontSize * 0.7 : fontSize * 0.8;

    return (
      <TouchableOpacity
        activeOpacity={1}
        onLongPress={() => onLongPress(verse)}
      >
        <View
          style={[
            {
              flexDirection: "row",
              alignItems: "flex-start",
              backgroundColor: "transparent",
              borderRadius: 6,
              padding: 0,
              borderWidth: 0,
              borderColor: "transparent",
              marginBottom: isFullScreen ? 2 : 4,
            },
          ]}
          onLayout={(event) => onVerseLayout(verse.verse, event)}
          ref={(ref) => onVerseRef(verse.verse, ref)}
        >
          <VerseDisplay
            verse={verse}
            fontSize={fontSize}
            themeColors={themeColors}
            fontFamily={fontFamily}
            onTagPress={localOnTagPress}
            onWordPress={onWordPress}
            textColor={textColor}
            showVerseNumbers={showVerseNumbers}
            showHeader={showHeader}
            isHighlighted={isHighlighted}
            bookmarked={bookmarked}
          />
          {(showVerseNumbers || bookmarked || isHighlighted) && (
            <Text style={{ fontSize: indicatorSize * 0.5 }}> </Text>
          )}
        </View>
      </TouchableOpacity>
    );
  }
);
