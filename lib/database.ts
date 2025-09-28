import {
  documentDirectory,
  getInfoAsync,
  makeDirectoryAsync,
  copyAsync,
} from "expo-file-system/legacy";
import { Asset } from "expo-asset";
import * as SQLite from "expo-sqlite";

import {
  Book,
  Verse,
  Story,
  Introduction,
  DatabaseInfo,
  SearchOptions,
  VerseRange,
  DatabaseMigration,
  DatabaseStats,
} from "../types";

class BibleDatabaseError extends Error {
  constructor(
    message: string,
    public originalError?: unknown,
    public operationName?: string
  ) {
    super(message);
    this.name = "BibleDatabaseError";
  }
}

class BibleDatabase {
  private db: SQLite.SQLiteDatabase | null = null;
  private isInitialized = false;
  private initializationPromise: Promise<void> | null = null;
  private isClosing = false;

  // Configuration - make dbName configurable
  private readonly dbName: string;
  private readonly sqliteDirectory = `${documentDirectory}SQLite`;
  private readonly dbPath: string;

  constructor(dbName: string = "niv11.sqlite3") {
    this.dbName = dbName;
    this.dbPath = `${this.sqliteDirectory}/${this.dbName}`;
  }

  // Performance and reliability settings
  private readonly maxRetries = 3;
  private readonly retryDelay = 1000;
  private readonly slowQueryThreshold = 1000; // ms

  // Migration support
  private readonly migrations: DatabaseMigration[] = [
    {
      version: 1,
      name: "initial_schema",
      sql: `
        CREATE TABLE IF NOT EXISTS schema_version (
          version INTEGER PRIMARY KEY,
          applied_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )
      `,
    },
  ];

  // Add a method to get current database name
  getDatabaseName(): string {
    return this.dbName;
  }

  // Add a method to check if database is the same
  isSameDatabase(dbName: string): boolean {
    return this.dbName === dbName;
  }

  async init(): Promise<void> {
    if (this.isInitialized) return;
    if (this.initializationPromise) {
      return this.initializationPromise;
    }

    this.initializationPromise = this.initializeDatabase();
    return this.initializationPromise;
  }

  private async initializeDatabase(): Promise<void> {
    try {
      await this.setupDatabase();
      this.db = await SQLite.openDatabaseAsync(this.dbName);
      await this.runMigrations();
      await this.verifyDatabase();
      this.isInitialized = true;
      console.log("Bible database initialized successfully");
    } catch (error) {
      console.error("Database initialization failed:", error);
      this.initializationPromise = null;
      throw new BibleDatabaseError(
        "Failed to initialize database",
        error,
        "initializeDatabase"
      );
    }
  }

  private async setupDatabase(): Promise<void> {
    try {
      const fileInfo = await getInfoAsync(this.dbPath);

      if (fileInfo.exists) {
        console.log("Database already exists, skipping copy");
        return;
      }

      await this.copyDatabaseFromAssets();
    } catch (error) {
      throw new BibleDatabaseError(
        "Failed to setup database",
        error,
        "setupDatabase"
      );
    }
  }

  private async copyDatabaseFromAssets(): Promise<void> {
    try {
      // Create a mock asset using the database name
      const asset = {
        name: this.dbName,
        type: "sqlite3",
        hash: null,
        uri: `asset:///${this.dbName}`,
        localUri: null,
      };

      // For Expo, we need to use a different approach since we can't directly require the database
      // We'll copy from the app bundle using the known database name
      await this.ensureDirectoryExists();
      await this.copyDatabaseFileFromBundle();

      console.log("Database copied successfully from assets");
    } catch (error) {
      throw new BibleDatabaseError(
        "Failed to copy database from assets",
        error,
        "copyDatabaseFromAssets"
      );
    }
  }

  private async copyDatabaseFileFromBundle(): Promise<void> {
    try {
      // This approach assumes the database file is included in the app bundle
      // For React Native, you might need to use a different method to access bundled files
      // One common approach is to use react-native-fs or similar libraries

      // For Expo, you can use Asset.loadAsync if the database is in assets
      // First, let's try to create the asset and download it
      const asset = Asset.fromModule(this.getDatabaseAsset());
      await asset.downloadAsync();

      if (asset.localUri) {
        await copyAsync({
          from: asset.localUri,
          to: this.dbPath,
        });
      } else {
        throw new Error("Could not load database asset");
      }
    } catch (error) {
      throw new BibleDatabaseError(
        "Failed to copy database file from bundle",
        error,
        "copyDatabaseFileFromBundle"
      );
    }
  }

  private getDatabaseAsset(): number {
    switch (this.dbName) {
      case "niv11.sqlite3":
        return require("../assets/niv11.sqlite3");
      case "csb17.sqlite3":
        return require("../assets/csb17.sqlite3");
      default:
        throw new Error(`Database ${this.dbName} not found in assets`);
    }
  }

  private async ensureDirectoryExists(): Promise<void> {
    try {
      const dirInfo = await getInfoAsync(this.sqliteDirectory);
      if (!dirInfo.exists) {
        await makeDirectoryAsync(this.sqliteDirectory, {
          intermediates: true,
        });
        console.log("SQLite directory created");
      }
    } catch (error) {
      throw new BibleDatabaseError(
        "Failed to create directory",
        error,
        "ensureDirectoryExists"
      );
    }
  }

  private async runMigrations(): Promise<void> {
    if (!this.db) {
      throw new BibleDatabaseError("Database not open", null, "runMigrations");
    }

    try {
      // Create schema version table if it doesn't exist
      await this.db.execAsync(`
        CREATE TABLE IF NOT EXISTS schema_version (
          version INTEGER PRIMARY KEY,
          applied_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )
      `);

      // Get current version
      const currentVersionResult = await this.db.getFirstAsync<{
        version: number;
      }>("SELECT MAX(version) as version FROM schema_version");
      const currentVersion = currentVersionResult?.version || 0;

      // Run pending migrations
      const pendingMigrations = this.migrations.filter(
        (m) => m.version > currentVersion
      );

      for (const migration of pendingMigrations) {
        await this.db.execAsync(migration.sql);
        await this.db.runAsync(
          "INSERT INTO schema_version (version) VALUES (?)",
          [migration.version]
        );
        console.log(
          `Applied migration: ${migration.name} (v${migration.version})`
        );
      }
    } catch (error) {
      throw new BibleDatabaseError("Migration failed", error, "runMigrations");
    }
  }

  private async verifyDatabase(): Promise<void> {
    if (!this.db) {
      throw new BibleDatabaseError("Database not open", null, "verifyDatabase");
    }

    try {
      const requiredTables = [
        "info",
        "books_all",
        "books",
        "verses",
        "stories",
        "introductions",
      ];
      const tableCheck = await this.db.getAllAsync<{ name: string }>(
        "SELECT name FROM sqlite_master WHERE type='table' AND name IN (?, ?, ?, ?, ?, ?)",
        requiredTables
      );

      const foundTables = tableCheck.map((row) => row.name);
      const missingTables = requiredTables.filter(
        (table) => !foundTables.includes(table)
      );

      if (missingTables.length > 0) {
        throw new Error(`Missing required tables: ${missingTables.join(", ")}`);
      }

      // Verify data integrity with sample queries
      const [bookCount, verseCount, storyCount, introCount] = await Promise.all(
        [
          this.db.getFirstAsync<{ count: number }>(
            "SELECT COUNT(*) as count FROM books"
          ),
          this.db.getFirstAsync<{ count: number }>(
            "SELECT COUNT(*) as count FROM verses"
          ),
          this.db.getFirstAsync<{ count: number }>(
            "SELECT COUNT(*) as count FROM stories"
          ),
          this.db.getFirstAsync<{ count: number }>(
            "SELECT COUNT(*) as count FROM introductions"
          ),
        ]
      );

      if (!bookCount || bookCount.count === 0) {
        throw new Error("No books found in database");
      }

      console.log(
        `Database verified: ${bookCount.count} books, ${verseCount?.count || 0} verses, ${storyCount?.count || 0} stories, ${introCount?.count || 0} introductions`
      );
    } catch (error) {
      throw new BibleDatabaseError(
        "Database verification failed",
        error,
        "verifyDatabase"
      );
    }
  }

  // Enhanced error handling with retry logic
  private async withRetry<T>(
    operation: () => Promise<T>,
    operationName: string,
    retries = this.maxRetries
  ): Promise<T> {
    try {
      return await this.withTiming(operation, operationName);
    } catch (error) {
      if (retries > 0 && !this.isClosing) {
        console.warn(`Retrying ${operationName}, ${retries} attempts left`);
        await new Promise((resolve) => setTimeout(resolve, this.retryDelay));
        return this.withRetry(operation, operationName, retries - 1);
      }
      throw new BibleDatabaseError(
        `Operation ${operationName} failed after ${this.maxRetries} retries`,
        error,
        operationName
      );
    }
  }

  private async withTiming<T>(
    operation: () => Promise<T>,
    operationName: string
  ): Promise<T> {
    const startTime = Date.now();
    try {
      const result = await operation();
      const duration = Date.now() - startTime;
      if (duration > this.slowQueryThreshold) {
        console.warn(`Slow operation ${operationName}: ${duration}ms`);
      }
      return result;
    } catch (error) {
      const duration = Date.now() - startTime;
      console.error(`Operation ${operationName} failed after ${duration}ms`);
      throw error;
    }
  }

  private async ensureInitialized(): Promise<void> {
    if (this.isClosing) {
      throw new BibleDatabaseError(
        "Database is closing",
        null,
        "ensureInitialized"
      );
    }

    if (!this.isInitialized) {
      await this.init();
    }
  }

  // Info table operations
  async getInfoValue(name: string): Promise<string | null> {
    return this.withRetry(async () => {
      await this.ensureInitialized();
      const result = await this.db!.getFirstAsync<{ value: string }>(
        "SELECT value FROM info WHERE name = ?",
        [name]
      );
      return result?.value || null;
    }, `getInfoValue(${name})`);
  }

  async getAllInfo(): Promise<DatabaseInfo[]> {
    return this.withRetry(async () => {
      await this.ensureInitialized();
      return await this.db!.getAllAsync<DatabaseInfo>(
        "SELECT name, value FROM info ORDER BY name"
      );
    }, "getAllInfo");
  }

  // Book operations with enhanced error handling and retry logic
  async getBooks(): Promise<Book[]> {
    return this.withRetry(async () => {
      await this.ensureInitialized();
      return await this.db!.getAllAsync<Book>(`
        SELECT book_number, short_name, long_name, book_color 
        FROM books 
        ORDER BY book_number
      `);
    }, "getBooks");
  }

  async getAllBooks(): Promise<Book[]> {
    return this.withRetry(async () => {
      await this.ensureInitialized();
      return await this.db!.getAllAsync<Book>(`
        SELECT book_number, short_name, long_name, book_color, is_present 
        FROM books_all 
        ORDER BY book_number
      `);
    }, "getAllBooks");
  }

  async getBook(bookNumber: number): Promise<Book | null> {
    return this.withRetry(async () => {
      await this.ensureInitialized();
      return await this.db!.getFirstAsync<Book>(
        "SELECT * FROM books WHERE book_number = ?",
        [bookNumber]
      );
    }, `getBook(${bookNumber})`);
  }

  async getBookFromAll(bookNumber: number): Promise<Book | null> {
    return this.withRetry(async () => {
      await this.ensureInitialized();
      return await this.db!.getFirstAsync<Book>(
        "SELECT * FROM books_all WHERE book_number = ?",
        [bookNumber]
      );
    }, `getBookFromAll(${bookNumber})`);
  }

  // Verse operations
  async getVerses(bookNumber: number, chapter: number): Promise<Verse[]> {
    return this.withRetry(async () => {
      await this.ensureInitialized();
      return await this.db!.getAllAsync<Verse>(
        `SELECT v.*, b.short_name as book_name, b.book_color 
         FROM verses v 
         JOIN books b ON v.book_number = b.book_number 
         WHERE v.book_number = ? AND v.chapter = ? 
         ORDER BY v.verse`,
        [bookNumber, chapter]
      );
    }, `getVerses(${bookNumber}, ${chapter})`);
  }

  async getVerse(
    bookNumber: number,
    chapter: number,
    verse: number
  ): Promise<Verse | null> {
    return this.withRetry(async () => {
      await this.ensureInitialized();
      return await this.db!.getFirstAsync<Verse>(
        `SELECT v.*, b.short_name as book_name, b.book_color 
         FROM verses v 
         JOIN books b ON v.book_number = b.book_number 
         WHERE v.book_number = ? AND v.chapter = ? AND v.verse = ?`,
        [bookNumber, chapter, verse]
      );
    }, `getVerse(${bookNumber}, ${chapter}, ${verse})`);
  }

  async getVerseRange(
    bookNumber: number,
    chapter: number,
    startVerse: number,
    endVerse: number
  ): Promise<Verse[]> {
    return this.withRetry(async () => {
      await this.ensureInitialized();
      return await this.db!.getAllAsync<Verse>(
        `SELECT v.*, b.short_name as book_name, b.book_color 
         FROM verses v 
         JOIN books b ON v.book_number = b.book_number 
         WHERE v.book_number = ? AND v.chapter = ? AND v.verse BETWEEN ? AND ? 
         ORDER BY v.verse`,
        [bookNumber, chapter, startVerse, endVerse]
      );
    }, `getVerseRange(${bookNumber}, ${chapter}, ${startVerse}-${endVerse})`);
  }

  // Story operations
  async getStories(bookNumber: number, chapter?: number): Promise<Story[]> {
    return this.withRetry(async () => {
      await this.ensureInitialized();

      if (chapter) {
        return await this.db!.getAllAsync<Story>(
          "SELECT * FROM stories WHERE book_number = ? AND chapter = ? ORDER BY verse, order_if_several",
          [bookNumber, chapter]
        );
      } else {
        return await this.db!.getAllAsync<Story>(
          "SELECT * FROM stories WHERE book_number = ? ORDER BY chapter, verse, order_if_several",
          [bookNumber]
        );
      }
    }, `getStories(${bookNumber}, ${chapter})`);
  }

  async getStoryAtVerse(
    bookNumber: number,
    chapter: number,
    verse: number
  ): Promise<Story[]> {
    return this.withRetry(async () => {
      await this.ensureInitialized();
      return await this.db!.getAllAsync<Story>(
        "SELECT * FROM stories WHERE book_number = ? AND chapter = ? AND verse = ? ORDER BY order_if_several",
        [bookNumber, chapter, verse]
      );
    }, `getStoryAtVerse(${bookNumber}, ${chapter}, ${verse})`);
  }

  // Introduction operations
  async getIntroduction(bookNumber: number): Promise<Introduction | null> {
    return this.withRetry(async () => {
      await this.ensureInitialized();
      return await this.db!.getFirstAsync<Introduction>(
        "SELECT * FROM introductions WHERE book_number = ?",
        [bookNumber]
      );
    }, `getIntroduction(${bookNumber})`);
  }

  async getAllIntroductions(): Promise<Introduction[]> {
    return this.withRetry(async () => {
      await this.ensureInitialized();
      return await this.db!.getAllAsync<Introduction>(
        "SELECT * FROM introductions ORDER BY book_number"
      );
    }, "getAllIntroductions");
  }

  // Batch operations
  async getMultipleVerseRanges(ranges: VerseRange[]): Promise<Verse[][]> {
    return this.withRetry(async () => {
      await this.ensureInitialized();

      const results: Verse[][] = [];
      for (const range of ranges) {
        const verses = await this.db!.getAllAsync<Verse>(
          `SELECT v.*, b.short_name as book_name, b.book_color 
           FROM verses v 
           JOIN books b ON v.book_number = b.book_number 
           WHERE v.book_number = ? AND v.chapter = ? AND v.verse BETWEEN ? AND ? 
           ORDER BY v.verse`,
          [range.bookNumber, range.chapter, range.startVerse, range.endVerse]
        );
        results.push(verses);
      }
      return results;
    }, `getMultipleVerseRanges(${ranges.length} ranges)`);
  }

  // Enhanced search functionality
  async searchVerses(
    query: string,
    options: SearchOptions = {}
  ): Promise<Verse[]> {
    return this.withRetry(async () => {
      await this.ensureInitialized();

      const {
        limit = 50,
        exactMatch = false,
        caseSensitive = false,
        wholeWords = false,
        bookNumbers = [],
      } = options;

      let searchTerm = query.trim();
      let operator = "LIKE";

      if (exactMatch) {
        operator = "=";
      } else if (!caseSensitive) {
        searchTerm = `%${searchTerm}%`;
      }

      if (wholeWords) {
        searchTerm = ` ${searchTerm} `;
      }

      const bookFilter =
        bookNumbers.length > 0
          ? "AND v.book_number IN (" +
            bookNumbers.map(() => "?").join(",") +
            ")"
          : "";
      const params: any[] = [searchTerm];
      if (bookNumbers.length > 0) {
        params.push(...bookNumbers);
      }
      params.push(limit);

      return await this.db!.getAllAsync<Verse>(
        `SELECT v.*, b.short_name as book_name, b.book_color 
         FROM verses v 
         JOIN books b ON v.book_number = b.book_number 
         WHERE v.text ${operator} ? ${bookFilter}
         ORDER BY b.book_number, v.chapter, v.verse 
         LIMIT ?`,
        params
      );
    }, `searchVerses("${query}")`);
  }

  async searchVersesByBook(
    bookNumber: number,
    query: string,
    options: Omit<SearchOptions, "limit" | "bookNumbers"> = {}
  ): Promise<Verse[]> {
    return this.withRetry(async () => {
      await this.ensureInitialized();

      const {
        exactMatch = false,
        caseSensitive = false,
        wholeWords = false,
      } = options;
      let searchTerm = query.trim();
      let operator = "LIKE";

      if (exactMatch) {
        operator = "=";
      } else if (!caseSensitive) {
        searchTerm = `%${searchTerm}%`;
      }

      if (wholeWords) {
        searchTerm = ` ${searchTerm} `;
      }

      return await this.db!.getAllAsync<Verse>(
        `SELECT v.*, b.short_name as book_name, b.book_color 
         FROM verses v 
         JOIN books b ON v.book_number = b.book_number 
         WHERE v.book_number = ? AND v.text ${operator} ? 
         ORDER BY v.chapter, v.verse`,
        [bookNumber, searchTerm]
      );
    }, `searchVersesByBook(${bookNumber}, "${query}")`);
  }

  // Memory-efficient iterator for large results
  async *getVersesIterator(
    bookNumber: number,
    chapter: number,
    batchSize = 50
  ): AsyncIterableIterator<Verse[]> {
    await this.ensureInitialized();

    let offset = 0;
    let hasMore = true;

    while (hasMore && !this.isClosing) {
      const verses = await this.withRetry(async () => {
        return await this.db!.getAllAsync<Verse>(
          `SELECT v.*, b.short_name as book_name, b.book_color 
           FROM verses v 
           JOIN books b ON v.book_number = b.book_number 
           WHERE v.book_number = ? AND v.chapter = ? 
           ORDER BY v.verse 
           LIMIT ? OFFSET ?`,
          [bookNumber, chapter, batchSize, offset]
        );
      }, `getVersesIterator(${bookNumber}, ${chapter})`);

      if (verses.length > 0) {
        yield verses;
        offset += verses.length;
      } else {
        hasMore = false;
      }
    }
  }

  // Metadata operations
  async getChapterCount(bookNumber: number): Promise<number> {
    return this.withRetry(async () => {
      await this.ensureInitialized();
      const result = await this.db!.getFirstAsync<{ max_chapter: number }>(
        "SELECT MAX(chapter) as max_chapter FROM verses WHERE book_number = ?",
        [bookNumber]
      );
      return result?.max_chapter || 0;
    }, `getChapterCount(${bookNumber})`);
  }

  async getVerseCount(bookNumber: number, chapter: number): Promise<number> {
    return this.withRetry(async () => {
      await this.ensureInitialized();
      const result = await this.db!.getFirstAsync<{ count: number }>(
        "SELECT COUNT(*) as count FROM verses WHERE book_number = ? AND chapter = ?",
        [bookNumber, chapter]
      );
      return result?.count || 0;
    }, `getVerseCount(${bookNumber}, ${chapter})`);
  }

  // Database management
  async close(): Promise<void> {
    if (this.isClosing) return;

    this.isClosing = true;

    if (this.db) {
      try {
        await this.db.closeAsync();
        console.log("Database closed successfully");
      } catch (error) {
        console.error("Error closing database:", error);
      } finally {
        this.db = null;
        this.isInitialized = false;
        this.initializationPromise = null;
        this.isClosing = false;
      }
    }
  }

  async getDatabaseStats(): Promise<DatabaseStats> {
    return this.withRetry(async () => {
      await this.ensureInitialized();

      const [
        bookCountResult,
        verseCountResult,
        storyCountResult,
        introCountResult,
        lastUpdatedResult,
      ] = await Promise.all([
        this.db!.getFirstAsync<{ count: number }>(
          "SELECT COUNT(*) as count FROM books"
        ),
        this.db!.getFirstAsync<{ count: number }>(
          "SELECT COUNT(*) as count FROM verses"
        ),
        this.db!.getFirstAsync<{ count: number }>(
          "SELECT COUNT(*) as count FROM stories"
        ),
        this.db!.getFirstAsync<{ count: number }>(
          "SELECT COUNT(*) as count FROM introductions"
        ),
        this.db!.getFirstAsync<{ applied_at: string }>(
          "SELECT MAX(applied_at) as applied_at FROM schema_version"
        ),
      ]);

      return {
        bookCount: bookCountResult?.count || 0,
        verseCount: verseCountResult?.count || 0,
        storyCount: storyCountResult?.count || 0,
        introductionCount: introCountResult?.count || 0,
        lastUpdated: lastUpdatedResult?.applied_at
          ? new Date(lastUpdatedResult.applied_at)
          : undefined,
      };
    }, "getDatabaseStats");
  }

  // Schema inspection
  async getTableSchema(tableName: string): Promise<any[]> {
    return this.withRetry(async () => {
      await this.ensureInitialized();
      return await this.db!.getAllAsync(`PRAGMA table_info(${tableName})`);
    }, `getTableSchema(${tableName})`);
  }

  // Health check with detailed diagnostics
  async healthCheck(): Promise<{ healthy: boolean; details: string }> {
    try {
      if (!this.isInitialized || !this.db) {
        return { healthy: false, details: "Database not initialized" };
      }

      if (this.isClosing) {
        return { healthy: false, details: "Database is closing" };
      }

      const result = await this.db.getFirstAsync<{ one: number }>(
        "SELECT 1 as one"
      );
      const stats = await this.getDatabaseStats();

      return {
        healthy:
          result?.one === 1 && stats.bookCount > 0 && stats.verseCount > 0,
        details: `Database healthy: ${stats.bookCount} books, ${stats.verseCount} verses, ${stats.storyCount} stories, ${stats.introductionCount} introductions`,
      };
    } catch (error) {
      return {
        healthy: false,
        details: `Health check failed: ${error instanceof Error ? error.message : String(error)}`,
      };
    }
  }

  isReady(): boolean {
    return this.isInitialized && this.db !== null && !this.isClosing;
  }

  // Backup and restore functionality
  async backup(): Promise<string> {
    return this.withRetry(async () => {
      await this.ensureInitialized();

      const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
      const backupPath = `${this.dbPath}.backup.${timestamp}`;

      await copyAsync({
        from: this.dbPath,
        to: backupPath,
      });

      return backupPath;
    }, "backup");
  }

  async restore(backupPath: string): Promise<void> {
    return this.withRetry(async () => {
      if (this.db) {
        await this.db.closeAsync();
        this.db = null;
        this.isInitialized = false;
      }

      await copyAsync({
        from: backupPath,
        to: this.dbPath,
      });

      // Reinitialize with the restored database
      await this.init();
    }, "restore");
  }

  async clearCache(): Promise<void> {
    return this.withRetry(async () => {
      if (this.db) {
        await this.db.closeAsync();
        this.db = null;
        this.isInitialized = false;
        this.initializationPromise = null;
      }

      // Reinitialize
      await this.init();
    }, "clearCache");
  }

  // Utility method to check if database file exists
  async databaseExists(): Promise<boolean> {
    try {
      const fileInfo = await getInfoAsync(this.dbPath);
      return fileInfo.exists;
    } catch {
      return false;
    }
  }

  // Method to get database size
  async getDatabaseSize(): Promise<number> {
    try {
      const fileInfo = await getInfoAsync(this.dbPath);
      return fileInfo.exists && fileInfo.size ? fileInfo.size : 0;
    } catch {
      return 0;
    }
  }
}

// Enhanced singleton manager with lifecycle control
class BibleDatabaseManager {
  private static instance: BibleDatabase;
  private static isInitializing = false;

  static getInstance(): BibleDatabase {
    if (!BibleDatabaseManager.instance) {
      BibleDatabaseManager.instance = new BibleDatabase();
    }
    return BibleDatabaseManager.instance;
  }

  static async initialize(): Promise<void> {
    if (BibleDatabaseManager.isInitializing) {
      // Wait for ongoing initialization
      while (BibleDatabaseManager.isInitializing) {
        await new Promise((resolve) => setTimeout(resolve, 100));
      }
      return;
    }

    BibleDatabaseManager.isInitializing = true;
    try {
      await BibleDatabaseManager.getInstance().init();
    } finally {
      BibleDatabaseManager.isInitializing = false;
    }
  }

  static async close(): Promise<void> {
    if (BibleDatabaseManager.instance) {
      await BibleDatabaseManager.instance.close();
    }
  }

  static isReady(): boolean {
    return BibleDatabaseManager.instance?.isReady() || false;
  }
}

export const bibleDB = BibleDatabaseManager.getInstance();
export const initializeBibleDB = () => BibleDatabaseManager.initialize();
export const closeBibleDB = () => BibleDatabaseManager.close();
export const isBibleDBReady = () => BibleDatabaseManager.isReady();
export { BibleDatabaseError, Verse, Book, BibleDatabase };
