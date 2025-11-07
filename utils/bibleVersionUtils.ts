export const VERSION_DISPLAY_NAMES: Record<string, string> = {
  "asv+.sqlite3": "ASV+",
  "bsb22.sqlite3": "BSB22",
  "cjb.sqlite3": "CJB",
  "ylt.sqlite3": "YLT",
  "nlt15.sqlite3": "NLT15",
  "kj21.sqlite3": "KJ21",
  "kjv1769+.sqlite3": "KJV1769+",
  "logos.sqlite3": "Logos",
  "kj2.sqlite3": "KJ2",
  "mkjv.sqlite3": "MKJV",
  "nheb.sqlite3": "NHEB",
  "niobe.sqlite3": "NIOBE",
  "rnkjv.sqlite3": "RNKJV",
  "web+.sqlite3": "WEB+",
  "wyc.sqlite3": "WYC",
  "rv1895.sqlite3": "RV1895",
  "cebB.sqlite3": "CEBB",
  "mbb05.sqlite3": "MBB05",
  "tagab01.sqlite3": "TAGAB01",
  "tagmb12.sqlite3": "TAGMB12",
  "hilab82.sqlite3": "HILAB82",
};

export const VERSION_DESCRIPTIONS: Record<string, string> = {
  "asv+.sqlite3": "American Standard Version",
  "bsb22.sqlite3": "Berean Standard Bible",
  "cjb.sqlite3": "Complete Jewish Bible",
  "ylt.sqlite3": "Young's Literal Translation",
  "nlt15.sqlite3": "New Living Translation",
  "kj21.sqlite3": "21st Century KJV",
  "kjv1769+.sqlite3": "King James Version 1769",
  "logos.sqlite3": "Logos Bible",
  "kj2.sqlite3": "King James 2000",
  "mkjv.sqlite3": "Modern King James Version",
  "nheb.sqlite3": "New Heart English Bible",
  "niobe.sqlite3": "Niobe Study Bible",
  "rnkjv.sqlite3": "Restored Names King James Version",
  "web+.sqlite3": "World English Bible",
  "wyc.sqlite3": "Wycliffe Bible",
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
