// hooks/useBackgroundTexture.ts
import { useState, useEffect, useMemo, useCallback } from "react";
import { useFocusEffect } from "@react-navigation/native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useTheme } from "../context/ThemeContext";
import { bgImages } from "../utils/bgImages";
import { ImageSourcePropType } from "react-native";

interface UseBackgroundTextureOverrides {
  index?: number;
  opacity?: number;
  customTextureUri?: string | null;
}

interface UseBackgroundTextureOptions extends UseBackgroundTextureOverrides {
  noBackground?: boolean;
}

export const useBackgroundTexture = (
  options: UseBackgroundTextureOptions = {}
) => {
  const {
    index: overrideIndex,
    opacity: overrideOpacity,
    customTextureUri: overrideCustomTextureUri,
    noBackground = false,
  } = options;

  const [internalIndex, setInternalIndex] = useState(0);
  const [internalOpacity, setInternalOpacity] = useState(0.5);
  const [internalCustomTextureUri, setInternalCustomTextureUri] = useState<
    string | null
  >(null);

  const { theme } = useTheme();

  const hasIndexOverride = overrideIndex !== undefined;
  const hasOpacityOverride = overrideOpacity !== undefined;
  const hasCustomTextureOverride = overrideCustomTextureUri !== undefined;

  // Load settings from AsyncStorage when no override is provided
  useEffect(() => {
    if (hasIndexOverride || noBackground) return;

    AsyncStorage.getItem("bgImageIndex")
      .then((str) => {
        if (str !== null) {
          setInternalIndex(parseInt(str, 10) || 0);
        }
      })
      .catch(console.error);
  }, [hasIndexOverride, noBackground]);

  useEffect(() => {
    if (hasOpacityOverride || noBackground) return;

    AsyncStorage.getItem("bgTextureOpacity")
      .then((str) => {
        if (str !== null) {
          setInternalOpacity(parseFloat(str) || 0.5);
        }
      })
      .catch(console.error);
  }, [hasOpacityOverride, noBackground]);

  useEffect(() => {
    if (hasCustomTextureOverride || noBackground) return;

    AsyncStorage.getItem("customTextureUri")
      .then((uri) => {
        if (uri !== null) {
          setInternalCustomTextureUri(uri);
        }
      })
      .catch(console.error);
  }, [hasCustomTextureOverride, noBackground]);

  // Use focus effect to refresh when screen comes into focus
  useFocusEffect(
    useCallback(() => {
      if (hasIndexOverride || noBackground) return;

      AsyncStorage.getItem("bgImageIndex")
        .then((str) => {
          if (str !== null) {
            const newIndex = parseInt(str, 10) || 0;
            setInternalIndex(newIndex);
          }
        })
        .catch(console.error);
    }, [hasIndexOverride, noBackground])
  );

  useFocusEffect(
    useCallback(() => {
      if (hasOpacityOverride || noBackground) return;

      AsyncStorage.getItem("bgTextureOpacity")
        .then((str) => {
          if (str !== null) {
            const newOpacity = parseFloat(str) || 0.5;
            setInternalOpacity(newOpacity);
          }
        })
        .catch(console.error);
    }, [hasOpacityOverride, noBackground])
  );

  useFocusEffect(
    useCallback(() => {
      if (hasCustomTextureOverride || noBackground) return;

      AsyncStorage.getItem("customTextureUri")
        .then((uri) => {
          if (uri !== null) {
            setInternalCustomTextureUri(uri);
          }
        })
        .catch(console.error);
    }, [hasCustomTextureOverride, noBackground])
  );

  // Determine effective values
  const effectiveIndex = hasIndexOverride ? overrideIndex! : internalIndex;
  const effectiveOpacity = hasOpacityOverride
    ? overrideOpacity!
    : internalOpacity;
  const effectiveCustomTextureUri = hasCustomTextureOverride
    ? overrideCustomTextureUri
    : internalCustomTextureUri;

  // Determine the image source based on index
  const source = useMemo((): ImageSourcePropType | undefined => {
    if (effectiveIndex === 0) {
      return undefined; // No background
    } else if (effectiveIndex === 34) {
      // Custom texture
      return effectiveCustomTextureUri
        ? { uri: effectiveCustomTextureUri }
        : undefined;
    } else if (bgImages[effectiveIndex]) {
      // Built-in texture
      return bgImages[effectiveIndex];
    }
    return undefined;
  }, [effectiveIndex, effectiveCustomTextureUri]);

  const hasSource = !!source;

  // Calculate overlay style based on theme and opacity
  const overlayStyle = useMemo(
    () => ({
      flex: 1,
      backgroundColor:
        theme === "dark"
          ? `rgba(24, 19, 56, ${hasSource ? 1 - effectiveOpacity : 1})`
          : `rgba(222, 216, 182, ${hasSource ? 1 - effectiveOpacity : 1})`,
    }),
    [theme, hasSource, effectiveOpacity]
  );

  const overlayKey = `overlay-${effectiveIndex}-${Math.floor(effectiveOpacity * 1000)}-${effectiveCustomTextureUri || "builtin"}`;

  return {
    source,
    hasSource,
    overlayStyle,
    overlayKey,
    effectiveIndex,
    effectiveOpacity,
    effectiveCustomTextureUri,
  };
};
