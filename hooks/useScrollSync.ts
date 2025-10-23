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
  chapterMeasurements: Record<number, number>,
  secondaryVerses: Verse[],
  secondaryChapterMeasurements: Record<number, number>,
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
  const syncEnabled = useRef(true);

  // Simplified sync function: proportional progress only (accurate for single-chapter views)
  const syncToSecondary = useCallback(() => {
    if (!showMultiVersion || !syncEnabled.current || isSyncing.current) return;
    isSyncing.current = true;

    const primaryOffset = lastPrimaryOffset.current;
    const viewHeight = scrollViewHeight;

    // Validation
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
      // Proportional progress (real-time heights ensure accuracy)
      const maxPrimary = Math.max(contentHeight - viewHeight, 1);
      const maxSecondary = Math.max(secondaryContentHeight - viewHeight, 1);
      const progress = Math.max(0, Math.min(1, primaryOffset / maxPrimary));
      let targetY = progress * maxSecondary;

      // Ensure target is within bounds
      targetY = Math.max(0, Math.min(targetY, maxSecondary));

      if (secondaryScrollViewRef.current && targetY >= 0) {
        console.log("Syncing secondary:", {
          primaryOffset,
          targetY,
          progress: (progress * 100).toFixed(1) + "%",
          maxPrimary,
          maxSecondary,
        });

        secondaryScrollViewRef.current.scrollTo({
          y: targetY,
          animated: false,
        });
      }
    } catch (error) {
      console.error("Error in syncToSecondary:", error);
    } finally {
      // Use requestAnimationFrame to ensure sync completes before next frame
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

    // Validation
    if (
      !primaryScrollViewRef.current ||
      !secondaryScrollViewRef.current ||
      contentHeight <= 0 ||
      secondaryContentHeight <= 0 ||
      viewHeight <= 0 ||
      !verses.length ||
      !secondaryVerses.length
    ) {
      console.warn("Sync to primary skipped: Invalid state");
      isSyncing.current = false;
      return;
    }

    try {
      const maxSecondary = Math.max(secondaryContentHeight - viewHeight, 1);
      const maxPrimary = Math.max(contentHeight - viewHeight, 1);

      const progress = Math.max(0, Math.min(1, secondaryOffset / maxSecondary));
      let targetY = progress * maxPrimary;

      // Ensure target is within bounds
      targetY = Math.max(0, Math.min(targetY, maxPrimary));

      if (primaryScrollViewRef.current && targetY >= 0) {
        console.log("Syncing primary:", {
          secondaryOffset,
          targetY,
          progress: (progress * 100).toFixed(1) + "%",
        });

        primaryScrollViewRef.current.scrollTo({
          y: targetY,
          animated: false,
        });
        scrollY.setValue(targetY);
      }
    } catch (error) {
      console.error("Error in syncToPrimary:", error);
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

  // Scroll handlers: debounced sync (updates only after scrolling stops) with isSyncing guard
  const handleScroll = useCallback(
    (event: NativeSyntheticEvent<NativeScrollEvent>) => {
      const offsetY = event.nativeEvent.contentOffset.y;
      updatePrimaryOffset(offsetY);

      if (isLandscape) {
        const scrollDelta = offsetY - lastScrollYMutableRef.current;
        if (scrollDelta > scrollThreshold && !isFullScreen && offsetY > 100) {
          setIsFullScreen(true);
        }
      }

      // Clear existing timeout
      if (primarySyncTimeout.current) {
        clearTimeout(primarySyncTimeout.current);
      }

      // Debounced sync: only after scrolling stops (150ms delay for smooth feel)
      if (showMultiVersion && syncEnabled.current) {
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

      if (isLandscape) {
        const scrollDelta = offsetY - lastScrollYMutableRef.current;
        if (scrollDelta > scrollThreshold && !isFullScreen && offsetY > 100) {
          setIsFullScreen(true);
        }
      }

      // Clear existing timeout
      if (secondarySyncTimeout.current) {
        clearTimeout(secondarySyncTimeout.current);
      }

      // Debounced sync: only after scrolling stops
      if (showMultiVersion && syncEnabled.current) {
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

  // Scroll listener for end detection
  useEffect(() => {
    const listener = scrollY.addListener(({ value }) => {
      if (value + scrollViewHeight >= contentHeight - 20) {
        setShowEnd(true);
      } else {
        setShowEnd(false);
      }

      if (isLandscape) {
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

  // Initialization: sync when heights are ready
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
        console.log("Initializing sync to secondary:", {
          contentHeight,
          secondaryContentHeight,
        });
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

  // Cleanup
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

  // Function to manually trigger resync
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
