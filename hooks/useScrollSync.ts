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
  secondaryVerses: Verse[],
  isLandscape: boolean,
  isFullScreen: boolean,
  setIsFullScreen: (full: boolean) => void,
  scrollThreshold: number,
  lastScrollYRef: React.RefObject<number>,
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

  const lastScrollYMutableRef = useRef(lastScrollYRef.current || 0);
  const lastSecondaryScrollYMutableRef = useRef(0);
  const syncEnabled = useRef(true);

  const primaryAnimating = useRef(false);
  const secondaryAnimating = useRef(false);

  const syncToSecondary = useCallback(() => {
    if (!showMultiVersion || !syncEnabled.current || isSyncing.current) return;
    isSyncing.current = true;

    const primaryOffset = lastPrimaryOffset.current;
    const viewHeight = scrollViewHeight;

    if (
      !primaryScrollViewRef.current ||
      !secondaryScrollViewRef.current ||
      contentHeight <= 0 ||
      secondaryContentHeight <= 0 ||
      viewHeight <= 0 ||
      !verses.length ||
      !secondaryVerses.length
    ) {
      console.warn("Sync to secondary skipped: Invalid state", {
        hasPrimaryRef: !!primaryScrollViewRef.current,
        hasSecondaryRef: !!secondaryScrollViewRef.current,
        contentHeight,
        secondaryContentHeight,
        viewHeight,
        versesLength: verses.length,
        secondaryVersesLength: secondaryVerses.length,
      });
      isSyncing.current = false;
      return;
    }

    try {
      const maxPrimary = Math.max(contentHeight - viewHeight, 1);
      const maxSecondary = Math.max(secondaryContentHeight - viewHeight, 1);
      const progress = Math.max(0, Math.min(1, primaryOffset / maxPrimary));
      let targetY = progress * maxSecondary;

      targetY = Math.max(0, Math.min(targetY, maxSecondary));

      secondaryAnimating.current = true;
      if (secondaryScrollViewRef.current && targetY >= 0) {
        secondaryScrollViewRef.current.scrollTo({
          y: targetY,
          animated: true,
        });
      }
      setTimeout(() => {
        secondaryAnimating.current = false;
      }, 300);
    } catch (error) {
      console.error("Error in syncToSecondary:", error);
      secondaryAnimating.current = false;
    } finally {
      requestAnimationFrame(() => {
        isSyncing.current = false;
      });
    }
  }, [
    showMultiVersion,
    scrollViewHeight,
    contentHeight,
    secondaryContentHeight,
    verses,
    secondaryVerses,
    secondaryScrollViewRef,
    primaryScrollViewRef,
  ]);

  const syncToPrimary = useCallback(() => {
    if (!showMultiVersion || !syncEnabled.current || isSyncing.current) return;
    isSyncing.current = true;

    const secondaryOffset = lastSecondaryOffset.current;
    const viewHeight = scrollViewHeight;

    if (
      !primaryScrollViewRef.current ||
      !secondaryScrollViewRef.current ||
      contentHeight <= 0 ||
      secondaryContentHeight <= 0 ||
      viewHeight <= 0 ||
      !verses.length ||
      !secondaryVerses.length
    ) {
      isSyncing.current = false;
      return;
    }

    try {
      const maxSecondary = Math.max(secondaryContentHeight - viewHeight, 1);
      const maxPrimary = Math.max(contentHeight - viewHeight, 1);

      const progress = Math.max(0, Math.min(1, secondaryOffset / maxSecondary));
      let targetY = progress * maxPrimary;

      targetY = Math.max(0, Math.min(targetY, maxPrimary));

      primaryAnimating.current = true;
      if (primaryScrollViewRef.current && targetY >= 0) {
        primaryScrollViewRef.current.scrollTo({
          y: targetY,
          animated: true,
        });
        Animated.timing(scrollY, {
          toValue: targetY,
          duration: 250,
          useNativeDriver: false,
        }).start();
      }
      setTimeout(() => {
        primaryAnimating.current = false;
      }, 300);
    } catch (error) {
      console.error("Error in syncToPrimary:", error);
      primaryAnimating.current = false;
    } finally {
      requestAnimationFrame(() => {
        isSyncing.current = false;
      });
    }
  }, [
    showMultiVersion,
    scrollViewHeight,
    contentHeight,
    secondaryContentHeight,
    verses,
    secondaryVerses,
    scrollY,
    primaryScrollViewRef,
    secondaryScrollViewRef,
  ]);

  const updatePrimaryOffset = useCallback(
    (y: number) => {
      lastPrimaryOffset.current = y;
      scrollY.setValue(y);
      lastScrollYMutableRef.current = y;
    },
    [scrollY]
  );

  const updateSecondaryOffset = useCallback((y: number) => {
    lastSecondaryOffset.current = y;
  }, []);

  const handleScroll = useCallback(
    (event: NativeSyntheticEvent<NativeScrollEvent>) => {
      const offsetY = event.nativeEvent.contentOffset.y;
      updatePrimaryOffset(offsetY);

      if (isLandscape && !primaryAnimating.current) {
        const scrollDelta = offsetY - lastScrollYMutableRef.current;
        if (scrollDelta > scrollThreshold && !isFullScreen && offsetY > 100) {
          setIsFullScreen(true);
        }
      }

      // Always clear previous timeout to debounce
      if (primarySyncTimeout.current) {
        clearTimeout(primarySyncTimeout.current);
      }

      // Schedule sync only if not animating (i.e., user-initiated)
      if (
        showMultiVersion &&
        syncEnabled.current &&
        !primaryAnimating.current
      ) {
        primarySyncTimeout.current = setTimeout(() => {
          if (!isSyncing.current) {
            syncToSecondary();
          }
        }, 150);
      }
    },
    [
      isLandscape,
      scrollThreshold,
      isFullScreen,
      syncToSecondary,
      updatePrimaryOffset,
      setIsFullScreen,
      showMultiVersion,
    ]
  );

  const handleSecondaryScroll = useCallback(
    (event: NativeSyntheticEvent<NativeScrollEvent>) => {
      const offsetY = event.nativeEvent.contentOffset.y;
      updateSecondaryOffset(offsetY);

      if (isLandscape && !secondaryAnimating.current) {
        const scrollDelta = offsetY - lastSecondaryScrollYMutableRef.current;
        if (scrollDelta > scrollThreshold && !isFullScreen && offsetY > 100) {
          setIsFullScreen(true);
        }
        lastSecondaryScrollYMutableRef.current = offsetY;
      }

      // Always clear previous timeout to debounce
      if (secondarySyncTimeout.current) {
        clearTimeout(secondarySyncTimeout.current);
      }

      // Schedule sync only if not animating (i.e., user-initiated)
      if (
        showMultiVersion &&
        syncEnabled.current &&
        !secondaryAnimating.current
      ) {
        secondarySyncTimeout.current = setTimeout(() => {
          if (!isSyncing.current) {
            syncToPrimary();
          }
        }, 150);
      }
    },
    [
      isLandscape,
      scrollThreshold,
      isFullScreen,
      syncToPrimary,
      updateSecondaryOffset,
      setIsFullScreen,
      showMultiVersion,
    ]
  );

  useEffect(() => {
    const listener = scrollY.addListener(({ value }) => {
      if (value + scrollViewHeight >= contentHeight - 20) {
        setShowEnd(true);
      } else {
        setShowEnd(false);
      }

      if (isLandscape && !primaryAnimating.current) {
        const scrollDelta = value - lastScrollYMutableRef.current;
        if (scrollDelta > scrollThreshold && !isFullScreen && value > 100) {
          setIsFullScreen(true);
        }
        lastScrollYMutableRef.current = value;
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
    isFullScreen,
    setIsFullScreen,
  ]);

  useEffect(() => {
    if (
      showMultiVersion &&
      secondaryVerses.length > 0 &&
      verses.length > 0 &&
      contentHeight > scrollViewHeight &&
      secondaryContentHeight > scrollViewHeight &&
      scrollViewHeight > 0
    ) {
      if (!isSyncing.current && syncEnabled.current) {
        syncToSecondary();
      }
    }
  }, [
    showMultiVersion,
    secondaryVerses.length,
    verses.length,
    contentHeight,
    secondaryContentHeight,
    syncToSecondary,
    scrollViewHeight,
  ]);

  useEffect(() => {
    return () => {
      if (primarySyncTimeout.current) {
        clearTimeout(primarySyncTimeout.current);
      }
      if (secondarySyncTimeout.current) {
        clearTimeout(secondarySyncTimeout.current);
      }
      syncEnabled.current = false;
    };
  }, []);

  const forceResync = useCallback(() => {
    if (showMultiVersion) {
      syncToSecondary();
    }
  }, [showMultiVersion, syncToSecondary]);

  return {
    handleScroll,
    handleSecondaryScroll,
    syncToSecondary,
    syncToPrimary,
    updatePrimaryOffset,
    updateSecondaryOffset,
    forceResync,
  };
};
