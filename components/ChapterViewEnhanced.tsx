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
   scrollEventThrottle: number;
}

const MemoizedVerseItem = memo(
  ({
    verse,
    fontSize,
    themeColors,
    fontFamily,
    onTagPress,
    onWordPress,
    textColor,
    showVerseNumbers,
    isHighlighted,
    bookmarked,
    onVerseLayout,
    onVerseRef,
    onLongPress,
    isFullScreen,
  }: {
    verse: Verse;
    fontSize: number;
    themeColors: any;
    fontFamily?: string;
    onTagPress: (content: string, verse: Verse) => void;
    onWordPress: (word: string) => void;
    textColor: string;
    showVerseNumbers: boolean;
    isHighlighted: boolean;
    bookmarked: boolean;
    onVerseLayout: (verseNumber: number, event: LayoutChangeEvent) => void;
    onVerseRef: (verseNumber: number, ref: View | null) => void;
    onLongPress: (verse: Verse) => void;
    isFullScreen?: boolean;
  }) => {
    return (
      <VerseItem
        verse={verse}
        fontSize={fontSize}
        themeColors={themeColors}
        fontFamily={fontFamily}
        onTagPress={onTagPress}
        onWordPress={onWordPress}
        textColor={textColor}
        showVerseNumbers={showVerseNumbers}
        showHeader={true}
        isHighlighted={isHighlighted}
        bookmarked={bookmarked}
        onVerseLayout={onVerseLayout}
        onVerseRef={onVerseRef}
        onLongPress={onLongPress}
        isFullScreen={isFullScreen}
      />
    );
  },
  (prevProps, nextProps) => {
    return (
      prevProps.verse.verse === nextProps.verse.verse &&
      prevProps.verse.text === nextProps.verse.text &&
      prevProps.fontSize === nextProps.fontSize &&
      prevProps.isHighlighted === nextProps.isHighlighted &&
      prevProps.bookmarked === nextProps.bookmarked &&
      prevProps.textColor === nextProps.textColor &&
      prevProps.isFullScreen === nextProps.isFullScreen
    );
  }
);

const MemoizedFooter = memo(
  ({ themeColors, fontFamily }: { themeColors: any; fontFamily?: string }) => {
    return (
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
    );
  }
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
      isFullScreen,
      displayVersion,
      bgImageIndex: propBgImageIndex,
      bgTextureOpacity: propBgTextureOpacity,
      noBackground,
      onScroll,
      scrollEnabled = true,
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

    const effectiveNoBg = noBackground ?? false;
    const bgHook = useBackgroundTexture({
      index: propBgImageIndex,
      opacity: propBgTextureOpacity,
      noBackground: effectiveNoBg,
    });
    const hasBg = !effectiveNoBg && bgHook.hasSource;

    const modalRef = useRef<EnhancedModalRef>(null);
    const flatListRef = useRef<FlatList<Verse>>(null);

    const setFlatListRef = useCallback(
      (node: FlatList<Verse> | null) => {
        flatListRef.current = node;
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
      [forwardedRef, verses.length]
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

    const handleVerseLayout = useCallback(
      (verseNumber: number, event: LayoutChangeEvent) => {
        onVerseLayout?.(verseNumber, event);
      },
      [onVerseLayout]
    );

    const handleVerseRef = useCallback(
      (verseNumber: number, ref: View | null) => {
        if (ref) {
          onVerseRef?.(verseNumber, ref);
        }
      },
      [onVerseRef]
    );

    const handleVersePress = useCallback(
      (verse: Verse) => {
        onVersePress?.(verse);
      },
      [onVersePress]
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
        const shouldHighlightNumber =
          isFullHighlighted || isNavigationHighlighted;
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
            isHighlighted={shouldHighlightNumber}
            bookmarked={isBookmarked}
            onVerseLayout={handleVerseLayout}
            onVerseRef={handleVerseRef}
            onLongPress={handleVersePress}
            isFullScreen={isFullScreen}
          />
        );
      },
      [
        fontSize,
        themeColors,
        actualFontFamily,
        handleTagPress,
        handleWordPress,
        highlightedVerses,
        highlightVerse,
        bookmarkedVerses,
        showVerseNumbers,
        handleVerseLayout,
        handleVerseRef,
        handleVersePress,
        isFullScreen,
      ]
    );

    const keyExtractor = useCallback(
      (verse: Verse) => verse.verse.toString(),
      []
    );

    const getItemLayout = useCallback(
      (_data: ArrayLike<Verse> | null | undefined, index: number) => {
        const itemHeight = fontSize * 3 + (isFullScreen ? 8 : 24);
        return {
          length: itemHeight,
          offset: itemHeight * index,
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
        paddingHorizontal: isFullScreen ? 8 : 16,
        paddingTop: isFullScreen ? 6 : 12,
        paddingBottom: 500,
        gap: isFullScreen ? 2 : 6,
      }),
      [isFullScreen, isLandscape]
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
          showsVerticalScrollIndicator={true}
          initialNumToRender={15}
          maxToRenderPerBatch={10}
          windowSize={21}
          removeClippedSubviews={true}
          updateCellsBatchingPeriod={50}
          disableVirtualization={false}
          keyboardShouldPersistTaps="handled"
          decelerationRate="normal"
          style={{ flex: 1 }}
          onScroll={onScroll}
          scrollEventThrottle={16}
          scrollEnabled={scrollEnabled}
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
