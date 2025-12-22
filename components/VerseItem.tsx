import React, { memo, useCallback, useEffect, useRef } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  LayoutChangeEvent,
  Animated,
  Easing,
} from "react-native";
import { VerseDisplay } from "./VerseDisplay";
import { Verse } from "../types";

interface VerseItemProps {
  verse: Verse;
  fontSize: number;
  themeColors: any;
  fontFamily?: string;
  onTagPress: (content: string, verse: Verse) => void;
  onWordPress: (word: string) => void;
  textColor: string;
  showVerseNumbers: boolean;
  showHeader: boolean;
  isHighlighted: boolean;
  bookmarked: boolean;
  onVerseLayout: (verseNumber: number, event: LayoutChangeEvent) => void;
  onVerseRef: (verseNumber: number, ref: View | null) => void;
  onLongPress: (verse: Verse) => void;
  isFullScreen?: boolean;
}

export const VerseItem: React.FC<VerseItemProps> = memo(
  ({
    verse,
    fontSize,
    themeColors,
    fontFamily,
    onTagPress,
    onWordPress,
    textColor,
    showVerseNumbers,
    showHeader,
    isHighlighted,
    bookmarked,
    onVerseLayout,
    onVerseRef,
    onLongPress,
    isFullScreen,
  }) => {
    const fadeAnim = useRef(new Animated.Value(0)).current;
    const animationRef = useRef<Animated.CompositeAnimation | null>(null);
    const animatedViewRef = useRef<View>(null);
    const wasHighlightedRef = useRef(false);
    const fadeDuration = 5000;
    const fadeDelay = 1000;

    const localOnTagPress = useCallback(
      (content: string) => {
        onTagPress(content, verse);
      },
      [onTagPress, verse]
    );

    const indicatorSize = isFullScreen ? fontSize * 0.7 : fontSize * 0.8;

    const handleRef = useCallback(
      (ref: View | null) => {
        animatedViewRef.current = ref;
        onVerseRef(verse.verse, ref);
      },
      [onVerseRef, verse.verse]
    );

    useEffect(() => {
      return () => {
        if (animationRef.current) {
          animationRef.current.stop();
        }
      };
    }, []);

    useEffect(() => {
      // Stop any ongoing animation
      if (animationRef.current) {
        animationRef.current.stop();
        animationRef.current = null;
      }

      if (isHighlighted && !bookmarked) {
        wasHighlightedRef.current = true;

        // Start with full opacity immediately
        fadeAnim.setValue(1);

        // Wait briefly before starting fade out
        const fadeOutAnimation = Animated.sequence([
          Animated.delay(fadeDelay),
          Animated.timing(fadeAnim, {
            toValue: 0,
            duration: fadeDuration,
            easing: Easing.bezier(0.25, 0.1, 0.25, 1), // Smooth cubic bezier curve
            useNativeDriver: false,
          }),
        ]);

        animationRef.current = fadeOutAnimation;
        fadeOutAnimation.start(({ finished }) => {
          if (finished) {
            animationRef.current = null;
          }
        });
      } else if (wasHighlightedRef.current && !isHighlighted) {
        // If we were highlighted and now we're not, fade out quickly
        const quickFade = Animated.timing(fadeAnim, {
          toValue: 0,
          duration: 300,
          easing: Easing.out(Easing.quad),
          useNativeDriver: false,
        });

        animationRef.current = quickFade;
        quickFade.start(({ finished }) => {
          if (finished) {
            animationRef.current = null;
          }
        });
        wasHighlightedRef.current = false;
      } else {
        // Reset to transparent if not highlighted
        fadeAnim.setValue(0);
      }

      return () => {
        if (animationRef.current) {
          animationRef.current.stop();
        }
      };
    }, [isHighlighted, bookmarked, fadeAnim]);

    return (
      <TouchableOpacity
        activeOpacity={0.7}
        onLongPress={() => onLongPress(verse)}
        delayLongPress={500}
      >
        <View
          style={[
            {
              flexDirection: "row",
              alignItems: "flex-start",
              marginBottom: isFullScreen ? 2 : 4,
              paddingHorizontal: isFullScreen ? 8 : 4,
              paddingVertical: isFullScreen ? 4 : 2,
              borderRadius: 4,
            },
          ]}
          onLayout={(event) => onVerseLayout(verse.verse, event)}
          ref={handleRef}
        >
          <Animated.View
            style={{
              position: "absolute",
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              backgroundColor: themeColors.highlightBg,
              borderRadius: 4,
              opacity: fadeAnim,
            }}
          />

          <VerseDisplay
            verse={verse}
            fontSize={fontSize}
            themeColors={themeColors}
            fontFamily={fontFamily}
            onTagPress={localOnTagPress}
            onWordPress={onWordPress}
            textColor={textColor}
            showVerseNumbers={showVerseNumbers}
            showHeader={showHeader}
            isHighlighted={isHighlighted}
            bookmarked={bookmarked}
          />

          {(showVerseNumbers || bookmarked || isHighlighted) && (
            <Text style={{ fontSize: indicatorSize * 0.5 }}> </Text>
          )}
        </View>
      </TouchableOpacity>
    );
  }
);
