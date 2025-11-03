import React, { useCallback, useMemo } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  LayoutChangeEvent,
} from "react-native";
import { ChapterViewEnhanced } from "../components/ChapterViewEnhanced";
import type { Verse as VerseType } from "../types";
import { BackgroundTexture } from "../components/BackgroundTexture";
import { useBackgroundTexture } from "../hooks/useBackgroundTexture";

interface ReaderContentProps {
  primaryVerses: VerseType[];
  secondaryVerses: VerseType[];
  primaryLoading: boolean;
  secondaryLoading: boolean;
  primaryLocation: {
    bookId: number;
    bookName: string;
    chapter: number;
  };
  secondaryLocation: {
    bookId: number;
    bookName: string;
    chapter: number;
  };
  primaryDisplayBookName: string;
  secondaryDisplayBookName: string;
  currentVersion: string;
  secondaryVersion: string | null;
  getVersionDisplayName: (version: string) => string;
  primaryOnVersePress: (verse: VerseType) => void;
  secondaryOnVersePress: (verse: VerseType) => void;
  getHighlightVerse: (isPrimary: boolean) => number | undefined;
  primaryHighlightedVerses: number[];
  secondaryHighlightedVerses: number[];
  primaryBookmarkedVerses: Set<number>;
  secondaryBookmarkedVerses: Set<number>;
  isFullScreen: boolean;
  colors: any;
  fontSize: number;
  primaryProps: any;
  primaryHandleScroll: (event: any) => void;
  handlePrimaryContentSizeChange: (width: number, height: number) => void;
  secondaryHandleScrollCb: (event: any) => void;
  handleSecondaryContentSizeChange: (width: number, height: number) => void;
  handleSecondaryScrollViewLayout: (event: any) => void;
  handleSecondaryVerseLayout: (
    verseNumber: number,
    event: LayoutChangeEvent
  ) => void;
  primaryHeaderRef: React.RefObject<View | null>;
  secondaryHeaderRef: React.RefObject<View | null>;
  setPrimaryHeaderX: (x: number) => void;
  setPrimaryHeaderY: (y: number) => void;
  setPrimaryHeaderWidth: (width: number) => void;
  setPrimaryHeaderHeight: (height: number) => void;
  setSecondaryHeaderX: (x: number) => void;
  setSecondaryHeaderY: (y: number) => void;
  setSecondaryHeaderWidth: (width: number) => void;
  setSecondaryHeaderHeight: (height: number) => void;
  versionHeaderPaddingVertical: number;
  openPrimaryNavigation: () => void;
  openSecondaryNavigation: () => void;
  openPrimaryVersionSelector: () => void;
  openSecondaryVersionSelector: () => void;
  primaryTextColor: string;
  effectiveLayout: "horizontal" | "vertical";
  showMultiVersion: boolean;
  isLandscape: boolean;
  primaryScrollViewRef: React.RefObject<ScrollView | null>;
  secondaryScrollViewRef: React.RefObject<ScrollView | null>;
  bgTextureOpacity: number;
  scrollEnabled: boolean;
  bgImageIndex: number;
}

export const ReaderContent: React.FC<ReaderContentProps> = ({
  primaryVerses,
  secondaryVerses,
  primaryLoading,
  secondaryLoading,
  primaryLocation,
  secondaryLocation,
  primaryDisplayBookName,
  secondaryDisplayBookName,
  currentVersion,
  secondaryVersion,
  getVersionDisplayName,
  primaryOnVersePress,
  secondaryOnVersePress,
  getHighlightVerse,
  primaryHighlightedVerses,
  secondaryHighlightedVerses,
  primaryBookmarkedVerses,
  secondaryBookmarkedVerses,
  isFullScreen,
  colors,
  fontSize,
  primaryProps,
  primaryHandleScroll,
  handlePrimaryContentSizeChange,
  secondaryHandleScrollCb,
  handleSecondaryContentSizeChange,
  handleSecondaryScrollViewLayout,
  handleSecondaryVerseLayout,
  primaryHeaderRef,
  secondaryHeaderRef,
  setPrimaryHeaderX,
  setPrimaryHeaderY,
  setPrimaryHeaderWidth,
  setPrimaryHeaderHeight,
  setSecondaryHeaderX,
  setSecondaryHeaderY,
  setSecondaryHeaderWidth,
  setSecondaryHeaderHeight,
  versionHeaderPaddingVertical,
  openPrimaryNavigation,
  openSecondaryNavigation,
  openPrimaryVersionSelector,
  openSecondaryVersionSelector,
  effectiveLayout,
  showMultiVersion,
  primaryScrollViewRef,
  secondaryScrollViewRef,
  bgTextureOpacity,
  scrollEnabled,
  bgImageIndex,
}) => {
  const bgHook = useBackgroundTexture({
    opacity: bgTextureOpacity,
    index: bgImageIndex,
  });
  const hasNoBgTexture = !bgHook.hasSource;
  const headerBgColor = colors.primary;
  const headerTextColor = "white";
  const headerButtonBg = "rgba(255,255,255,0.15)";

  const primaryDisplay = getVersionDisplayName(currentVersion);
  const secondaryDisplay = getVersionDisplayName(secondaryVersion || "");

  const renderPrimaryContent = useCallback(() => {
    if (primaryLoading) {
      return (
        <View
          style={{
            flex: 1,
            justifyContent: "center",
            alignItems: "center",
          }}
        >
          <ActivityIndicator size="small" color={colors.primary} />
          <Text style={{ color: colors.muted, marginTop: 8 }}>Loading</Text>
        </View>
      );
    }
    if (primaryVerses.length === 0) {
      return (
        <View
          style={{
            flex: 1,
            justifyContent: "center",
            alignItems: "center",
          }}
        >
          <Text style={{ color: colors.muted, textAlign: "center" }}>
            Unable to load {primaryDisplay} version
          </Text>
          <Text
            style={{
              color: colors.muted + "80",
              fontSize: 12,
              textAlign: "center",
              marginTop: 4,
            }}
          >
            This version may not be available
          </Text>
        </View>
      );
    }
    return (
      <ScrollView
        style={{ flex: 1 }}
        ref={primaryScrollViewRef}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{
          paddingBottom: 40,
          paddingTop: 0,
        }}
        onScroll={primaryHandleScroll}
        scrollEventThrottle={16}
        onContentSizeChange={handlePrimaryContentSizeChange}
        onLayout={primaryProps.handleScrollViewLayout}
        scrollEnabled={scrollEnabled}
      >
        <View
          ref={primaryProps.chapterContainerRef}
          onLayout={primaryProps.handleChapterContainerLayout}
          style={{}}
        >
          <ChapterViewEnhanced
            verses={primaryVerses}
            bookName={primaryLocation.bookName}
            chapterNumber={primaryLocation.chapter}
            bookId={primaryLocation.bookId}
            showVerseNumbers
            fontSize={fontSize}
            onVersePress={primaryOnVersePress}
            onVerseLayout={primaryProps.handleVerseLayout}
            highlightVerse={getHighlightVerse(true)}
            highlightedVerses={new Set(primaryHighlightedVerses)}
            bookmarkedVerses={primaryBookmarkedVerses}
            isFullScreen={isFullScreen}
            displayVersion={primaryDisplay}
            colors={colors}
            bgImageIndex={bgHook.effectiveIndex}
            bgTextureOpacity={bgHook.effectiveOpacity}
            noBackground={bgHook.hasSource}
          />
        </View>
      </ScrollView>
    );
  }, [
    primaryLoading,
    primaryVerses,
    primaryLocation,
    primaryDisplay,
    primaryScrollViewRef,
    primaryHandleScroll,
    handlePrimaryContentSizeChange,
    primaryProps,
    fontSize,
    primaryOnVersePress,
    getHighlightVerse,
    primaryHighlightedVerses,
    primaryBookmarkedVerses,
    isFullScreen,
    colors,
    bgHook.effectiveIndex,
    bgHook.effectiveOpacity,
    bgHook.hasSource,
    scrollEnabled,
  ]);

  const innerContent = useMemo(() => {
    if (!showMultiVersion) {
      return renderPrimaryContent();
    }

    if (effectiveLayout === "horizontal") {
      return (
        <View style={{ flex: 1, flexDirection: "row" }}>
          <View
            style={{
              flex: 1,
              borderRightWidth: 1,
              borderRightColor: colors.border?.default,
            }}
          >
            <View
              ref={primaryHeaderRef}
              onLayout={() => {
                primaryHeaderRef.current?.measureInWindow((x, y, w, h) => {
                  setPrimaryHeaderX(x);
                  setPrimaryHeaderY(y);
                  setPrimaryHeaderWidth(w);
                  setPrimaryHeaderHeight(h);
                });
              }}
              style={{
                backgroundColor: headerBgColor,
                paddingVertical: versionHeaderPaddingVertical,
                paddingHorizontal: 16,
                borderBottomWidth: 1,
                borderBottomColor: colors.border?.default,
                flexDirection: "row",
                gap: 5,
              }}
            >
              <TouchableOpacity
                onPress={openPrimaryNavigation}
                style={{
                  paddingHorizontal: 5,
                  paddingVertical: 4,
                  backgroundColor: headerButtonBg,
                  borderRadius: 4,
                }}
              >
                <Text
                  style={{
                    color: headerTextColor,
                    fontWeight: "500",
                    fontSize: 14,
                  }}
                  numberOfLines={1}
                >
                  {`${primaryDisplayBookName} ${primaryLocation.chapter}`}
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={openPrimaryVersionSelector}
                style={{
                  paddingHorizontal: 5,
                  paddingVertical: 4,
                  backgroundColor: headerButtonBg,
                  borderRadius: 4,
                }}
              >
                <Text
                  style={{
                    color: headerTextColor,
                    fontWeight: "500",
                    fontSize: 14,
                  }}
                  numberOfLines={1}
                >
                  {primaryDisplay}
                </Text>
              </TouchableOpacity>
            </View>
            {renderPrimaryContent()}
          </View>
          <View style={{ flex: 1 }}>
            <View
              ref={secondaryHeaderRef}
              onLayout={() => {
                secondaryHeaderRef.current?.measureInWindow((x, y, w, h) => {
                  setSecondaryHeaderX(x);
                  setSecondaryHeaderY(y);
                  setSecondaryHeaderWidth(w);
                  setSecondaryHeaderHeight(h);
                });
              }}
              style={{
                backgroundColor: headerBgColor,
                paddingVertical: versionHeaderPaddingVertical,
                paddingHorizontal: 16,
                borderBottomWidth: 1,
                borderBottomColor: colors.border?.default,
                flexDirection: "row",
                gap: 5,
              }}
            >
              <TouchableOpacity
                onPress={openSecondaryNavigation}
                style={{
                  paddingHorizontal: 5,
                  paddingVertical: 4,
                  backgroundColor: headerButtonBg,
                  borderRadius: 4,
                }}
              >
                <Text
                  style={{
                    color: headerTextColor,
                    fontWeight: "500",
                    fontSize: 14,
                  }}
                  numberOfLines={1}
                >
                  {`${secondaryDisplayBookName} ${secondaryLocation.chapter}`}
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={openSecondaryVersionSelector}
                style={{
                  paddingHorizontal: 5,
                  paddingVertical: 4,
                  backgroundColor: headerButtonBg,
                  borderRadius: 4,
                }}
              >
                <Text
                  style={{
                    color: headerTextColor,
                    fontWeight: "500",
                    fontSize: 14,
                  }}
                  numberOfLines={1}
                >
                  {secondaryDisplay}
                </Text>
              </TouchableOpacity>
            </View>
            {secondaryLoading ? (
              <View
                style={{
                  flex: 1,
                  justifyContent: "center",
                  alignItems: "center",
                }}
              >
                <ActivityIndicator size="small" color={colors.primary} />
                <Text style={{ color: colors.muted, marginTop: 8 }}>
                  Loading
                </Text>
              </View>
            ) : secondaryVerses.length === 0 ? (
              <View
                style={{
                  flex: 1,
                  justifyContent: "center",
                  alignItems: "center",
                }}
              >
                <Text style={{ color: colors.muted, textAlign: "center" }}>
                  Unable to load {secondaryDisplay} version
                </Text>
                <Text
                  style={{
                    color: colors.muted + "80",
                    fontSize: 12,
                    textAlign: "center",
                    marginTop: 4,
                  }}
                >
                  This version may not be available
                </Text>
              </View>
            ) : (
              <ScrollView
                style={{ flex: 1 }}
                ref={secondaryScrollViewRef}
                showsVerticalScrollIndicator={false}
                contentContainerStyle={{
                  paddingBottom: 40,
                  paddingTop: 0,
                }}
                onScroll={secondaryHandleScrollCb}
                scrollEventThrottle={16}
                onContentSizeChange={handleSecondaryContentSizeChange}
                onLayout={handleSecondaryScrollViewLayout}
                scrollEnabled={scrollEnabled}
              >
                <ChapterViewEnhanced
                  verses={secondaryVerses}
                  bookName={secondaryLocation.bookName}
                  chapterNumber={secondaryLocation.chapter}
                  bookId={secondaryLocation.bookId}
                  showVerseNumbers
                  fontSize={fontSize}
                  onVersePress={secondaryOnVersePress}
                  onVerseLayout={handleSecondaryVerseLayout}
                  highlightVerse={getHighlightVerse(false)}
                  highlightedVerses={new Set(secondaryHighlightedVerses)}
                  bookmarkedVerses={secondaryBookmarkedVerses}
                  isFullScreen={isFullScreen}
                  displayVersion={secondaryDisplay}
                  colors={colors}
                  bgImageIndex={bgHook.effectiveIndex}
                  bgTextureOpacity={bgHook.effectiveOpacity}
                  noBackground={bgHook.hasSource}
                />
              </ScrollView>
            )}
          </View>
        </View>
      );
    } else {
      return (
        <View style={{ flex: 1, flexDirection: "column" }}>
          <View style={{ flex: 1 }}>
            {isFullScreen && (
              <View
                ref={primaryHeaderRef}
                onLayout={() => {
                  primaryHeaderRef.current?.measureInWindow((x, y, w, h) => {
                    setPrimaryHeaderX(x);
                    setPrimaryHeaderY(y);
                    setPrimaryHeaderWidth(w);
                    setPrimaryHeaderHeight(h);
                  });
                }}
                style={{
                  backgroundColor: headerBgColor,
                  paddingVertical: versionHeaderPaddingVertical,
                  paddingHorizontal: 16,
                  borderBottomWidth: 1,
                  borderBottomColor: colors.border?.default,
                  flexDirection: "row",
                  gap: 10,
                }}
              >
                <TouchableOpacity
                  onPress={openPrimaryNavigation}
                  style={{
                    paddingHorizontal: 5,
                    paddingVertical: 4,
                    backgroundColor: headerButtonBg,
                    borderRadius: 4,
                  }}
                >
                  <Text
                    style={{
                      color: headerTextColor,
                      fontWeight: "500",
                      fontSize: 16,
                    }}
                    numberOfLines={1}
                  >
                    {`${primaryDisplayBookName} ${primaryLocation.chapter}`}
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  onPress={openPrimaryVersionSelector}
                  style={{
                    paddingHorizontal: 5,
                    paddingVertical: 4,
                    backgroundColor: headerButtonBg,
                    borderRadius: 4,
                  }}
                >
                  <Text
                    style={{
                      color: headerTextColor,
                      fontWeight: "500",
                      fontSize: 16,
                    }}
                    numberOfLines={1}
                  >
                    {primaryDisplay}
                  </Text>
                </TouchableOpacity>
              </View>
            )}
            {renderPrimaryContent()}
          </View>
          <View
            style={{
              flex: 1,
              borderTopWidth: 1,
              borderTopColor: colors.border?.default,
            }}
          >
            <View
              ref={secondaryHeaderRef}
              onLayout={() => {
                secondaryHeaderRef.current?.measureInWindow((x, y, w, h) => {
                  setSecondaryHeaderX(x);
                  setSecondaryHeaderY(y);
                  setSecondaryHeaderWidth(w);
                  setSecondaryHeaderHeight(h);
                });
              }}
              style={{
                backgroundColor: headerBgColor,
                paddingVertical: versionHeaderPaddingVertical,
                paddingHorizontal: 16,
                borderBottomWidth: 1,
                borderBottomColor: colors.border?.default,
                flexDirection: "row",
                gap: 10,
              }}
            >
              <TouchableOpacity
                onPress={openSecondaryNavigation}
                style={{
                  paddingHorizontal: 5,
                  paddingVertical: 4,
                  backgroundColor: headerButtonBg,
                  borderRadius: 4,
                }}
              >
                <Text
                  style={{
                    color: headerTextColor,
                    fontWeight: "500",
                    fontSize: 16,
                  }}
                  numberOfLines={1}
                >
                  {`${secondaryDisplayBookName} ${secondaryLocation.chapter}`}
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={openSecondaryVersionSelector}
                style={{
                  paddingHorizontal: 5,
                  paddingVertical: 4,
                  backgroundColor: headerButtonBg,
                  borderRadius: 4,
                }}
              >
                <Text
                  style={{
                    color: headerTextColor,
                    fontWeight: "500",
                    fontSize: 16,
                  }}
                  numberOfLines={1}
                >
                  {secondaryDisplay}
                </Text>
              </TouchableOpacity>
            </View>
            {secondaryLoading ? (
              <View
                style={{
                  flex: 1,
                  justifyContent: "center",
                  alignItems: "center",
                }}
              >
                <ActivityIndicator size="small" color={colors.primary} />
                <Text style={{ color: colors.muted, marginTop: 8 }}>
                  Loading
                </Text>
              </View>
            ) : secondaryVerses.length === 0 ? (
              <View
                style={{
                  flex: 1,
                  justifyContent: "center",
                  alignItems: "center",
                }}
              >
                <Text style={{ color: colors.muted, textAlign: "center" }}>
                  Unable to load {secondaryDisplay} version
                </Text>
                <Text
                  style={{
                    color: colors.muted + "80",
                    fontSize: 12,
                    textAlign: "center",
                    marginTop: 4,
                  }}
                >
                  This version may not be available
                </Text>
              </View>
            ) : (
              <ScrollView
                style={{ flex: 1 }}
                ref={secondaryScrollViewRef}
                showsVerticalScrollIndicator={false}
                contentContainerStyle={{
                  paddingBottom: 40,
                  paddingTop: 0,
                }}
                onScroll={secondaryHandleScrollCb}
                scrollEventThrottle={16}
                onContentSizeChange={handleSecondaryContentSizeChange}
                onLayout={handleSecondaryScrollViewLayout}
                scrollEnabled={scrollEnabled}
              >
                <ChapterViewEnhanced
                  verses={secondaryVerses}
                  bookName={secondaryLocation.bookName}
                  chapterNumber={secondaryLocation.chapter}
                  bookId={secondaryLocation.bookId}
                  showVerseNumbers
                  fontSize={fontSize}
                  onVersePress={secondaryOnVersePress}
                  onVerseLayout={handleSecondaryVerseLayout}
                  highlightVerse={getHighlightVerse(false)}
                  highlightedVerses={new Set(secondaryHighlightedVerses)}
                  bookmarkedVerses={secondaryBookmarkedVerses}
                  isFullScreen={isFullScreen}
                  displayVersion={secondaryDisplay}
                  colors={colors}
                  bgImageIndex={bgHook.effectiveIndex}
                  bgTextureOpacity={bgHook.effectiveOpacity}
                  noBackground={bgHook.hasSource}
                />
              </ScrollView>
            )}
          </View>
        </View>
      );
    }
  }, [
    showMultiVersion,
    effectiveLayout,
    renderPrimaryContent,
    secondaryLoading,
    secondaryVerses,
    secondaryLocation,
    secondaryDisplay,
    secondaryScrollViewRef,
    secondaryHandleScrollCb,
    handleSecondaryContentSizeChange,
    handleSecondaryScrollViewLayout,
    fontSize,
    secondaryOnVersePress,
    getHighlightVerse,
    secondaryHighlightedVerses,
    secondaryBookmarkedVerses,
    isFullScreen,
    colors,
    bgHook.effectiveIndex,
    bgHook.effectiveOpacity,
    bgHook.hasSource,
    primaryHeaderRef,
    setPrimaryHeaderX,
    setPrimaryHeaderY,
    setPrimaryHeaderWidth,
    setPrimaryHeaderHeight,
    versionHeaderPaddingVertical,
    openPrimaryNavigation,
    primaryDisplayBookName,
    primaryLocation,
    openPrimaryVersionSelector,
    primaryDisplay,
    secondaryHeaderRef,
    setSecondaryHeaderX,
    setSecondaryHeaderY,
    setSecondaryHeaderWidth,
    setSecondaryHeaderHeight,
    openSecondaryNavigation,
    secondaryDisplayBookName,
    openSecondaryVersionSelector,
    scrollEnabled,
    headerBgColor,
    headerTextColor,
    headerButtonBg,
  ]);

  return (
    <BackgroundTexture
      source={bgHook.source}
      hasBg={bgHook.hasSource}
      overlayStyle={bgHook.overlayStyle}
      overlayKey={bgHook.overlayKey}
      resizeMode="repeat"
      style={{
        flex: 1,
        marginBottom: 0,
        borderBottomLeftRadius: 20,
        borderBottomRightRadius: 20,
        overflow: "hidden",
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 4,
        elevation: hasNoBgTexture? 0: 5,
      }}
    >
      {innerContent}
    </BackgroundTexture>
  );
};
