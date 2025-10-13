import React, { useMemo, useState, useCallback, useEffect } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  StyleProp,
  ViewStyle,
  LayoutChangeEvent,
  DimensionValue,
  Modal,
  ScrollView,
  ActivityIndicator,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { Verse } from "../types";
import {
  useTheme,
  type ColorScheme,
  type Theme,
  type FontFamily,
} from "../context/ThemeContext";
import { Platform } from "react-native";
import * as SQLite from "expo-sqlite";

const primaryColors: Record<ColorScheme, { light: string; dark: string }> = {
  purple: { light: "#A855F7", dark: "#9333EA" },
  green: { light: "#10B981", dark: "#059669" },
  red: { light: "#EF4444", dark: "#DC2626" },
  yellow: { light: "#F59E0B", dark: "#D97706" },
};

const BASE_LIGHT_THEME_COLORS = {
  card: "#FFFFFF",
  background: "#FFFFFF",
  surface: "#F8F9FA",
  textPrimary: "#1F2937",
  textSecondary: "#374151",
  textMuted: "#6C757D",
  highlightBg: "#FFF3CD",
  highlightBorder: "#FFD700",
  highlightText: "#8B4513",
  highlightIcon: "#B8860B",
  tagBg: "rgba(0,255,0,0.1)",
  searchHighlightBg: "#FFFF99",
  border: "#E9ECEF",
} as const;

const BASE_DARK_THEME_COLORS = {
  card: "#111827",
  background: "#111827",
  surface: "#1F2937",
  textPrimary: "#F9FAFB",
  textSecondary: "#D1D5DB",
  textMuted: "#9CA3AF",
  highlightBg: "#1F2937",
  highlightBorder: "#FCD34D",
  highlightText: "#FECACA",
  highlightIcon: "#FCD34D",
  tagBg: "rgba(255,255,255,0.1)",
  searchHighlightBg: "#374151",
  border: "#374151",
} as const;

type BaseThemeColors =
  | typeof BASE_LIGHT_THEME_COLORS
  | typeof BASE_DARK_THEME_COLORS;

const getThemeColors = (
  theme: Theme,
  colorScheme: ColorScheme
): ThemeColors => {
  const primary =
    primaryColors[colorScheme][theme === "dark" ? "dark" : "light"];
  const baseColors =
    theme === "dark" ? BASE_DARK_THEME_COLORS : BASE_LIGHT_THEME_COLORS;

  const getLighterColor = (hex: string, amount: number = 50): string => {
    const num = parseInt(hex.replace("#", ""), 16);
    const amt = Math.round(2.55 * amount);
    const R = (num >> 16) + amt;
    const G = ((num >> 8) & 0x00ff) + amt;
    const B = (num & 0x0000ff) + amt;
    return (
      "#" +
      (
        0x1000000 +
        (R < 255 ? (R < 1 ? 0 : R) : 255) * 0x10000 +
        (G < 255 ? (G < 1 ? 0 : G) : 255) * 0x100 +
        (B < 255 ? (B < 1 ? 0 : B) : 255)
      )
        .toString(16)
        .slice(1)
    );
  };

  const lighterPrimary = getLighterColor(primary, theme === "dark" ? 40 : -10);

  return {
    ...baseColors,
    primary,
    verseNumber: lighterPrimary,
    tagColor: primary,
  } as const;
};

type ThemeColors = BaseThemeColors & {
  primary: string;
  verseNumber: string;
  tagColor: string;
};

const bookToNumber: Record<string, number> = {
  Genesis: 1,
  "Gen.": 1,
  "Ge.": 1,
  "Gn.": 1,
  Exodus: 2,
  "Ex.": 2,
  "Exod.": 2,
  "Exo.": 2,
  Leviticus: 3,
  "Lev.": 3,
  "Le.": 3,
  "Lv.": 3,
  Numbers: 4,
  "Num.": 4,
  "Nu.": 4,
  "Nm.": 4,
  "Nb.": 4,
  Deuteronomy: 5,
  "Deut.": 5,
  "De.": 5,
  "Dt.": 5,
  Joshua: 6,
  "Josh.": 6,
  "Jos.": 6,
  "Jsh.": 6,
  Judges: 7,
  "Judg.": 7,
  "Jdg.": 7,
  "Jg.": 7,
  "Jdgs.": 7,
  Ruth: 8,
  "Rth.": 8,
  "Ru.": 8,
  "1 Samuel": 9,
  "1 Sam.": 9,
  "1 Sm.": 9,
  "1 Sa.": 9,
  "1 S.": 9,
  "I Sam.": 9,
  "I Sa.": 9,
  "1Sam.": 9,
  "1Sa.": 9,
  "1S.": 9,
  "1st Samuel": 9,
  "1st Sam.": 9,
  "First Samuel": 9,
  "First Sam.": 9,
  "2 Samuel": 10,
  "2 Sam.": 10,
  "2 Sm.": 10,
  "2 Sa.": 10,
  "2 S.": 10,
  "II Sam.": 10,
  "II Sa.": 10,
  "2Sam.": 10,
  "2Sa.": 10,
  "2S.": 10,
  "2nd Samuel": 10,
  "2nd Sam.": 10,
  "Second Samuel": 10,
  "Second Sam.": 10,
  "1 Kings": 11,
  "1 Kgs": 11,
  "1 Ki": 11,
  "1Kgs": 11,
  "1Kin": 11,
  "1Ki": 11,
  "1K": 11,
  "I Kgs": 11,
  "I Ki": 11,
  "1st Kings": 11,
  "1st Kgs": 11,
  "First Kings": 11,
  "First Kgs": 11,
  "2 Kings": 12,
  "2 Kgs.": 12,
  "2 Ki.": 12,
  "2Kgs.": 12,
  "2Kin.": 12,
  "2Ki.": 12,
  "2K.": 12,
  "II Kgs.": 12,
  "II Ki.": 12,
  "2nd Kings": 12,
  "2nd Kgs.": 12,
  "Second Kings": 12,
  "Second Kgs.": 12,
  "1 Chronicles": 13,
  "1 Chron.": 13,
  "1 Chr.": 13,
  "1 Ch.": 13,
  "1Chron.": 13,
  "1Chr.": 13,
  "1Ch.": 13,
  "I Chron.": 13,
  "I Chr.": 13,
  "I Ch.": 13,
  "1st Chronicles": 13,
  "1st Chron.": 13,
  "First Chronicles": 13,
  "First Chron.": 13,
  "2 Chronicles": 14,
  "2 Chron.": 14,
  "2 Chr.": 14,
  "2 Ch.": 14,
  "2Chron.": 14,
  "2Chr.": 14,
  "2Ch.": 14,
  "II Chron.": 14,
  "II Chr.": 14,
  "II Ch.": 14,
  "2nd Chronicles": 14,
  "2nd Chron.": 14,
  "Second Chronicles": 14,
  "Second Chron.": 14,
  Ezra: 15,
  "Ezr.": 15,
  "Ez.": 15,
  Nehemiah: 16,
  "Neh.": 16,
  "Ne.": 16,
  Esther: 17,
  "Est.": 17,
  "Esth.": 17,
  "Es.": 17,
  Job: 18,
  "Jb.": 18,
  Psalms: 19,
  "Ps.": 19,
  Psalm: 19,
  "Pslm.": 19,
  "Psa.": 19,
  "Psm.": 19,
  "Pss.": 19,
  Proverbs: 20,
  Prov: 20,
  "Pro.": 20,
  "Prv.": 20,
  "Pr.": 20,
  Ecclesiastes: 21,
  "Eccles.": 21,
  "Eccle.": 21,
  "Ecc.": 21,
  "Ec.": 21,
  "Qoh.": 21,
  "Song of Solomon": 22,
  Song: 22,
  "Song of Songs": 22,
  "SOS.": 22,
  "So.": 22,
  "Canticle of Canticles": 22,
  Canticles: 22,
  "Cant.": 22,
  Isaiah: 23,
  "Isa.": 23,
  "Is.": 23,
  Jeremiah: 24,
  "Jer.": 24,
  "Je.": 24,
  "Jr.": 24,
  Lamentations: 25,
  "Lam.": 25,
  "La.": 25,
  Ezekiel: 26,
  "Ezek.": 26,
  "Eze.": 26,
  "Ezk.": 26,
  Daniel: 27,
  "Dan.": 27,
  "Da.": 27,
  "Dn.": 27,
  Hosea: 28,
  "Hos.": 28,
  "Ho.": 28,
  Joel: 29,
  "Jl.": 29,
  Amos: 30,
  "Am.": 30,
  Obadiah: 31,
  "Obad.": 31,
  "Ob.": 31,
  Jonah: 32,
  "Jnh.": 32,
  "Jon.": 32,
  Micah: 33,
  "Mic.": 33,
  "Mc.": 33,
  Nahum: 34,
  "Nah.": 34,
  "Na.": 34,
  Habakkuk: 35,
  "Hab.": 35,
  "Hb.": 35,
  Zephaniah: 36,
  "Zeph.": 36,
  "Zep.": 36,
  "Zp.": 36,
  Haggai: 37,
  "Hag.": 37,
  "Hg.": 37,
  Zechariah: 38,
  "Zech.": 38,
  "Zec.": 38,
  "Zc.": 38,
  Malachi: 39,
  "Mal.": 39,
  "Ml.": 39,
  Matthew: 40,
  "Matt.": 40,
  "Mt.": 40,
  Mark: 41,
  Mrk: 41,
  Mar: 41,
  Mk: 41,
  Mr: 41,
  Luke: 42,
  Luk: 42,
  Lk: 42,
  John: 43,
  Joh: 43,
  Jhn: 43,
  Jn: 43,
  Acts: 44,
  Act: 44,
  Ac: 44,
  Romans: 45,
  "Rom.": 45,
  "Ro.": 45,
  "Rm.": 45,
  "1 Corinthians": 46,
  "1 Cor.": 46,
  "1 Co.": 46,
  "I Cor.": 46,
  "I Co.": 46,
  "1Cor.": 46,
  "1Co.": 46,
  "I Corinthians": 46,
  "1Corinthians": 46,
  "1st Corinthians": 46,
  "First Corinthians": 46,
  "2 Corinthians": 47,
  "2 Cor.": 47,
  "2 Co.": 47,
  "II Cor.": 47,
  "II Co.": 47,
  "2Cor.": 47,
  "2Co.": 47,
  "II Corinthians": 47,
  "2Corinthians": 47,
  "2nd Corinthians": 47,
  "Second Corinthians": 47,
  Galatians: 48,
  "Gal.": 48,
  "Ga.": 48,
  Ephesians: 49,
  "Eph.": 49,
  "Ephes.": 49,
  Philippians: 50,
  "Phil.": 50,
  "Php.": 50,
  "Pp.": 50,
  Colossians: 51,
  "Col.": 51,
  "Co.": 51,
  "1 Thessalonians": 52,
  "1 Thess.": 52,
  "1 Thes.": 52,
  "1 Th.": 52,
  "I Thessalonians": 52,
  "I Thess.": 52,
  "I Thes.": 52,
  "I Th.": 52,
  "1Thessalonians": 52,
  "1Thess.": 52,
  "1Thes.": 52,
  "1Th.": 52,
  "1st Thessalonians": 52,
  "1st Thess.": 52,
  "First Thessalonians": 52,
  "First Thess.": 52,
  "2 Thessalonians": 53,
  "2 Thess.": 53,
  "2 Thes.": 53,
  "2 Th.": 53,
  "II Thessalonians": 53,
  "II Thess.": 53,
  "II Thes.": 53,
  "II Th.": 53,
  "2Thessalonians": 53,
  "2Thess.": 53,
  "2Thes.": 53,
  "2Th.": 53,
  "2nd Thessalonians": 53,
  "2nd Thess.": 53,
  "Second Thessalonians": 53,
  "Second Thess.": 53,
  "1 Timothy": 54,
  "1 Tim.": 54,
  "1 Ti.": 54,
  "I Timothy": 54,
  "I Tim.": 54,
  "I Ti.": 54,
  "1Timothy": 54,
  "1Tim.": 54,
  "1Ti.": 54,
  "1st Timothy": 54,
  "1st Tim.": 54,
  "First Timothy": 54,
  "First Tim.": 54,
  "2 Timothy": 55,
  "2 Tim.": 55,
  "2 Ti.": 55,
  "II Timothy": 55,
  "II Tim.": 55,
  "II Ti.": 55,
  "2Timothy": 55,
  "2Tim.": 55,
  "2Ti.": 55,
  "2nd Timothy": 55,
  "2nd Tim.": 55,
  "Second Timothy": 55,
  "Second Tim.": 55,
  Titus: 56,
  Tit: 56,
  ti: 56,
  Philemon: 57,
  "Philem.": 57,
  "Phm.": 57,
  "Pm.": 57,
  Hebrews: 58,
  "Heb.": 58,
  James: 59,
  Jas: 59,
  Jm: 59,
  "1 Peter": 60,
  "1 Pet.": 60,
  "1 Pe.": 60,
  "1 Pt.": 60,
  "1 P.": 60,
  "I Pet.": 60,
  "I Pt.": 60,
  "I Pe.": 60,
  "1Peter": 60,
  "1Pet.": 60,
  "1Pe.": 60,
  "1Pt.": 60,
  "1P.": 60,
  "I Peter": 60,
  "1st Peter": 60,
  "First Peter": 60,
  "2 Peter": 61,
  "2 Pet.": 61,
  "2 Pe.": 61,
  "2 Pt.": 61,
  "2 P.": 61,
  "II Peter": 61,
  "II Pet.": 61,
  "II Pt.": 61,
  "II Pe.": 61,
  "2Peter": 61,
  "2Pet.": 61,
  "2Pe.": 61,
  "2Pt.": 61,
  "2P.": 61,
  "2nd Peter": 61,
  "Second Peter": 61,
  "1 John": 62,
  "1 Jhn.": 62,
  "1 Jn.": 62,
  "1 J.": 62,
  "1John": 62,
  "1Jhn.": 62,
  "1Joh.": 62,
  "1Jn.": 62,
  "1Jo.": 62,
  "1J.": 62,
  "I John": 62,
  "I Jhn.": 62,
  "I Joh.": 62,
  "I Jn.": 62,
  "I Jo.": 62,
  "1st John": 62,
  "First John": 62,
  "2 John": 63,
  "2 Jhn.": 63,
  "2 Jn.": 63,
  "2 J.": 63,
  "2John": 63,
  "2Jhn.": 63,
  "2Joh.": 63,
  "2Jn.": 63,
  "2Jo.": 63,
  "2J.": 63,
  "II John": 63,
  "II Jhn.": 63,
  "II Joh.": 63,
  "II Jn.": 63,
  "II Jo.": 63,
  "2nd John": 63,
  "Second John": 63,
  "3 John": 64,
  "3 Jhn.": 64,
  "3 Jn.": 64,
  "3 J.": 64,
  "3John": 64,
  "3Jhn.": 64,
  "3Joh.": 64,
  "3Jn.": 64,
  "3Jo.": 64,
  "3J.": 64,
  "III John": 64,
  "III Jhn.": 64,
  "III Joh.": 64,
  "III Jn.": 64,
  "III Jo.": 64,
  "3rd John": 64,
  "Third John": 64,
  Jude: 65,
  "Jud.": 65,
  "Jd.": 65,
  Revelation: 66,
  Rev: 66,
  Re: 66,
  "The Revelation": 66,
};

const commentaryDBMap: Record<string, string> = {
  ESVGSB: "esvgsbcom.sqlite3",
  NKJV: "nkjvcom.sqlite3",
  CSB17: "csb17com.sqlite3",
  ESV: "esvcom.sqlite3",
  NIV11: "niv11com.sqlite3",
  NLT15: "nlt15com.sqlite3",
  RV1895: "rv1895com.sqlite3",
  // Add more as needed, e.g., NASB: "nasbcom.sqlite3" (if exists)
} as const;

// Reverse mapping from display names to stems (e.g., "CSB (2017)" -> "csb17")
const DISPLAY_TO_STEM_MAP: Record<string, string> = {
  NIV11: "niv11",
  CSB17: "csb17",
  YLT: "ylt",
  NLT15: "nlt15",
  NKJV: "nkjv",
  NASB: "nasb",
  Logos: "logos",
  KJ2: "kj2",
  ESV: "esv",
  ESVGSB: "esvgsb",
  IESV: "iesvth",
  RV1895: "rv1895",
  CEBB: "cebB",
  MBB05: "mbb05",
  TAGAB01: "tagab01",
  TAGMB12: "tagmb12",
  HILAB82: "hilab82",
} as const;

// Normalization helper to handle displayVersion variations to map key
const getVersionKey = (
  displayVersion: string | undefined
): string | undefined => {
  if (!displayVersion) return undefined;

  // First, try exact match in reverse map
  let stem = DISPLAY_TO_STEM_MAP[displayVersion];
  if (stem) {
    return stem.toUpperCase();
  }

  // Fallback: Uppercase and remove year in parentheses, e.g., "CSB (2017)" -> "CSB"
  let normalized = displayVersion
    .toUpperCase()
    .replace(/\s*\(\d{4}\)/g, "")
    .trim();

  // Manual mapping for common normalized forms
  const normalizedToStem: Record<string, string> = {
    CSB: "csb17",
    NLT: "nlt15",
    NIV: "niv11",
    RV: "rv1895",
    // Add more if needed
  } as const;

  const normKey = normalized.replace(/\s+/g, "");
  stem = normalizedToStem[normKey];
  return stem ? stem.toUpperCase() : undefined;
};

// Custom hook for commentary loading
const useCommentary = (displayVersion: string | undefined) => {
  const stripTags = useCallback((text: string): string => {
    // Remove entire <script> blocks to filter out JavaScript code
    let cleaned = text.replace(
      /<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script\s*>/gi,
      ""
    );
    // Remove other HTML tags
    cleaned = cleaned.replace(/<[^>]*>/g, "");
    // Filter out arrow HTML entities (e.g., &larr;, &rarr;, etc.)
    cleaned = cleaned.replace(
      /&(?:larr|rarr|uarr|darr|harr|laquo|raquo|lt|gt);/gi,
      ""
    );
    // Normalize whitespace
    cleaned = cleaned.replace(/\s+/g, " ").trim();
    return cleaned;
  }, []);

  const loadCommentaryForVerse = useCallback(
    async (verse: Verse | null, tagContent: string): Promise<string> => {
      if (!verse || !tagContent) {
        return `Marker: "${tagContent}"`;
      }

      // Use normalized key for better mapping
      const versionKey = getVersionKey(displayVersion);
      const dbName = versionKey
        ? commentaryDBMap[versionKey as keyof typeof commentaryDBMap]
        : undefined;

      console.log(
        `[Commentary] Attempting to load for version: ${displayVersion} (normalized key: ${versionKey}), DB: ${dbName}`
      );

      if (!dbName) {
        console.log(
          `[Commentary] No DB mapping for normalized key ${versionKey}`
        );
        return `Marker: "${tagContent}" (Commentary not available for ${displayVersion})`;
      }

      // Early check if tagContent looks like a commentary marker (short/symbol, not full phrase)
      if (
        tagContent.length > 20 ||
        (tagContent.length > 5 && !/^[††ⓐ-ⓩ\[\]0-9\s\-–]+$/.test(tagContent))
      ) {
        console.log(
          `[Commentary] Skipping query for long/phrase marker: "${tagContent}" (likely not a commentary tag)`
        );
        return `Marker: "${tagContent}" (Not a commentary reference)`;
      }

      let db: SQLite.SQLiteDatabase | null = null;
      try {
        console.log(`[Commentary] Opening DB: ${dbName}`);
        db = SQLite.openDatabaseSync(dbName, { useNewConnection: true });

        console.log(
          `[Commentary] Searching for suitable commentary table in ${dbName}`
        );
        let commentaryTable: string | null = null;
        const requiredColumns = [
          "book_number",
          "chapter_number_from",
          "verse_number_from",
          "marker",
          "text",
        ];

        // First, check for 'commentaries' table
        let tableCheck = await db.getFirstAsync<{ name: string }>(`
          SELECT name FROM sqlite_master WHERE type='table' AND name='commentaries';
        `);
        if (tableCheck) {
          const cols = await db.getAllAsync<any>(
            `PRAGMA table_info(commentaries);`
          );
          const hasAll = requiredColumns.every((col) =>
            cols.some((c: any) => c.name === col)
          );
          if (hasAll) {
            commentaryTable = "commentaries";
            console.log(`[Commentary] Using 'commentaries' table in ${dbName}`);
          }
        }

        // If not found or doesn't have required columns, search other tables
        if (!commentaryTable) {
          const allTables = await db.getAllAsync<{ name: string }>(`
            SELECT name FROM sqlite_master WHERE type='table' AND name != 'sqlite_sequence';
          `);
          console.log(
            `[Commentary] Available tables in ${dbName}:`,
            allTables.map((t) => t.name)
          );

          for (const t of allTables) {
            try {
              const cols = await db.getAllAsync<any>(
                `PRAGMA table_info(${t.name});`
              );
              const hasAll = requiredColumns.every((col) =>
                cols.some((c: any) => c.name === col)
              );
              if (hasAll) {
                commentaryTable = t.name;
                console.log(
                  `[Commentary] Found suitable table '${commentaryTable}' in ${dbName}`
                );
                break;
              }
            } catch (e) {
              console.log(`[Commentary] Error checking table ${t.name}:`, e);
            }
          }
        }

        if (!commentaryTable) {
          console.log(`[Commentary] No suitable table found in ${dbName}`);
          await db.closeAsync();
          db = null;
          return `Marker: "${tagContent}" (No suitable commentaries table in database for ${displayVersion})`;
        }

        // Get schema for the found table
        const columnsInfo = await db.getAllAsync<any>(
          `PRAGMA table_info(${commentaryTable});`
        );
        console.log(
          `[Commentary] Schema for '${commentaryTable}' table in ${dbName}:`,
          columnsInfo.map((col: any) => ({
            name: col.name,
            type: col.type,
            notnull: col.notnull,
            pk: col.pk,
          }))
        );
        // Specifically check/log if 'is_preceding' exists
        const hasPreceding = columnsInfo.some(
          (col: any) => col.name === "is_preceding"
        );
        console.log(
          `[Commentary] 'is_preceding' column ${hasPreceding ? "EXISTS" : "MISSING"} in ${dbName}`
        );

        // Log total row count for debugging
        const totalCount = await db.getFirstAsync<{ count: number }>(
          `SELECT COUNT(*) as count FROM ${commentaryTable}`
        );
        console.log(
          `[Commentary] Total commentaries in ${dbName}: ${totalCount?.count || 0}`
        );
        if (totalCount?.count === 0) {
          console.log(
            `[Commentary] WARNING: Commentary table is empty in ${dbName} - check file bundling/loading`
          );
          return `Marker: "${tagContent}" (Empty commentaries database for ${displayVersion})`;
        }

        // Check for rows matching book/chapter (ignoring verse/marker for broad check)
        const bookChapterCount = await db.getFirstAsync<{ count: number }>(
          `SELECT COUNT(*) as count FROM ${commentaryTable} WHERE book_number = ? AND chapter_number_from = ?`,
          [verse.book_number, verse.chapter]
        );
        console.log(
          `[Commentary] Commentaries for book ${verse.book_number}, chapter ${verse.chapter} in ${dbName}: ${bookChapterCount?.count || 0}`
        );

        // Adaptive query for 'is_preceding' if it exists
        let result: { text: string } | null = null;
        if (hasPreceding) {
          console.log(
            `[Commentary] 'is_preceding' exists; trying query with filter (is_preceding = 0 for verse-specific)`
          );
          result = await db.getFirstAsync<{ text: string }>(
            `SELECT text FROM ${commentaryTable} WHERE book_number = ? AND chapter_number_from = ? AND verse_number_from = ? AND marker = ? AND is_preceding = 0`,
            [verse.book_number, verse.chapter, verse.verse, tagContent]
          );
          if (!result) {
            console.log(
              `[Commentary] No result with is_preceding=0; trying without filter`
            );
            result = await db.getFirstAsync<{ text: string }>(
              `SELECT text FROM ${commentaryTable} WHERE book_number = ? AND chapter_number_from = ? AND verse_number_from = ? AND marker = ?`,
              [verse.book_number, verse.chapter, verse.verse, tagContent]
            );
          }
          if (!result) {
            console.log(
              `[Commentary] No result without filter; trying is_preceding=1 (preceding note)`
            );
            result = await db.getFirstAsync<{ text: string }>(
              `SELECT text FROM ${commentaryTable} WHERE book_number = ? AND chapter_number_from = ? AND verse_number_from = ? AND marker = ? AND is_preceding = 1`,
              [verse.book_number, verse.chapter, verse.verse, tagContent]
            );
          }
        } else {
          console.log(`[Commentary] No 'is_preceding'; using standard query`);
          result = await db.getFirstAsync<{ text: string }>(
            `SELECT text FROM ${commentaryTable} WHERE book_number = ? AND chapter_number_from = ? AND verse_number_from = ? AND marker = ?`,
            [verse.book_number, verse.chapter, verse.verse, tagContent]
          );
        }

        console.log(
          `[Commentary] Querying for book: ${verse.book_number}, chapter: ${verse.chapter}, verse: ${verse.verse}, marker: "${tagContent}"`
        );

        if (!result?.text) {
          console.log(
            `[Commentary] No result found for the exact query in ${dbName}`
          );
          // Try a broader query without verse/marker for debugging
          const broadResult = await db.getFirstAsync<{ text: string }>(
            `SELECT text FROM ${commentaryTable} WHERE book_number = ? AND chapter_number_from = ? LIMIT 1`,
            [verse.book_number, verse.chapter]
          );
          if (broadResult?.text) {
            console.log(
              `[Commentary] But found a commentary for the book/chapter: ${broadResult.text.substring(0, 100)}...`
            );
          }
        } else {
          console.log(
            `[Commentary] Found commentary in ${dbName} (length: ${result.text.length})`
          );
        }

        return stripTags(
          result?.text || `No commentary found for marker "${tagContent}".`
        );
      } catch (error) {
        console.error(`[Commentary] Error querying ${dbName}:`, error);
        if (error instanceof Error) {
          console.error(`[Commentary] Error message: ${error.message}`);
          console.error(`[Commentary] Error stack: ${error.stack}`);
        }
        return "Error loading commentary.";
      } finally {
        if (db) {
          await db.closeAsync();
          console.log(`[Commentary] Closed DB: ${dbName}`);
        }
      }
    },
    [displayVersion, stripTags]
  );

  return { loadCommentaryForVerse };
};

const parseXmlTags = (text: string): any[] => {
  if (!text) return [];

  const nodes = [];
  let currentText = "";
  let i = 0;

  while (i < text.length) {
    if (text[i] === "<") {
      // Push any accumulated text before the tag
      if (currentText) {
        nodes.push({ type: "text", content: currentText });
        currentText = "";
      }

      // Find the end of the tag
      const tagEnd = text.indexOf(">", i);
      if (tagEnd === -1) {
        currentText += text.substring(i);
        break;
      }

      const fullTag = text.substring(i, tagEnd + 1);

      if (fullTag.startsWith("</")) {
        // Closing tag
        nodes.push({ type: "closing-tag", tag: fullTag });
      } else if (fullTag.endsWith("/>")) {
        // Self-closing tag
        const tagName = fullTag.slice(1, -2).trim();
        nodes.push({ type: "self-closing-tag", tag: tagName, fullTag });
      } else {
        // Opening tag
        const tagName = fullTag.slice(1, -1).trim().split(" ")[0]; // Get just the tag name, not attributes
        nodes.push({ type: "opening-tag", tag: tagName, fullTag });
      }

      i = tagEnd + 1;
    } else {
      currentText += text[i];
      i++;
    }
  }

  // Push any remaining text
  if (currentText) {
    nodes.push({ type: "text", content: currentText });
  }

  return nodes;
};

// Build a tree structure from parsed nodes to handle nesting
const buildTree = (nodes: any[]): any[] => {
  const stack: any[] = [];
  const root: any[] = [];
  let currentParent = { children: root };

  for (const node of nodes) {
    if (node.type === "opening-tag") {
      const element = {
        type: "element",
        tag: node.tag,
        fullTag: node.fullTag,
        children: [],
      };
      currentParent.children.push(element);
      stack.push(currentParent);
      currentParent = element;
    } else if (node.type === "closing-tag") {
      if (stack.length > 0) {
        currentParent = stack.pop()!;
      }
    } else if (node.type === "self-closing-tag") {
      currentParent.children.push(node);
    } else if (node.type === "text") {
      currentParent.children.push(node);
    }
  }

  return root;
};

// Render the tree to React elements
const renderTree = (
  tree: any[],
  baseFontSize: number,
  themeColors: ThemeColors,
  highlight?: string,
  fontFamily?: string,
  onTagPress?: (content: string) => void
): React.ReactNode[] => {
  const elements: React.ReactNode[] = [];
  let key = 0;

  const renderNode = (node: any): React.ReactNode => {
    key++;

    if (node.type === "text") {
      return renderTextWithHighlight(
        node.content,
        themeColors,
        highlight,
        `text-${key}`,
        fontFamily
      );
    } else if (node.type === "self-closing-tag") {
      const content = extractContentFromTag(node.fullTag);
      const isNumber = /^\d+$/.test(content.trim());
      const tagContent = content.trim();
      return (
        <Text
          key={`self-${key}`}
          onPress={() => onTagPress?.(tagContent)}
          style={{
            fontSize: isNumber ? baseFontSize * 0.5 : baseFontSize * 0.95,
            color: themeColors.tagColor,
            backgroundColor: themeColors.tagBg,
            fontFamily,
          }}
        >
          {content}
        </Text>
      );
    } else if (node.type === "element") {
      // Handle opening tags with children
      const children = node.children.map((child: any, idx: number) =>
        renderNode({ ...child, key: `${key}-${idx}` })
      );

      const isNumber =
        node.tag === "S" &&
        node.children.length === 1 &&
        node.children[0].type === "text" &&
        /^\d+$/.test(node.children[0].content.trim());

      const tagContent = node.children
        .map((child: any) => (child.type === "text" ? child.content : ""))
        .join("")
        .trim();

      return (
        <Text
          key={`elem-${key}`}
          onPress={() => onTagPress?.(tagContent)}
          style={{
            fontSize: isNumber ? baseFontSize * 0.5 : baseFontSize * 0.95,
            color: themeColors.tagColor,
            fontFamily,
          }}
        >
          {children}
        </Text>
      );
    }

    return null;
  };

  for (const node of tree) {
    elements.push(renderNode(node));
  }

  return elements;
};

// Extract content from between tags
const extractContentFromTag = (tag: string): string => {
  // For self-closing tags, extract any potential content
  const match = tag.match(/<[^>]+>([^<]*)<\/[^>]+>/);
  return match ? match[1] : "";
};

// Render text with highlighting
const renderTextWithHighlight = (
  text: string,
  themeColors: ThemeColors,
  highlight?: string,
  keyPrefix?: string,
  fontFamily?: string
): React.ReactNode => {
  if (!highlight || !text)
    return (
      <Text key={keyPrefix} style={{ fontFamily }}>
        {text}
      </Text>
    );

  const cleanText = text.replace(/<[^>]+>/g, "");
  if (!cleanText)
    return (
      <Text key={keyPrefix} style={{ fontFamily }}>
        {text}
      </Text>
    );

  const regex = new RegExp(`(${escapeRegex(highlight)})`, "gi");
  const parts = cleanText.split(regex);

  return (
    <Text key={keyPrefix} style={{ fontFamily }}>
      {parts.map((part, i) =>
        part.toLowerCase() === highlight.toLowerCase() ? (
          <Text
            key={`${keyPrefix}-${i}`}
            style={{ backgroundColor: themeColors.searchHighlightBg }}
          >
            {part}
          </Text>
        ) : (
          <Text key={`${keyPrefix}-${i}`}>{part}</Text>
        )
      )}
    </Text>
  );
};

// Helper to escape regex special characters
const escapeRegex = (string: string) => {
  return string.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
};

// Improved verse text rendering
const renderVerseTextWithXmlHighlight = (
  text: string,
  baseFontSize: number,
  themeColors: ThemeColors,
  highlight?: string,
  fontFamily?: string,
  onTagPress?: (content: string) => void
): React.ReactNode[] => {
  if (!text) return [];

  try {
    const nodes = parseXmlTags(text);
    const tree = buildTree(nodes);
    return renderTree(
      tree,
      baseFontSize,
      themeColors,
      highlight,
      fontFamily,
      onTagPress
    );
  } catch (error) {
    console.error("Error parsing XML tags:", error);
    // Fallback to simple text rendering
    return [
      renderTextWithHighlight(
        text,
        themeColors,
        highlight,
        "fallback",
        fontFamily
      ),
    ];
  }
};

// Render commentary text with clickable verse references
const renderCommentaryWithVerseLinks = (
  text: string,
  themeColors: ThemeColors,
  fontFamily: string | undefined,
  onNavigate: (bookNum: number, chapter: number, verse: number) => void
): React.ReactNode[] => {
  if (!text) return [];

  const bookKeys = Object.keys(bookToNumber);
  const escapedKeys = bookKeys.map(escapeRegex);
  const bookPattern = escapedKeys.join("|");
  const verseRegex = new RegExp(
    `\\b(${bookPattern})\\s+(\\d+)\\s*:\\s*(\\d+)(?:\\s*-\\s*(\\d+))?\\b`,
    "gi"
  );

  const parts: React.ReactNode[] = [];
  let lastIndex = 0;
  let match: RegExpExecArray | null;

  while ((match = verseRegex.exec(text)) !== null) {
    // Add plain text before the match
    if (match.index > lastIndex) {
      const plainText = text.slice(lastIndex, match.index);
      parts.push(
        <Text
          key={parts.length}
          style={{
            color: themeColors.textPrimary,
            fontSize: 16,
            lineHeight: 24,
            fontFamily,
          }}
        >
          {plainText}
        </Text>
      );
    }

    // The verse reference match
    const bookStr = match[1];
    const chapter = parseInt(match[2], 10);
    const verseStart = parseInt(match[3], 10);
    const verseEnd = match[4] ? parseInt(match[4], 10) : verseStart;
    const refText = text.slice(match.index, verseRegex.lastIndex);

    const bookNum = bookToNumber[bookStr];
    if (bookNum !== undefined) {
      parts.push(
        <TouchableOpacity
          key={parts.length}
          onPress={() => onNavigate(bookNum, chapter, verseStart)}
          activeOpacity={0.7}
        >
          <Text
            style={{
              color: themeColors.primary,
              textDecorationLine: "underline",
              fontSize: 16,
              lineHeight: 24,
              fontFamily,
            }}
          >
            {refText}
          </Text>
        </TouchableOpacity>
      );
    } else {
      // Not a recognized reference, render as plain text
      parts.push(
        <Text
          key={parts.length}
          style={{
            color: themeColors.textPrimary,
            fontSize: 16,
            lineHeight: 24,
            fontFamily,
          }}
        >
          {refText}
        </Text>
      );
    }

    lastIndex = verseRegex.lastIndex;
  }

  // Remaining plain text
  if (lastIndex < text.length) {
    const plainText = text.slice(lastIndex);
    parts.push(
      <Text
        key={parts.length}
        style={{
          color: themeColors.textPrimary,
          fontSize: 16,
          lineHeight: 24,
          fontFamily,
        }}
      >
        {plainText}
      </Text>
    );
  }

  return parts;
};

// Helper function to determine text color based on background color
const getContrastColor = (
  backgroundColor: string,
  themeColors: ThemeColors
): string => {
  // Default to theme text primary if no background color
  if (!backgroundColor) return themeColors.textPrimary;

  // Convert hex color to RGB
  const hex = backgroundColor.replace("#", "");
  const r = parseInt(hex.substr(0, 2), 16);
  const g = parseInt(hex.substr(2, 2), 16);
  const b = parseInt(hex.substr(4, 2), 16);

  // Calculate luminance
  const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255;

  // Return dark text for light colors, light text for dark colors
  return luminance > 0.5 ? themeColors.textSecondary : themeColors.textPrimary;
};

// Map fontFamily to actual font family string
const getFontFamily = (fontFamily: FontFamily): string | undefined => {
  switch (fontFamily) {
    case "serif":
      return Platform.OS === "ios" ? "Georgia" : "serif";
    case "sans-serif":
      return Platform.OS === "ios" ? "Helvetica Neue" : "sans-serif";
    case "system":
    default:
      return undefined;
  }
};

const STYLES = {
  container: {
    borderRadius: 8,
    shadowOpacity: 0.1,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 2 },
    elevation: 2,
    minHeight: 400,
    alignSelf: "stretch" as const,
    width: "100%" as DimensionValue,
    overflow: "hidden",
  },
  verse: {
    flexDirection: "row" as const,
    alignItems: "flex-start" as const,
  },
  verseNumber: {
    includeFontPadding: false,
  },
  verseText: {
    textAlign: "left" as const,
    flex: 1,
    minWidth: 0,
  },
} as const;

interface ChapterViewProps {
  verses: Verse[];
  bookName: string;
  chapterNumber: number;
  onPress?: () => void;
  showVerseNumbers?: boolean;
  fontSize?: number;
  onVersePress?: (verse: Verse) => void;
  onVerseLayout?: (verseNumber: number, event: LayoutChangeEvent) => void;
  onVerseRef?: (verseNumber: number, ref: View | null) => void;
  highlightVerse?: number;
  highlightedVerses?: Set<number>;
  bookmarkedVerses?: Set<number>;
  style?: StyleProp<ViewStyle>;
  bookId?: number;
  isFullScreen?: boolean;
  displayVersion?: string;
  colors?: any;
  onNavigateToVerse?: (
    bookNumber: number,
    chapter: number,
    verse: number
  ) => void;
}

export const ChapterViewEnhanced: React.FC<ChapterViewProps> = ({
  verses,
  bookName,
  chapterNumber,
  onPress,
  showVerseNumbers = true,
  fontSize = 16,
  onVersePress,
  onVerseLayout,
  onVerseRef,
  highlightVerse,
  highlightedVerses = new Set(),
  bookmarkedVerses = new Set(),
  style,
  isFullScreen,
  displayVersion,
  onNavigateToVerse,
}) => {
  const { theme, colorScheme, fontFamily } = useTheme();
  const themeColors = getThemeColors(theme, colorScheme);
  const actualFontFamily = getFontFamily(fontFamily);
  const { loadCommentaryForVerse } = useCommentary(displayVersion);

  const [showTagModal, setShowTagModal] = useState(false);
  const [tagContent, setTagContent] = useState("");
  const [selectedVerse, setSelectedVerse] = useState<Verse | null>(null);
  const [commentaryLoading, setCommentaryLoading] = useState(false);
  const [commentaryText, setCommentaryText] = useState("");

  // Load commentary when modal opens
  useEffect(() => {
    if (showTagModal && selectedVerse && tagContent) {
      const load = async () => {
        setCommentaryLoading(true);
        const text = await loadCommentaryForVerse(selectedVerse, tagContent);
        setCommentaryText(text);
        setCommentaryLoading(false);
      };
      load();
    } else if (showTagModal) {
      setCommentaryText(`Marker: "${tagContent}"`);
      setCommentaryLoading(false);
    }
  }, [showTagModal, selectedVerse, tagContent, loadCommentaryForVerse]);

  const handleTagPress = useCallback((content: string, verse: Verse) => {
    setTagContent(content);
    setSelectedVerse(verse);
    setShowTagModal(true);
  }, []);

  // Sort verses by verse number
  const sortedVerses = useMemo(
    () => [...verses].sort((a, b) => a.verse - b.verse),
    [verses]
  );

  const handleVerseLayout = (verseNumber: number, event: LayoutChangeEvent) => {
    onVerseLayout?.(verseNumber, event);
  };

  const handleVerseRef = (verseNumber: number, ref: View | null) => {
    if (ref) {
      onVerseRef?.(verseNumber, ref);
    }
  };

  const handleVersePress = (verse: Verse) => {
    onVersePress?.(verse);
  };

  const getHeaderTitle = () => {
    let title = `${bookName} ${chapterNumber}`;
    if (highlightVerse) {
      title += ` : ${highlightVerse}`;
    }
    return title;
  };

  const versionText = useMemo(
    () => (displayVersion ? ` • ${displayVersion.toUpperCase()}` : ""),
    [displayVersion]
  );

  // Get book color and calculate contrast text color
  const bookColor = sortedVerses[0]?.book_color || themeColors.primary;
  const headerTextColor = getContrastColor(bookColor, themeColors);

  if (sortedVerses.length === 0) {
    return (
      <View
        style={[
          {
            backgroundColor: themeColors.card,
            padding: isFullScreen ? 8 : 16,
            borderRadius: 8,
            borderWidth: 1,
            borderColor: themeColors.border,
          },
          style,
        ]}
      >
        <Text
          style={{
            textAlign: "center",
            color: themeColors.textMuted,
            fontSize: isFullScreen ? 14 : 16,
            fontFamily: actualFontFamily,
          }}
        >
          No verses available
        </Text>
      </View>
    );
  }

  const renderVerseItem = (verse: Verse) => {
    const isHighlighted =
      highlightedVerses.has(verse.verse) || verse.verse === highlightVerse;
    const localOnTagPress = useCallback(
      (content: string) => {
        handleTagPress(content, verse);
      },
      [handleTagPress, verse]
    );
    const renderedText = useMemo(
      () =>
        renderVerseTextWithXmlHighlight(
          verse.text,
          fontSize,
          themeColors,
          undefined,
          actualFontFamily,
          localOnTagPress
        ),
      [verse.text, fontSize, themeColors, actualFontFamily, localOnTagPress]
    );

    return (
      <TouchableOpacity
        key={verse.verse}
        activeOpacity={onVersePress ? 0.7 : 1}
        onPress={() => handleVersePress(verse)}
      >
        <View
          style={[
            STYLES.verse,
            {
              backgroundColor: isHighlighted
                ? themeColors.highlightBg
                : "transparent",
              borderRadius: 6,
              padding: isHighlighted ? (isFullScreen ? 4 : 8) : 0,
              borderWidth: isHighlighted ? 1 : 0,
              borderColor: isHighlighted
                ? themeColors.highlightBorder
                : "transparent",
              marginBottom: isFullScreen ? 4 : 8,
            },
          ]}
          onLayout={(event) => handleVerseLayout(verse.verse, event)}
          ref={(ref) => handleVerseRef(verse.verse, ref)}
        >
          <View style={{ flexDirection: "row", alignItems: "flex-start" }}>
            {showVerseNumbers && (
              <View
                style={{
                  flexDirection: "row",
                  alignItems: "center",
                  minWidth: isFullScreen ? 18 : 20,
                  marginRight: isFullScreen ? 0 : 2,
                  ...STYLES.verseNumber,
                }}
              >
                <Text
                  style={{
                    fontSize: isFullScreen ? fontSize - 6 : fontSize - 4,
                    fontWeight: "600",
                    color: isHighlighted
                      ? themeColors.highlightIcon
                      : themeColors.verseNumber,
                    fontFamily: actualFontFamily,
                  }}
                >
                  {verse.verse}
                </Text>
                {isHighlighted && (
                  <Ionicons
                    name="star"
                    size={isFullScreen ? 10 : 12}
                    color={themeColors.highlightIcon}
                    style={{ marginLeft: 2 }}
                  />
                )}
              </View>
            )}
            <View
              style={{
                ...STYLES.verseText,
                flexDirection: "row",
                alignItems: "flex-start",
              }}
            >
              <Text
                style={{
                  fontSize,
                  lineHeight: fontSize * 1.4,
                  flexShrink: 1,
                  flexWrap: "wrap",
                  color: isHighlighted
                    ? themeColors.highlightText
                    : themeColors.textPrimary,
                  fontFamily: actualFontFamily,
                }}
                numberOfLines={0}
              >
                {renderedText}
              </Text>
              {bookmarkedVerses.has(verse.verse) && (
                <Ionicons
                  name="bookmark"
                  size={isFullScreen ? 14 : 16}
                  color={themeColors.primary}
                  style={{ marginLeft: 8, marginTop: 2 }}
                />
              )}
            </View>
          </View>
        </View>
      </TouchableOpacity>
    );
  };

  const renderVerses = () => {
    return (
      <View style={{ gap: isFullScreen ? 4 : 12 }}>
        {sortedVerses.map(renderVerseItem)}
      </View>
    );
  };

  // Container style
  const containerStyle: ViewStyle = {
    ...STYLES.container,
    backgroundColor: themeColors.card,
  };

  // Adjust padding for full screen mode
  const adjustedStyle = isFullScreen
    ? { ...containerStyle, paddingHorizontal: 8 }
    : containerStyle;

  const chapterContent = (
    <View style={[adjustedStyle, style]}>
      {/* Colored Header */}
      <View
        style={{
          backgroundColor: bookColor,
          paddingHorizontal: isFullScreen ? 8 : 12,
          paddingVertical: isFullScreen ? 6 : 8,
          borderTopLeftRadius: 8,
          borderTopRightRadius: 8,
        }}
      >
        <View
          style={{
            flexDirection: "row",
            justifyContent: "space-between",
            alignItems: "center",
          }}
        >
          <View style={{ flex: 1 }}>
            <Text
              style={{
                color: "#41315eff",
                fontSize: isFullScreen ? 10 : 14,
                fontWeight: "600",
                fontFamily: actualFontFamily,
              }}
              numberOfLines={2}
            >
              {getHeaderTitle()}
            </Text>
          </View>

          {versionText && (
            <Text
              style={{
                color: "#654f74ff",
                fontSize: isFullScreen ? 10 : 12,
                opacity: 0.9,
                marginLeft: 8,
                fontFamily: actualFontFamily,
              }}
            >
              {versionText.replace(" • ", "")}
            </Text>
          )}
        </View>
      </View>

      {/* Verse Content */}
      <View
        style={{
          padding: isFullScreen ? 8 : 16,
          paddingTop: isFullScreen ? 6 : 12,
        }}
      >
        {renderVerses()}

        {/* Footer */}
        <View
          style={{
            marginTop: isFullScreen ? 8 : 16,
            paddingTop: isFullScreen ? 6 : 12,
            borderTopWidth: 1,
            borderTopColor: themeColors.border,
          }}
        >
          <Text
            style={{
              textAlign: "center",
              color: themeColors.textMuted,
              fontSize: 10,
              fontFamily: actualFontFamily,
            }}
            numberOfLines={1}
            ellipsizeMode="tail"
          >
            {sortedVerses.length} verse{sortedVerses.length !== 1 ? "s" : ""}
            {highlightedVerses.size > 0 &&
              ` • ${highlightedVerses.size} highlighted`}
            {bookmarkedVerses.size > 0 &&
              ` • ${bookmarkedVerses.size} bookmarked`}
          </Text>
        </View>
      </View>
    </View>
  );

  if (onPress) {
    return (
      <TouchableOpacity onPress={onPress} activeOpacity={0.7}>
        {chapterContent}
      </TouchableOpacity>
    );
  }

  return (
    <>
      {chapterContent}
      <Modal
        visible={showTagModal}
        transparent
        animationType="fade"
        onRequestClose={() => setShowTagModal(false)}
      >
        <View
          style={{
            flex: 1,
            justifyContent: "center",
            alignItems: "center",
            backgroundColor: "rgba(0,0,0,0.5)",
          }}
        >
          <View
            style={{
              backgroundColor: themeColors.card,
              padding: 20,
              borderRadius: 10,
              width: "80%",
              maxHeight: "80%",
              alignItems: "center",
            }}
          >
            <Text
              style={{
                color: themeColors.textPrimary,
                fontSize: 18,
                fontWeight: "bold",
                marginBottom: 10,
                textAlign: "center",
                fontFamily: actualFontFamily,
              }}
            >
              Commentary for marker "{tagContent}"
            </Text>
            {selectedVerse && (
              <Text
                style={{
                  color: themeColors.textMuted,
                  fontSize: 14,
                  marginBottom: 10,
                  textAlign: "center",
                  fontFamily: actualFontFamily,
                }}
              >
                {selectedVerse.book_name} {selectedVerse.chapter}:
                {selectedVerse.verse}
              </Text>
            )}
            {commentaryLoading ? (
              <ActivityIndicator size="small" color={themeColors.primary} />
            ) : (
              <ScrollView style={{ maxHeight: 200, width: "100%" }}>
                <View style={{ flexDirection: "row", flexWrap: "wrap" }}>
                  {renderCommentaryWithVerseLinks(
                    commentaryText,
                    themeColors,
                    actualFontFamily,
                    (bookNum, chapter, verse) => {
                      setShowTagModal(false);
                      onNavigateToVerse?.(bookNum, chapter, verse);
                    }
                  )}
                </View>
              </ScrollView>
            )}
            <TouchableOpacity
              onPress={() => setShowTagModal(false)}
              style={{
                backgroundColor: themeColors.primary,
                paddingHorizontal: 20,
                paddingVertical: 10,
                borderRadius: 5,
                marginTop: 10,
              }}
              activeOpacity={0.7}
            >
              <Text
                style={{
                  color: "#FFFFFF",
                  fontWeight: "600",
                }}
              >
                Close
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </>
  );
};
