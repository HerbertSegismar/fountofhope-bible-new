import React from "react";
import {
  View,
  Text,
  TouchableOpacity,
  StyleProp,
  ViewStyle,
  TextStyle,
  LayoutChangeEvent,
  DimensionValue,
  useColorScheme,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { Verse } from "../types";

interface Colors {
  primary: string;
  background?: {
    target: string;
    highlight: string;
    default: string;
  };
  text?: {
    primary: string;
    secondary: string;
    verseNumber: string;
    target: string;
  };
  border?: {
    target: string;
    highlight: string;
    default: string;
  };
  secondary?: string;
  accent?: string;
  muted?: string;
  card?: string;
}

interface ChapterViewProps {
  verses: Verse[];
  bookName: string;
  chapterNumber: number;
  onPress?: () => void;
  showVerseNumbers?: boolean;
  fontSize?: number;
  onVersePress?: (verse: Verse) => void;
  onVerseLayout?: (verseNumber: number, event: LayoutChangeEvent) => void;
  onVerseRef?: (verseNumber: number, ref: View | null) => void;
  highlightVerse?: number;
  highlightedVerses?: Set<number>;
  bookmarkedVerses?: Set<number>;
  style?: StyleProp<ViewStyle>;
  bookId?: number;
  isFullScreen?: boolean;
  displayVersion?: string;
  colors?: Colors;
}

interface VerseTextElement {
  type: "text" | "xml";
  content: string;
  isNumber?: boolean;
}

// Constants for better maintainability - light theme fallback values
const LIGHT_THEME_COLORS = {
  primary: "#3B82F6",
  secondary: "#1E40AF",
  accent: "#FF6B6B",
  background: {
    target: "#FFF9E6",
    highlight: "#EFF6FF",
    default: "#FFFFFF",
  },
  border: {
    target: "#FFD700",
    highlight: "#3B82F6",
    default: "#E5E7EB",
  },
  text: {
    primary: "#1F2937",
    secondary: "#374151",
    verseNumber: "#1E40AF",
    target: "#DC2626",
  },
  muted: "#6B7280",
  card: "#FFFFFF",
} as const;

// Dark theme colors
const DARK_THEME_COLORS = {
  primary: "#60A5FA",
  secondary: "#3B82F6",
  accent: "#F87171",
  background: {
    target: "#1F2937",
    highlight: "#1E3A8A",
    default: "#111827",
  },
  border: {
    target: "#FCD34D",
    highlight: "#60A5FA",
    default: "#374151",
  },
  text: {
    primary: "#F9FAFB",
    secondary: "#D1D5DB",
    verseNumber: "#93C5FD",
    target: "#FECACA",
  },
  muted: "#9CA3AF",
  card: "#111827",
} as const;

const STYLES = {
  container: {
    padding: 16,
    borderRadius: 12,
    minHeight: 400,
    alignSelf: "stretch" as const,
    width: "100%" as DimensionValue,
  },
  header: {
    fontSize: 20,
    fontWeight: "700" as const,
    textAlign: "center" as const,
    marginBottom: 16,
  },
  verse: {
    flexDirection: "row" as const,
    alignItems: "flex-start" as const,
    padding: 4,
    borderRadius: 8,
  },
  verseNumber: {
    width: 20,
    marginRight: 2,
    textAlign: "left" as const,
    includeFontPadding: false,
  },
  verseText: {
    textAlign: "left" as const,
    flex: 1,
    minWidth: 0,
  },
} as const;

// Get theme-based default colors
const getDefaultColors = (
  theme: "light" | "dark" | null | undefined
): Colors => {
  return theme === "dark" ? DARK_THEME_COLORS : LIGHT_THEME_COLORS;
};

// Parse verse text and extract XML tags
const parseVerseText = (text: string): VerseTextElement[] => {
  if (!text) return [];

  const elements: VerseTextElement[] = [];
  let lastIndex = 0;
  const regex = /<([^>]+)>([^<]*)<\/\1>|<([^>]+)\/>/g;
  let match;

  while ((match = regex.exec(text)) !== null) {
    // Add text before the XML tag
    if (match.index > lastIndex) {
      elements.push({
        type: "text",
        content: text.slice(lastIndex, match.index),
      });
    }

    // Handle XML tags with content
    if (match[1] && match[2] !== undefined) {
      elements.push({
        type: "xml",
        content: match[2],
        isNumber: /^\d+$/.test(match[2].trim()),
      });
    }
    // Handle self-closing XML tags
    else if (match[3]) {
      elements.push({
        type: "xml",
        content: "",
        isNumber: false,
      });
    }

    lastIndex = regex.lastIndex;
  }

  // Add remaining text after last XML tag
  if (lastIndex < text.length) {
    elements.push({
      type: "text",
      content: text.slice(lastIndex),
    });
  }

  return elements.length > 0 ? elements : [{ type: "text", content: text }];
};

// Render verse text with XML highlighting
const renderVerseText = (
  elements: VerseTextElement[],
  baseFontSize: number,
  accentColor: string
) => {
  return elements.map((element, index) => {
    if (element.type === "text") {
      return <Text key={index}>{element.content.replace(/<[^>]+>/g, "")}</Text>;
    } else {
      return (
        <Text
          key={index}
          style={{
            fontSize: element.isNumber
              ? baseFontSize * 0.5
              : baseFontSize * 0.95,
            color: accentColor,
          }}
        >
          {element.content}
        </Text>
      );
    }
  });
};

export const ChapterViewEnhanced: React.FC<ChapterViewProps> = ({
  verses,
  bookName,
  chapterNumber,
  onPress,
  showVerseNumbers = true,
  fontSize = 16,
  onVersePress,
  onVerseLayout,
  onVerseRef,
  highlightVerse,
  highlightedVerses = new Set(),
  bookmarkedVerses = new Set(),
  style,
  isFullScreen,
  displayVersion,
  colors: propColors,
}) => {
  const theme = useColorScheme();
  const defaultColors = getDefaultColors(theme);

  // Use provided colors or theme-based defaults
  const colors = { ...defaultColors, ...propColors };

  // Extract specific colors with fallbacks
  const primaryColor = colors.primary;
  const secondaryColor =
    colors.secondary ?? defaultColors.secondary! ?? primaryColor;
  const accentColor = colors.accent ?? defaultColors.accent!;
  const backgroundTarget =
    colors.background?.target ?? defaultColors.background!.target;
  const backgroundHighlight =
    colors.background?.highlight ?? defaultColors.background!.highlight;
  const backgroundDefault =
    colors.background?.default ?? defaultColors.background!.default;
  const borderTarget = colors.border?.target ?? defaultColors.border!.target;
  const borderHighlight =
    colors.border?.highlight ?? defaultColors.border!.highlight;
  const borderDefault = colors.border?.default ?? defaultColors.border!.default;
  const textPrimary = colors.text?.primary ?? defaultColors.text!.primary;
  const textSecondary = colors.text?.secondary ?? defaultColors.text!.secondary;
  const textVerseNumber =
    colors.text?.verseNumber ?? defaultColors.text!.verseNumber;
  const textTarget = colors.text?.target ?? defaultColors.text!.target;
  const cardBg = colors.card ?? defaultColors.card!;
  const mutedColor = colors.muted ?? defaultColors.muted!;
  const borderColor = colors.border?.default ?? defaultColors.border!.default;

  // Sort verses by verse number
  const sortedVerses = React.useMemo(
    () => [...verses].sort((a, b) => a.verse - b.verse),
    [verses]
  );

  // Memoize parsed verse elements to avoid re-parsing on every render
  const verseElements = React.useMemo(
    () =>
      sortedVerses.map((verse) => ({
        ...verse,
        elements: parseVerseText(verse.text),
      })),
    [sortedVerses]
  );

  const handleVerseLayout = (verseNumber: number, event: LayoutChangeEvent) => {
    onVerseLayout?.(verseNumber, event);
  };

  const handleVerseRef = (verseNumber: number, ref: View | null) => {
    if (ref) {
      onVerseRef?.(verseNumber, ref);
    }
  };

  const handleVersePress = (verse: Verse) => {
    onVersePress?.(verse);
  };

  // Enhanced getVerseStyle to handle highlighted and bookmarked verses
  const getVerseStyle = (verseNumber: number): ViewStyle => {
    const baseStyle: ViewStyle = STYLES.verse;
    const isHighlighted = highlightedVerses.has(verseNumber);
    const isTargetVerse = highlightVerse === verseNumber;

    if (isTargetVerse && isHighlighted) {
      return {
        ...baseStyle,
        backgroundColor: backgroundTarget,
        borderLeftWidth: 4,
        borderLeftColor: borderTarget,
        borderRightWidth: 4,
        borderRightColor: borderHighlight,
      };
    } else if (isTargetVerse) {
      return {
        ...baseStyle,
        backgroundColor: backgroundTarget,
        borderLeftWidth: 4,
        borderLeftColor: borderTarget,
      };
    } else if (isHighlighted) {
      return {
        ...baseStyle,
        backgroundColor: backgroundHighlight,
        borderLeftWidth: 4,
        borderLeftColor: borderHighlight,
      };
    }

    return baseStyle;
  };

  // Enhanced verse number style
  const getVerseNumberStyle = (verseNumber: number): TextStyle => {
    const baseStyle: TextStyle = {
      ...STYLES.verseNumber,
      fontSize: Math.max(12, fontSize - 2),
    };

    const isHighlighted = highlightedVerses.has(verseNumber);
    const isTargetVerse = highlightVerse === verseNumber;

    if (isTargetVerse) {
      return {
        ...baseStyle,
        color: textTarget,
        fontWeight: "bold",
      };
    } else if (isHighlighted) {
      return {
        ...baseStyle,
        color: secondaryColor,
        fontWeight: "bold",
      };
    } else {
      return {
        ...baseStyle,
        color: textVerseNumber,
        fontWeight: "normal",
      };
    }
  };

  // Enhanced verse text style
  const getVerseTextStyle = (verseNumber: number): TextStyle => {
    const baseStyle: TextStyle = {
      ...STYLES.verseText,
      fontSize,
      lineHeight: fontSize * 1.6,
    };

    const isHighlighted = highlightedVerses.has(verseNumber);
    const isTargetVerse = highlightVerse === verseNumber;

    if (isTargetVerse) {
      return {
        ...baseStyle,
        color: textPrimary,
        fontWeight: "600",
      };
    } else if (isHighlighted) {
      return {
        ...baseStyle,
        color: secondaryColor,
        fontWeight: "500",
      };
    } else {
      return {
        ...baseStyle,
        color: textSecondary,
        fontWeight: "normal",
      };
    }
  };

  const renderVerseItem = (verse: (typeof verseElements)[0]) => (
    <TouchableOpacity
      key={verse.verse}
      activeOpacity={onVersePress ? 0.7 : 1}
      onPress={() => handleVersePress(verse)}
    >
      <View
        style={getVerseStyle(verse.verse)}
        onLayout={(event) => handleVerseLayout(verse.verse, event)}
        ref={(ref) => handleVerseRef(verse.verse, ref)}
      >
        {showVerseNumbers && (
          <Text style={getVerseNumberStyle(verse.verse)}>{verse.verse}</Text>
        )}

        <View
          style={{
            flex: 1,
            minWidth: 0,
            flexDirection: "row",
            alignItems: "flex-start",
          }}
        >
          <Text style={getVerseTextStyle(verse.verse)}>
            {renderVerseText(verse.elements, fontSize, accentColor)}
          </Text>

          {/* Bookmark Icon */}
          {bookmarkedVerses.has(verse.verse) && (
            <Ionicons
              name="bookmark"
              size={16}
              color={primaryColor}
              style={{ marginLeft: 8, marginTop: 2 }}
            />
          )}
        </View>
      </View>
    </TouchableOpacity>
  );

  const renderVerses = () => {
    if (!verseElements.length) {
      return (
        <View style={{ padding: 20 }}>
          <Text
            style={{
              color: mutedColor,
              textAlign: "center",
              fontSize,
              lineHeight: fontSize * 1.6,
            }}
          >
            No verses available for {bookName} {chapterNumber}
          </Text>
        </View>
      );
    }

    return <View style={{ gap: 4 }}>{verseElements.map(renderVerseItem)}</View>;
  };

  const getHeaderTitle = () => {
    let title = `${bookName} ${chapterNumber}`;
    if (highlightVerse) {
      title += ` : ${highlightVerse}`;
    }
    return title;
  };

  // Container style with book color border
  const containerStyle: ViewStyle = verses[0]?.book_color
    ? {
        ...STYLES.container,
        backgroundColor: cardBg,
        borderLeftWidth: 4,
        borderLeftColor: verses[0].book_color,
      }
    : {
        ...STYLES.container,
        backgroundColor: cardBg,
      };

  // Adjust padding for full screen mode
  const adjustedStyle = isFullScreen
    ? { ...containerStyle, paddingHorizontal: 8 }
    : containerStyle;

  const chapterContent = (
    <View style={[adjustedStyle, style]}>
      <Text
        style={[
          STYLES.header,
          {
            color: textPrimary,
          },
        ]}
        numberOfLines={2}
        adjustsFontSizeToFit
        minimumFontScale={0.8}
      >
        {getHeaderTitle()}
      </Text>

      {renderVerses()}

      <View
        style={{
          marginTop: 16,
          paddingTop: 12,
          borderTopWidth: 1,
          borderTopColor: borderColor,
        }}
      >
        <Text
          style={{
            textAlign: "center",
            color: mutedColor,
            fontSize: 12,
          }}
        >
          {verseElements.length} verse{verseElements.length !== 1 ? "s" : ""}
          {highlightedVerses.size > 0 &&
            ` • ${highlightedVerses.size} highlighted`}
          {bookmarkedVerses.size > 0 &&
            ` • ${bookmarkedVerses.size} bookmarked`}
          {displayVersion && <> • {displayVersion}</>}
        </Text>
      </View>
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
