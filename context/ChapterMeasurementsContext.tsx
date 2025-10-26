import React, {
  createContext,
  useContext,
  useState,
  ReactNode,
  useEffect,
  useCallback,
} from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";

interface ChapterMeasurement {
  y: number;
  height: number;
  timestamp: number;
  fontSize: number;
}

interface VersionMeasurements {
  [bookId: string]: {
    [chapter: number]: ChapterMeasurement;
  };
}

interface ChapterMeasurementsContextType {
  measurements: {
    [version: string]: VersionMeasurements;
  };
  stats: {
    totalStored: number;
    cacheHits: number;
    cacheMisses: number;
  };
  storeChapterMeasurement: (
    version: string,
    bookId: number,
    chapter: number,
    measurement: Omit<ChapterMeasurement, "timestamp">
  ) => void;
  getChapterMeasurement: (
    version: string,
    bookId: number,
    chapter: number,
    currentFontSize?: number
  ) => ChapterMeasurement | undefined;
  clearVersionMeasurements: (version: string) => void;
  clearAllMeasurements: () => void;
  getStats: () => {
    total: number;
    hits: number;
    misses: number;
    hitRate: number;
  };
}

const ChapterMeasurementsContext = createContext<
  ChapterMeasurementsContextType | undefined
>(undefined);

const STORAGE_KEY = "@chapter_measurements";

const MEASUREMENT_EXPIRY = 7 * 24 * 60 * 60 * 1000;

export const ChapterMeasurementsProvider: React.FC<{ children: ReactNode }> = ({
  children,
}) => {
  const [measurements, setMeasurements] = useState<{
    [version: string]: VersionMeasurements;
  }>({});
  const [stats, setStats] = useState({
    totalStored: 0,
    cacheHits: 0,
    cacheMisses: 0,
  });
  const [isLoaded, setIsLoaded] = useState(false);

  const saveMeasurementsToStorage = useCallback(() => {
    if (!isLoaded) return;
    const timer = setTimeout(async () => {
      try {
        const dataToStore = {
          measurements,
          stats,
          lastUpdated: Date.now(),
        };
        await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(dataToStore));
      } catch (error) {
        console.error("Failed to save measurements to storage:", error);
      }
    }, 1000);
    return () => clearTimeout(timer);
  }, [measurements, stats, isLoaded]);

  useEffect(() => {
    return saveMeasurementsToStorage();
  }, [saveMeasurementsToStorage]);

  const storeChapterMeasurement = useCallback(
    (
      version: string,
      bookId: number,
      chapter: number,
      measurement: Omit<ChapterMeasurement, "timestamp">
    ) => {
      setMeasurements((prev) => {
        const newMeasurements = {
          ...prev,
          [version]: {
            ...prev[version],
            [bookId]: {
              ...prev[version]?.[bookId],
              [chapter]: {
                ...measurement,
                timestamp: Date.now(),
              },
            },
          },
        };

        const isNewMeasurement = !prev[version]?.[bookId]?.[chapter];
        setStats((prevStats) => ({
          ...prevStats,
          totalStored: isNewMeasurement
            ? prevStats.totalStored + 1
            : prevStats.totalStored,
        }));

        return newMeasurements;
      });
    },
    []
  );

  const getChapterMeasurement = useCallback(
    (
      version: string,
      bookId: number,
      chapter: number,
      currentFontSize?: number
    ): ChapterMeasurement | undefined => {
      const measurement = measurements[version]?.[bookId]?.[chapter];

      if (measurement) {
        if (Date.now() - measurement.timestamp > MEASUREMENT_EXPIRY) {
          setStats((prev) => ({ ...prev, cacheMisses: prev.cacheMisses + 1 }));
          return undefined;
        }

        if (
          currentFontSize &&
          Math.abs(measurement.fontSize - currentFontSize) > 2
        ) {
          console.log(
            `Font size changed from ${measurement.fontSize} to ${currentFontSize}, measurement discarded`
          );
          setStats((prev) => ({ ...prev, cacheMisses: prev.cacheMisses + 1 }));
          return undefined;
        }

        setStats((prev) => ({ ...prev, cacheHits: prev.cacheHits + 1 }));
        return measurement;
      }

      setStats((prev) => ({ ...prev, cacheMisses: prev.cacheMisses + 1 }));
      return undefined;
    },
    [measurements]
  );

  const clearVersionMeasurements = useCallback((version: string) => {
    setMeasurements((prev) => {
      const newMeasurements = { ...prev };
      delete newMeasurements[version];
      let total = 0;
      Object.values(newMeasurements).forEach((versionData) => {
        Object.values(versionData).forEach((book) => {
          total += Object.keys(book).length;
        });
      });
      setStats((prev) => ({ ...prev, totalStored: total }));
      return newMeasurements;
    });
  }, []);

  const clearAllMeasurements = useCallback(() => {
    setMeasurements({});
    setStats({ totalStored: 0, cacheHits: 0, cacheMisses: 0 });
    AsyncStorage.removeItem(STORAGE_KEY);
  }, []);

  const getStats = useCallback(() => {
    const totalRequests = stats.cacheHits + stats.cacheMisses;
    const hitRate =
      totalRequests > 0 ? (stats.cacheHits / totalRequests) * 100 : 0;

    return {
      total: stats.totalStored,
      hits: stats.cacheHits,
      misses: stats.cacheMisses,
      hitRate: Math.round(hitRate),
    };
  }, [stats]);

  return (
    <ChapterMeasurementsContext.Provider
      value={{
        measurements,
        stats,
        storeChapterMeasurement,
        getChapterMeasurement,
        clearVersionMeasurements,
        clearAllMeasurements,
        getStats,
      }}
    >
      {children}
    </ChapterMeasurementsContext.Provider>
  );
};

export const useChapterMeasurements = () => {
  const context = useContext(ChapterMeasurementsContext);
  if (context === undefined) {
    throw new Error(
      "useChapterMeasurements must be used within a ChapterMeasurementsProvider"
    );
  }
  return context;
};
