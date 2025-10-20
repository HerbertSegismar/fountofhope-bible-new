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
  availableBibleVersions: string[]; // Main Bibles only (no commentary)
  availableCommentaryVersions: string[]; // Commentary databases only
  switchVersion: (newVersion: string) => Promise<void>;
  isInitializing: boolean;
  initializationError: string | null;
  refreshDatabase: () => Promise<void>;
  searchVerses: (query: string, options?: SearchOptions) => Promise<Verse[]>;
  getDatabase: (version: string) => Promise<BibleDatabase | undefined>;
  retryInitialization: () => Promise<void>;
  preloadCurrentCommentary: () => Promise<void>;
  recoverDatabaseConnection: () => Promise<void>;
  // Add method to explicitly close secondary databases
  closeSecondaryDatabases: (keepVersions?: string[]) => Promise<void>;
}

const BibleDatabaseContext = createContext<
  BibleDatabaseContextType | undefined
>(undefined);

interface BibleDatabaseProviderProps {
  children: ReactNode;
}

const STORAGE_KEY = "selected_bible_version";

// Map main Bible versions to their commentary versions
const BIBLE_TO_COMMENTARY_MAP: Record<string, string> = {
  "ampc.sqlite3": "ampccom.sqlite3",
  "niv11.sqlite3": "niv11com.sqlite3",
  "csb17.sqlite3": "csb17com.sqlite3",
  "nlt15.sqlite3": "nlt15com.sqlite3",
  "nkjv.sqlite3": "nkjvcom.sqlite3",
  "esv.sqlite3": "esvcom.sqlite3",
  "esvgsb.sqlite3": "esvgsbcom.sqlite3",
  "rv1895.sqlite3": "rv1895com.sqlite3",
};

export const BibleDatabaseProvider: React.FC<BibleDatabaseProviderProps> = ({
  children,
}) => {
  const [bibleDB, setBibleDB] = useState<BibleDatabase | null>(null);
  const [currentVersion, setCurrentVersion] = useState("esv.sqlite3");
  const [isInitializing, setIsInitializing] = useState(false);
  const [initializationError, setInitializationError] = useState<string | null>(
    null
  );

  // Separate arrays for better organization
  const availableBibleVersions = [
    "ampc.sqlite3",
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

  const availableCommentaryVersions = [
    "ampccom.sqlite3",
    "niv11com.sqlite3",
    "csb17com.sqlite3",
    "nlt15com.sqlite3",
    "nkjvcom.sqlite3",
    "esvcom.sqlite3",
    "esvgsbcom.sqlite3",
    "rv1895com.sqlite3",
  ];

  // Combined list for backward compatibility
  const availableVersions = [
    ...availableBibleVersions,
    ...availableCommentaryVersions,
  ];

  const openDatabases = React.useRef<Map<string, BibleDatabase>>(new Map());
  const pendingInits = React.useRef<Map<string, Promise<BibleDatabase>>>(
    new Map()
  );

  // Initialize a database version if not already open
  const initializeDatabase = useCallback(
    async (
      version: string,
      isPrimary: boolean = false
    ): Promise<BibleDatabase> => {
      if (isPrimary) {
        setIsInitializing(true);
        setInitializationError(null);
      }

      if (openDatabases.current.has(version)) {
        const db = openDatabases.current.get(version)!;
        if (isPrimary) {
          setIsInitializing(false);
        }
        console.log(`Using existing database: ${version}`);
        return db;
      }

      if (pendingInits.current.has(version)) {
        console.log(`Awaiting pending initialization for: ${version}`);
        const db = await pendingInits.current.get(version)!;
        if (isPrimary) {
          setIsInitializing(false);
        }
        return db;
      }

      console.log(`Starting new initialization for: ${version}`);

      const initPromise = (async (): Promise<BibleDatabase> => {
        let db: BibleDatabase | null = null;
        try {
          db = new BibleDatabase(version);

          // Add timeout to prevent hanging indefinitely
          const dbInitPromise = db.init();
          const timeoutPromise = new Promise<BibleDatabase>((_, reject) =>
            setTimeout(
              () =>
                reject(new Error("Database initialization timeout after 30s")),
              30000
            )
          );

          await Promise.race([dbInitPromise, timeoutPromise]);

          openDatabases.current.set(version, db);

          console.log(`Database initialized successfully: ${version}`);
          return db;
        } catch (error) {
          if (db) {
            openDatabases.current.delete(version);
          }
          console.error("Failed to initialize database:", error);
          const errorMessage =
            error instanceof Error
              ? error.message
              : "Unknown initialization error";
          console.error(`Full error details:`, {
            message: errorMessage,
            stack: error instanceof Error ? error.stack : undefined,
            version,
          });

          // Only set error if it's the primary Bible database
          if (isPrimary) {
            setInitializationError(errorMessage);
            setBibleDB(null);
          }

          throw error;
        } finally {
          if (isPrimary) {
            setIsInitializing(false);
          }
          pendingInits.current.delete(version);
        }
      })();

      pendingInits.current.set(version, initPromise);

      return await initPromise;
    },
    []
  );

  // Preload only the commentary for the current main Bible version
  const preloadCurrentCommentary = useCallback(async (version: string) => {
    const commentaryVersion = BIBLE_TO_COMMENTARY_MAP[version];

    if (commentaryVersion) {
      // Skip if already loaded
      if (openDatabases.current.has(commentaryVersion)) {
        console.log(`Commentary already loaded: ${commentaryVersion}`);
        // Still proceed to check dictionary
      } else {
        try {
          console.log(`Preloading commentary: ${commentaryVersion}`);
          const db = new BibleDatabase(commentaryVersion);
          await db.init();
          openDatabases.current.set(commentaryVersion, db);
          console.log(
            `Successfully preloaded commentary: ${commentaryVersion}`
          );
        } catch (error) {
          console.warn(
            `Failed to preload commentary ${commentaryVersion}:`,
            error
          );
          // Don't throw - commentary databases are optional
        }
      }
    } else {
      console.log(`No commentary available for ${version}`);
    }

    if (version === "nasb.sqlite3") {
      const dictionaryVersion = "secedictionary.sqlite3";
      if (!openDatabases.current.has(dictionaryVersion)) {
        try {
          console.log(`Preloading dictionary: ${dictionaryVersion}`);
          const db = new BibleDatabase(dictionaryVersion);

          // Add timeout for dictionary loading
          const initPromise = db.init();
          const timeoutPromise = new Promise((_, reject) =>
            setTimeout(
              () => reject(new Error("Dictionary loading timeout after 30s")),
              30000
            )
          );

          await Promise.race([initPromise, timeoutPromise]);
          openDatabases.current.set(dictionaryVersion, db);
          console.log(
            `Successfully preloaded dictionary: ${dictionaryVersion}`
          );
        } catch (error) {
          console.warn(
            `Failed to preload dictionary ${dictionaryVersion}:`,
            error
          );
          // Don't throw - dictionary databases are optional
        }
      }
    }
  }, []);

  // Public wrapper for preloadCurrentCommentary that uses currentVersion
  const preloadCurrentCommentaryPublic = useCallback(async () => {
    await preloadCurrentCommentary(currentVersion);
  }, [currentVersion, preloadCurrentCommentary]);

  // Retry initialization
  const retryInitialization = useCallback(async () => {
    const db = await initializeDatabase(currentVersion, true);
    setBibleDB(db);
  }, [currentVersion, initializeDatabase]);

  // NEW: Close secondary databases (commentaries and dictionaries) except those to keep
  const closeSecondaryDatabases = useCallback(
    async (keepVersions: string[] = []) => {
      const versionsToClose: string[] = [];

      openDatabases.current.forEach((db, version) => {
        // Don't close the current main Bible version
        if (version === currentVersion) return;

        // Don't close versions in the keep list
        if (keepVersions.includes(version)) return;

        // Close secondary databases (commentaries and dictionaries)
        if (version.includes("com") || version.includes("dictionary")) {
          versionsToClose.push(version);
        }
      });

      for (const version of versionsToClose) {
        try {
          const db = openDatabases.current.get(version);
          if (db) {
            await db.close();
            openDatabases.current.delete(version);
            console.log(`Closed secondary database: ${version}`);
          }
        } catch (error) {
          console.warn(`Error closing secondary database ${version}:`, error);
        }
      }
    },
    [currentVersion]
  );

  // Load persisted version on mount and preload current commentary
  useEffect(() => {
    const loadVersion = async () => {
      try {
        const savedVersion = await AsyncStorage.getItem(STORAGE_KEY);
        const versionToLoad = savedVersion || currentVersion;
        console.log(`Loading version: ${versionToLoad}`);

        const db = await initializeDatabase(versionToLoad, true);
        setCurrentVersion(versionToLoad);
        setBibleDB(db);

        // Preload current commentary in background
        if (versionToLoad === "nasb.sqlite3") {
          // Immediate preload for NASB to ensure dictionary is loaded without delay
          await preloadCurrentCommentary(versionToLoad);
        } else {
          setTimeout(() => {
            preloadCurrentCommentary(versionToLoad);
          }, 1000);
        }
      } catch (err) {
        console.error("Failed to load persisted version:", err);
        setInitializationError("Failed to load Bible database");
      }
    };

    loadVersion();
  }, [initializeDatabase, preloadCurrentCommentary]);

  const switchVersion = useCallback(
    async (newVersion: string) => {
      if (newVersion === currentVersion || isInitializing) {
        return;
      }

      // Only allow switching to main Bible versions, not commentary versions
      if (newVersion.includes("com")) {
        console.warn("Cannot switch to commentary database as main Bible");
        return;
      }

      console.log(`Switching to version: ${newVersion}`);
      setIsInitializing(true);
      setInitializationError(null);

      try {
        await AsyncStorage.setItem(STORAGE_KEY, newVersion);

        // Get the commentary version for the current Bible before switching
        const currentCommentaryVersion =
          BIBLE_TO_COMMENTARY_MAP[currentVersion];
        // Get the commentary version for the new Bible
        const newCommentaryVersion = BIBLE_TO_COMMENTARY_MAP[newVersion];

        // Determine which secondary databases to keep
        const keepVersions: string[] = [];

        // If switching to a different version but keeping the same commentary,
        // don't close the commentary database
        if (
          currentCommentaryVersion &&
          currentCommentaryVersion === newCommentaryVersion
        ) {
          keepVersions.push(currentCommentaryVersion);
        }

        // Always keep the dictionary if NASB is involved
        if (
          currentVersion === "nasb.sqlite3" ||
          newVersion === "nasb.sqlite3"
        ) {
          keepVersions.push("secedictionary.sqlite3");
        }

        // Close secondary databases except those we want to keep
        await closeSecondaryDatabases(keepVersions);

        const db = await initializeDatabase(newVersion, true);
        setCurrentVersion(newVersion);
        setBibleDB(db);
        console.log(`Successfully switched to: ${newVersion}`);

        // Preload commentary for the new version if not already loaded
        if (
          newCommentaryVersion &&
          !openDatabases.current.has(newCommentaryVersion)
        ) {
          if (newVersion === "nasb.sqlite3") {
            // Immediate preload for NASB to ensure dictionary is loaded without delay
            await preloadCurrentCommentary(newVersion);
          } else {
            setTimeout(() => {
              preloadCurrentCommentary(newVersion);
            }, 500);
          }
        }
      } catch (err) {
        console.error("Failed to switch version:", err);
        await AsyncStorage.setItem(STORAGE_KEY, currentVersion);
        throw err;
      } finally {
        setIsInitializing(false);
      }
    },
    [
      currentVersion,
      isInitializing,
      initializeDatabase,
      preloadCurrentCommentary,
      closeSecondaryDatabases,
    ]
  );

  const refreshDatabase = useCallback(async () => {
    const db = await initializeDatabase(currentVersion, true);
    setBibleDB(db);
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
    async (version: string): Promise<BibleDatabase | undefined> => {
      try {
        const db = await initializeDatabase(version, false);
        // Preload commentary after secondary bible version initialization
        if (!version.includes("com")) {
          preloadCurrentCommentary(version).catch((error) => {
            console.warn(`Failed to preload commentary for ${version}:`, error);
          });
        }
        return db;
      } catch (error) {
        console.error(`Error loading database ${version}:`, error);
        return undefined;
      }
    },
    [initializeDatabase, preloadCurrentCommentary]
  );

  const recoverDatabaseConnection = useCallback(async () => {
    console.log("Attempting to recover database connection...");

    // Close all existing databases
    openDatabases.current.forEach((db, version) => {
      try {
        db.close();
      } catch (error) {
        console.error(`Error closing database ${version}:`, error);
      }
    });
    openDatabases.current.clear();
    pendingInits.current.clear();

    // Reinitialize current version
    const db = await initializeDatabase(currentVersion, true);
    setBibleDB(db);
  }, [currentVersion, initializeDatabase]);

  const value: BibleDatabaseContextType = {
    bibleDB,
    currentVersion,
    availableVersions,
    availableBibleVersions,
    availableCommentaryVersions,
    switchVersion,
    isInitializing,
    initializationError,
    refreshDatabase,
    searchVerses,
    getDatabase,
    retryInitialization,
    preloadCurrentCommentary: preloadCurrentCommentaryPublic,
    recoverDatabaseConnection,
    closeSecondaryDatabases, // Export the new method
  };

  React.useEffect(() => {
    return () => {
      // Close all databases on unmount
      openDatabases.current.forEach((db) => {
        try {
          db.close();
        } catch (error) {
          console.error("Error closing database:", error);
        }
      });
      openDatabases.current.clear();
      pendingInits.current.clear();
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
