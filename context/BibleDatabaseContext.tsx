// context/BibleDatabaseContext.tsx
import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  ReactNode,
} from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { BibleDatabase } from "../services/BibleDatabase";
import { Verse, SearchOptions } from "../types"; // Import from types

interface BibleDatabaseContextType {
  bibleDB: BibleDatabase | null;
  currentVersion: string;
  availableVersions: string[];
  switchVersion: (newVersion: string) => Promise<void>;
  isInitializing: boolean;
  refreshDatabase: () => Promise<void>;
  searchVerses: (query: string, options?: SearchOptions) => Promise<Verse[]>;
  getDatabase: (version: string) => BibleDatabase | undefined;
}

const BibleDatabaseContext = createContext<
  BibleDatabaseContextType | undefined
>(undefined);

interface BibleDatabaseProviderProps {
  children: ReactNode;
}

const STORAGE_KEY = "selected_bible_version";

export const BibleDatabaseProvider: React.FC<BibleDatabaseProviderProps> = ({
  children,
}) => {
  const [bibleDB, setBibleDB] = useState<BibleDatabase | null>(null);
  const [currentVersion, setCurrentVersion] = useState("esv.sqlite3");
  const [isInitializing, setIsInitializing] = useState(false);

  const availableVersions = [
    "niv11.sqlite3",
    "csb17.sqlite3",
    "ylt.sqlite3",
    "nlt15.sqlite3",
    "nkjv.sqlite3",
    "nasb.sqlite3",
    "logos.sqlite3",
    "kj2.sqlite3",
    "esv.sqlite3",
    "esvgsb.sqlite3",
    "iesvth.sqlite3",
    "rv1895.sqlite3",
    "cebB.sqlite3",
    "hilab82.sqlite3",
    "mbb05.sqlite3",
    "tagab01.sqlite3",
    "tagmb12.sqlite3",
  ];

  // Keep all open databases for lightning-fast switching
  const openDatabases = React.useRef<Map<string, BibleDatabase>>(new Map());

  // Initialize a database version if not already open
  const initializeDatabase = useCallback(async (version: string) => {
    setIsInitializing(true);
    try {
      if (openDatabases.current.has(version)) {
        const db = openDatabases.current.get(version)!;
        setBibleDB(db);
        console.log(`Database already open: ${version}`);
      } else {
        const db = new BibleDatabase(version);
        await db.init();
        openDatabases.current.set(version, db);
        setBibleDB(db);
        console.log(`Database initialized: ${version}`);
      }
    } catch (error) {
      console.error("Failed to initialize database:", error);
      setBibleDB(null);
      throw error;
    } finally {
      setIsInitializing(false);
    }
  }, []);

  // Load persisted version on mount
  useEffect(() => {
    const loadVersion = async () => {
      try {
        const savedVersion = await AsyncStorage.getItem(STORAGE_KEY);
        const versionToLoad = savedVersion || currentVersion;
        if (!openDatabases.current.has(versionToLoad)) {
          await initializeDatabase(versionToLoad);
        } else {
          setBibleDB(openDatabases.current.get(versionToLoad)!);
        }
        setCurrentVersion(versionToLoad);
      } catch (err) {
        console.warn("Failed to load persisted version:", err);
        if (!openDatabases.current.has(currentVersion)) {
          await initializeDatabase(currentVersion);
        } else {
          setBibleDB(openDatabases.current.get(currentVersion)!);
        }
      }
    };
    loadVersion();
  }, []);

  // In BibleDatabaseContext.tsx - Add this method
  const verifyDatabaseReady = useCallback(
    async (version: string): Promise<boolean> => {
      const db = openDatabases.current.get(version);
      if (!db) return false;

      try {
        // Try a simple query to verify the database is actually functional
        await db.getBooks();
        return true;
      } catch (error) {
        console.error(`Database verification failed for ${version}:`, error);
        return false;
      }
    },
    []
  );

  // Update switchVersion to include verification
  const switchVersion = useCallback(
    async (newVersion: string) => {
      if (newVersion === currentVersion || isInitializing) {
        return;
      }

      console.log(`Switching to version: ${newVersion}`);
      setIsInitializing(true);

      try {
        // Save to storage first
        await AsyncStorage.setItem(STORAGE_KEY, newVersion);

        // Then initialize the new database
        await initializeDatabase(newVersion);

        // Verify the database is actually functional
        const isReady = await verifyDatabaseReady(newVersion);
        if (!isReady) {
          throw new Error(`Database ${newVersion} failed verification`);
        }

        // Finally update the current version state
        setCurrentVersion(newVersion);

        console.log(`Successfully switched to: ${newVersion}`);
      } catch (err) {
        console.error("Failed to switch version:", err);

        // Revert to previous version on failure
        await AsyncStorage.setItem(STORAGE_KEY, currentVersion);

        // Re-initialize previous version
        await initializeDatabase(currentVersion);

        throw err;
      } finally {
        setIsInitializing(false);
      }
    },
    [currentVersion, isInitializing, initializeDatabase, verifyDatabaseReady]
  );

  // Refresh current DB
  const refreshDatabase = useCallback(async () => {
    await initializeDatabase(currentVersion);
  }, [currentVersion, initializeDatabase]);

  // Search helper - UPDATED to pass options to bibleDB
  const searchVerses = useCallback(
    async (query: string, options?: SearchOptions) => {
      if (!bibleDB) {
        throw new Error("Bible database not available");
      }
      return await bibleDB.searchVerses(query, options);
    },
    [bibleDB]
  );

  // Get a database if already open
  const getDatabase = useCallback(
    (version: string) => openDatabases.current.get(version),
    []
  );

  const value: BibleDatabaseContextType = {
    bibleDB,
    currentVersion,
    availableVersions,
    switchVersion,
    isInitializing,
    refreshDatabase,
    searchVerses,
    getDatabase,
  };

  React.useEffect(() => {
    return () => {
      openDatabases.current.forEach((db) => db.close());
    };
  }, []);

  return (
    <BibleDatabaseContext.Provider value={value}>
      {children}
    </BibleDatabaseContext.Provider>
  );
};

// Custom hook
export const useBibleDatabase = (): BibleDatabaseContextType => {
  const context = useContext(BibleDatabaseContext);
  if (!context) {
    throw new Error(
      "useBibleDatabase must be used within a BibleDatabaseProvider"
    );
  }
  return context;
};
