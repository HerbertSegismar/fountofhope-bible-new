// file: src/utils/bibleDatabaseUtils.ts
import { getTestament } from "./testamentUtils";
import { Verse } from "../types";

export const commentaryDBMap: Record<string, string> = {
  AMPC: "ampccom.sqlite3",
  ESVGSB: "esvgsbcom.sqlite3",
  NKJV: "nkjvcom.sqlite3",
  CSB17: "csb17com.sqlite3",
  ESV: "esvcom.sqlite3",
  NIV11: "niv11com.sqlite3",
  NLT15: "nlt15com.sqlite3",
  RV1895: "rv1895com.sqlite3",
} as const;

// Reverse mapping from display names to stems (e.g., "CSB (2017)" -> "csb17")
export const DISPLAY_TO_STEM_MAP: Record<string, string> = {
  AMPC: "ampc",
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
export const getVersionKey = (
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
  } as const;

  const normKey = normalized.replace(/\s+/g, "");
  stem = normalizedToStem[normKey];
  return stem ? stem.toUpperCase() : undefined;
};

// Get database filename from displayVersion (e.g., "ESV" -> "esv.sqlite3")
export const getDatabaseFilename = (
  displayVersion: string | undefined
): string | undefined => {
  const stem = getVersionKey(displayVersion);
  if (!stem) return undefined;
  return `${stem.toLowerCase()}.sqlite3`;
};

export const stripTags = (text: string): string => {
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
};
