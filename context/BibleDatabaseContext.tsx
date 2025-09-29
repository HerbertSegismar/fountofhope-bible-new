// context/BibleDatabaseContext.tsx
import React, {
  createContext,
  useContext,
  ReactNode,
  useState,
  useEffect,
  useCallback,
} from "react";
import { BibleDatabase } from "../services/BibleDatabase";

interface BibleDatabaseContextType {
  bibleDB: BibleDatabase | null;
  currentVersion: string;
  availableVersions: string[];
  switchVersion: (newVersion: string) => Promise<void>;
  isInitializing: boolean;
}

const BibleDatabaseContext = createContext<BibleDatabaseContextType | null>(
  null
);

export const useBibleDB = () => {
  const context = useContext(BibleDatabaseContext);
  if (!context) {
    throw new Error("useBibleDB must be used within a BibleDatabaseProvider");
  }
  return context;
};

interface BibleDatabaseProviderProps {
  children: ReactNode;
}

export const BibleDatabaseProvider: React.FC<BibleDatabaseProviderProps> = ({
  children,
}) => {
  const [bibleDB, setBibleDB] = useState<BibleDatabase | null>(null);
  const [currentVersion, setCurrentVersion] = useState("csb17.sqlite3");
  const [isInitializing, setIsInitializing] = useState(true);

  const availableVersions = ["niv11.sqlite3", "csb17.sqlite3"];

  // Initialize database on app start
  useEffect(() => {
    const initDatabase = async () => {
      setIsInitializing(true);
      try {
        console.log(`Initializing database: ${currentVersion}`);
        const db = new BibleDatabase(currentVersion);
        await db.init();
        setBibleDB(db);
        console.log(`Database ${currentVersion} initialized successfully`);
      } catch (error) {
        console.error("Failed to initialize database:", error);
        // Fallback to default version if initialization fails
        if (currentVersion !== "niv11.sqlite3") {
          console.log("Falling back to NIV version");
          const fallbackDB = new BibleDatabase("niv11.sqlite3");
          await fallbackDB.init();
          setBibleDB(fallbackDB);
          setCurrentVersion("niv11.sqlite3");
        }
      } finally {
        setIsInitializing(false);
      }
    };

    initDatabase();
  }, []);

  const switchVersion = useCallback(
    async (newVersion: string) => {
      if (newVersion === currentVersion) return;

      setIsInitializing(true);
      try {
        console.log(`Switching from ${currentVersion} to ${newVersion}`);

        // Close current database if it exists
        if (bibleDB) {
          await bibleDB.close();
        }

        // Initialize new database
        const newDB = new BibleDatabase(newVersion);
        await newDB.init();

        setBibleDB(newDB);
        setCurrentVersion(newVersion);
        console.log(`Successfully switched to ${newVersion}`);
      } catch (error) {
        console.error("Failed to switch version:", error);

        // Try to reinitialize the current version if switch fails
        if (bibleDB) {
          const currentDB = new BibleDatabase(currentVersion);
          await currentDB.init();
          setBibleDB(currentDB);
        }

        throw error;
      } finally {
        setIsInitializing(false);
      }
    },
    [bibleDB, currentVersion]
  );

  const value: BibleDatabaseContextType = {
    bibleDB,
    currentVersion,
    availableVersions,
    switchVersion,
    isInitializing,
  };

  return (
    <BibleDatabaseContext.Provider value={value}>
      {children}
    </BibleDatabaseContext.Provider>
  );
};
