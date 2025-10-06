import React, { useEffect, useRef, useState, useCallback } from "react";
import { View, Text, Dimensions, StyleSheet, Animated } from "react-native";
import Svg, { Text as SvgText } from "react-native-svg";
import { useTheme } from "../context/ThemeContext";

const { width, height } = Dimensions.get("window");

const JesusAttributes = [
  "Jesus Christ",
  "Messiah",
  "Savior",
  "Redeemer",
  "Son of God",
  "Lamb of God",
  "King of Kings",
  "Lord of Lords",
  "Prince of Peace",
  "Alpha and Omega",
  "The Way",
  "The Truth",
  "The Life",
  "Good Shepherd",
  "Light of the World",
  "Bread of Life",
  "The Resurrection",
  "Emmanuel",
  "Wonderful Counselor",
  "Mighty God",
  "Everlasting Father",
  "The Word",
  "Son of Man",
  "The Door",
  "The Vinedresser",
  "True Vine",
  "The Amen",
  "Author and Finisher of Our Faith",
  "Chief Cornerstone",
  "Bright Morning Star",
  "Lion of the Tribe of Judah",
  "Root of David",
  "Holy One of Israel",
  "Bridegroom",
  "Head of the Church",
  "Mediator",
  "Great High Priest",
  "The Prophet",
  "The Rock",
  "Captain of Our Salvation",
  "Image of the Invisible God",
  "Firstborn Over All Creation",
  "The Righteous One",
  "I AM",
  "The Great I Am",
  "Lord of All",
  "Judge of the Living and the Dead",
  "Shiloh",
  "Sun of Righteousness",
  "The Branch",
  "Man of Sorrows",
  "Faithful and True Witness",
  "Lord of Glory",
  "The Power of God",
  "The Wisdom of God",
  "Our Passover Lamb",
  "Shepherd of Souls",
  "The Holy One",
  "The Deliverer",
  "The Hope of Nations",
  "The Desire of All Nations",
  "The Fountain of Living Waters",
];

// Type definitions
interface CharObject {
  x: number;
  y: number;
  speed: number;
  char: string;
}

interface RandomText {
  key: string;
  text: string;
  x: number;
  y: number;
  opacity: Animated.Value;
}

const Matrix = () => {
  const { theme, colorScheme } = useTheme();
  const [randomTexts, setRandomTexts] = useState<RandomText[]>([]);
  const matrixColor = useRef("#1ad73dff");
  const charsRef = useRef<CharObject[]>([]);
  const animationRef = useRef<number | null>(null);
  const lastUpdateTime = useRef<number>(0);

  // Memoize color calculation
  const getMatrixColor = useCallback(() => {
    if (theme === "dark") {
      switch (colorScheme) {
        case "green":
          return "#1ad73dff";
        case "red":
          return "#EF4444";
        case "yellow":
          return "#F59E0B";
        default:
          return "#8B5CF6";
      }
    } else {
      switch (colorScheme) {
        case "green":
          return "#15c641ff";
        case "red":
          return "#cb2929ff";
        case "yellow":
          return "#D97706";
        default:
          return "#7C3AED";
      }
    }
  }, [theme, colorScheme]);

  // Update color when theme changes
  useEffect(() => {
    matrixColor.current = getMatrixColor();
  }, [getMatrixColor]);

  // Initialize characters once
  useEffect(() => {
    charsRef.current = Array.from(
      { length: 60 },
      (): CharObject => ({
        x: Math.random() * width,
        y: Math.random() * height,
        speed: 1 + Math.random() * 3,
        char: String.fromCharCode(0x30a0 + Math.random() * 96),
      })
    );
  }, []);

  // Optimized animation loop using requestAnimationFrame
  const animateMatrix = useCallback((timestamp: number) => {
    if (!lastUpdateTime.current) lastUpdateTime.current = timestamp;

    const delta = timestamp - lastUpdateTime.current;

    // Only update every ~16ms (~60fps) instead of 40ms
    if (delta > 16) {
      charsRef.current = charsRef.current.map((c) => {
        let newY = c.y + c.speed;
        if (newY > height) {
          newY = 0;
          // Only update character when it wraps around
          return {
            ...c,
            y: newY,
            char: String.fromCharCode(0x30a0 + Math.random() * 96),
          };
        }
        return { ...c, y: newY };
      });

      lastUpdateTime.current = timestamp;
    }

    animationRef.current = requestAnimationFrame(animateMatrix);
  }, []);

  // Start/stop animation
  useEffect(() => {
    animationRef.current = requestAnimationFrame(animateMatrix);
    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, [animateMatrix]);

  // Optimized random text animation
  useEffect(() => {
    const interval = setInterval(() => {
      const randomAttribute =
        JesusAttributes[Math.floor(Math.random() * JesusAttributes.length)];
      const x = Math.random() * (width - 200); // More margin
      const y = Math.random() * (height - 200);
      const opacity = new Animated.Value(0);

      const newText: RandomText = {
        key: Date.now().toString() + Math.random(),
        text: randomAttribute,
        x,
        y,
        opacity,
      };

      setRandomTexts((prev) => {
        // Limit to 3 simultaneous texts maximum
        const updated = [...prev, newText];
        return updated.slice(-3);
      });

      Animated.sequence([
        Animated.timing(opacity, {
          toValue: 1,
          duration: 800, // Slightly faster
          useNativeDriver: true,
        }),
        Animated.delay(1500), // Shorter delay
        Animated.timing(opacity, {
          toValue: 0,
          duration: 800,
          useNativeDriver: true,
        }),
      ]).start(() => {
        setRandomTexts((prev) => prev.filter((t) => t.key !== newText.key));
      });
    }, 4000); // Less frequent (every 4 seconds)

    return () => clearInterval(interval);
  }, []);

  // Memoize SVG characters to prevent unnecessary re-renders
  const renderSvgChars = useCallback(() => {
    return charsRef.current.map((c, i) => (
      <SvgText
        key={`char-${i}`}
        x={c.x}
        y={c.y}
        fill={matrixColor.current}
        fontSize="14"
        fontFamily="monospace"
      >
        {c.char}
      </SvgText>
    ));
  }, []);

  return (
    <View style={styles.container}>
      <Text style={styles.title}>
        Names & Attributes of the Lord Jesus Christ
      </Text>
      <View style={styles.matrixContainer}>
        <Svg height={height} width={width} style={StyleSheet.absoluteFill}>
          {renderSvgChars()}
        </Svg>
        {randomTexts.map((t) => (
          <Animated.Text
            key={t.key}
            style={[
              styles.overlayText,
              {
                top: t.y,
                left: t.x,
                color: matrixColor.current,
                opacity: t.opacity,
              },
            ]}
            numberOfLines={2}
            ellipsizeMode="tail"
          >
            {t.text}
          </Animated.Text>
        ))}
      </View>
    </View>
  );
};

export default Matrix;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "black",
    alignItems: "center",
    justifyContent: "center",
    paddingTop: 30,
  },
  title: {
    color: "#888",
    fontSize: 14,
    marginBottom: 8,
    fontFamily: "monospace",
  },
  matrixContainer: {
    width: "100%",
    height: height * 0.75,
    overflow: "hidden",
    borderRadius: 16,
    backgroundColor: "#000",
  },
  overlayText: {
    position: "absolute",
    fontFamily: "sans-serif-light",
    fontSize: 16,
    fontWeight: "300",
    textAlign: "center",
    maxWidth: 180, // Prevent text from being too wide
  },
});
