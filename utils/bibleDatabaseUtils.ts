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

export const DISPLAY_TO_STEM_MAP: Record<string, string> = {
  AMPC: "ampc",
  NIV11: "niv11",
  CSB17: "csb17",
  YLT: "ylt",
  NLT15: "nlt15",
  NKJV: "nkjv",
  NASB: "nasb+",
  Logos: "logos",
  KJ2: "kj2",
  KJV1769: "kjv1769+",
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

export const getVersionKey = (
  displayVersion: string | undefined
): string | undefined => {
  if (!displayVersion) return undefined;

  let stem = DISPLAY_TO_STEM_MAP[displayVersion];
  if (stem) {
    return stem.toUpperCase();
  }

  let normalized = displayVersion
    .toUpperCase()
    .replace(/\s*\(\d{4}\)/g, "")
    .trim();

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

export const getDatabaseFilename = (
  displayVersion: string | undefined
): string | undefined => {
  const stem = getVersionKey(displayVersion);
  if (!stem) return undefined;
  return `${stem.toLowerCase()}.sqlite3`;
};

export const stripTags = (text: string): string => {
  let cleaned = text.replace(
    /<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script\s*>/gi,
    ""
  );
  cleaned = cleaned.replace(/<[^>]*>/g, (match, offset, string) => {
    const pos = offset + match.length;
    const textAfter = string.substring(pos);
    if (/^\d+[a-zA-Z]/.test(textAfter)) {
      // Verse reference: number followed by letter, do not add newline
      return "";
    }
    // Plain number start followed by period: add 2 newlines
    if (/^\d+\./.test(textAfter)) {
      return "\n\n";
    }
    const nextChar = textAfter[0];
    // Other plain number start: add space
    return nextChar >= "0" && nextChar <= "9" ? " " : "";
  });
  cleaned = cleaned.replace(
    /&(?:larr|rarr|uarr|darr|harr|laquo|raquo|lt|gt);/gi,
    ""
  );
  // Normalize spaces but preserve newlines
  cleaned = cleaned.replace(/ +/g, " ").replace(/\n+/g, "\n\n").trim();
  return cleaned;
};
