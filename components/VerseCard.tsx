import React from "react";
import { View, Text, TouchableOpacity, StyleSheet } from "react-native";
import { Verse } from "../types";
import { useBibleDatabase } from "../context/BibleDatabaseContext";

interface VerseCardProps {
  verse: Verse;
  showReference?: boolean;
  compact?: boolean;
  highlight?: string; // optional search highlight
  onPress?: () => void;
  onCopy?: (verse: Verse) => void;
  onBookmark?: (verse: Verse) => void;
}

// Utility to clean HTML/XML tags from verse text
const cleanText = (text?: string) => {
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

// Highlight search terms in verse text
const getHighlightedText = (text: string, highlight?: string) => {
  if (!highlight) return <Text>{text}</Text>;
  const parts = text.split(new RegExp(`(${highlight})`, "gi"));
  return (
    <Text>
      {parts.map((part, idx) =>
        part.toLowerCase() === highlight.toLowerCase() ? (
          <Text key={idx} style={{ backgroundColor: "yellow" }}>
            {part}
          </Text>
        ) : (
          <Text key={idx}>{part}</Text>
        )
      )}
    </Text>
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
  const text = cleanText(verse.text);

  const CardContent = () => (
    <View
      style={[
        styles.card,
        compact ? styles.compactCard : styles.fullCard,
        verse.book_color && !compact
          ? { borderLeftWidth: 4, borderLeftColor: verse.book_color }
          : {},
      ]}
    >
      {showReference && (
        <View style={compact ? styles.compactHeader : styles.header}>
          <Text style={styles.reference}>
            {verse.book_name} {verse.chapter}:{verse.verse}
          </Text>
          {currentVersion && !compact && (
            <Text style={styles.version}>
              {currentVersion.replace(".sqlite3", "").toUpperCase()}
            </Text>
          )}
        </View>
      )}

      <View style={{ flex: 1 }}>
        <Text
          style={[styles.text, compact ? styles.compactText : styles.fullText]}
          textBreakStrategy="highQuality"
          allowFontScaling
          adjustsFontSizeToFit={false}
          minimumFontScale={0.8}
        >
          {getHighlightedText(text, highlight)}
        </Text>
      </View>

      {/* Optional action buttons */}
      {(onCopy || onBookmark) && !compact && (
        <View style={styles.actions}>
          {onCopy && (
            <TouchableOpacity onPress={() => onCopy(verse)}>
              <Text style={styles.actionText}>Copy</Text>
            </TouchableOpacity>
          )}
          {onBookmark && (
            <TouchableOpacity onPress={() => onBookmark(verse)}>
              <Text style={styles.actionText}>Bookmark</Text>
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

const styles = StyleSheet.create({
  card: {
    backgroundColor: "#fff",
    borderRadius: 8,
    borderColor: "#E5E7EB",
    marginBottom: 12,
  },
  fullCard: {
    padding: 20,
  },
  compactCard: {
    padding: 12,
  },
  header: {
    marginBottom: 12,
    paddingBottom: 6,
    borderBottomWidth: 1,
    borderBottomColor: "#F3F4F6",
  },
  compactHeader: {
    marginBottom: 6,
  },
  reference: {
    color: "#2563EB",
    fontWeight: "600",
    fontSize: 14,
  },
  version: {
    color: "#9CA3AF",
    fontSize: 12,
    marginTop: 2,
  },
  text: {
    color: "#1F2937",
    flexShrink: 1,
    flexWrap: "wrap",
  },
  fullText: {
    fontSize: 16,
    lineHeight: 24,
  },
  compactText: {
    fontSize: 14,
    lineHeight: 20,
  },
  actions: {
    flexDirection: "row",
    justifyContent: "flex-end",
    marginTop: 10,
    gap: 12,
  },
  actionText: {
    color: "#2563EB",
    fontWeight: "600",
  },
});
