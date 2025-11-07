export const commentaryDBMap: Record<string, string> = {
  CJB: "cjbcom.sqlite3",
  NLT15: "nlt15com.sqlite3",
  RV1895: "rv1895com.sqlite3",
} as const;

export const DISPLAY_TO_STEM_MAP: Record<string, string> = {
  ASV: "asv+",
  BSB22: "bsb22",
  CJB: "cjb",
  YLT: "ylt",
  NLT15: "nlt15",
  KJ21: "kj21",
  KJV1769: "kjv1769+",
  Logos: "logos",
  KJ2: "kj2",
  mkjv: "mkjv",
  NHEB: "nheb",
  NIOBE: "niobe",
  RNKJV: "rnkjv",
  WEB: "web+",
  WYC: "wyc",
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
    BSB: "bsb22",
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
  cleaned = cleaned.replace(/<[^>]*>/g, "");
  cleaned = cleaned.replace(
    /&(?:larr|rarr|uarr|darr|harr|laquo|raquo|lt|gt);/gi,
    ""
  );
  cleaned = cleaned.replace(/\s+/g, " ").trim();
  return cleaned;
};
