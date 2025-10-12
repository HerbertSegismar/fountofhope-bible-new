// Updated hooks/useScrollSync.ts
import { useCallback, useRef, useEffect } from "react";
import {
  NativeSyntheticEvent,
  NativeScrollEvent,
  ScrollView,
} from "react-native";
import { Animated } from "react-native";
import { Verse } from "../types";

export const useScrollSync = (
  showMultiVersion: boolean,
  scrollViewHeight: number,
  contentHeight: number,
  secondaryContentHeight: number,
  verses: Verse[],
  verseMeasurements: Record<number, number>,
  secondaryVerses: Verse[],
  secondaryVerseMeasurements: Record<number, number>,
  isLandscape: boolean,
  isFullScreen: boolean,
  setIsFullScreen: (full: boolean) => void,
  scrollThreshold: number,
  lastScrollYRef: React.MutableRefObject<number>,
  scrollY: Animated.Value,
  setShowEnd: (show: boolean) => void,
  primaryScrollViewRef: React.RefObject<ScrollView | null>,
  secondaryScrollViewRef: React.RefObject<ScrollView | null>
) => {
  const isSyncing = useRef(false);
  const lastPrimaryOffset = useRef(0);
  const lastSecondaryOffset = useRef(0);
  const primarySyncTimeout = useRef<NodeJS.Timeout | null>(null);
  const secondarySyncTimeout = useRef<NodeJS.Timeout | null>(null);
  const defaultVerseHeight = 80;

  const syncToSecondary = useCallback(() => {
    if (!showMultiVersion || isSyncing.current) return;
    isSyncing.current = true;
    const primaryOffset = lastPrimaryOffset.current;
    const viewHeight = scrollViewHeight;
    let targetY = 0;
    const maxSecondary = Math.max(secondaryContentHeight - viewHeight, 0);

    let cumulative = 0;
    let verseIndex = -1;
    for (let i = 0; i < verses.length; i++) {
      const verseNum = verses[i].verse;
      const height = verseMeasurements[verseNum] || defaultVerseHeight;
      if (primaryOffset < cumulative + height) {
        verseIndex = i;
        break;
      }
      cumulative += height;
    }

    if (verseIndex !== -1) {
      const startY = cumulative;
      const verseNum = verses[verseIndex].verse;
      const secIndex = secondaryVerses.findIndex((v) => v.verse === verseNum);
      if (secIndex !== -1) {
        let secCumulative = 0;
        for (let j = 0; j < secIndex; j++) {
          secCumulative +=
            secondaryVerseMeasurements[secondaryVerses[j].verse] ||
            defaultVerseHeight;
        }
        targetY = secCumulative - startY + primaryOffset;
      } else {
        const maxPrimary = Math.max(contentHeight - viewHeight, 0);
        const progress = maxPrimary > 0 ? primaryOffset / maxPrimary : 0;
        targetY = progress * maxSecondary;
      }
    } else {
      targetY = maxSecondary;
    }

    targetY = Math.max(0, Math.min(targetY, maxSecondary));
    // Assume secondaryScrollViewRef is passed or global
    secondaryScrollViewRef.current?.scrollTo({ y: targetY, animated: false });
    requestAnimationFrame(() => {
      isSyncing.current = false;
    });
  }, [
    showMultiVersion,
    scrollViewHeight,
    contentHeight,
    secondaryContentHeight,
    verses,
    verseMeasurements,
    secondaryVerses,
    secondaryVerseMeasurements,
  ]);

  const syncToPrimary = useCallback(() => {
    if (!showMultiVersion || isSyncing.current) return;
    isSyncing.current = true;
    const secondaryOffset = lastSecondaryOffset.current;
    const viewHeight = scrollViewHeight;
    let targetY = 0;
    const maxPrimary = Math.max(contentHeight - viewHeight, 0);

    let cumulative = 0;
    let verseIndex = -1;
    for (let i = 0; i < secondaryVerses.length; i++) {
      const verseNum = secondaryVerses[i].verse;
      const height = secondaryVerseMeasurements[verseNum] || defaultVerseHeight;
      if (secondaryOffset < cumulative + height) {
        verseIndex = i;
        break;
      }
      cumulative += height;
    }

    if (verseIndex !== -1) {
      const startY = cumulative;
      const verseNum = secondaryVerses[verseIndex].verse;
      const priIndex = verses.findIndex((v) => v.verse === verseNum);
      if (priIndex !== -1) {
        let priCumulative = 0;
        for (let j = 0; j < priIndex; j++) {
          priCumulative +=
            verseMeasurements[verses[j].verse] || defaultVerseHeight;
        }
        targetY = priCumulative - startY + secondaryOffset;
      } else {
        const maxSecondary = Math.max(secondaryContentHeight - viewHeight, 0);
        const progress = maxSecondary > 0 ? secondaryOffset / maxSecondary : 0;
        targetY = progress * maxPrimary;
      }
    } else {
      targetY = maxPrimary;
    }

    targetY = Math.max(0, Math.min(targetY, maxPrimary));
    primaryScrollViewRef.current?.scrollTo({ y: targetY, animated: false });
    scrollY.setValue(targetY);
    requestAnimationFrame(() => {
      isSyncing.current = false;
    });
  }, [
    showMultiVersion,
    scrollViewHeight,
    contentHeight,
    secondaryContentHeight,
    secondaryVerses,
    secondaryVerseMeasurements,
    verses,
    verseMeasurements,
    scrollY,
  ]);

  const handleScroll = useCallback(
    (event: NativeSyntheticEvent<NativeScrollEvent>) => {
      const offsetY = event.nativeEvent.contentOffset.y;
      scrollY.setValue(offsetY);
      if (isLandscape) {
        const scrollDelta = offsetY - lastScrollYRef.current;
        if (scrollDelta > scrollThreshold && !isFullScreen && offsetY > 100)
          setIsFullScreen(true);
        lastScrollYRef.current = offsetY;
      }
      lastPrimaryOffset.current = offsetY;
      if (primarySyncTimeout.current) clearTimeout(primarySyncTimeout.current);
      primarySyncTimeout.current = setTimeout(syncToSecondary, 150);
    },
    [
      isLandscape,
      scrollThreshold,
      isFullScreen,
      syncToSecondary,
      scrollY,
      setIsFullScreen,
      lastScrollYRef,
    ]
  );

  const handleSecondaryScroll = useCallback(
    (event: NativeSyntheticEvent<NativeScrollEvent>) => {
      const offsetY = event.nativeEvent.contentOffset.y;
      lastSecondaryOffset.current = offsetY;
      if (secondarySyncTimeout.current)
        clearTimeout(secondarySyncTimeout.current);
      secondarySyncTimeout.current = setTimeout(syncToPrimary, 150);
      if (isLandscape) {
        const scrollDelta = offsetY - lastScrollYRef.current;
        if (scrollDelta > scrollThreshold && !isFullScreen && offsetY > 100)
          setIsFullScreen(true);
        lastScrollYRef.current = offsetY;
      }
    },
    [
      isLandscape,
      scrollThreshold,
      isFullScreen,
      syncToPrimary,
      lastScrollYRef,
      setIsFullScreen,
    ]
  );

  useEffect(() => {
    const listener = scrollY.addListener(({ value }) => {
      if (value + scrollViewHeight >= contentHeight - 20) setShowEnd(true);
      else setShowEnd(false);
      if (isLandscape) {
        const scrollDelta = value - lastScrollYRef.current;
        if (scrollDelta > scrollThreshold && !isFullScreen && value > 100) {
          setIsFullScreen(true);
        }
        lastScrollYRef.current = value;
      }
    });
    return () => scrollY.removeListener(listener);
  }, [
    scrollY,
    scrollViewHeight,
    contentHeight,
    setShowEnd,
    isLandscape,
    scrollThreshold,
    lastScrollYRef,
    isFullScreen,
    setIsFullScreen,
  ]);

  useEffect(() => {
    if (showMultiVersion && secondaryVerses.length > 0) {
      const timer = setTimeout(syncToSecondary, 100);
      return () => clearTimeout(timer);
    }
  }, [showMultiVersion, secondaryVerses.length, syncToSecondary]);

  // Late sync for primary when verses load in multi-version mode
  useEffect(() => {
    if (showMultiVersion && verses.length > 0 && secondaryVerses.length > 0) {
      const timer = setTimeout(syncToSecondary, 100);
      return () => clearTimeout(timer);
    }
  }, [
    showMultiVersion,
    verses.length,
    secondaryVerses.length,
    syncToSecondary,
  ]);

  useEffect(() => {
    return () => {
      if (primarySyncTimeout.current) clearTimeout(primarySyncTimeout.current);
      if (secondarySyncTimeout.current)
        clearTimeout(secondarySyncTimeout.current);
    };
  }, []);

  return {
    handleScroll,
    handleSecondaryScroll,
    syncToSecondary,
    syncToPrimary,
  };
};
