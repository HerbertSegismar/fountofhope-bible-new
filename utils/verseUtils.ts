// file: src/utils/verseUtils.ts
export const parseVerseList = (
  verseStr: string
): { start: number; end: number }[] => {
  if (!verseStr) return [];
  const parts = verseStr.split(",").map((p) => p.trim());
  const ranges: { start: number; end: number }[] = [];
  const rangeRegex = /(\d+)(?:\s*(?:[-–—]|\s*to\s*)\s*(\d+))?/gi;
  parts.forEach((part) => {
    rangeRegex.lastIndex = 0;
    const match = rangeRegex.exec(part);
    if (match) {
      const start = parseInt(match[1], 10);
      const end = match[2] ? parseInt(match[2], 10) : start;
      ranges.push({ start, end });
    }
  });
  return ranges;
};
