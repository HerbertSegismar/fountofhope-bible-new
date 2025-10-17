// file: src/hooks/useCommentary.ts
import { useCallback } from "react";
import { Verse } from "../types";
import { useBibleDatabase } from "../context/BibleDatabaseContext";
import { commentaryDBMap } from "../utils/bibleDatabaseUtils";
import { getVersionKey, stripTags } from "../utils/bibleDatabaseUtils";
import { useDictionary } from "./useDictionary";

export const useCommentary = (displayVersion: string | undefined) => {
  const { getDatabase } = useBibleDatabase();
  const { loadDictionaryDefinition } = useDictionary(displayVersion);

  const loadCommentaryForVerse = useCallback(
    async (verse: Verse | null, tagContent: string): Promise<string> => {
      if (!verse || !tagContent) {
        return `Marker: "${tagContent}"`;
      }

      const versionKey = getVersionKey(displayVersion);

      // For NASB, check if this is a Strong's number (numeric tag)
      if (versionKey === "NASB" && /^\d+$/.test(tagContent)) {
        return await loadDictionaryDefinition(verse, tagContent);
      }

      // Original commentary logic for other versions
      const dbName = versionKey
        ? commentaryDBMap[versionKey as keyof typeof commentaryDBMap]
        : undefined;

      if (!dbName) {
        return `Marker: "${tagContent}" (Commentary not available for ${displayVersion})`;
      }

      try {
        const commentaryDB = await getDatabase(dbName);
        if (!commentaryDB) {
          return `Marker: "${tagContent}" (Commentary database not loaded)`;
        }

        const commentaryText = await commentaryDB.getCommentary(
          verse.book_number,
          verse.chapter,
          verse.verse,
          tagContent
        );

        if (commentaryText) {
          return stripTags(commentaryText);
        } else {
          const availableMarkers: string[] =
            await commentaryDB.getAvailableCommentaryMarkers(
              verse.book_number,
              verse.chapter,
              verse.verse
            );

          if (availableMarkers.length > 0) {
            return `No commentary found for marker "${tagContent}" in ${displayVersion}. Available markers: ${availableMarkers.join(", ")}`;
          } else {
            return `No commentary found for marker "${tagContent}" in ${displayVersion}.`;
          }
        }
      } catch (error) {
        console.error(`[Commentary] Error loading commentary:`, error);
        return `Error loading commentary for marker "${tagContent}".`;
      }
    },
    [displayVersion, getDatabase, loadDictionaryDefinition]
  );

  return { loadCommentaryForVerse };
};
