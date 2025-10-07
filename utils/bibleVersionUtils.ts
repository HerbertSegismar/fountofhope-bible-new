// utils/bibleVersionUtils.ts

export const VERSION_DISPLAY_NAMES: Record<string, string> = {
  "niv11.sqlite3": "NIV (2011)",
  "csb17.sqlite3": "CSB (2017)",
  "ylt.sqlite3": "YLT",
  "nlt15.sqlite3": "NLT (2015)",
  "nkjv.sqlite3": "NKJV",
  "nasb.sqlite3": "NASB",
  "logos.sqlite3": "Logos Edition",
  "kj2.sqlite3": "King James II",
  "esv.sqlite3": "ESV",
  "esvgsb.sqlite3": "ESV Global Study Bible",
  "iesvth.sqlite3": "English-Greek Interliniar NT",
  "rv1895.sqlite3": "RV1895 with Apocrypa",
};

export const VERSION_DESCRIPTIONS: Record<string, string> = {
  "niv11.sqlite3": "New International Version",
  "csb17.sqlite3": "Christian Standard Bible",
  "ylt.sqlite3": "Young's Literal Translation",
  "nlt15.sqlite3": "New Living Translation",
  "nkjv.sqlite3": "New King James Version",
  "nasb.sqlite3": "New American Standard Bible",
  "logos.sqlite3": "Logos Bible",
  "kj2.sqlite3": "King James 2",
  "esv.sqlite3": "English Standard Version",
  "esvgsb.sqlite3": "ESV Global Study Bible",
  "iesvth.sqlite3": "The Interliniar English-Greek NT",
  "rv1895.sqlite3": "Revised Version with Apocrypha",
};

export const getVersionDisplayName = (version: string): string => {
  return VERSION_DISPLAY_NAMES[version] || version;
};

export const getVersionDescription = (version: string): string => {
  return VERSION_DESCRIPTIONS[version] || "Bible translation";
};
