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
    close() {
        throw new Error("Method not implemented.");
    }
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
    runMigrations() {
        throw new Error("Method not implemented.");
    }
    verifyDatabase() {
        throw new Error("Method not implemented.");
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
    ensureDirectoryExists() {
        throw new Error("Method not implemented.");
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

  // ... rest of your BibleDatabase class methods remain the same
  // (getBooks, getVerses, searchVerses, etc.)

  // Add a method to get current database name
  getDatabaseName(): string {
    return this.dbName;
  }

  // Add a method to check if database is the same
  isSameDatabase(dbName: string): boolean {
    return this.dbName === dbName;
  }

  // ... include all the other methods from your original BibleDatabase class
}

export { BibleDatabase, BibleDatabaseError };
