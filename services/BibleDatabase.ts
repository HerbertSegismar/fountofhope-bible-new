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

// Cache manager for better cache organization
class DatabaseCache {
  private queryCache = new Map<string, any>();
  private tableExistsCache = new Map<string, boolean>();
  private chapterCounts = new Map<number, number>();
  private verseCounts = new Map<string, number>();
  private statsCache?: DatabaseStats;

  getQuery<T>(key: string): T | null {
    return this.queryCache.get(key) || null;
  }

  setQuery<T>(key: string, value: T): void {
    this.queryCache.set(key, value);
  }

  getTableExists(tableName: string): boolean | null {
    return this.tableExistsCache.get(tableName.toLowerCase()) || null;
  }

  setTableExists(tableName: string, exists: boolean): void {
    this.tableExistsCache.set(tableName.toLowerCase(), exists);
  }

  getChapterCount(bookNumber: number): number | null {
    return this.chapterCounts.get(bookNumber) || null;
  }

  setChapterCount(bookNumber: number, count: number): void {
    this.chapterCounts.set(bookNumber, count);
  }

  getVerseCount(key: string): number | null {
    return this.verseCounts.get(key) || null;
  }

  setVerseCount(key: string, count: number): void {
    this.verseCounts.set(key, count);
  }

  getStats(): DatabaseStats | null {
    return this.statsCache || null;
  }

  setStats(stats: DatabaseStats): void {
    this.statsCache = stats;
  }

  clear(): void {
    this.queryCache.clear();
    this.tableExistsCache.clear();
    this.chapterCounts.clear();
    this.verseCounts.clear();
    this.statsCache = undefined;
  }
}

class BibleDatabase {
  protected db: SQLite.SQLiteDatabase | null = null;
  private isInitialized = false;
  private initializationPromise: Promise<void> | null = null;
  private isClosing = false;
  private cache = new DatabaseCache();

  private readonly dbName: string;
  private readonly sqliteDirectory = `${FileSystem.documentDirectory}SQLite`;
  private readonly dbPath: string;

  private readonly maxRetries = 3;
  private readonly retryDelay = 1000;
  private readonly slowQueryThreshold = 1000;

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

  // ==================== PUBLIC INTERFACE ====================

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
        this.cache.clear();
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

  // ==================== CORE DATABASE OPERATIONS ====================

  async searchVerses(query: string, options?: SearchOptions): Promise<Verse[]> {
    await this.ensureInitialized();

    let sql = `
      SELECT v.*, b.short_name as book_name 
      FROM verses v 
      JOIN books b ON v.book_number = b.book_number 
      WHERE v.text LIKE ?
    `;

    const params: any[] = [`%${query}%`];

    if (options?.bookRange) {
      sql += ` AND v.book_number BETWEEN ? AND ?`;
      params.push(options.bookRange.start, options.bookRange.end);
    }

    sql += ` ORDER BY v.book_number, v.chapter, v.verse`;

    return this.withRetry(async () => {
      return await this.db!.getAllAsync<Verse>(sql, params);
    }, "searchVerses");
  }

  async getBooks(): Promise<Book[]> {
    const cacheKey = "getBooks";
    const cached = this.cache.getQuery<Book[]>(cacheKey);
    if (cached) return cached;

    const books = await this.withRetry(async () => {
      await this.ensureInitialized();
      return await this.db!.getAllAsync<Book>(
        `SELECT book_number, short_name, long_name, book_color 
         FROM books ORDER BY book_number`
      );
    }, "getBooks");

    this.cache.setQuery(cacheKey, books);
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
      const books = await this.db!.getAllAsync<Book>(
        `SELECT book_number, short_name, long_name, book_color 
         FROM books ORDER BY book_number`
      );
      return books.map((b: any) => ({ ...b, is_present: 1 }));
    }, "getAllBooks");
  }

  async getBook(bookNumber: number): Promise<Book | null> {
    const cacheKey = `getBook:${bookNumber}`;
    const cached = this.cache.getQuery<Book>(cacheKey);
    if (cached) return cached;

    const book = await this.withRetry(async () => {
      await this.ensureInitialized();
      return await this.db!.getFirstAsync<Book>(
        "SELECT * FROM books WHERE book_number = ?",
        [bookNumber]
      );
    }, `getBook(${bookNumber})`);

    if (book) this.cache.setQuery(cacheKey, book);
    return book;
  }

  async getVerses(bookNumber: number, chapter: number): Promise<Verse[]> {
    const cacheKey = `getVerses:${bookNumber}:${chapter}`;
    const cached = this.cache.getQuery<Verse[]>(cacheKey);
    if (cached) return cached;

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

    this.cache.setQuery(cacheKey, verses);
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

  // ==================== COMMENTARY OPERATIONS ====================

  async getCommentary(
    bookNumber: number,
    chapter: number,
    verse: number,
    marker: string
  ): Promise<string | null> {
    return this.withRetry(async () => {
      await this.ensureInitialized();

      if (!(await this.tableExists("commentaries"))) {
        return null;
      }

      const result = await this.db!.getFirstAsync<{ text: string }>(
        `SELECT text FROM commentaries 
         WHERE book_number = ? AND chapter_number_from = ? AND verse_number_from = ? AND marker = ?`,
        [bookNumber, chapter, verse, marker]
      );

      return result?.text || null;
    }, `getCommentary(${bookNumber}, ${chapter}, ${verse}, ${marker})`);
  }

  async getAvailableCommentaryMarkers(
    bookNumber: number,
    chapter: number,
    verse: number
  ): Promise<string[]> {
    return this.withRetry(async () => {
      await this.ensureInitialized();

      if (!(await this.tableExists("commentaries"))) {
        return [];
      }

      const results = await this.db!.getAllAsync<{ marker: string }>(
        `SELECT marker FROM commentaries 
         WHERE book_number = ? AND chapter_number_from = ? AND verse_number_from = ?`,
        [bookNumber, chapter, verse]
      );

      return results.map((r) => r.marker);
    }, `getAvailableCommentaryMarkers(${bookNumber}, ${chapter}, ${verse})`);
  }

  // ==================== METADATA OPERATIONS ====================

  async getChapterCount(bookNumber: number): Promise<number> {
    const cached = this.cache.getChapterCount(bookNumber);
    if (cached !== null) return cached;

    const count = await this.withRetry(async () => {
      await this.ensureInitialized();
      const result = await this.db!.getFirstAsync<{ max_chapter: number }>(
        "SELECT MAX(chapter) as max_chapter FROM verses WHERE book_number = ?",
        [bookNumber]
      );
      return result?.max_chapter ?? 0;
    }, `getChapterCount(${bookNumber})`);

    this.cache.setChapterCount(bookNumber, count);
    return count;
  }

  async getVerseCount(bookNumber: number, chapter: number): Promise<number> {
    const key = `${bookNumber}:${chapter}`;
    const cached = this.cache.getVerseCount(key);
    if (cached !== null) return cached;

    const count = await this.withRetry(async () => {
      await this.ensureInitialized();
      const result = await this.db!.getFirstAsync<{ count: number }>(
        "SELECT COUNT(*) as count FROM verses WHERE book_number = ? AND chapter = ?",
        [bookNumber, chapter]
      );
      return result?.count ?? 0;
    }, `getVerseCount(${bookNumber}, ${chapter})`);

    this.cache.setVerseCount(key, count);
    return count;
  }

  async getDatabaseStats(): Promise<DatabaseStats> {
    const cached = this.cache.getStats();
    if (cached) return cached;

    const stats = await this.withRetry(async () => {
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

      return {
        bookCount: bookCountRow?.count ?? 0,
        verseCount: verseCountRow?.count ?? 0,
        storyCount: storyCountRow?.count ?? 0,
        introductionCount: introCountRow?.count ?? 0,
        lastUpdated: new Date(),
      };
    }, "getDatabaseStats");

    this.cache.setStats(stats);
    return stats;
  }

  // ==================== PRIVATE METHODS ====================

  private async initializeDatabase(): Promise<void> {
    try {
      await this.setupDatabase();
      this.db = await SQLite.openDatabaseAsync(
        this.dbName,
        undefined,
        this.sqliteDirectory
      );
      await this.runMigrations();
      await this.verifyDatabase();
      this.isInitialized = true;
      console.log(`Bible database ${this.dbName} initialized ✅`);
    } catch (error) {
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

      if (!fileInfo.exists) {
        const rootPath = `${FileSystem.documentDirectory}${this.dbName}`;
        const rootInfo = await FileSystem.getInfoAsync(rootPath);

        if (rootInfo.exists && rootInfo.size! > 0) {
          console.log(
            `Migrating legacy DB from root to ${this.sqliteDirectory}`
          );
          await FileSystem.copyAsync({ from: rootPath, to: this.dbPath });
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

      const assetModule = this.getDatabaseAsset();
      const asset = Asset.fromModule(assetModule);

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

      console.log(`Copying from: ${sourceUri} to: ${this.dbPath}`);
      await FileSystem.copyAsync({ from: sourceUri, to: this.dbPath });

      const copiedInfo = await FileSystem.getInfoAsync(this.dbPath);
      if (!copiedInfo.exists || copiedInfo.size === 0) {
        throw new Error(
          `Copy failed - file missing or empty at ${this.dbPath}`
        );
      }

      console.log(
        `Database copied successfully. Size: ${copiedInfo.size} bytes`
      );
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
      if (this.isCommentaryDatabase()) {
        await this.verifyCommentaryDatabase();
      } else {
        await this.verifyMainDatabase();
      }
    } catch (error) {
      throw new BibleDatabaseError(
        "Database verification failed",
        error,
        "verifyDatabase"
      );
    }
  }

  private isCommentaryDatabase(): boolean {
    return this.dbName.includes("com");
  }

  private async verifyMainDatabase(): Promise<void> {
    const requiredTables = ["info", "books", "verses"];
    const tableRows = await this.db!.getAllAsync<{ name: string }>(
      "SELECT name FROM sqlite_master WHERE type='table'"
    );
    const foundTables = tableRows.map((r) => r.name.toLowerCase());
    const missingTables = requiredTables.filter(
      (t) => !foundTables.includes(t)
    );

    if (missingTables.length) {
      throw new Error(`Missing required tables: ${missingTables.join(", ")}`);
    }

    const [bookCount, verseCount] = await Promise.all([
      this.db!.getFirstAsync<{ count: number }>(
        "SELECT COUNT(*) as count FROM books"
      ),
      this.db!.getFirstAsync<{ count: number }>(
        "SELECT COUNT(*) as count FROM verses"
      ),
    ]);

    if (!bookCount || bookCount.count === 0) {
      throw new Error("No books found in database");
    }
  }

  private async verifyCommentaryDatabase(): Promise<void> {
    const tableRows = await this.db!.getAllAsync<{ name: string }>(
      "SELECT name FROM sqlite_master WHERE type='table'"
    );
    const foundTables = tableRows.map((r) => r.name.toLowerCase());

    console.log(`Commentary database tables: ${foundTables.join(", ")}`);

    // Check for commentaries table specifically
    if (!foundTables.includes("commentaries")) {
      // If no commentaries table, check if it's an empty/invalid commentary DB
      const rowCount = await this.db!.getFirstAsync<{ count: number }>(
        `SELECT COUNT(*) as count FROM sqlite_master WHERE type='table' AND name != 'schema_version'`
      );

      if (rowCount?.count === 0) {
        console.warn(
          `Commentary database ${this.dbName} appears to be empty or invalid`
        );
        // Don't throw error - just warn and continue
        return;
      } else {
        throw new Error("Commentaries table not found in commentary database");
      }
    }

    // Verify commentaries table structure
    const columnsInfo = await this.db!.getAllAsync<any>(
      `PRAGMA table_info(commentaries);`
    );
    const columnNames = columnsInfo.map((col: any) => col.name);

    console.log(`Commentaries table columns: ${columnNames.join(", ")}`);

    const requiredColumns = [
      "book_number",
      "chapter_number_from",
      "verse_number_from",
      "marker",
      "text",
    ];
    const missingColumns = requiredColumns.filter(
      (col) => !columnNames.includes(col)
    );

    if (missingColumns.length > 0) {
      throw new Error(
        `Missing required columns in commentaries table: ${missingColumns.join(", ")}`
      );
    }

    // Check data existence
    const rowCount = await this.db!.getFirstAsync<{ count: number }>(
      `SELECT COUNT(*) as count FROM commentaries`
    );
    console.log(`Commentaries table has ${rowCount?.count || 0} rows`);

    if (rowCount?.count === 0) {
      console.warn("Commentaries table is empty");
    }
  }

  private async tableExists(tableName: string): Promise<boolean> {
    const cached = this.cache.getTableExists(tableName);
    if (cached !== null) return cached;

    if (!this.db) return false;

    try {
      const rows = await this.db.getAllAsync<{ name: string }>(
        "SELECT name FROM sqlite_master WHERE type='table' AND name = ?",
        [tableName]
      );
      const exists = rows.length > 0;
      this.cache.setTableExists(tableName, exists);
      return exists;
    } catch {
      this.cache.setTableExists(tableName, false);
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
      if (duration > this.slowQueryThreshold) {
        console.warn(`Slow operation ${operationName}: ${duration}ms`);
      }
      return result;
    } catch (error) {
      console.error(
        `Operation ${operationName} failed after ${Date.now() - startTime}ms`
      );
      throw error;
    }
  }

  async ensureInitialized(): Promise<void> {
    if (this.isClosing) {
      throw new BibleDatabaseError(
        "Database is closing",
        null,
        "ensureInitialized"
      );
    }
    if (!this.isInitialized) await this.init();
  }

  // Keep the existing getDatabaseAsset method unchanged
  private getDatabaseAsset(): number {
    switch (this.dbName) {
      case "ampc.sqlite3":
        return require("../assets/ampc.sqlite3");
      case "ampccom.sqlite3":
        return require("../assets/ampccom.sqlite3");
      case "niv11.sqlite3":
        return require("../assets/niv11.sqlite3");
      case "niv11com.sqlite3":
        return require("../assets/niv11com.sqlite3");
      case "csb17.sqlite3":
        return require("../assets/csb17.sqlite3");
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
      case "esvcom.sqlite3":
        return require("../assets/esvcom.sqlite3");
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
