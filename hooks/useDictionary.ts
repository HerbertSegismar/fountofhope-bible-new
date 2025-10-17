// file: src/hooks/useDictionary.ts
import { useCallback } from "react";
import { Verse } from "../types";
import { useBibleDatabase } from "../context/BibleDatabaseContext";
import { getVersionKey, stripTags } from "../utils/bibleDatabaseUtils";
import { getTestament } from "../utils/testamentUtils";

export const useDictionary = (displayVersion: string | undefined) => {
  const { getDatabase } = useBibleDatabase();

  const loadDictionaryDefinition = useCallback(
    async (verse: Verse | null, tagContent: string): Promise<string> => {
      if (!verse || !tagContent) {
        return `Strong's: "${tagContent}"`;
      }

      // Check if this is NASB version
      const versionKey = getVersionKey(displayVersion);
      if (versionKey !== "NASB") {
        return `Strong's: "${tagContent}" (Dictionary only available for NASB)`;
      }

      // Only handle numeric tags for Strong's numbers
      if (!/^\d+$/.test(tagContent)) {
        return `Strong's: "${tagContent}" (Not a valid Strong's number)`;
      }

      try {
        // Load dictionary database
        const dictionaryDB = await getDatabase("secedictionary.sqlite3");
        if (!dictionaryDB) {
          return `Strong's: "${tagContent}" (Dictionary database not loaded)`;
        }

        // Determine prefix based on testament using your testamentUtils
        const testament = getTestament(
          verse.book_number,
          verse.book_name || ""
        );
        const isNewTestament = testament === "NT";
        const prefix = isNewTestament ? "G" : "H";
        const strongNumber = `${prefix}${tagContent}`;

        console.log(
          `Looking up Strong's number in dictionary: ${strongNumber} for ${verse.book_name} (${testament})`
        );

        const definition =
          await dictionaryDB.getDictionaryDefinition(strongNumber);

        if (definition) {
          // Clean up the definition text - remove HTML tags and extra whitespace but preserve line breaks
          let cleanedDefinition = stripTags(definition)
            .replace(/\u200e/g, "") // remove LRM
            .replace(/&#x200e;/gi, "") // remove entity if present
            .replace(/\.\s+/g, ".\n\n")
            .trim();

          cleanedDefinition = cleanedDefinition.replace(
            /LN:\s*\d+(?:\.\d+)?(?:\s*,\s*\d+(?:\.\d+)?)*\s*(?:;)?\s*(?=[A-Za-z]|$)/gi,
            ""
          );

          cleanedDefinition = cleanedDefinition
            .replace(/([a-zA-Z])(KJV)/gi, "$1 KJV")
            .replace(/([a-zA-Z])(Derivation)/gi, "$1 Derivation");

          return `Strong's ${strongNumber} (${isNewTestament ? "Greek" : "Hebrew"}):\n\n${cleanedDefinition}`;
        } else {
          console.log(`No definition found for Strong's ${strongNumber}`);
          return `No definition found for Strong's ${strongNumber} (${isNewTestament ? "Greek" : "Hebrew"})`;
        }
      } catch (error) {
        console.error(`[Dictionary] Error loading definition:`, error);
        return `Error loading definition for Strong's "${tagContent}". Please try again.`;
      }
    },
    [displayVersion, getDatabase]
  );

  return { loadDictionaryDefinition };
};
