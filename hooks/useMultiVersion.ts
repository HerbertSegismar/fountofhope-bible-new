// useMultiVersion Hook
import { useState, useCallback, useRef, useEffect } from "react";
import { Alert, ScrollView } from "react-native";
import { Verse } from "../types";
import { BibleDatabase } from "../services/BibleDatabase";
import { useBibleDatabase } from "../context/BibleDatabaseContext";

export const useMultiVersion = (
  bookId: number,
  chapter: number,
  verses: Verse[]
) => {
  const { currentVersion, availableVersions, switchVersion } =
    useBibleDatabase();
  const [showMultiVersion, setShowMultiVersion] = useState(false);
  const [secondaryVersion, setSecondaryVersion] = useState<string | null>(null);
  const [secondaryVerses, setSecondaryVerses] = useState<Verse[]>([]);
  const [secondaryLoading, setSecondaryLoading] = useState(false);
  const [isSwitchingVersion, setIsSwitchingVersion] = useState(false);
  const [secondaryFailureCount, setSecondaryFailureCount] = useState(0);
  const secondaryDBCache = useRef<Record<string, BibleDatabase>>({});
  const secondaryScrollViewRef = useRef<ScrollView>(null);
  const [secondaryVerseMeasurements, setSecondaryVerseMeasurements] = useState<
    Record<number, number>
  >({});
  const [secondaryContentHeight, setSecondaryContentHeight] = useState(1);

  const toggleMultiVersion = useCallback(async () => {
    setSecondaryFailureCount(0);
    if (!showMultiVersion) {
      if (!secondaryVersion) {
        const otherVersions = availableVersions.filter(
          (v) => v !== currentVersion
        );
        if (otherVersions.length > 0) {
          setSecondaryVersion(otherVersions[0]);
        } else {
          Alert.alert("Info", "No other Bible versions available");
          return;
        }
      }
      setShowMultiVersion(true);
    } else {
      setShowMultiVersion(false);
      setSecondaryVerses([]);
    }
  }, [showMultiVersion, secondaryVersion, availableVersions, currentVersion]);

  const handleSecondaryVersionSelect = useCallback(
    (version: string) => {
      if (version === currentVersion) {
        Alert.alert(
          "Error",
          "Secondary version cannot be the same as primary version"
        );
        return;
      }
      setSecondaryVersion(version);
      setSecondaryFailureCount(0); // Reset failure count on version change
    },
    [currentVersion]
  );

  const loadSecondaryVerses = useCallback(
    async (dbInstance: BibleDatabase, retryCount = 0) => {
      const maxRetries = 5; // Increased from 3 for better resilience
      if (retryCount >= maxRetries)
        throw new Error(`Failed after ${maxRetries} retries`);
      try {
        return await dbInstance.getVerses(bookId, chapter);
      } catch (error) {
        console.error(
          `Secondary load attempt ${retryCount + 1} failed for version ${secondaryVersion}:`,
          error
        );
        if (retryCount < maxRetries - 1) {
          await new Promise((resolve) => setTimeout(resolve, 1000)); // Increased delay
          return loadSecondaryVerses(dbInstance, retryCount + 1);
        }
        throw error;
      }
    },
    [bookId, chapter, secondaryVersion]
  );

  useEffect(() => {
    const loadSecondary = async () => {
      if (!showMultiVersion || !secondaryVersion) return;
      setSecondaryLoading(true);
      try {
        let secondaryChapterVerses: Verse[] = [];
        const dbName = secondaryVersion;
        let dbInstance = secondaryDBCache.current[dbName];
        if (!dbInstance) {
          dbInstance = new BibleDatabase(dbName);
          await dbInstance.init();
          secondaryDBCache.current[dbName] = dbInstance;
        }
        if (secondaryVersion === currentVersion) {
          secondaryChapterVerses = verses;
        } else {
          secondaryChapterVerses = await loadSecondaryVerses(dbInstance!);
        }
        setSecondaryFailureCount(0);
        setSecondaryVerses(secondaryChapterVerses);
      } catch (error) {
        console.error(
          `Failed to load secondary version ${secondaryVersion}:`,
          error
        );
        const newFailureCount = secondaryFailureCount + 1;
        setSecondaryFailureCount(newFailureCount);
        if (newFailureCount >= 5) {
          // Increased threshold
          Alert.alert(
            "Version Load Error",
            `Failed to load ${secondaryVersion}. Trying another version or disabling multi-version.`
          );
          // Fallback: Try next available version
          const otherVersions = availableVersions.filter(
            (v) => v !== currentVersion && v !== secondaryVersion
          );
          if (otherVersions.length > 0) {
            setSecondaryVersion(otherVersions[0]);
            setSecondaryFailureCount(0);
          } else {
            setShowMultiVersion(false);
            setSecondaryVersion(null);
          }
        }
        setSecondaryVerses([]);
      } finally {
        setSecondaryLoading(false);
      }
    };
    loadSecondary();
  }, [
    showMultiVersion,
    secondaryVersion,
    currentVersion,
    bookId,
    chapter,
    loadSecondaryVerses,
    secondaryFailureCount,
    availableVersions,
  ]);

  useEffect(() => {
    if (!showMultiVersion && Object.keys(secondaryDBCache.current).length > 0) {
      Object.values(secondaryDBCache.current).forEach((db) =>
        db.close().catch(console.error)
      );
      secondaryDBCache.current = {};
    }
  }, [showMultiVersion]);

  const handleSecondaryVerseLayout = useCallback(
    (verseNumber: number, event: any) => {
      const { height } = event.nativeEvent.layout;
      if (height > 0) {
        setSecondaryVerseMeasurements((prev) =>
          prev[verseNumber] === height
            ? prev
            : { ...prev, [verseNumber]: height }
        );
      }
    },
    []
  );

  const handleSecondaryContentSizeChange = useCallback(
    (w: number, h: number) => {
      setSecondaryContentHeight(h);
    },
    []
  );

  const handleSecondaryScroll = useCallback((event: any) => {
    // Sync logic will be in useScrollSync
  }, []);

  return {
    showMultiVersion,
    setShowMultiVersion,
    secondaryVersion,
    setSecondaryVersion,
    secondaryVerses,
    secondaryLoading,
    isSwitchingVersion,
    setIsSwitchingVersion,
    secondaryScrollViewRef,
    secondaryVerseMeasurements,
    secondaryContentHeight,
    toggleMultiVersion,
    handleSecondaryVersionSelect,
    handleSecondaryVerseLayout,
    handleSecondaryContentSizeChange,
    handleSecondaryScroll,
  };
};
