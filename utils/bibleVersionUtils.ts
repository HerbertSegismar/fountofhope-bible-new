// utils/bibleVersionUtils.ts

export const VERSION_DISPLAY_NAMES: Record<string, string> = {
  "niv11.sqlite3": "NIV (2011)",
  "csb17.sqlite3": "CSB (2017)",
  "ylt.sqlite3": "YLT",
  "nlt15.sqlite3": "NLT (2015)",
  "nkjv.sqlite3": "NKJV",
  "nasb.sqlite3": "NASB",
  "logos.sqlite3": "Logos",
  "kj2.sqlite3": "KJ2",
  "esv.sqlite3": "ESV",
  "esvgsb.sqlite3": "ESVGSB",
  "iesvth.sqlite3": "IESV NT",
  "rv1895.sqlite3": "RV1895",
  "cebB.sqlite3": "CEBB",
  "mbb05.sqlite3": "MBB05",
  "tagab01.sqlite3": "TAGAB01",
  "tagmb12.sqlite3": "TAGMB12",
  "hilab82.sqlite3": "HILAB82"
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
  "cebB.sqlite3": "Cebuano Bible",
  "mbb05.sqlite3": "Magandang Balita Biblia 2005",
  "tagab01.sqlite3": "Tagalog Biblia 2001",
  "tagmb12.sqlite3": "Tagalog Magandang Balita 2012",
  "hilab82.sqlite3": "Hiligaynon Ang Biblia 1982",
};

export const getVersionDisplayName = (version: string): string => {
  return VERSION_DISPLAY_NAMES[version] || version;
};

export const getVersionDescription = (version: string): string => {
  return VERSION_DESCRIPTIONS[version] || "Bible translation";
};
