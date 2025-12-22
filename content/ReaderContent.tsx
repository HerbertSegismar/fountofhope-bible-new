import React, {
  useCallback,
  useMemo,
  useState,
  useEffect,
  useRef,
  memo,
} from "react";
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  LayoutChangeEvent,
  Animated,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
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
  goToPrimaryPreviousChapter: () => void;
  goToPrimaryNextChapter: () => void;
  goToSecondaryPreviousChapter: () => void;
  goToSecondaryNextChapter: () => void;
  primaryMaxChapter: number;
  secondaryMaxChapter: number;
  isLinked: boolean;
  buttonOpacity: Animated.Value;
  resetButtonOpacity: () => void;
  setUiMode: (value: number) => void;
}

const PrimaryHeader = memo(
  ({
    ref,
    onLayout,
    setX,
    setY,
    setWidth,
    setHeight,
    bookName,
    chapter,
    version,
    openNavigation,
    openVersionSelector,
    paddingVertical,
    headerBgColor,
    headerTextColor,
    headerButtonBg,
    colors,
    isFullScreen,
  }: {
    ref: React.RefObject<View | null>;
    onLayout: (event: any) => void;
    setX: (x: number) => void;
    setY: (y: number) => void;
    setWidth: (width: number) => void;
    setHeight: (height: number) => void;
    bookName: string;
    chapter: number;
    version: string;
    openNavigation: () => void;
    openVersionSelector: () => void;
    paddingVertical: number;
    headerBgColor: string;
    headerTextColor: string;
    headerButtonBg: string;
    colors: any;
    isFullScreen: boolean;
  }) => (
    <View
      ref={ref}
      onLayout={(event) => {
        onLayout(event);
        ref.current?.measureInWindow((x, y, w, h) => {
          setX(x);
          setY(y);
          setWidth(w);
          setHeight(h);
        });
      }}
      style={{
        backgroundColor: headerBgColor,
        paddingVertical,
        paddingHorizontal: 16,
        borderBottomWidth: 1,
        borderBottomColor: colors.border?.default,
        flexDirection: "row",
        gap: isFullScreen ? 10 : 5,
      }}
    >
      <TouchableOpacity
        onPress={openNavigation}
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
            fontSize: isFullScreen ? 16 : 14,
          }}
          numberOfLines={1}
        >
          {`${bookName} ${chapter}`}
        </Text>
      </TouchableOpacity>
      <TouchableOpacity
        onPress={openVersionSelector}
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
            fontSize: isFullScreen ? 16 : 14,
          }}
          numberOfLines={1}
        >
          {version}
        </Text>
      </TouchableOpacity>
    </View>
  )
);

const ChevronButtons = memo(
  ({
    isLandscape,
    showMultiVersion,
    isLinked,
    primaryChapter,
    secondaryChapter,
    primaryMaxChapter,
    secondaryMaxChapter,
    goToPrimaryPreviousChapter,
    goToPrimaryNextChapter,
    goToSecondaryPreviousChapter,
    goToSecondaryNextChapter,
    colors,
  }: {
    isLandscape: boolean;
    showMultiVersion: boolean;
    isLinked: boolean;
    primaryChapter: number;
    secondaryChapter: number;
    primaryMaxChapter: number;
    secondaryMaxChapter: number;
    goToPrimaryPreviousChapter: () => void;
    goToPrimaryNextChapter: () => void;
    goToSecondaryPreviousChapter: () => void;
    goToSecondaryNextChapter: () => void;
    colors: any;
  }) => {
    const pairGap = isLandscape ? 200 : 48;
    const buttonSize = 35;
    const iconSize = 24;
    if (!showMultiVersion || isLinked) {
      return (
        <>
          <TouchableOpacity
            onPress={goToPrimaryPreviousChapter}
            disabled={primaryChapter <= 1}
            style={{
              width: buttonSize,
              height: buttonSize,
              backgroundColor: colors.primary,
              borderRadius: "100%",
              justifyContent: "center",
              alignItems: "center",
              marginLeft: 28,
              opacity: primaryChapter <= 1 ? 0.3 : 1,
            }}
          >
            <Ionicons name="chevron-back" size={iconSize} color="white" />
          </TouchableOpacity>
          <View style={{ flex: 1, alignItems: "center" }} />
          <TouchableOpacity
            onPress={goToPrimaryNextChapter}
            style={{
              width: buttonSize,
              height: buttonSize,
              backgroundColor: colors.primary,
              borderRadius: "100%",
              justifyContent: "center",
              alignItems: "center",
              marginRight: 28,
            }}
          >
            <Ionicons name="chevron-forward" size={iconSize} color="white" />
          </TouchableOpacity>
        </>
      );
    } else {
      const primaryPrevDisabled = primaryChapter <= 1;
      const secondaryPrevDisabled = secondaryChapter <= 1;
      const primaryNextDisabled = primaryChapter >= primaryMaxChapter;
      const secondaryNextDisabled = secondaryChapter >= secondaryMaxChapter;
      return (
        <View
          style={{
            flex: 1,
            flexDirection: "row",
            justifyContent: "space-between",
            alignItems: "center",
          }}
        >
          <View
            style={{ flexDirection: "row", gap: pairGap, alignItems: "center" }}
          >
            <TouchableOpacity
              onPress={goToPrimaryPreviousChapter}
              disabled={primaryPrevDisabled}
              style={{
                width: buttonSize,
                height: buttonSize,
                backgroundColor: colors.primary,
                borderRadius: "100%",
                justifyContent: "center",
                alignItems: "center",
                opacity: primaryPrevDisabled ? 0.3 : 1,
              }}
            >
              <Ionicons name="chevron-back" size={iconSize} color="white" />
            </TouchableOpacity>
            <TouchableOpacity
              onPress={goToPrimaryNextChapter}
              disabled={primaryNextDisabled}
              style={{
                width: buttonSize,
                height: buttonSize,
                backgroundColor: colors.primary,
                borderRadius: "100%",
                justifyContent: "center",
                alignItems: "center",
                opacity: primaryNextDisabled ? 0.3 : 1,
              }}
            >
              <Ionicons name="chevron-forward" size={iconSize} color="white" />
            </TouchableOpacity>
          </View>
          <View
            style={{ flexDirection: "row", gap: pairGap, alignItems: "center" }}
          >
            <TouchableOpacity
              onPress={goToSecondaryPreviousChapter}
              disabled={secondaryPrevDisabled}
              style={{
                width: buttonSize,
                height: buttonSize,
                backgroundColor: colors.primary,
                borderRadius: "100%",
                justifyContent: "center",
                alignItems: "center",
                opacity: secondaryPrevDisabled ? 0.3 : 1,
              }}
            >
              <Ionicons name="chevron-back" size={iconSize} color="white" />
            </TouchableOpacity>
            <TouchableOpacity
              onPress={goToSecondaryNextChapter}
              disabled={secondaryNextDisabled}
              style={{
                width: buttonSize,
                height: buttonSize,
                backgroundColor: colors.primary,
                borderRadius: "100%",
                justifyContent: "center",
                alignItems: "center",
                opacity: secondaryNextDisabled ? 0.3 : 1,
              }}
            >
              <Ionicons name="chevron-forward" size={iconSize} color="white" />
            </TouchableOpacity>
          </View>
        </View>
      );
    }
  }
);

const ToggleButton = memo(
  ({
    isFullScreen,
    onPress,
    resetButtonOpacity,
    colors,
  }: {
    isFullScreen: boolean;
    onPress: () => void;
    resetButtonOpacity: () => void;
    colors: any;
    isLandscape: boolean;
  }) => {
    const toggleSize = 48;
    return (
      <TouchableOpacity
        onPress={() => {
          onPress();
          resetButtonOpacity();
        }}
        style={{
          width: toggleSize,
          height: toggleSize,
          borderRadius: toggleSize / 2,
          backgroundColor: colors.primary,
          justifyContent: "center",
          alignItems: "center",
        }}
      >
        <Text
          style={{
            color: "white",
            fontSize: isFullScreen ? 32 : 24,
            fontWeight: "bold",
            marginBottom: isFullScreen ? 3 : 0,
          }}
        >
          {isFullScreen ? "▢" : "⛶"}
        </Text>
      </TouchableOpacity>
    );
  }
);

const LoadingView = memo(({ colors }: { colors: any }) => (
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
));

const ErrorView = memo(
  ({ display, colors }: { display: string; colors: any }) => (
    <View
      style={{
        flex: 1,
        justifyContent: "center",
        alignItems: "center",
      }}
    >
      <Text style={{ color: colors.muted, textAlign: "center" }}>
        Unable to load {display} version
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
  )
);

const MemoizedReaderContent = memo(({ ...props }: ReaderContentProps) => {
  const [hasSecondaryFailed, setHasSecondaryFailed] = useState(false);
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);

  const primaryHighlightedSet = useMemo(
    () => new Set(props.primaryHighlightedVerses),
    [props.primaryHighlightedVerses]
  );
  const secondaryHighlightedSet = useMemo(
    () => new Set(props.secondaryHighlightedVerses),
    [props.secondaryHighlightedVerses]
  );

  useEffect(() => {
    setHasSecondaryFailed(false);
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }
  }, [props.secondaryVersion]);

  useEffect(() => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }

    if (!props.secondaryLoading && props.secondaryVerses.length === 0) {
      timeoutRef.current = setTimeout(() => {
        setHasSecondaryFailed(true);
      }, 10000);
    } else {
      setHasSecondaryFailed(false);
    }

    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
        timeoutRef.current = null;
      }
    };
  }, [props.secondaryLoading, props.secondaryVerses.length]);

  const bgHook = useBackgroundTexture({
    opacity: props.bgTextureOpacity,
    index: props.bgImageIndex,
  });
  const hasNoBgTexture = !bgHook.hasSource;
  const headerBgColor = props.colors.primary;
  const headerTextColor = "white";
  const headerButtonBg = "rgba(255,255,255,0.15)";

  const primaryDisplay = props.getVersionDisplayName(props.currentVersion);
  const secondaryDisplay = props.getVersionDisplayName(
    props.secondaryVersion || ""
  );

  const primaryHeaderCallbacksRef = useRef({
    setX: props.setPrimaryHeaderX,
    setY: props.setPrimaryHeaderY,
    setWidth: props.setPrimaryHeaderWidth,
    setHeight: props.setPrimaryHeaderHeight,
  });
  const secondaryHeaderCallbacksRef = useRef({
    setX: props.setSecondaryHeaderX,
    setY: props.setSecondaryHeaderY,
    setWidth: props.setSecondaryHeaderWidth,
    setHeight: props.setSecondaryHeaderHeight,
  });

  useEffect(() => {
    primaryHeaderCallbacksRef.current = {
      setX: props.setPrimaryHeaderX,
      setY: props.setPrimaryHeaderY,
      setWidth: props.setPrimaryHeaderWidth,
      setHeight: props.setPrimaryHeaderHeight,
    };
  }, [
    props.setPrimaryHeaderX,
    props.setPrimaryHeaderY,
    props.setPrimaryHeaderWidth,
    props.setPrimaryHeaderHeight,
  ]);

  useEffect(() => {
    secondaryHeaderCallbacksRef.current = {
      setX: props.setSecondaryHeaderX,
      setY: props.setSecondaryHeaderY,
      setWidth: props.setSecondaryHeaderWidth,
      setHeight: props.setSecondaryHeaderHeight,
    };
  }, [
    props.setSecondaryHeaderX,
    props.setSecondaryHeaderY,
    props.setSecondaryHeaderWidth,
    props.setSecondaryHeaderHeight,
  ]);

  const handlePrimaryHeaderLayout = useCallback((_event: any) => {
    props.primaryHeaderRef.current?.measureInWindow((x, y, w, h) => {
      primaryHeaderCallbacksRef.current.setX(x);
      primaryHeaderCallbacksRef.current.setY(y);
      primaryHeaderCallbacksRef.current.setWidth(w);
      primaryHeaderCallbacksRef.current.setHeight(h);
    });
  }, []);

  const handleSecondaryHeaderLayout = useCallback(() => {
    props.secondaryHeaderRef.current?.measureInWindow((x, y, w, h) => {
      secondaryHeaderCallbacksRef.current.setX(x);
      secondaryHeaderCallbacksRef.current.setY(y);
      secondaryHeaderCallbacksRef.current.setWidth(w);
      secondaryHeaderCallbacksRef.current.setHeight(h);
    });
  }, []);

  const renderPrimaryContent = useCallback(() => {
    if (props.primaryLoading) {
      return <LoadingView colors={props.colors} />;
    }
    if (props.primaryVerses.length === 0) {
      return <ErrorView display={primaryDisplay} colors={props.colors} />;
    }
    return (
      <ScrollView
        style={{ flex: 1 }}
        ref={props.primaryScrollViewRef}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{
          paddingBottom: 40,
          paddingTop: 0,
        }}
        onScroll={props.primaryHandleScroll}
        scrollEventThrottle={16}
        onContentSizeChange={props.handlePrimaryContentSizeChange}
        onLayout={props.primaryProps.handleScrollViewLayout}
        scrollEnabled={props.scrollEnabled}
      >
        <View
          ref={props.primaryProps.chapterContainerRef}
          onLayout={props.primaryProps.handleChapterContainerLayout}
          style={{}}
        >
          <ChapterViewEnhanced
            verses={props.primaryVerses}
            bookName={props.primaryLocation.bookName}
            chapterNumber={props.primaryLocation.chapter}
            bookId={props.primaryLocation.bookId}
            showVerseNumbers
            fontSize={props.fontSize}
            onVersePress={props.primaryOnVersePress}
            onVerseLayout={props.primaryProps.handleVerseLayout}
            highlightVerse={props.getHighlightVerse(true)}
            highlightedVerses={primaryHighlightedSet}
            bookmarkedVerses={props.primaryBookmarkedVerses}
            isFullScreen={props.isFullScreen}
            displayVersion={primaryDisplay}
            colors={props.colors}
            bgImageIndex={bgHook.effectiveIndex}
            bgTextureOpacity={bgHook.effectiveOpacity}
            noBackground={bgHook.hasSource}
          />
        </View>
      </ScrollView>
    );
  }, [
    props.primaryLoading,
    props.primaryVerses.length,
    props.primaryLocation,
    primaryDisplay,
    props.primaryScrollViewRef,
    props.primaryHandleScroll,
    props.handlePrimaryContentSizeChange,
    props.primaryProps,
    props.fontSize,
    props.primaryOnVersePress,
    props.getHighlightVerse,
    primaryHighlightedSet,
    props.primaryBookmarkedVerses,
    props.isFullScreen,
    props.colors,
    bgHook.effectiveIndex,
    bgHook.effectiveOpacity,
    bgHook.hasSource,
    props.scrollEnabled,
  ]);

  const renderSecondaryContent = useMemo(() => {
    const isPostLoadEmpty =
      !props.secondaryLoading && props.secondaryVerses.length === 0;
    if (props.secondaryLoading || (isPostLoadEmpty && !hasSecondaryFailed)) {
      return <LoadingView colors={props.colors} />;
    }
    if (hasSecondaryFailed) {
      return <ErrorView display={secondaryDisplay} colors={props.colors} />;
    }
    return (
      <ScrollView
        style={{ flex: 1 }}
        ref={props.secondaryScrollViewRef}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{
          paddingBottom: 40,
          paddingTop: 0,
        }}
        onScroll={props.secondaryHandleScrollCb}
        scrollEventThrottle={16}
        onContentSizeChange={props.handleSecondaryContentSizeChange}
        onLayout={props.handleSecondaryScrollViewLayout}
        scrollEnabled={props.scrollEnabled}
      >
        <ChapterViewEnhanced
          verses={props.secondaryVerses}
          bookName={props.secondaryLocation.bookName}
          chapterNumber={props.secondaryLocation.chapter}
          bookId={props.secondaryLocation.bookId}
          showVerseNumbers
          fontSize={props.fontSize}
          onVersePress={props.secondaryOnVersePress}
          onVerseLayout={props.handleSecondaryVerseLayout}
          highlightVerse={props.getHighlightVerse(false)}
          highlightedVerses={secondaryHighlightedSet}
          bookmarkedVerses={props.secondaryBookmarkedVerses}
          isFullScreen={props.isFullScreen}
          displayVersion={secondaryDisplay}
          colors={props.colors}
          bgImageIndex={bgHook.effectiveIndex}
          bgTextureOpacity={bgHook.effectiveOpacity}
          noBackground={bgHook.hasSource}
        />
      </ScrollView>
    );
  }, [
    props.secondaryLoading,
    hasSecondaryFailed,
    props.secondaryVerses.length,
    props.secondaryLocation,
    secondaryDisplay,
    props.secondaryScrollViewRef,
    props.secondaryHandleScrollCb,
    props.handleSecondaryContentSizeChange,
    props.handleSecondaryScrollViewLayout,
    props.fontSize,
    props.secondaryOnVersePress,
    props.getHighlightVerse,
    secondaryHighlightedSet,
    props.secondaryBookmarkedVerses,
    props.isFullScreen,
    props.colors,
    bgHook.effectiveIndex,
    bgHook.effectiveOpacity,
    bgHook.hasSource,
    props.scrollEnabled,
  ]);

  const togglePress = useCallback(() => {
    props.setUiMode(props.isFullScreen ? 0 : 1);
  }, [props.isFullScreen, props.setUiMode]);

  const innerContent = useMemo(() => {
    if (!props.showMultiVersion) {
      return renderPrimaryContent();
    }

    if (props.effectiveLayout === "horizontal") {
      return (
        <View style={{ flex: 1, flexDirection: "row" }}>
          <View
            style={{
              flex: 1,
              borderRightWidth: 1,
              borderRightColor: props.colors.border?.default,
            }}
          >
            <PrimaryHeader
              ref={props.primaryHeaderRef}
              onLayout={handlePrimaryHeaderLayout}
              setX={primaryHeaderCallbacksRef.current.setX}
              setY={primaryHeaderCallbacksRef.current.setY}
              setWidth={primaryHeaderCallbacksRef.current.setWidth}
              setHeight={primaryHeaderCallbacksRef.current.setHeight}
              bookName={props.primaryDisplayBookName}
              chapter={props.primaryLocation.chapter}
              version={primaryDisplay}
              openNavigation={props.openPrimaryNavigation}
              openVersionSelector={props.openPrimaryVersionSelector}
              paddingVertical={props.versionHeaderPaddingVertical}
              headerBgColor={headerBgColor}
              headerTextColor={headerTextColor}
              headerButtonBg={headerButtonBg}
              colors={props.colors}
              isFullScreen={false}
            />
            {renderPrimaryContent()}
          </View>
          <View style={{ flex: 1 }}>
            <PrimaryHeader
              ref={props.secondaryHeaderRef}
              onLayout={handleSecondaryHeaderLayout}
              setX={secondaryHeaderCallbacksRef.current.setX}
              setY={secondaryHeaderCallbacksRef.current.setY}
              setWidth={secondaryHeaderCallbacksRef.current.setWidth}
              setHeight={secondaryHeaderCallbacksRef.current.setHeight}
              bookName={props.secondaryDisplayBookName}
              chapter={props.secondaryLocation.chapter}
              version={secondaryDisplay}
              openNavigation={props.openSecondaryNavigation}
              openVersionSelector={props.openSecondaryVersionSelector}
              paddingVertical={props.versionHeaderPaddingVertical}
              headerBgColor={headerBgColor}
              headerTextColor={headerTextColor}
              headerButtonBg={headerButtonBg}
              colors={props.colors}
              isFullScreen={false}
            />
            {renderSecondaryContent}
          </View>
        </View>
      );
    } else {
      return (
        <View style={{ flex: 1, flexDirection: "column" }}>
          <View style={{ flex: 1 }}>
            {props.isFullScreen && (
              <PrimaryHeader
                ref={props.primaryHeaderRef}
                onLayout={handlePrimaryHeaderLayout}
                setX={primaryHeaderCallbacksRef.current.setX}
                setY={primaryHeaderCallbacksRef.current.setY}
                setWidth={primaryHeaderCallbacksRef.current.setWidth}
                setHeight={primaryHeaderCallbacksRef.current.setHeight}
                bookName={props.primaryDisplayBookName}
                chapter={props.primaryLocation.chapter}
                version={primaryDisplay}
                openNavigation={props.openPrimaryNavigation}
                openVersionSelector={props.openPrimaryVersionSelector}
                paddingVertical={props.versionHeaderPaddingVertical}
                headerBgColor={headerBgColor}
                headerTextColor={headerTextColor}
                headerButtonBg={headerButtonBg}
                colors={props.colors}
                isFullScreen={true}
              />
            )}
            {renderPrimaryContent()}
          </View>
          <View
            style={{
              flex: 1,
              borderTopWidth: 1,
              borderTopColor: props.colors.border?.default,
            }}
          >
            <PrimaryHeader
              ref={props.secondaryHeaderRef}
              onLayout={handleSecondaryHeaderLayout}
              setX={secondaryHeaderCallbacksRef.current.setX}
              setY={secondaryHeaderCallbacksRef.current.setY}
              setWidth={secondaryHeaderCallbacksRef.current.setWidth}
              setHeight={secondaryHeaderCallbacksRef.current.setHeight}
              bookName={props.secondaryDisplayBookName}
              chapter={props.secondaryLocation.chapter}
              version={secondaryDisplay}
              openNavigation={props.openSecondaryNavigation}
              openVersionSelector={props.openSecondaryVersionSelector}
              paddingVertical={props.versionHeaderPaddingVertical}
              headerBgColor={headerBgColor}
              headerTextColor={headerTextColor}
              headerButtonBg={headerButtonBg}
              colors={props.colors}
              isFullScreen={true}
            />
            {renderSecondaryContent}
          </View>
        </View>
      );
    }
  }, [
    props.showMultiVersion,
    props.effectiveLayout,
    renderPrimaryContent,
    renderSecondaryContent,
    props.isFullScreen,
    props.primaryDisplayBookName,
    props.primaryLocation.chapter,
    primaryDisplay,
    props.openPrimaryNavigation,
    props.openPrimaryVersionSelector,
    props.secondaryDisplayBookName,
    props.secondaryLocation.chapter,
    secondaryDisplay,
    props.openSecondaryNavigation,
    props.openSecondaryVersionSelector,
    props.versionHeaderPaddingVertical,
    headerBgColor,
    headerTextColor,
    headerButtonBg,
    props.colors,
    handlePrimaryHeaderLayout,
    handleSecondaryHeaderLayout,
  ]);

  const chevronBottom = 20;
  const toggleBottom = 22;
  const toggleSize = 48;

  return (
    <View style={{ flex: 1, position: "relative" }}>
      <BackgroundTexture
        source={bgHook.source}
        hasBg={bgHook.hasSource}
        overlayStyle={bgHook.overlayStyle}
        overlayKey={bgHook.overlayKey}
        style={{
          flex: 1,
          marginBottom: 5,
          borderBottomLeftRadius: 20,
          borderBottomRightRadius: 20,
          overflow: "hidden",
          shadowColor: "#000",
          shadowOffset: { width: 0, height: 4 },
          shadowOpacity: 0.3,
          shadowRadius: 4,
          elevation: hasNoBgTexture ? 0 : 5,
        }}
      >
        {innerContent}
      </BackgroundTexture>
      <Animated.View
        style={{
          position: "absolute",
          bottom: 0,
          left: 0,
          right: 0,
          height: 80,
          opacity: props.buttonOpacity,
        }}
      >
        <View
          style={{
            position: "absolute",
            bottom: chevronBottom,
            left: 0,
            right: 0,
            height: 20,
            flexDirection: "row",
            justifyContent: "space-between",
            alignItems: "center",
            paddingHorizontal: 16,
          }}
        >
          <ChevronButtons
            isLandscape={props.isLandscape}
            showMultiVersion={props.showMultiVersion}
            isLinked={props.isLinked}
            primaryChapter={props.primaryLocation.chapter}
            secondaryChapter={props.secondaryLocation.chapter}
            primaryMaxChapter={props.primaryMaxChapter}
            secondaryMaxChapter={props.secondaryMaxChapter}
            goToPrimaryPreviousChapter={props.goToPrimaryPreviousChapter}
            goToPrimaryNextChapter={props.goToPrimaryNextChapter}
            goToSecondaryPreviousChapter={props.goToSecondaryPreviousChapter}
            goToSecondaryNextChapter={props.goToSecondaryNextChapter}
            colors={props.colors}
          />
        </View>
        <View
          style={{
            position: "absolute",
            bottom: toggleBottom,
            left: "50%",
            marginLeft: -toggleSize / 2,
            alignItems: "center",
            justifyContent: "center",
            height: 20,
          }}
        >
          <ToggleButton
            isFullScreen={props.isFullScreen}
            onPress={togglePress}
            resetButtonOpacity={props.resetButtonOpacity}
            colors={props.colors}
            isLandscape={props.isLandscape}
          />
        </View>
      </Animated.View>
    </View>
  );
});

export const ReaderContent = MemoizedReaderContent;
