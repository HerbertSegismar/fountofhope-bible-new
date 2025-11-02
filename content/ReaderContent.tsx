import React from "react";
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
}) => {
  const renderPrimaryContent = () => {
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
            Unable to load {getVersionDisplayName(currentVersion)} version
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
            displayVersion={getVersionDisplayName(currentVersion)}
            colors={colors}
            bgTextureOpacity={bgTextureOpacity}
          />
        </View>
      </ScrollView>
    );
  };

  if (!showMultiVersion) {
    return renderPrimaryContent();
  }

  const primaryDisplay = getVersionDisplayName(currentVersion);
  const secondaryDisplay = getVersionDisplayName(secondaryVersion || "");

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
              backgroundColor: colors.muted + "40",
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
                backgroundColor: colors.card + "70",
                borderRadius: 4,
              }}
            >
              <Text
                style={{
                  color: colors.primary,
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
                backgroundColor: colors.card + "70",
                borderRadius: 4,
              }}
            >
              <Text
                style={{
                  color: colors.primary,
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
              backgroundColor: colors.muted + "40",
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
                backgroundColor: colors.card + "70",
                borderRadius: 4,
              }}
            >
              <Text
                style={{
                  color: colors.primary,
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
                backgroundColor: colors.card + "70",
                borderRadius: 4,
              }}
            >
              <Text
                style={{
                  color: colors.primary,
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
              <Text style={{ color: colors.muted, marginTop: 8 }}>Loading</Text>
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
                bgTextureOpacity={bgTextureOpacity}
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
                backgroundColor: colors.primary,
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
                  backgroundColor: "rgba(255,255,255,0.15)",
                  borderRadius: 4,
                }}
              >
                <Text
                  style={{
                    color: "white",
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
                  backgroundColor: "rgba(255,255,255,0.15)",
                  borderRadius: 4,
                }}
              >
                <Text
                  style={{
                    color: "white",
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
              backgroundColor: colors.primary,
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
                backgroundColor: "rgba(255,255,255,0.15)",
                borderRadius: 4,
              }}
            >
              <Text
                style={{
                  color: "white",
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
                backgroundColor: "rgba(255,255,255,0.15)",
                borderRadius: 4,
              }}
            >
              <Text
                style={{
                  color: "white",
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
              <Text style={{ color: colors.muted, marginTop: 8 }}>Loading</Text>
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
                bgTextureOpacity={bgTextureOpacity}
              />
            </ScrollView>
          )}
        </View>
      </View>
    );
  }
};
