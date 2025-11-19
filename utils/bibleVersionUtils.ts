export const VERSION_DISPLAY_NAMES: Record<string, string> = {
  "ampc.sqlite3": "AMPC",
  "cebB.sqlite3": "CEBB",
  "csb17.sqlite3": "CSB17",
  "esv.sqlite3": "ESV",
  "esvgsb.sqlite3": "ESVGSB",
  "hilab82.sqlite3": "HILAB82",
  "iesvth.sqlite3": "IESV",
  "kj2.sqlite3": "KJ2",
  "kjv+.sqlite3": "KJV+",
  "logos.sqlite3": "Logos",
  "mbb05.sqlite3": "MBB05",
  "nasb+.sqlite3": "NASB+",
  "niv11.sqlite3": "NIV11",
  "nkjv.sqlite3": "NKJV",
  "nlt15.sqlite3": "NLT15",
  "rv1895.sqlite3": "RV1895",
  "tagab01.sqlite3": "TAGAB01",
  "tagmb12.sqlite3": "TAGMB12",
  "ylt.sqlite3": "YLT",
};

export const VERSION_DESCRIPTIONS: Record<string, string> = {
  "ampc.sqlite3": "Amplified Bible Classic Edition",
  "cebB.sqlite3": "Cebuano Bible",
  "csb17.sqlite3": "Christian Standard Bible",
  "esv.sqlite3": "English Standard Version",
  "esvgsb.sqlite3": "ESV Global Study Bible",
  "hilab82.sqlite3": "Hiligaynon Ang Biblia 1982",
  "iesvth.sqlite3": "The Interliniar English-Greek NT",
  "kj2.sqlite3": "King James 2",
  "kjv+.sqlite3": "King James Version 1769",
  "logos.sqlite3": "Logos Bible",
  "mbb05.sqlite3": "Magandang Balita Biblia 2005",
  "nasb+.sqlite3": "New American Standard Bible",
  "niv11.sqlite3": "New International Version",
  "nkjv.sqlite3": "New King James Version",
  "nlt15.sqlite3": "New Living Translation",
  "rv1895.sqlite3": "Revised Version with Apocrypha",
  "tagab01.sqlite3": "Tagalog Biblia 2001",
  "tagmb12.sqlite3": "Tagalog Magandang Balita 2012",
  "ylt.sqlite3": "Young's Literal Translation",
};

export const getVersionDisplayName = (version: string): string => {
  return VERSION_DISPLAY_NAMES[version] || version;
};

export const getVersionDescription = (version: string): string => {
  return VERSION_DESCRIPTIONS[version] || "Bible translation";
};
