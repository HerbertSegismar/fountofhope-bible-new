// context/BibleDatabaseContext.tsx
import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  ReactNode,
} from "react";
import { BibleDatabase, Verse } from "../services/BibleDatabase";

interface SearchOptions {
  limit?: number;
  bookNumber?: number;
  chapter?: number;
}

interface BibleDatabaseContextType {
  bibleDB: BibleDatabase | null;
  currentVersion: string;
  availableVersions: string[];
  switchVersion: (newVersion: string) => Promise<void>;
  isInitializing: boolean;
  refreshDatabase: () => Promise<void>;
  searchVerses: (query: string, options?: SearchOptions) => Promise<Verse[]>;
}

const BibleDatabaseContext = createContext<
  BibleDatabaseContextType | undefined
>(undefined);

interface BibleDatabaseProviderProps {
  children: ReactNode;
}

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
  ];

  // Initialize DB
  const initializeDatabase = useCallback(async (version: string) => {
    setIsInitializing(true);
    try {
      const db = new BibleDatabase(version);
      await db.init();
      setBibleDB(db);
      console.log(`Database initialized with version: ${version}`);
    } catch (error) {
      console.error("Failed to initialize database:", error);
      setBibleDB(null);
      throw error;
    } finally {
      setIsInitializing(false);
    }
  }, []);


  // Auto-initialize on mount or when version changes
  useEffect(() => {
    initializeDatabase(currentVersion);
  }, []);

  // Switch DB version
  const switchVersion = useCallback(
    async (newVersion: string) => {
      if (newVersion === currentVersion) return;

      setIsInitializing(true);
      try {
        if (bibleDB) await bibleDB.close();
        await initializeDatabase(newVersion);
        setCurrentVersion(newVersion); // ✅ move here
      } catch (error) {
        console.error("Failed to switch version:", error);
        // re-init old version if needed
        await initializeDatabase(currentVersion);
        throw error;
      } finally {
        setIsInitializing(false);
      }
    },
    [bibleDB, currentVersion, initializeDatabase]
  );


  // Refresh DB
  const refreshDatabase = useCallback(async () => {
    await initializeDatabase(currentVersion);
  }, [currentVersion, initializeDatabase]);

  // Search helper
  const searchVerses = useCallback(
    async (query: string, options?: SearchOptions) => {
      if (!bibleDB) return [];
      return bibleDB.searchVerses(query, options);
    },
    [bibleDB]
  );

  const value: BibleDatabaseContextType = {
    bibleDB,
    currentVersion,
    availableVersions,
    switchVersion,
    isInitializing,
    refreshDatabase,
    searchVerses,
  };

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
