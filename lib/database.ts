import * as SQLite from "expo-sqlite";

export interface Verse {
  id: number;
  book: string;
  chapter: number;
  verse: number;
  text: string;
  testament: "OT" | "NT";
}

export interface Book {
  id: number;
  name: string;
  testament: "OT" | "NT";
  chapters: number;
}

class BibleDatabase {
  private db: SQLite.SQLiteDatabase | null = null;

  async init(): Promise<void> {
    try {
      this.db = await SQLite.openDatabaseAsync("bible.db");
      await this.createTables();
      await this.insertSampleData();
    } catch (error) {
      console.error("Database initialization failed:", error);
    }
  }

  private async createTables(): Promise<void> {
    if (!this.db) return;

    await this.db.execAsync(`
      CREATE TABLE IF NOT EXISTS books (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL,
        testament TEXT NOT NULL,
        chapters INTEGER NOT NULL
      );

      CREATE TABLE IF NOT EXISTS verses (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        book_id INTEGER NOT NULL,
        chapter INTEGER NOT NULL,
        verse INTEGER NOT NULL,
        text TEXT NOT NULL,
        FOREIGN KEY (book_id) REFERENCES books (id)
      );
    `);
  }

  private async insertSampleData(): Promise<void> {
    if (!this.db) return;

    // Check if data already exists
    const result = await this.db.getFirstAsync<{ count: number }>(
      "SELECT COUNT(*) as count FROM books"
    );

    if (result && result.count > 0) return;

    // Insert sample books
    const books: Omit<Book, "id">[] = [
      { name: "Genesis", testament: "OT", chapters: 50 },
      { name: "Exodus", testament: "OT", chapters: 40 },
      { name: "Matthew", testament: "NT", chapters: 28 },
      { name: "John", testament: "NT", chapters: 21 },
    ];

    for (const book of books) {
      await this.db.runAsync(
        "INSERT INTO books (name, testament, chapters) VALUES (?, ?, ?)",
        [book.name, book.testament, book.chapters]
      );
    }

    // Insert sample verses
    const sampleVerses = [
      {
        book_id: 1,
        chapter: 1,
        verse: 1,
        text: "In the beginning God created the heavens and the earth.",
      },
      {
        book_id: 1,
        chapter: 1,
        verse: 2,
        text: "Now the earth was formless and empty, darkness was over the surface of the deep, and the Spirit of God was hovering over the waters.",
      },
      {
        book_id: 3,
        chapter: 1,
        verse: 1,
        text: "This is the genealogy of Jesus the Messiah the son of David, the son of Abraham:",
      },
    ];

    for (const verse of sampleVerses) {
      await this.db.runAsync(
        "INSERT INTO verses (book_id, chapter, verse, text) VALUES (?, ?, ?, ?)",
        [verse.book_id, verse.chapter, verse.verse, verse.text]
      );
    }
  }

  async getBooks(): Promise<Book[]> {
    if (!this.db) return [];
    return await this.db.getAllAsync<Book>("SELECT * FROM books ORDER BY id");
  }

  async getVerses(bookId: number, chapter: number): Promise<Verse[]> {
    if (!this.db) return [];
    return await this.db.getAllAsync<Verse>(
      `
      SELECT v.*, b.name as book, b.testament 
      FROM verses v 
      JOIN books b ON v.book_id = b.id 
      WHERE v.book_id = ? AND v.chapter = ? 
      ORDER BY v.verse
    `,
      [bookId, chapter]
    );
  }

  async searchVerses(query: string): Promise<Verse[]> {
    if (!this.db) return [];
    return await this.db.getAllAsync<Verse>(
      `
      SELECT v.*, b.name as book, b.testament 
      FROM verses v 
      JOIN books b ON v.book_id = b.id 
      WHERE v.text LIKE ? 
      ORDER BY b.id, v.chapter, v.verse
    `,
      [`%${query}%`]
    );
  }

  async getChapters(bookId: number): Promise<number> {
    if (!this.db) return 0;
    const result = await this.db.getFirstAsync<{ chapters: number }>(
      "SELECT chapters FROM books WHERE id = ?",
      [bookId]
    );
    return result?.chapters || 0;
  }
}

export const bibleDB = new BibleDatabase();
