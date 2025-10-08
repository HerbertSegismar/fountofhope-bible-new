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
  DatabaseMigration,
  DatabaseStats,
  SearchOptions
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

  private readonly dbName: string;
  private readonly sqliteDirectory = `${documentDirectory}SQLite`;
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

  // services/BibleDatabase.ts
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
    return this.withRetry(async () => {
      await this.ensureInitialized();
      return await this.db!.getAllAsync<Book>(
        `SELECT book_number, short_name, long_name, book_color 
         FROM books 
         ORDER BY book_number`
      );
    }, "getBooks");
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
      if (!(await this.tableExists("books_all"))) return null;
      return await this.db!.getFirstAsync<Book>(
        "SELECT * FROM books_all WHERE book_number = ?",
        [bookNumber]
      );
    }, `getBookFromAll(${bookNumber})`);
  }

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

  async getChapterCount(bookNumber: number): Promise<number> {
    return this.withRetry(async () => {
      await this.ensureInitialized();
      const result = await this.db!.getFirstAsync<{ max_chapter: number }>(
        "SELECT MAX(chapter) as max_chapter FROM verses WHERE book_number = ?",
        [bookNumber]
      );
      return result?.max_chapter ?? 0;
    }, `getChapterCount(${bookNumber})`);
  }

  async getVerseCount(bookNumber: number, chapter: number): Promise<number> {
    return this.withRetry(async () => {
      await this.ensureInitialized();
      const result = await this.db!.getFirstAsync<{ count: number }>(
        "SELECT COUNT(*) as count FROM verses WHERE book_number = ? AND chapter = ?",
        [bookNumber, chapter]
      );
      return result?.count ?? 0;
    }, `getVerseCount(${bookNumber}, ${chapter})`);
  }

  async getDatabaseStats(): Promise<DatabaseStats> {
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

      return {
        bookCount: bookCountRow?.count ?? 0,
        verseCount: verseCountRow?.count ?? 0,
        storyCount: storyCountRow?.count ?? 0,
        introductionCount: introCountRow?.count ?? 0,
        lastUpdated: new Date(),
      };
    }, "getDatabaseStats");
  }

  // ==================== PRIVATE METHODS ====================

  private async initializeDatabase(): Promise<void> {
    try {
      await this.setupDatabase();
      this.db = await SQLite.openDatabaseAsync(this.dbName);
      await this.runMigrations();
      await this.verifyDatabase();
      this.isInitialized = true;
      console.log(`Bible database ${this.dbName} initialized ✅`);
    } catch (error) {
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
      if (!fileInfo.exists) await this.copyDatabaseFromAssets();
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
        await copyAsync({ from: asset.localUri, to: this.dbPath });
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
        await makeDirectoryAsync(this.sqliteDirectory, { intermediates: true });
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
      case "ylt.sqlite3":
        return require("../assets/ylt.sqlite3");
      case "nlt15.sqlite3":
        return require("../assets/nlt15.sqlite3");
      case "nkjv.sqlite3":
        return require("../assets/nkjv.sqlite3");
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
      case "iesvth.sqlite3":
        return require("../assets/iesvth.sqlite3");
      case "rv1895.sqlite3":
        return require("../assets/rv1895.sqlite3");
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

  private async tableExists(tableName: string): Promise<boolean> {
    if (!this.db) return false;
    try {
      const rows = await this.db.getAllAsync<{ name: string }>(
        "SELECT name FROM sqlite_master WHERE type='table' AND name = ?",
        [tableName]
      );
      return rows.length > 0;
    } catch {
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
