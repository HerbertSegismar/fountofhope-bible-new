// context/VerseMeasurementsContext.tsx
import React, {
  createContext,
  useContext,
  useState,
  ReactNode,
  useEffect,
} from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";

interface VerseMeasurement {
  y: number;
  height: number;
  timestamp: number;
  fontSize: number;
}

interface VersionMeasurements {
  [bookId: string]: {
    [chapter: number]: {
      [verse: number]: VerseMeasurement;
    };
  };
}

interface VerseMeasurementsContextType {
  measurements: {
    [version: string]: VersionMeasurements;
  };
  stats: {
    totalStored: number;
    cacheHits: number;
    cacheMisses: number;
  };
  storeVerseMeasurement: (
    version: string,
    bookId: number,
    chapter: number,
    verse: number,
    measurement: Omit<VerseMeasurement, "timestamp">
  ) => void;
  getVerseMeasurement: (
    version: string,
    bookId: number,
    chapter: number,
    verse: number,
    currentFontSize?: number
  ) => VerseMeasurement | undefined;
  clearVersionMeasurements: (version: string) => void;
  clearAllMeasurements: () => void;
  getStats: () => {
    total: number;
    hits: number;
    misses: number;
    hitRate: number;
  };
}

const VerseMeasurementsContext = createContext<
  VerseMeasurementsContextType | undefined
>(undefined);

// AsyncStorage key
const STORAGE_KEY = "@verse_measurements";

export const VerseMeasurementsProvider: React.FC<{ children: ReactNode }> = ({
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

  // Load measurements from AsyncStorage on mount
  useEffect(() => {
    loadMeasurementsFromStorage();
  }, []);

  // Save to AsyncStorage whenever measurements change
  useEffect(() => {
    if (isLoaded) {
      saveMeasurementsToStorage();
    }
  }, [measurements, isLoaded]);

  const loadMeasurementsFromStorage = async () => {
    try {
      const stored = await AsyncStorage.getItem(STORAGE_KEY);
      if (stored) {
        const parsed = JSON.parse(stored);
        setMeasurements(parsed.measurements || {});
        setStats(
          parsed.stats || { totalStored: 0, cacheHits: 0, cacheMisses: 0 }
        );

        // Calculate total stored count
        let total = 0;
        Object.values(parsed.measurements || {}).forEach((version: any) => {
          Object.values(version).forEach((book: any) => {
            Object.values(book).forEach((chapter: any) => {
              total += Object.keys(chapter).length;
            });
          });
        });
        setStats((prev) => ({ ...prev, totalStored: total }));
      }
    } catch (error) {
      console.error("Failed to load measurements from storage:", error);
    } finally {
      setIsLoaded(true);
    }
  };

  const saveMeasurementsToStorage = async () => {
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
  };

  const storeVerseMeasurement = (
    version: string,
    bookId: number,
    chapter: number,
    verse: number,
    measurement: Omit<VerseMeasurement, "timestamp">
  ) => {
    setMeasurements((prev) => {
      const newMeasurements = {
        ...prev,
        [version]: {
          ...prev[version],
          [bookId]: {
            ...prev[version]?.[bookId],
            [chapter]: {
              ...prev[version]?.[bookId]?.[chapter],
              [verse]: {
                ...measurement,
                timestamp: Date.now(),
              },
            },
          },
        },
      };

      // Update stats
      const isNewMeasurement = !prev[version]?.[bookId]?.[chapter]?.[verse];
      setStats((prevStats) => ({
        ...prevStats,
        totalStored: isNewMeasurement
          ? prevStats.totalStored + 1
          : prevStats.totalStored,
      }));

      return newMeasurements;
    });
  };

  const getVerseMeasurement = (
    version: string,
    bookId: number,
    chapter: number,
    verse: number,
    currentFontSize?: number
  ): VerseMeasurement | undefined => {
    const measurement = measurements[version]?.[bookId]?.[chapter]?.[verse];

    if (measurement) {
      // Check if font size has changed significantly (more than 2px)
      if (
        currentFontSize &&
        Math.abs(measurement.fontSize - currentFontSize) > 2
      ) {
        console.log(
          `Font size changed from ${measurement.fontSize} to ${currentFontSize}, measurement may be inaccurate`
        );
        return undefined;
      }

      // Update cache hit stat
      setStats((prev) => ({ ...prev, cacheHits: prev.cacheHits + 1 }));
      return measurement;
    }

    // Update cache miss stat
    setStats((prev) => ({ ...prev, cacheMisses: prev.cacheMisses + 1 }));
    return undefined;
  };

  const clearVersionMeasurements = (version: string) => {
    setMeasurements((prev) => {
      const newMeasurements = { ...prev };
      delete newMeasurements[version];
      return newMeasurements;
    });
  };

  const clearAllMeasurements = () => {
    setMeasurements({});
    setStats({ totalStored: 0, cacheHits: 0, cacheMisses: 0 });
    AsyncStorage.removeItem(STORAGE_KEY);
  };

  const getStats = () => {
    const totalRequests = stats.cacheHits + stats.cacheMisses;
    const hitRate =
      totalRequests > 0 ? (stats.cacheHits / totalRequests) * 100 : 0;

    return {
      total: stats.totalStored,
      hits: stats.cacheHits,
      misses: stats.cacheMisses,
      hitRate: Math.round(hitRate),
    };
  };

  return (
    <VerseMeasurementsContext.Provider
      value={{
        measurements,
        stats,
        storeVerseMeasurement,
        getVerseMeasurement,
        clearVersionMeasurements,
        clearAllMeasurements,
        getStats,
      }}
    >
      {children}
    </VerseMeasurementsContext.Provider>
  );
};

export const useVerseMeasurements = () => {
  const context = useContext(VerseMeasurementsContext);
  if (context === undefined) {
    throw new Error(
      "useVerseMeasurements must be used within a VerseMeasurementsProvider"
    );
  }
  return context;
};
