import React, { useMemo, useCallback, useRef } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  StyleProp,
  ViewStyle,
  LayoutChangeEvent,
  DimensionValue,
  ScrollView,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { Verse } from "../types";
import { useTheme } from "../context/ThemeContext";
import { BIBLE_BOOKS_MAP } from "../utils/testamentUtils";
import { BOOK_ABBREVS } from "../utils/bookAbbrevs";
import { getThemeColors } from "../utils/themeUtils";
import { BackgroundTexture } from "../components/BackgroundTexture";
import { useBackgroundTexture } from "../hooks/useBackgroundTexture";
import { Fonts } from "../utils/fonts";
import { EnhancedModal, type EnhancedModalRef } from "./EnhancedModal";
import { VerseDisplay } from "./VerseDisplay";

const STYLES = {
  container: {
    borderRadius: 8,
    shadowOpacity: 0.1,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 2 },
    elevation: 2,
    minHeight: 400,
    alignSelf: "stretch" as const,
    width: "100%" as DimensionValue,
    overflow: "hidden",
  },
  verse: {
    flexDirection: "row" as const,
    alignItems: "flex-start" as const,
  },
  verseNumber: {
    includeFontPadding: false,
  },
  verseText: {
    textAlign: "left" as const,
    flex: 1,
    minWidth: 0,
  },
} as const;

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
  colors?: any;
  onNavigateToVerse?: (
    bookNumber: number,
    chapter: number,
    verse: number
  ) => void;
  bgImageIndex?: number;
  bgTextureOpacity?: number;
  noBackground?: boolean;
}

export const ChapterViewEnhanced: React.FC<ChapterViewProps> = ({
  verses,
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
  bgImageIndex: propBgImageIndex,
  bgTextureOpacity: propBgTextureOpacity,
  noBackground,
}) => {
  const { theme, colorScheme, fontFamily, customColor } = useTheme();
  const themeColors = getThemeColors(theme, colorScheme, customColor);
  const actualFontFamily = useMemo((): string | undefined => {
    switch (fontFamily) {
      case "system":
        return undefined;
      case "oswald":
        return Fonts.OswaldVariable;
      case "rubik-glitch":
        return Fonts.RubikGlitchRegular;
      case "poppins":
        return Fonts.PoppinsRegular;
      default:
        return undefined;
    }
  }, [fontFamily]);
  const effectiveNoBg = noBackground ?? false;
  const bgHook = useBackgroundTexture({
    index: propBgImageIndex,
    opacity: propBgTextureOpacity,
    noBackground: effectiveNoBg,
  });
  const hasBg = !effectiveNoBg && bgHook.hasSource;

  const modalRef = useRef<EnhancedModalRef>(null);

  const bookToNumber = useMemo(() => {
    const map: Record<string, number> = {};
    Object.entries(BIBLE_BOOKS_MAP).forEach(([dbNumStr, { long, short }]) => {
      const dbNum = parseInt(dbNumStr, 10);
      map[long] = dbNum;
      map[short] = dbNum;
      const abbrevs = BOOK_ABBREVS[long] || [];
      abbrevs.forEach((abb) => {
        if (!map[abb]) {
          map[abb] = dbNum;
        }
      });
    });
    return map;
  }, []);

  const sortedVerses = useMemo(
    () => [...verses].sort((a, b) => a.verse - b.verse),
    [verses]
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

  const renderVerseItem = (verse: Verse) => {
    const isFullHighlighted = highlightedVerses.has(verse.verse);
    const isNavigationHighlighted = verse.verse === highlightVerse;
    const shouldHighlightNumber = isFullHighlighted || isNavigationHighlighted;
    const verseTextColor = isFullHighlighted
      ? themeColors.highlightText
      : themeColors.textPrimary;
    const localOnTagPress = useCallback(
      (content: string) => {
        modalRef.current?.openCommentary(content, verse);
      },
      [verse]
    );
    const localOnWordPress = useCallback((word: string) => {
      modalRef.current?.openWord(word);
    }, []);
    const indicatorSize = isFullScreen ? fontSize * 0.7 : fontSize * 0.8;
    return (
      <TouchableOpacity
        key={verse.verse}
        activeOpacity={1}
        onLongPress={() => handleVersePress(verse)}
      >
        <View
          style={[
            STYLES.verse,
            {
              backgroundColor: "transparent",
              borderRadius: 6,
              padding: 0,
              borderWidth: 0,
              borderColor: "transparent",
              marginBottom: isFullScreen ? 2 : 4,
            },
          ]}
          onLayout={(event) => handleVerseLayout(verse.verse, event)}
          ref={(ref) => handleVerseRef(verse.verse, ref)}
        >
          <View style={{ ...STYLES.verseText }}>
            <VerseDisplay
              verse={verse}
              fontSize={fontSize}
              themeColors={themeColors}
              fontFamily={actualFontFamily}
              onTagPress={localOnTagPress}
              onWordPress={localOnWordPress}
              textColor={verseTextColor}
              showVerseNumbers={showVerseNumbers}
              showHeader={true}
              isHighlighted={shouldHighlightNumber}
            />
            {bookmarkedVerses.has(verse.verse) && (
              <Ionicons
                name="bookmark-sharp"
                size={20}
                color={themeColors.primary}
              />
            )}
            {(showVerseNumbers ||
              bookmarkedVerses.has(verse.verse) ||
              shouldHighlightNumber) && (
              <Text style={{ fontSize: indicatorSize * 0.5 }}> </Text>
            )}
          </View>
        </View>
      </TouchableOpacity>
    );
  };

  const renderVerses = () => {
    return (
      <View style={{ gap: isFullScreen ? 2 : 6 }}>
        {sortedVerses.map(renderVerseItem)}
      </View>
    );
  };

  const wrapperStyle = useMemo<ViewStyle>(
    () => ({
      ...STYLES.container,
      flex: isFullScreen ? 1 : undefined,
      backgroundColor: effectiveNoBg
        ? "transparent"
        : hasBg
          ? undefined
          : themeColors.card,
      shadowOpacity: effectiveNoBg || hasBg ? 0 : 0.1,
      shadowRadius: effectiveNoBg || hasBg ? 0 : 4,
      shadowOffset:
        effectiveNoBg || hasBg
          ? { width: 0, height: 0 }
          : { width: 0, height: 2 },
      elevation: effectiveNoBg || hasBg ? 0 : 2,
    }),
    [isFullScreen, effectiveNoBg, hasBg, themeColors.card]
  );

  const contentContainerStyle = useMemo(
    () => ({
      padding: isFullScreen ? 8 : 16,
      paddingTop: isFullScreen ? 6 : 12,
    }),
    [isFullScreen]
  );

  const footerStyle = useMemo(
    () => ({
      marginTop: isFullScreen ? 8 : 16,
      paddingTop: isFullScreen ? 6 : 12,
      borderTopWidth: 1,
      borderTopColor: themeColors.border,
    }),
    [isFullScreen, themeColors.border]
  );

  const innerContent = (
    <>
      {renderVerses()}
      <View style={footerStyle}>
        <Text
          style={{
            textAlign: "center",
            color: themeColors.textMuted,
            fontSize: 10,
            fontFamily: actualFontFamily,
          }}
          numberOfLines={1}
          ellipsizeMode="tail"
        >
          {sortedVerses.length} verse{sortedVerses.length !== 1 ? "s" : ""}
          {highlightedVerses.size > 0 &&
            ` • ${highlightedVerses.size} highlighted`}
          {bookmarkedVerses.size > 0 &&
            ` • ${bookmarkedVerses.size} bookmarked`}
        </Text>
      </View>
    </>
  );

  const scrollOrView = effectiveNoBg ? (
    <View style={contentContainerStyle}>{innerContent}</View>
  ) : (
    <ScrollView
      style={{ flex: 1 }}
      contentContainerStyle={contentContainerStyle}
      showsVerticalScrollIndicator={false}
    >
      {innerContent}
    </ScrollView>
  );

  const chapterContent = (
    <BackgroundTexture
      source={bgHook.source}
      hasBg={hasBg}
      overlayStyle={bgHook.overlayStyle}
      overlayKey={bgHook.overlayKey}
      style={[wrapperStyle, style]}
    >
      {scrollOrView}
    </BackgroundTexture>
  );

  if (onPress) {
    return (
      <TouchableOpacity onPress={onPress} activeOpacity={0.7}>
        {chapterContent}
      </TouchableOpacity>
    );
  }

  if (sortedVerses.length === 0) {
    return (
      <View
        style={[
          {
            backgroundColor: effectiveNoBg ? "transparent" : themeColors.card,
            padding: isFullScreen ? 8 : 16,
            borderRadius: 8,
            borderWidth: 1,
            borderColor: themeColors.border,
          },
          style,
        ]}
      >
        <Text
          style={{
            textAlign: "center",
            color: themeColors.textMuted,
            fontSize: isFullScreen ? 14 : 16,
            fontFamily: actualFontFamily,
          }}
        >
          No verses available
        </Text>
      </View>
    );
  }

  return (
    <>
      {chapterContent}
      <EnhancedModal
        ref={modalRef}
        themeColors={themeColors}
        actualFontFamily={actualFontFamily}
        displayVersion={displayVersion}
        bookToNumber={bookToNumber}
      />
    </>
  );
};
