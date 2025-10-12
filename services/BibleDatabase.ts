import { Asset } from "expo-asset";
import * as SQLite from "expo-sqlite";
import * as FileSystem from "expo-file-system/legacy";

import {
  Book,
  Verse,
  Story,
  Introduction,
  DatabaseInfo,
  DatabaseMigration,
  DatabaseStats,
  SearchOptions,
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

  // REFACTOR: Simple in-memory cache for common queries (e.g., getBook, getVerses). Clear on close.
  private queryCache = new Map<string, any>();
  // REFACTOR: Cache for table existence checks to avoid repeated sqlite_master queries
  private tableExistsCache = new Map<string, boolean>();
  // REFACTOR: Cache for chapter counts (MAX chapter per book) to avoid repeated MAX queries
  private chapterCounts = new Map<number, number>();
  // REFACTOR: Cache for verse counts per chapter to avoid repeated COUNT queries
  private verseCounts = new Map<string, number>();
  // REFACTOR: Cache for database stats (computed once as data is static)
  private statsCache?: DatabaseStats;

  private readonly dbName: string;
  private readonly sqliteDirectory = `${FileSystem.documentDirectory}SQLite`;
  private readonly dbPath: string;

  private readonly maxRetries = 3;
  private readonly retryDelay = 1000;
  private readonly slowQueryThreshold = 1000; // ms

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

  constructor(dbName: string = "esv.sqlite3") {
    this.dbName = dbName;
    this.dbPath = `${this.sqliteDirectory}/${this.dbName}`;
  }

  // ==================== PUBLIC METHODS ====================

  async searchVerses(query: string, options?: SearchOptions): Promise<Verse[]> {
    if (!this.db) {
      throw new Error("Database not initialized");
    }

    let sql = `
    SELECT v.*, b.short_name as book_name 
    FROM verses v 
    JOIN books b ON v.book_number = b.book_number 
    WHERE v.text LIKE ?
  `;

    const params: any[] = [`%${query}%`];

    // Add book range filter if provided
    if (options?.bookRange) {
      sql += ` AND v.book_number BETWEEN ? AND ?`;
      params.push(options.bookRange.start, options.bookRange.end);
    }

    sql += ` ORDER BY v.book_number, v.chapter, v.verse`;

    try {
      return await this.db.getAllAsync<Verse>(sql, params);
    } catch (error) {
      console.error("Search error:", error);
      throw error;
    }
  }

  async init(): Promise<void> {
    if (this.isInitialized) return;
    if (this.initializationPromise) return this.initializationPromise;

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
        this.queryCache.clear(); // REFACTOR: Clear cache on close
        this.tableExistsCache.clear();
        this.chapterCounts.clear();
        this.verseCounts.clear();
        this.statsCache = undefined;
        this.isClosing = false;
      }
    }
  }

  getDatabaseName(): string {
    return this.dbName;
  }

  isSameDatabase(dbName: string): boolean {
    return this.dbName === dbName;
  }

  // ==================== DATABASE OPERATIONS ====================

  async getInfoValue(name: string): Promise<string | null> {
    return this.withRetry(async () => {
      await this.ensureInitialized();
      const result = await this.db!.getFirstAsync<{ value: string }>(
        "SELECT value FROM info WHERE name = ?",
        [name]
      );
      return result?.value ?? null;
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

  async getBooks(): Promise<Book[]> {
    const cacheKey = "getBooks";
    if (this.queryCache.has(cacheKey)) return this.queryCache.get(cacheKey)!;

    const books = await this.withRetry(async () => {
      await this.ensureInitialized();
      return await this.db!.getAllAsync<Book>(
        `SELECT book_number, short_name, long_name, book_color 
         FROM books 
         ORDER BY book_number`
      );
    }, "getBooks");

    this.queryCache.set(cacheKey, books);
    return books;
  }

  async getAllBooks(): Promise<Book[]> {
    return this.withRetry(async () => {
      await this.ensureInitialized();
      if (await this.tableExists("books_all")) {
        return await this.db!.getAllAsync<Book>(
          `SELECT book_number, short_name, long_name, book_color, is_present 
           FROM books_all ORDER BY book_number`
        );
      }
      // fallback: map books -> books_all shape
      const books = await this.db!.getAllAsync<Book>(
        `SELECT book_number, short_name, long_name, book_color 
         FROM books ORDER BY book_number`
      );
      return books.map((b: any) => ({ ...b, is_present: 1 }));
    }, "getAllBooks");
  }

  async getBook(bookNumber: number): Promise<Book | null> {
    const cacheKey = `getBook:${bookNumber}`;
    if (this.queryCache.has(cacheKey)) return this.queryCache.get(cacheKey)!;

    const book = await this.withRetry(async () => {
      await this.ensureInitialized();
      return await this.db!.getFirstAsync<Book>(
        "SELECT * FROM books WHERE book_number = ?",
        [bookNumber]
      );
    }, `getBook(${bookNumber})`);

    if (book) this.queryCache.set(cacheKey, book);
    return book;
  }

  async getBookFromAll(bookNumber: number): Promise<Book | null> {
    return this.withRetry(async () => {
      await this.ensureInitialized();
      if (!(await this.tableExists("books_all"))) return null;
      return await this.db!.getFirstAsync<Book>(
        "SELECT * FROM books_all WHERE book_number = ?",
        [bookNumber]
      );
    }, `getBookFromAll(${bookNumber})`);
  }

  // REFACTOR: Added cache for getVerses (keyed by book+chapter)
  async getVerses(bookNumber: number, chapter: number): Promise<Verse[]> {
    const cacheKey = `getVerses:${bookNumber}:${chapter}`;
    if (this.queryCache.has(cacheKey)) return this.queryCache.get(cacheKey)!;

    const verses = await this.withRetry(async () => {
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

    this.queryCache.set(cacheKey, verses);
    return verses;
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

  async getStories(bookNumber: number, chapter?: number): Promise<Story[]> {
    return this.withRetry(async () => {
      await this.ensureInitialized();
      if (!(await this.tableExists("stories"))) return [];

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
      if (!(await this.tableExists("stories"))) return [];
      return await this.db!.getAllAsync<Story>(
        "SELECT * FROM stories WHERE book_number = ? AND chapter = ? AND verse = ? ORDER BY order_if_several",
        [bookNumber, chapter, verse]
      );
    }, `getStoryAtVerse(${bookNumber}, ${chapter}, ${verse})`);
  }

  async getIntroduction(bookNumber: number): Promise<Introduction | null> {
    return this.withRetry(async () => {
      await this.ensureInitialized();
      if (!(await this.tableExists("introductions"))) return null;
      return await this.db!.getFirstAsync<Introduction>(
        "SELECT * FROM introductions WHERE book_number = ?",
        [bookNumber]
      );
    }, `getIntroduction(${bookNumber})`);
  }

  async getAllIntroductions(): Promise<Introduction[]> {
    return this.withRetry(async () => {
      await this.ensureInitialized();
      if (!(await this.tableExists("introductions"))) return [];
      return await this.db!.getAllAsync<Introduction>(
        "SELECT * FROM introductions ORDER BY book_number"
      );
    }, "getAllIntroductions");
  }

  // ==================== METADATA OPERATIONS ====================

  // REFACTOR: Cached MAX chapter per book
  async getChapterCount(bookNumber: number): Promise<number> {
    if (this.chapterCounts.has(bookNumber)) {
      return this.chapterCounts.get(bookNumber)!;
    }

    return this.withRetry(async () => {
      await this.ensureInitialized();
      const result = await this.db!.getFirstAsync<{ max_chapter: number }>(
        "SELECT MAX(chapter) as max_chapter FROM verses WHERE book_number = ?",
        [bookNumber]
      );
      const count = result?.max_chapter ?? 0;
      this.chapterCounts.set(bookNumber, count);
      return count;
    }, `getChapterCount(${bookNumber})`);
  }

  // REFACTOR: Cached COUNT per book+chapter
  async getVerseCount(bookNumber: number, chapter: number): Promise<number> {
    const key = `${bookNumber}:${chapter}`;
    if (this.verseCounts.has(key)) {
      return this.verseCounts.get(key)!;
    }

    return this.withRetry(async () => {
      await this.ensureInitialized();
      const result = await this.db!.getFirstAsync<{ count: number }>(
        "SELECT COUNT(*) as count FROM verses WHERE book_number = ? AND chapter = ?",
        [bookNumber, chapter]
      );
      const count = result?.count ?? 0;
      this.verseCounts.set(key, count);
      return count;
    }, `getVerseCount(${bookNumber}, ${chapter})`);
  }

  // REFACTOR: Cached stats (computed once)
  async getDatabaseStats(): Promise<DatabaseStats> {
    if (this.statsCache) {
      return this.statsCache;
    }

    return this.withRetry(async () => {
      await this.ensureInitialized();

      const [bookCountRow, verseCountRow] = await Promise.all([
        this.db!.getFirstAsync<{ count: number }>(
          "SELECT COUNT(*) as count FROM books"
        ),
        this.db!.getFirstAsync<{ count: number }>(
          "SELECT COUNT(*) as count FROM verses"
        ),
      ]);

      const storyCountRow = (await this.tableExists("stories"))
        ? await this.db!.getFirstAsync<{ count: number }>(
            "SELECT COUNT(*) as count FROM stories"
          )
        : { count: 0 };

      const introCountRow = (await this.tableExists("introductions"))
        ? await this.db!.getFirstAsync<{ count: number }>(
            "SELECT COUNT(*) as count FROM introductions"
          )
        : { count: 0 };

      const stats: DatabaseStats = {
        bookCount: bookCountRow?.count ?? 0,
        verseCount: verseCountRow?.count ?? 0,
        storyCount: storyCountRow?.count ?? 0,
        introductionCount: introCountRow?.count ?? 0,
        lastUpdated: new Date(),
      };

      this.statsCache = stats;
      return stats;
    }, "getDatabaseStats");
  }

  // ==================== PRIVATE METHODS ====================

  private async initializeDatabase(): Promise<void> {
    try {
      await this.setupDatabase();
      // FIXED: Add dbLocation to match copy path
      this.db = await SQLite.openDatabaseAsync(
        this.dbName,
        undefined,
        this.sqliteDirectory // <- This ensures it opens in /SQLite/
      );
      await this.runMigrations();
      await this.verifyDatabase();
      this.isInitialized = true;
      // REFACTOR: Consolidated logging (remove duplicate from provider)
      console.log(`Bible database ${this.dbName} initialized ✅`);
    } catch (error) {
      // Enhanced logging for debugging (remove in production if needed)
      console.error(`Detailed init failure for ${this.dbName}:`, {
        error: error instanceof Error ? error.message : error,
        stack: error instanceof Error ? error.stack : undefined,
        operation: "initializeDatabase",
      });
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
      const fileInfo = await FileSystem.getInfoAsync(this.dbPath);
      const rootPath = `${FileSystem.documentDirectory}${this.dbName}`; // Legacy root path
      const rootInfo = await FileSystem.getInfoAsync(rootPath);

      if (!fileInfo.exists) {
        if (rootInfo.exists && rootInfo.size! > 0) {
          console.log(
            `Migrating legacy DB from root to ${this.sqliteDirectory}`
          );
          await FileSystem.copyAsync({ from: rootPath, to: this.dbPath });
          // Optionally delete root: await FileSystem.deleteAsync(rootPath);
        } else {
          console.log(`Copying ${this.dbName} from assets...`);
          await this.copyDatabaseFromAssets();
        }
      } else {
        console.log(
          `Using existing ${this.dbName} (size: ${fileInfo.size!} bytes)`
        );
      }
    } catch (error) {
      // Enhanced logging
      console.error(`Setup failure for ${this.dbName}:`, {
        error: error instanceof Error ? error.message : error,
        operation: "setupDatabase",
      });
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
      console.log(`Copied ${this.dbName} successfully`);
    } catch (error) {
      // Enhanced logging
      console.error(`Copy failure for ${this.dbName}:`, {
        error: error instanceof Error ? error.message : error,
        operation: "copyDatabaseFromAssets",
      });
      throw new BibleDatabaseError(
        "Failed to copy database from assets",
        error,
        "copyDatabaseFromAssets"
      );
    }
  }

  private async copyDatabaseFileFromBundle(): Promise<void> {
    try {
      console.log(`Starting database copy for: ${this.dbName}`);

      // Get the asset module
      const assetModule = this.getDatabaseAsset();

      // Use Expo Asset to load the database file properly
      const asset = Asset.fromModule(assetModule);

      // For production builds, we need to ensure the asset is loaded
      let sourceUri = asset.localUri;
      if (!sourceUri) {
        console.log(`Downloading asset for: ${this.dbName}`);
        await asset.downloadAsync();
        sourceUri = asset.localUri;
      }

      if (!sourceUri) {
        throw new Error(
          `No localUri available for bundled asset ${this.dbName}`
        );
      }

      console.log(`Chunked copy from: ${sourceUri} to: ${this.dbPath}`);

      // Chunked copy for large files to avoid OOM on Android
      const CHUNK_SIZE = 1024 * 1024; // 1MB chunks
      const fileInfo = await FileSystem.getInfoAsync(sourceUri);
      if (!fileInfo.exists) {
        throw new Error(`Source asset does not exist: ${sourceUri}`);
      }
      const fileSize = fileInfo.size!;
      if (fileSize === 0) {
        throw new Error(`Source asset is empty: ${sourceUri}`);
      }
      console.log(`Source file size: ${fileSize} bytes`);

      let fileBase64 = "";
      const numberOfChunks = Math.ceil(fileSize / CHUNK_SIZE);
      for (let i = 0; i < numberOfChunks; i++) {
        const position = i * CHUNK_SIZE;
        const currentChunkSize = Math.min(CHUNK_SIZE, fileSize - position);
        let chunk = await FileSystem.readAsStringAsync(sourceUri, {
          position,
          length: currentChunkSize,
          encoding: FileSystem.EncodingType.Base64,
        });
        if (i < numberOfChunks - 1) {
          chunk = chunk.replace(/=*$/, ""); // Remove padding for non-last chunks
        }
        fileBase64 += chunk;
        console.log(
          `Copied chunk ${i + 1}/${numberOfChunks} (${(((position + currentChunkSize) / fileSize) * 100).toFixed(1)}%)`
        );
      }

      // Write the full Base64 (with largeHeap enabled, this should handle it)
      await FileSystem.writeAsStringAsync(this.dbPath, fileBase64, {
        encoding: FileSystem.EncodingType.Base64,
      });

      // Verify the copy worked
      const copiedInfo = await FileSystem.getInfoAsync(this.dbPath);
      if (!copiedInfo.exists) {
        throw new Error(
          `Chunked copy failed - file doesn't exist at ${this.dbPath}`
        );
      }
      if (copiedInfo.size! !== fileSize) {
        throw new Error(
          `Chunked copy failed - size mismatch (expected ${fileSize}, got ${copiedInfo.size!}) at ${this.dbPath}`
        );
      }

      console.log(
        `Database copied successfully via chunks. Size: ${copiedInfo.size!} bytes`
      );
    } catch (error) {
      console.error(`Bundle copy failure for ${this.dbName}:`, {
        error: error instanceof Error ? error.message : error,
        operation: "copyDatabaseFileFromBundle",
      });
      throw new BibleDatabaseError(
        "Failed to copy database file from bundle",
        error,
        "copyDatabaseFileFromBundle"
      );
    }
  }

  private async ensureDirectoryExists(): Promise<void> {
    try {
      const dirInfo = await FileSystem.getInfoAsync(this.sqliteDirectory);
      if (!dirInfo.exists) {
        await FileSystem.makeDirectoryAsync(this.sqliteDirectory, {
          intermediates: true,
        });
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
    if (!this.db)
      throw new BibleDatabaseError("Database not open", null, "runMigrations");

    try {
      await this.db.execAsync(`
        CREATE TABLE IF NOT EXISTS schema_version (
          version INTEGER PRIMARY KEY,
          applied_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )
      `);

      let currentVersion = 0;
      try {
        const versionRow = await this.db.getFirstAsync<{ version: number }>(
          "SELECT MAX(version) as version FROM schema_version"
        );
        currentVersion = versionRow?.version ?? 0;
      } catch {}

      const pendingMigrations = this.migrations.filter(
        (m) => m.version > currentVersion
      );
      for (const migration of pendingMigrations) {
        try {
          await this.db.execAsync(migration.sql);
          await this.db.runAsync(
            "INSERT INTO schema_version (version) VALUES (?)",
            [migration.version]
          );
        } catch (mErr) {
          console.warn(`Skipping failed migration ${migration.name}:`, mErr);
        }
      }
    } catch (error) {
      throw new BibleDatabaseError("Migration failed", error, "runMigrations");
    }
  }

  private async verifyDatabase(): Promise<void> {
    if (!this.db)
      throw new BibleDatabaseError("Database not open", null, "verifyDatabase");

    try {
      const requiredTables = ["info", "books", "verses"];
      const tableRows = await this.db.getAllAsync<{ name: string }>(
        "SELECT name FROM sqlite_master WHERE type='table'"
      );
      const foundTables = tableRows.map((r) => r.name.toLowerCase());
      const missingTables = requiredTables.filter(
        (t) => !foundTables.includes(t)
      );

      if (missingTables.length)
        throw new Error(`Missing required tables: ${missingTables.join(", ")}`);

      const [bookCount, verseCount] = await Promise.all([
        this.db.getFirstAsync<{ count: number }>(
          "SELECT COUNT(*) as count FROM books"
        ),
        this.db.getFirstAsync<{ count: number }>(
          "SELECT COUNT(*) as count FROM verses"
        ),
      ]);

      if (!bookCount || bookCount.count === 0)
        throw new Error("No books found in database");

      // Optional: Add commentary-specific check
      if (this.dbName.includes("com")) {
        // For commentary DBs like esvgsbcom
        const introCount = await this.db.getFirstAsync<{ count: number }>(
          "SELECT COUNT(*) as count FROM introductions"
        );
        console.log(
          `Commentary check for ${this.dbName}: ${introCount?.count || 0} introductions`
        );
        if (introCount?.count === 0) {
          console.warn(
            "Warning: No commentary data found - check DB integrity"
          );
        }
      }
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
      case "niv11com.sqlite3":
        return require("../assets/csb17com.sqlite3");
      case "csb17.sqlite3":
        return require("../assets/niv11.sqlite3");
      case "csb17com.sqlite3":
        return require("../assets/csb17com.sqlite3");
      case "ylt.sqlite3":
        return require("../assets/ylt.sqlite3");
      case "nlt15.sqlite3":
        return require("../assets/nlt15.sqlite3");
      case "nlt15com.sqlite3":
        return require("../assets/nlt15com.sqlite3");
      case "nkjv.sqlite3":
        return require("../assets/nkjv.sqlite3");
      case "nkjvcom.sqlite3":
        return require("../assets/nkjvcom.sqlite3");
      case "nasb.sqlite3":
        return require("../assets/nasb.sqlite3");
      case "logos.sqlite3":
        return require("../assets/logos.sqlite3");
      case "kj2.sqlite3":
        return require("../assets/kj2.sqlite3");
      case "esv.sqlite3":
        return require("../assets/esv.sqlite3");
      case "esvgsb.sqlite3":
        return require("../assets/esvgsb.sqlite3");
      case "esvgsbcom.sqlite3":
        return require("../assets/esvgsbcom.sqlite3");
      case "iesvth.sqlite3":
        return require("../assets/iesvth.sqlite3");
      case "rv1895.sqlite3":
        return require("../assets/rv1895.sqlite3");
      case "rv1895com.sqlite3":
        return require("../assets/rv1895com.sqlite3");
      case "cebB.sqlite3":
        return require("../assets/cebB.sqlite3");
      case "hilab82.sqlite3":
        return require("../assets/hilab82.sqlite3");
      case "tagab01.sqlite3":
        return require("../assets/tagab01.sqlite3");
      case "tagmb12.sqlite3":
        return require("../assets/tagmb12.sqlite3");
      case "mbb05.sqlite3":
        return require("../assets/mbb05.sqlite3");
      default:
        throw new Error(`Database ${this.dbName} not found in assets`);
    }
  }

  private async ensureInitialized(): Promise<void> {
    if (this.isClosing)
      throw new BibleDatabaseError(
        "Database is closing",
        null,
        "ensureInitialized"
      );
    if (!this.isInitialized) await this.init();
  }

  // REFACTOR: Cached table existence check
  private async tableExists(tableName: string): Promise<boolean> {
    const key = tableName.toLowerCase();
    if (this.tableExistsCache.has(key)) {
      return this.tableExistsCache.get(key)!;
    }

    if (!this.db) return false;
    try {
      const rows = await this.db.getAllAsync<{ name: string }>(
        "SELECT name FROM sqlite_master WHERE type='table' AND name = ?",
        [tableName]
      );
      const exists = rows.length > 0;
      this.tableExistsCache.set(key, exists);
      return exists;
    } catch {
      this.tableExistsCache.set(key, false);
      return false;
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
        await new Promise((r) => setTimeout(r, this.retryDelay));
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
      if (duration > this.slowQueryThreshold)
        console.warn(`Slow operation ${operationName}: ${duration}ms`);
      return result;
    } catch (error) {
      console.error(
        `Operation ${operationName} failed after ${Date.now() - startTime}ms`
      );
      throw error;
    }
  }
}

export {
  BibleDatabase,
  BibleDatabaseError,
  Verse,
  Book,
  Story,
  Introduction,
  DatabaseStats,
};
