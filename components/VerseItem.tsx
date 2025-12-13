import React, {
  memo,
  useCallback,
  useEffect,
  useRef,
  forwardRef,
  useImperativeHandle,
} from "react";
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
  onVerseRef?: (verseNumber: number, ref: View | null) => void;
  onLongPress: (verse: Verse) => void;
  isFullScreen?: boolean;
  scrollToVerse?: (verseNumber: number) => void;
}

interface VerseItemRef {
  measure: (
    callback: (
      x: number,
      y: number,
      width: number,
      height: number,
      pageX: number,
      pageY: number
    ) => void
  ) => void;
}

export const VerseItem = memo(
  forwardRef<VerseItemRef, VerseItemProps>(
    (
      {
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
        scrollToVerse,
      },
      ref
    ) => {
      const fadeAnim = useRef(new Animated.Value(0)).current;
      const animationRef = useRef<Animated.CompositeAnimation | null>(null);
      const viewRef = useRef<View>(null);
      const wasHighlightedRef = useRef(false);
      const fadeDuration = 5000;
      const fadeDelay = 1000;

      useImperativeHandle(ref, () => ({
        measure: (callback) => {
          viewRef.current?.measure(callback);
        },
      }));

      const localOnTagPress = useCallback(
        (content: string) => {
          onTagPress(content, verse);
        },
        [onTagPress, verse]
      );

      const indicatorSize = isFullScreen ? fontSize * 0.7 : fontSize * 0.8;

      const handleRef = useCallback(
        (ref: View | null) => {
          viewRef.current = ref;
          onVerseRef?.(verse.verse, ref);
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
        if (animationRef.current) {
          animationRef.current.stop();
          animationRef.current = null;
        }

        if (isHighlighted && !bookmarked) {
          wasHighlightedRef.current = true;

          fadeAnim.setValue(1);

          const fadeOutAnimation = Animated.sequence([
            Animated.delay(fadeDelay),
            Animated.timing(fadeAnim, {
              toValue: 0,
              duration: fadeDuration,
              easing: Easing.bezier(0.25, 0.1, 0.25, 1),
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
          fadeAnim.setValue(0);
        }

        return () => {
          if (animationRef.current) {
            animationRef.current.stop();
          }
        };
      }, [isHighlighted, bookmarked, fadeAnim]);

      // Handle scroll to verse
      const handlePress = useCallback(() => {
        if (scrollToVerse) {
          scrollToVerse(verse.verse);
        }
      }, [scrollToVerse, verse.verse]);

      return (
        <TouchableOpacity
          activeOpacity={0.7}
          onLongPress={() => onLongPress(verse)}
          delayLongPress={500}
          onPress={handlePress}
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
  )
);
