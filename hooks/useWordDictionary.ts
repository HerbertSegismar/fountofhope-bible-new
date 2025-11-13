import { useCallback } from "react";
import { Verse } from "../types";
import { useBibleDatabase } from "../context/BibleDatabaseContext";
import { commentaryDBMap } from "../utils/bibleDatabaseUtils";
import { getVersionKey, stripTags } from "../utils/bibleDatabaseUtils";
import { useDictionary } from "./useDictionary";

const levenshteinDistance = (str1: string, str2: string): number => {
  const matrix: number[][] = [];
  for (let i = 0; i <= str2.length; i++) {
    matrix[i] = [i];
  }
  for (let j = 0; j <= str1.length; j++) {
    matrix[0][j] = j;
  }
  for (let i = 1; i <= str2.length; i++) {
    for (let j = 1; j <= str1.length; j++) {
      if (str2.charAt(i - 1) === str1.charAt(j - 1)) {
        matrix[i][j] = matrix[i - 1][j - 1];
      } else {
        matrix[i][j] = Math.min(
          matrix[i - 1][j - 1] + 1,
          matrix[i][j - 1] + 1,
          matrix[i - 1][j] + 1
        );
      }
    }
  }
  return matrix[str2.length][str1.length];
};

const getSimilarity = (str1: string, str2: string): number => {
  const distance = levenshteinDistance(str1.toLowerCase(), str2.toLowerCase());
  const maxLength = Math.max(str1.length, str2.length);
  return maxLength === 0 ? 1 : 1 - distance / maxLength;
};

const findBestMatch = (
  query: string,
  candidates: string[],
  minSimilarity: number = 0.8
): string | null => {
  let bestMatch: string | null = null;
  let bestSimilarity = 0;

  for (const candidate of candidates) {
    const similarity = getSimilarity(query, candidate);
    if (similarity > bestSimilarity && similarity >= minSimilarity) {
      bestSimilarity = similarity;
      bestMatch = candidate;
    }
  }

  return bestMatch;
};

export const useWordDictionary = (displayVersion: string | undefined) => {
  const { getDatabase } = useBibleDatabase();

  const loadWordDefinition = useCallback(
    async (word: string): Promise<string> => {
      word = word.trim();
      if (!word || !/^[a-zA-Z\u00C0-\u00FF\s]{2,}$/.test(word)) {
        return `Word: "${word}"`;
      }

      const hasSpace = /\s/.test(word);
      const lowerWord = word.toLowerCase();

      try {
        const dictionaryDB = await getDatabase("atsbd.dictionary.sqlite3");
        if (!dictionaryDB) {
          // Fallback to parts if phrase and DB not loaded
          if (hasSpace) {
            const parts = word.split(/\s+/);
            const partDefs = await Promise.all(
              parts
                .filter((p) => p.length >= 2)
                .map((part) => loadWordDefinition(part))
            );
            const validDefs = partDefs.filter(
              (def) =>
                !def.startsWith("No definition found") &&
                !def.startsWith("Error")
            );
            if (validDefs.length > 0) {
              return validDefs.join("\n\n");
            }
          }
          return `Word: "${word}" (Dictionary database not loaded)`;
        }

        console.log(`Looking up word in dictionary: ${word}`);

        let searchTopic = word;
        let isExactMatch = false;
        let definition: string | null = null;

        const topicExists = await dictionaryDB.topicExists(word);
        if (topicExists) {
          isExactMatch = true;
          definition = await dictionaryDB.getDefinitionFromTopic(word);
        } else {
          console.log(
            `No exact entry found for topic ${word}, searching for similar...`
          );

          const allTopics: string[] = await dictionaryDB.getAllTopics();
          if (!allTopics || allTopics.length === 0) {
            // Fallback to parts if phrase and no topics
            if (hasSpace) {
              const parts = word.split(/\s+/);
              const partDefs = await Promise.all(
                parts
                  .filter((p) => p.length >= 2)
                  .map((part) => loadWordDefinition(part))
              );
              const validDefs = partDefs.filter(
                (def) =>
                  !def.startsWith("No definition found") &&
                  !def.startsWith("Error")
              );
              if (validDefs.length > 0) {
                return validDefs.join("\n\n");
              }
            }
            return `No definition found for word "${word}"`;
          }

          let bestMatch = findBestMatch(word, allTopics);
          if (!bestMatch) {
            // Try partial prefix match: topics starting with word + space
            const partialMatches = allTopics.filter((t) =>
              t.toLowerCase().startsWith(lowerWord + " ")
            );
            if (partialMatches.length > 0) {
              // Pick the one with highest similarity
              bestMatch = partialMatches.reduce((best, current) =>
                getSimilarity(word, current) > getSimilarity(word, best)
                  ? current
                  : best
              );
              console.log(`Found partial prefix match: ${bestMatch}`);
            }
          }

          if (bestMatch) {
            console.log(
              `Found best match: ${bestMatch} with similarity ${(getSimilarity(word, bestMatch) * 100).toFixed(1)}%`
            );
            searchTopic = bestMatch;
            definition = await dictionaryDB.getDefinitionFromTopic(bestMatch);
            isExactMatch = false;
          } else {
            // Fallback to parts if phrase and no similar match
            if (hasSpace) {
              const parts = word.split(/\s+/);
              const partDefs = await Promise.all(
                parts
                  .filter((p) => p.length >= 2)
                  .map((part) => loadWordDefinition(part))
              );
              const validDefs = partDefs.filter(
                (def) =>
                  !def.startsWith("No definition found") &&
                  !def.startsWith("Error")
              );
              if (validDefs.length > 0) {
                return validDefs.join("\n\n");
              }
            }
            console.log(`No similar entry found for topic ${word}`);
            return `No definition found for word "${word}"`;
          }
        }

        if (definition) {
          let cleanedDefinition = stripTags(definition)
            .replace(/\u200e/g, "")
            .replace(/&#x200e;/gi, "")
            .trim();

          const lowerSearchTopic = searchTopic.toLowerCase();
          if (cleanedDefinition.toLowerCase().startsWith(lowerSearchTopic)) {
            const actualLength = lowerSearchTopic.length;
            cleanedDefinition = cleanedDefinition
              .substring(actualLength)
              .trim();

            if (cleanedDefinition.length > 0) {
              const firstChar = cleanedDefinition.charAt(0);
              if (/[a-z]/.test(firstChar)) {
                cleanedDefinition =
                  firstChar.toUpperCase() + cleanedDefinition.substring(1);
              }
            }
          }

          const header = isExactMatch
            ? `${searchTopic.toUpperCase()} - `
            : `${word.toUpperCase()} (matched to ${searchTopic.toUpperCase()}) - `;

          return `\n${header}${cleanedDefinition}`;
        } else {
          console.log(
            `No definition found for ${isExactMatch ? "topic" : "matched topic"} ${searchTopic}`
          );
          // Fallback to parts if phrase and no definition
          if (hasSpace) {
            const parts = word.split(/\s+/);
            const partDefs = await Promise.all(
              parts
                .filter((p) => p.length >= 2)
                .map((part) => loadWordDefinition(part))
            );
            const validDefs = partDefs.filter(
              (def) =>
                !def.startsWith("No definition found") &&
                !def.startsWith("Error")
            );
            if (validDefs.length > 0) {
              return validDefs.join("\n\n");
            }
          }
          return `No definition found for word "${word}"`;
        }
      } catch (error) {
        console.error(`[Word Dictionary] Error loading definition:`, error);
        // Fallback to parts if phrase and error
        if (hasSpace) {
          const parts = word.split(/\s+/);
          const partDefs = await Promise.all(
            parts
              .filter((p) => p.length >= 2)
              .map((part) => loadWordDefinition(part))
          );
          const validDefs = partDefs.filter(
            (def) =>
              !def.startsWith("No definition found") && !def.startsWith("Error")
          );
          if (validDefs.length > 0) {
            return validDefs.join("\n\n");
          }
        }
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

      const isWordCandidate = /^[a-zA-Z\u00C0-\u00FF\s]{2,}$/.test(tagContent);

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
            let searchMarker = tagContent;
            let isExactMatch = availableMarkers.includes(tagContent);
            let fallbackToWord = true;

            if (!isExactMatch && isWordCandidate) {
              const bestMatch = findBestMatch(tagContent, availableMarkers);
              if (bestMatch) {
                console.log(
                  `Found best commentary marker match: ${bestMatch} with similarity ${(getSimilarity(tagContent, bestMatch) * 100).toFixed(1)}%`
                );
                searchMarker = bestMatch;
                const bestCommentaryText = await commentaryDB.getCommentary(
                  verse.book_number,
                  verse.chapter,
                  verse.verse,
                  searchMarker
                );
                if (bestCommentaryText) {
                  const header = `\n\n${tagContent} (matched marker: ${searchMarker})`;
                  fallbackToWord = false;
                  return {
                    text: `${header}\n\n${stripTags(bestCommentaryText)}`,
                    isWord: false,
                  };
                }
              }
            }

            if (fallbackToWord && isWordCandidate) {
              const wordText = await loadWordDefinition(tagContent);
              return { text: wordText, isWord: true };
            }

            let msg = `No commentary found for marker "${tagContent}" in ${displayVersion}. Available markers: ${availableMarkers.join(", ")}`;
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
