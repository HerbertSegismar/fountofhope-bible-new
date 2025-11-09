import { useCallback } from "react";
import { Verse } from "../types";
import { useBibleDatabase } from "../context/BibleDatabaseContext";
import { commentaryDBMap } from "../utils/bibleDatabaseUtils";
import { getVersionKey, stripTags } from "../utils/bibleDatabaseUtils";
import { useDictionary } from "./useDictionary";

export const useWordDictionary = (displayVersion: string | undefined) => {
  const { getDatabase } = useBibleDatabase();

  const loadWordDefinition = useCallback(
    async (word: string): Promise<string> => {
      if (!word || !/^[a-zA-Z\u00C0-\u00FF]{2,}$/.test(word)) {
        return `Word: "${word}"`;
      }

      try {
        const dictionaryDB = await getDatabase("atbsd.dictionary.sqlite3");
        if (!dictionaryDB) {
          return `Word: "${word}" (Dictionary database not loaded)`;
        }

        console.log(`Looking up word in dictionary: ${word}`);

        // Verify if word exists in topic column
        const topicExists = await dictionaryDB.topicExists(word);
        if (!topicExists) {
          console.log(`No entry found for topic ${word}`);
          return `No definition found for word "${word}"`;
        }

        // Fetch definition from definition column
        const definition = await dictionaryDB.getDefinitionFromTopic(word);

        if (definition) {
          let cleanedDefinition = stripTags(definition)
            .replace(/\u200e/g, "")
            .replace(/&#x200e;/gi, "")
            .trim();

          return `Word "${word}":\n\n${cleanedDefinition}`;
        } else {
          console.log(`No definition found for word ${word}`);
          return `No definition found for word "${word}"`;
        }
      } catch (error) {
        console.error(`[Word Dictionary] Error loading definition:`, error);
        return `Error loading definition for word "${word}". Please try again.`;
      }
    },
    [getDatabase]
  );

  return { loadWordDefinition };
};

export const useCommentary = (displayVersion: string | undefined) => {
  const { getDatabase } = useBibleDatabase();
  const { loadDictionaryDefinition } = useDictionary(displayVersion);
  const { loadWordDefinition } = useWordDictionary(displayVersion);

  const loadCommentaryForVerse = useCallback(
    async (
      verse: Verse | null,
      tagContent: string
    ): Promise<{ text: string; isWord: boolean }> => {
      if (!verse || !tagContent) {
        return { text: `Marker: "${tagContent}"`, isWord: false };
      }

      const versionKey = getVersionKey(displayVersion);

      if (displayVersion?.includes("+") && /^\d+$/.test(tagContent)) {
        const defText = await loadDictionaryDefinition(verse, tagContent);
        return { text: defText, isWord: false };
      }

      const dbName = versionKey
        ? commentaryDBMap[versionKey as keyof typeof commentaryDBMap]
        : undefined;

      const isWordCandidate = /^[a-zA-Z\u00C0-\u00FF]{2,}$/.test(tagContent);

      if (!dbName) {
        if (isWordCandidate) {
          const wordText = await loadWordDefinition(tagContent);
          return { text: wordText, isWord: true };
        }
        return {
          text: `Marker: "${tagContent}" (Commentary not available for ${displayVersion})`,
          isWord: false,
        };
      }

      try {
        const commentaryDB = await getDatabase(dbName);
        if (!commentaryDB) {
          if (isWordCandidate) {
            const wordText = await loadWordDefinition(tagContent);
            return { text: wordText, isWord: true };
          }
          return {
            text: `Marker: "${tagContent}" (Commentary database not loaded)`,
            isWord: false,
          };
        }

        const commentaryText = await commentaryDB.getCommentary(
          verse.book_number,
          verse.chapter,
          verse.verse,
          tagContent
        );

        if (commentaryText) {
          return { text: stripTags(commentaryText), isWord: false };
        } else {
          const availableMarkers: string[] =
            await commentaryDB.getAvailableCommentaryMarkers(
              verse.book_number,
              verse.chapter,
              verse.verse
            );

          if (availableMarkers.length > 0) {
            let msg = `No commentary found for marker "${tagContent}" in ${displayVersion}. Available markers: ${availableMarkers.join(", ")}`;
            if (isWordCandidate && !availableMarkers.includes(tagContent)) {
              const wordText = await loadWordDefinition(tagContent);
              return { text: wordText, isWord: true };
            }
            return { text: msg, isWord: false };
          } else {
            if (isWordCandidate) {
              const wordText = await loadWordDefinition(tagContent);
              return { text: wordText, isWord: true };
            }
            return {
              text: `No commentary found for marker "${tagContent}" in ${displayVersion}.`,
              isWord: false,
            };
          }
        }
      } catch (error) {
        console.error(`[Commentary] Error loading commentary:`, error);
        if (isWordCandidate) {
          const wordText = await loadWordDefinition(tagContent);
          return { text: wordText, isWord: true };
        }
        return {
          text: `Error loading commentary for marker "${tagContent}".`,
          isWord: false,
        };
      }
    },
    [displayVersion, getDatabase, loadDictionaryDefinition, loadWordDefinition]
  );

  return { loadCommentaryForVerse };
};
