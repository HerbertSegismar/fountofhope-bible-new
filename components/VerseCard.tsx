import React from "react";
import { View, Text, TouchableOpacity } from "react-native";
import { Verse } from "../types";
import { useBibleDatabase } from "../context/BibleDatabaseContext";

interface VerseCardProps {
  verse: Verse;
  showReference?: boolean;
  compact?: boolean;
  highlight?: string;
  onPress?: () => void;
  onCopy?: (verse: Verse) => void;
  onBookmark?: (verse: Verse) => void;
}

// --- Handle XML tags like ChapterViewEnhanced ---
const renderVerseTextWithXmlHighlight = (
  text?: string,
  baseFontSize = 16,
  verseNumber?: number
) => {
  if (!text) return [];

  const elements: React.ReactNode[] = [];
  let lastIndex = 0;
  const regex = /<[^/>]+>([^<]*)<\/[^>]+>|<[^>]+\/>|<\/[^>]+>/g;
  let match;
  let elIndex = 0;

  while ((match = regex.exec(text)) !== null) {
    // Plain text before this tag
    if (match.index > lastIndex) {
      elements.push(
        <Text key={`plain-${verseNumber}-${elIndex++}`}>
          {text.slice(lastIndex, match.index)}
        </Text>
      );
    }

    // Inner text inside <tag>content</tag>
    if (match[1] && match[1].trim()) {
      const isNumber = /^\d+$/.test(match[1].trim());
      elements.push(
        <Text
          key={`xml-${verseNumber}-${elIndex++}`}
          className={`${isNumber ? "text-[0.5rem]" : "text-[0.85rem]"} italic text-orange-500`}
        >
          {match[1]}
        </Text>
      );
    }

    lastIndex = regex.lastIndex;
  }

  // Remaining text after last tag
  if (lastIndex < text.length) {
    elements.push(
      <Text key={`plain-${verseNumber}-${elIndex++}`}>
        {text.slice(lastIndex)}
      </Text>
    );
  }

  return elements;
};

// Highlight search terms
const getHighlightedText = (
  elements: React.ReactNode[],
  highlight?: string,
  verseNumber?: number
) => {
  if (!highlight) return <>{elements}</>;

  return (
    <>
      {React.Children.map(elements, (child, idx) => {
        if (typeof child === "string") {
          const parts = child.split(new RegExp(`(${highlight})`, "gi"));
          return parts.map((part, i) =>
            part.toLowerCase() === highlight.toLowerCase() ? (
              <Text
                key={`hl-${verseNumber}-${idx}-${i}`}
                className="bg-yellow-300"
              >
                {part}
              </Text>
            ) : (
              <Text key={`txt-${verseNumber}-${idx}-${i}`}>{part}</Text>
            )
          );
        }
        return React.cloneElement(child as React.ReactElement, {
          key: `child-${verseNumber}-${idx}`,
        });
      })}
    </>
  );
};

export const VerseCard: React.FC<VerseCardProps> = ({
  verse,
  showReference = true,
  compact = false,
  highlight,
  onPress,
  onCopy,
  onBookmark,
}) => {
  const { currentVersion } = useBibleDatabase();
  const textElements =
    renderVerseTextWithXmlHighlight(
      verse.text,
      compact ? 14 : 16,
      verse.verse
    ) || [];

  const CardContent = () => (
    <View
      className={`bg-white rounded-lg border border-gray-200 mb-3 ${compact ? "p-3" : "p-5"} ${verse.book_color && !compact ? "border-l-4" : ""}`}
      style={
        verse.book_color && !compact
          ? { borderLeftColor: verse.book_color }
          : {}
      }
    >
      {showReference && (
        <View
          className={`${compact ? "mb-1" : "mb-3 pb-1 border-b border-gray-100"}`}
        >
          <Text className="text-blue-600 font-semibold text-sm">
            {verse.book_name} {verse.chapter}:{verse.verse}
          </Text>
          {currentVersion && !compact && (
            <Text className="text-gray-400 text-xs mt-0.5">
              {currentVersion.replace(".sqlite3", "").toUpperCase()}
            </Text>
          )}
        </View>
      )}

      <View className="flex-1">
        <Text
          className={`text-gray-800 flex-shrink flex-wrap leading-6 ${compact ? "text-sm leading-5" : "text-base leading-6"}`}
          textBreakStrategy="highQuality"
          allowFontScaling
          adjustsFontSizeToFit={false}
          minimumFontScale={0.8}
        >
          {getHighlightedText(textElements, highlight, verse.verse)}
        </Text>
      </View>

      {(onCopy || onBookmark) && !compact && (
        <View className="flex-row justify-end mt-2 space-x-3">
          {onCopy && (
            <TouchableOpacity onPress={() => onCopy(verse)}>
              <Text className="text-blue-600 font-semibold">Copy</Text>
            </TouchableOpacity>
          )}
          {onBookmark && (
            <TouchableOpacity onPress={() => onBookmark(verse)}>
              <Text className="text-blue-600 font-semibold">Bookmark</Text>
            </TouchableOpacity>
          )}
        </View>
      )}
    </View>
  );

  if (onPress) {
    return (
      <TouchableOpacity onPress={onPress} activeOpacity={0.7}>
        <CardContent />
      </TouchableOpacity>
    );
  }

  return <CardContent />;
};
