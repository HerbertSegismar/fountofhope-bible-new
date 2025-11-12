import { useState, useEffect, useMemo, useCallback } from "react";
import { useFocusEffect } from "@react-navigation/native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useTheme } from "../context/ThemeContext";
import { bgImages } from "../utils/bgImages";

interface UseBackgroundTextureOverrides {
  index?: number;
  opacity?: number;
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
    noBackground = false,
  } = options;

  const [internalIndex, setInternalIndex] = useState(0);
  const [internalOpacity, setInternalOpacity] = useState(0.5);

  const { theme } = useTheme();

  const hasIndexOverride = overrideIndex !== undefined;
  const hasOpacityOverride = overrideOpacity !== undefined;

  useEffect(() => {
    if (hasIndexOverride) {
      setInternalIndex(overrideIndex);
    }
  }, [overrideIndex, hasIndexOverride]);

  useEffect(() => {
    if (hasOpacityOverride) {
      setInternalOpacity(overrideOpacity);
    }
  }, [overrideOpacity, hasOpacityOverride]);

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

  const effectiveIndex = hasIndexOverride ? overrideIndex! : internalIndex;
  const effectiveOpacity = hasOpacityOverride
    ? overrideOpacity!
    : internalOpacity;

  const source = useMemo(
    () => (effectiveIndex > 0 ? bgImages[effectiveIndex] : undefined),
    [effectiveIndex]
  );

  const hasSource = !!source;

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

  const overlayKey = `overlay-${Math.floor(effectiveOpacity * 1000)}`;

  return {
    source,
    hasSource,
    overlayStyle,
    overlayKey,
    effectiveIndex,
    effectiveOpacity,
  };
};
