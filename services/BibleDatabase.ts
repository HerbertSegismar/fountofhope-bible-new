// services/BibleDatabase.ts
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

  constructor(dbName: string = "niv11.sqlite3") {
    this.dbName = dbName;
    this.dbPath = `${this.sqliteDirectory}/${this.dbName}`;
  }

  // ==================== PUBLIC METHODS ====================

  async init(): Promise<void> {
    if (this.isInitialized) return;
    if (this.initializationPromise) {
      return this.initializationPromise;
    }

    this.initializationPromise = this.initializeDatabase();
    return this.initializationPromise;
  }

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

  // Add a method to get current database name
  getDatabaseName(): string {
    return this.dbName;
  }

  // Add a method to check if database is the same
  isSameDatabase(dbName: string): boolean {
    return this.dbName === dbName;
  }

  // ==================== DATABASE OPERATIONS ====================

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

  // Book operations
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

  // Search operations
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

  // ==================== PRIVATE METHODS ====================

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

      // Check if tables exist
      const tableCheck = await this.db.getAllAsync<{ name: string }>(
        "SELECT name FROM sqlite_master WHERE type='table'"
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

  // ==================== UTILITY METHODS ====================

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
}

export { BibleDatabase, BibleDatabaseError };
