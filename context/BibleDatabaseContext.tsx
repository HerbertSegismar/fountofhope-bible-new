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
import { Verse, SearchOptions } from "../types";

interface BibleDatabaseContextType {
  bibleDB: BibleDatabase | null;
  currentVersion: string;
  availableVersions: string[];
  switchVersion: (newVersion: string) => Promise<void>;
  isInitializing: boolean;
  initializationError: string | null;
  refreshDatabase: () => Promise<void>;
  searchVerses: (query: string, options?: SearchOptions) => Promise<Verse[]>;
  getDatabase: (version: string) => BibleDatabase | undefined;
  retryInitialization: () => Promise<void>;
}

const BibleDatabaseContext = createContext<
  BibleDatabaseContextType | undefined
>(undefined);

interface BibleDatabaseProviderProps {
  children: ReactNode;
}

const STORAGE_KEY = "selected_bible_version";

// REFACTOR: Shared cache for cross-version queries (e.g., books list—static across DBs)
const sharedQueryCache = new Map<string, any>();

export const BibleDatabaseProvider: React.FC<BibleDatabaseProviderProps> = ({
  children,
}) => {
  const [bibleDB, setBibleDB] = useState<BibleDatabase | null>(null);
  const [currentVersion, setCurrentVersion] = useState("esv.sqlite3");
  const [isInitializing, setIsInitializing] = useState(false);
  const [initializationError, setInitializationError] = useState<string | null>(
    null
  );

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

  const openDatabases = React.useRef<Map<string, BibleDatabase>>(new Map());

  // Initialize a database version if not already open
  const initializeDatabase = useCallback(async (version: string) => {
    setIsInitializing(true);
    setInitializationError(null);

    try {
      console.log(`Initializing database: ${version}`);

      if (openDatabases.current.has(version)) {
        const db = openDatabases.current.get(version)!;
        setBibleDB(db);
        console.log(`Using existing database: ${version}`);
      } else {
        const db = new BibleDatabase(version);

        // Add timeout to prevent hanging indefinitely
        const initPromise = db.init();
        const timeoutPromise = new Promise((_, reject) =>
          setTimeout(
            () =>
              reject(new Error("Database initialization timeout after 30s")),
            30000
          )
        );

        await Promise.race([initPromise, timeoutPromise]);

        openDatabases.current.set(version, db);
        setBibleDB(db);
        // REFACTOR: Consolidated logging (remove from class; use one here)
        console.log(`Database initialized successfully: ${version}`);
      }
    } catch (error) {
      console.error("Failed to initialize database:", error);
      const errorMessage =
        error instanceof Error ? error.message : "Unknown initialization error";
      setInitializationError(errorMessage);
      setBibleDB(null);

      // Clean up failed database
      openDatabases.current.delete(version);
      throw error;
    } finally {
      setIsInitializing(false);
    }
  }, []);

  // Retry initialization
  const retryInitialization = useCallback(async () => {
    await initializeDatabase(currentVersion);
  }, [currentVersion, initializeDatabase]);

  // Load persisted version on mount
  useEffect(() => {
    const loadVersion = async () => {
      try {
        const savedVersion = await AsyncStorage.getItem(STORAGE_KEY);
        const versionToLoad = savedVersion || currentVersion;
        console.log(`Loading version: ${versionToLoad}`);

        await initializeDatabase(versionToLoad);
        setCurrentVersion(versionToLoad);
      } catch (err) {
        console.error("Failed to load persisted version:", err);
        setInitializationError("Failed to load Bible database");
      }
    };

    loadVersion();
  }, [initializeDatabase]);

  const switchVersion = useCallback(
    async (newVersion: string) => {
      if (newVersion === currentVersion || isInitializing) {
        return;
      }

      console.log(`Switching to version: ${newVersion}`);
      setIsInitializing(true);
      setInitializationError(null);

      try {
        await AsyncStorage.setItem(STORAGE_KEY, newVersion);
        await initializeDatabase(newVersion);
        setCurrentVersion(newVersion);
        console.log(`Successfully switched to: ${newVersion}`);
      } catch (err) {
        console.error("Failed to switch version:", err);
        await AsyncStorage.setItem(STORAGE_KEY, currentVersion);
        throw err;
      } finally {
        setIsInitializing(false);
      }
    },
    [currentVersion, isInitializing, initializeDatabase]
  );

  const refreshDatabase = useCallback(async () => {
    await initializeDatabase(currentVersion);
  }, [currentVersion, initializeDatabase]);

  const searchVerses = useCallback(
    async (query: string, options?: SearchOptions) => {
      if (!bibleDB) {
        throw new Error("Bible database not available");
      }
      return await bibleDB.searchVerses(query, options);
    },
    [bibleDB]
  );

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
    initializationError,
    refreshDatabase,
    searchVerses,
    getDatabase,
    retryInitialization,
  };

  React.useEffect(() => {
    return () => {
      openDatabases.current.forEach((db) => db.close());
      sharedQueryCache.clear(); // REFACTOR: Clear shared cache on unmount
    };
  }, []);

  return (
    <BibleDatabaseContext.Provider value={value}>
      {children}
    </BibleDatabaseContext.Provider>
  );
};

export const useBibleDatabase = (): BibleDatabaseContextType => {
  const context = useContext(BibleDatabaseContext);
  if (!context) {
    throw new Error(
      "useBibleDatabase must be used within a BibleDatabaseProvider"
    );
  }
  return context;
};
