import React, { useMemo, useCallback, useRef, memo, forwardRef } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  StyleProp,
  ViewStyle,
  LayoutChangeEvent,
  DimensionValue,
  FlatList,
  ListRenderItemInfo,
  NativeSyntheticEvent,
  NativeScrollEvent,
} from "react-native";
import { Verse } from "../types";
import { useTheme } from "../context/ThemeContext";
import { BIBLE_BOOKS_MAP } from "../utils/testamentUtils";
import { BOOK_ABBREVS } from "../utils/bookAbbrevs";
import { getThemeColors } from "../utils/themeUtils";
import { BackgroundTexture } from "../components/BackgroundTexture";
import { useBackgroundTexture } from "../hooks/useBackgroundTexture";
import { Fonts } from "../utils/fonts";
import { EnhancedModal, type EnhancedModalRef } from "./EnhancedModal";
import { VerseItem } from "./VerseItem";
import { useWindowDimensions } from "react-native";

const STYLES = {
  container: {
    borderRadius: 8,
    shadowOpacity: 0.1,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 2 },
    elevation: 2,
    minHeight: 800,
    alignSelf: "stretch" as const,
    width: "100%" as DimensionValue,
    overflow: "hidden",
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
  onScroll?: (event: NativeSyntheticEvent<NativeScrollEvent>) => void;
  scrollEnabled?: boolean;
  onScrollBeginDrag?: (event: NativeSyntheticEvent<NativeScrollEvent>) => void;
  onScrollEndDrag?: (event: NativeSyntheticEvent<NativeScrollEvent>) => void;
  onMomentumScrollBegin?: (
    event: NativeSyntheticEvent<NativeScrollEvent>
  ) => void;
  onMomentumScrollEnd?: (
    event: NativeSyntheticEvent<NativeScrollEvent>
  ) => void;
  scrollEventThrottle?: number;
}

const MemoizedVerseItem = memo(VerseItem);

const MemoizedFooter = memo(
  ({ themeColors, fontFamily }: { themeColors: any; fontFamily?: string }) => (
    <View
      style={{
        marginTop: 16,
        paddingTop: 12,
        borderTopWidth: 1,
        borderTopColor: themeColors.border,
      }}
    >
      <Text
        style={{
          textAlign: "center",
          color: themeColors.textMuted,
          fontSize: 10,
          fontFamily,
        }}
      >
        End of Chapter
      </Text>
    </View>
  )
);

export const ChapterViewEnhanced = forwardRef<
  FlatList<Verse>,
  ChapterViewProps
>(
  (
    {
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
      isFullScreen = false,
      displayVersion,
      bgImageIndex,
      bgTextureOpacity,
      noBackground = false,
      onScroll,
      scrollEnabled = true,
      onScrollBeginDrag,
      onScrollEndDrag,
      onMomentumScrollBegin,
      onMomentumScrollEnd,
      scrollEventThrottle = 16,
    },
    forwardedRef
  ) => {
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

    const bgHook = useBackgroundTexture({
      index: bgImageIndex,
      opacity: bgTextureOpacity,
      noBackground,
    });

    const hasBg = !noBackground && bgHook.hasSource;

    const modalRef = useRef<EnhancedModalRef>(null);

    const setFlatListRef = useCallback(
      (node: FlatList<Verse> | null) => {
        if (forwardedRef) {
          if (typeof forwardedRef === "function") {
            forwardedRef(node);
          } else {
            (
              forwardedRef as React.MutableRefObject<FlatList<Verse> | null>
            ).current = node;
          }
        }
      },
      [forwardedRef]
    );

    const { width, height } = useWindowDimensions();
    const isLandscape = width > height;

    const bookToNumber = useMemo(() => {
      const map: Record<string, number> = {};
      Object.entries(BIBLE_BOOKS_MAP).forEach(([dbNumStr, { long, short }]) => {
        const dbNum = parseInt(dbNumStr, 10);
        map[long] = dbNum;
        map[short] = dbNum;
        const abbrevs = BOOK_ABBREVS[long] || [];
        abbrevs.forEach((abb) => {
          if (!map[abb]) map[abb] = dbNum;
        });
      });
      return map;
    }, []);

    const sortedVerses = useMemo(
      () => [...verses].sort((a, b) => a.verse - b.verse),
      [verses]
    );

    // Always provide a real function for onVerseLayout (required by VerseItem)
    const safeOnVerseLayout = useCallback(
      (verseNumber: number, event: LayoutChangeEvent) => {
        onVerseLayout?.(verseNumber, event);
      },
      [onVerseLayout]
    );

    const handleTagPress = useCallback((content: string, verse: Verse) => {
      modalRef.current?.openCommentary(content, verse);
    }, []);

    const handleWordPress = useCallback((word: string) => {
      modalRef.current?.openWord(word);
    }, []);

    const renderVerseItem = useCallback(
      ({ item: verse }: ListRenderItemInfo<Verse>) => {
        const isFullHighlighted = highlightedVerses.has(verse.verse);
        const isNavigationHighlighted = verse.verse === highlightVerse;
        const shouldHighlight = isFullHighlighted || isNavigationHighlighted;
        const isBookmarked = bookmarkedVerses.has(verse.verse);
        const verseTextColor = isFullHighlighted
          ? themeColors.highlightText
          : themeColors.textPrimary;

        return (
          <MemoizedVerseItem
            verse={verse}
            fontSize={fontSize}
            themeColors={themeColors}
            fontFamily={actualFontFamily}
            onTagPress={handleTagPress}
            onWordPress={handleWordPress}
            textColor={verseTextColor}
            showVerseNumbers={showVerseNumbers}
            showHeader={true}
            isHighlighted={shouldHighlight}
            bookmarked={isBookmarked}
            onVerseLayout={safeOnVerseLayout}
            onVerseRef={onVerseRef}
            onLongPress={onVersePress || (() => {})}
            isFullScreen={isFullScreen}
          />
        );
      },
      [
        fontSize,
        themeColors,
        actualFontFamily,
        highlightedVerses,
        highlightVerse,
        bookmarkedVerses,
        showVerseNumbers,
        handleTagPress,
        handleWordPress,
        safeOnVerseLayout,
        onVerseRef,
        onVersePress,
        isFullScreen,
      ]
    );

    const keyExtractor = useCallback((verse: Verse) => `${verse.verse}`, []);

    // Accurate estimated height — increased to cover longer verses
    const getItemLayout = useCallback(
      (data: ArrayLike<Verse> | null | undefined, index: number) => {
        const lineHeight = fontSize * 1.6;
        const estimatedLines = isFullScreen ? 3.5 : 3.2; // Key fix for long verses
        const padding = isFullScreen ? 8 : 24;
        const itemHeight = lineHeight * estimatedLines + padding;

        return {
          length: Math.ceil(itemHeight),
          offset: Math.ceil(itemHeight) * index,
          index,
        };
      },
      [fontSize, isFullScreen]
    );

    const ListFooterComponent = useMemo(
      () => (
        <MemoizedFooter
          themeColors={themeColors}
          fontFamily={actualFontFamily}
        />
      ),
      [themeColors, actualFontFamily]
    );

    const wrapperStyle = useMemo<ViewStyle>(
      () => ({
        ...STYLES.container,
        flex: isFullScreen ? 1 : undefined,
        backgroundColor: noBackground
          ? "transparent"
          : hasBg
            ? undefined
            : themeColors.card,
        shadowOpacity: noBackground || hasBg ? 0 : 0.1,
        shadowRadius: noBackground || hasBg ? 0 : 4,
        shadowOffset:
          noBackground || hasBg
            ? { width: 0, height: 0 }
            : { width: 0, height: 2 },
        elevation: noBackground || hasBg ? 0 : 2,
      }),
      [isFullScreen, noBackground, hasBg, themeColors.card]
    );

    const contentContainerStyle = useMemo(
      () => ({
        paddingHorizontal: isFullScreen ? 8 : 16,
        paddingTop: isFullScreen ? 6 : 12,
        paddingBottom: 500,
        gap: isFullScreen ? 2 : 6,
      }),
      [isFullScreen]
    );

    const chapterContent = (
      <BackgroundTexture
        source={bgHook.source}
        hasBg={hasBg}
        overlayStyle={bgHook.overlayStyle}
        overlayKey={bgHook.overlayKey}
        style={[wrapperStyle, style]}
      >
        <FlatList
          ref={setFlatListRef}
          data={sortedVerses}
          renderItem={renderVerseItem}
          keyExtractor={keyExtractor}
          getItemLayout={getItemLayout}
          ListFooterComponent={ListFooterComponent}
          contentContainerStyle={contentContainerStyle}
          showsVerticalScrollIndicator={false}
          initialNumToRender={25}
          maxToRenderPerBatch={15}
          windowSize={11}
          removeClippedSubviews={true}
          updateCellsBatchingPeriod={100}
          scrollEventThrottle={scrollEventThrottle}
          onScroll={onScroll}
          scrollEnabled={scrollEnabled}
          onScrollBeginDrag={onScrollBeginDrag}
          onScrollEndDrag={onScrollEndDrag}
          onMomentumScrollBegin={onMomentumScrollBegin}
          onMomentumScrollEnd={onMomentumScrollEnd}
          keyboardShouldPersistTaps="handled"
          decelerationRate="normal"
          style={{ flex: 1 }}
          extraData={{
            highlightVerse,
            fontSize,
            isFullScreen,
            themeColors,
          }}
        />
      </BackgroundTexture>
    );

    if (onPress) {
      return (
        <TouchableOpacity onPress={onPress} activeOpacity={0.7}>
          {chapterContent}
        </TouchableOpacity>
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
  }
);

ChapterViewEnhanced.displayName = "ChapterViewEnhanced";
