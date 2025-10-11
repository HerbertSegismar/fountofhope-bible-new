import React, { JSX, useCallback, useEffect, useRef, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  Animated,
  Easing,
} from "react-native";
import { useTheme } from "../context/ThemeContext";
import { Fonts } from "../utils/fonts";

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
  "Stone of Stumbling",
  "Captain of Our Salvation",
  "Chosen One",
  "Image of the Invisible God",
  "Firstborn Over All Creation",
  "Firstborn from the Dead",
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
  "The Amen",
  "Lord of Glory",
  "The Power of God",
  "The Wisdom of God",
  "Our Passover Lamb",
  "Shepherd of Souls",
  "The Resurrection and the Life",
  "The Holy One",
  "The Just One",
  "The Advocate",
  "The Deliverer",
  "The Hope of Nations",
  "The Consolation of Israel",
  "The Desire of All Nations",
  "The Fountain of Living Waters",
  "The Rod from the Stem of Jesse",
  "The Governor Among the Nations",
  "The Word of Life",
  "The Spirit of Life",
  "The Beloved Son",
  "The Light of Men",
  "The True Light",
  "The Horn of Salvation",
  "The Dayspring from on High",
  "The Upholder of All Things",
  "The Apostle of Our Confession",
  "The Bishop of Souls",
  "The Christ of God",
  "The Holy Servant",
  "The Pioneer of Salvation",
  "The Author of Eternal Salvation",
  "The Forerunner",
  "The Lawgiver",
  "The Lord of the Harvest",
  "The Lord of the Sabbath",
  "The Truth of God",
  "The Vine",
  "The Living Stone",
  "The Chosen Stone",
  "The Precious Cornerstone",
  "The Foundation",
  "The Temple",
  "The Light of Heaven",
  "The King of the Jews",
  "The King of Israel",
  "The King of Righteousness",
  "The King of Peace",
  "The King of Glory",
  "The Lord Strong and Mighty",
  "The Lord Mighty in Battle",
  "The Lord of Hosts",
  "The Lord Our Righteousness",
  "The Lord Who Heals",
  "The Lord Who Provides",
  "The Lord Who Sanctifies",
  "The Lord Who Sees",
  "The Angel of God",
  "The Angel of the Lord",
  "Yahweh",
  "Jehovah",
  "Elohim",
  "El Shaddai",
  "Adonai",
  "Jehovah Jireh",
  "Jehovah Rapha",
  "Jehovah Nissi",
  "Jehovah Shalom",
  "Jehovah Raah",
  "Jehovah Tsidkenu",
  "Jehovah Shammah",
  "El Elyon",
  "El Roi",
  "El Olam",
  "Yahweh Yireh",
  "Yahweh Rapha",
  "Yahweh Nissi",
  "Yahweh Shalom",
  "Yahweh Raah",
  "Yahweh Tsidkenu",
  "Yahweh Shammah",
  "Yahweh Sabaoth",
];

const height = 512;
const fontSize = 14;
const trailLength = 15;

interface Drop {
  id: string;
  headAnim: Animated.Value;
  trailChars: string[];
  x: number;
}

interface Overlay {
  id: string;
  text: string;
  left: number;
  top: number;
  fontSize: number;
  color: string;
  fadeAnim: Animated.Value;
  positionAnim: Animated.Value;
}

const MatrixNative = () => {
  const { theme } = useTheme();
  const [overlays, setOverlays] = useState<Overlay[]>([]);
  const dropsRef = useRef<Drop[]>([]);
  const [containerWidth, setContainerWidth] = useState(0);
  const overlayTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const getMatrixColor = useCallback(() => {
    if (theme === "dark") {
      return "#1ad73dff";
    } else {
      return "#15c641ff";
    }
  }, [theme]);

  const matrixChars =
    "アァカサタナハマヤャラワガザダバパイィキシチニヒミリヰギジヂビピウゥクスツヌフムユュルグズブヅプエェケセテネヘメレヱゲゼデベペオォコソトノホモヨョロヲゴゾドボポヴッン0123456789abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ~!@#$%^&*()_-+=ᜀᜁᜂᜃᜄᜅᜆᜇᜈᜉᜊᜋᜌᜎᜏᜐᜑ";

  useEffect(() => {
    if (containerWidth === 0) return;

    const numColumns = Math.floor(containerWidth / fontSize);
    const newDrops: Drop[] = [];

    for (let i = 0; i < numColumns; i++) {
      const id = `drop-${i}`;
      const headAnim = new Animated.Value(0);
      const trailChars = Array.from({ length: trailLength }, () =>
        matrixChars.charAt(Math.floor(Math.random() * matrixChars.length))
      );
      newDrops.push({ id, headAnim, trailChars, x: i * fontSize });
    }

    // Stop previous animations
    dropsRef.current.forEach((drop) => drop.headAnim.stopAnimation());
    dropsRef.current = newDrops;

    // Start animations
    newDrops.forEach((drop) => startDropAnimation(drop.headAnim));

    return () => {
      newDrops.forEach((drop) => drop.headAnim.stopAnimation());
    };
  }, [containerWidth]);

  const startDropAnimation = (anim: Animated.Value) => {
    const duration = 2000 + Math.random() * 3000; // Slightly adjusted for smoother feel
    const totalHeight = height + trailLength * fontSize;

    Animated.timing(anim, {
      toValue: totalHeight,
      duration,
      easing: Easing.linear,
      useNativeDriver: true,
    }).start(() => {
      anim.setValue(0);
      const gapDelay = 500 + Math.random() * 2000; // Approximate web's probabilistic gap
      setTimeout(() => {
        startDropAnimation(anim);
      }, gapDelay);
    });
  };

  const showRandomAttribute = () => {
    if (containerWidth === 0) return;
    const randomAttribute =
      JesusAttributes[Math.floor(Math.random() * JesusAttributes.length)];
    const color = getMatrixColor();
    const fs = Math.random() * 18 + 10;
    const estimatedWidth = randomAttribute.length * (fs / 2.5);
    let left = Math.random() * 0.8 * containerWidth;
    left = Math.min(left, containerWidth - estimatedWidth);
    const top = Math.random() * 0.8 * height;

    const fadeAnim = new Animated.Value(0);
    const positionAnim = new Animated.Value(20);

    const newOverlay: Overlay = {
      id: `${Date.now()}-${Math.random()}`,
      text: randomAttribute,
      left,
      top,
      fontSize: fs,
      color,
      fadeAnim,
      positionAnim,
    };

    setOverlays((prev) => [...prev, newOverlay]);

    // Animate in
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 500,
        easing: Easing.ease,
        useNativeDriver: true,
      }),
      Animated.timing(positionAnim, {
        toValue: 0,
        duration: 500,
        easing: Easing.ease,
        useNativeDriver: true,
      }),
    ]).start();

    // Animate out after 2s
    const stayTimeout = setTimeout(() => {
      overlayTimeoutRef.current = null;
      Animated.parallel([
        Animated.timing(fadeAnim, {
          toValue: 0,
          duration: 1500,
          easing: Easing.ease,
          useNativeDriver: true,
        }),
        Animated.timing(positionAnim, {
          toValue: -20,
          duration: 1500,
          easing: Easing.ease,
          useNativeDriver: true,
        }),
      ]).start(({ finished }) => {
        if (finished) {
          setOverlays((prev) => prev.filter((o) => o.id !== newOverlay.id));
          showRandomAttribute();
        }
      });
    }, 2000);

    overlayTimeoutRef.current = stayTimeout;
  };

  useEffect(() => {
    if (containerWidth === 0) return;

    if (overlayTimeoutRef.current) {
      clearTimeout(overlayTimeoutRef.current);
      overlayTimeoutRef.current = null;
    }

    setOverlays([]);

    showRandomAttribute();

    return () => {
      if (overlayTimeoutRef.current) {
        clearTimeout(overlayTimeoutRef.current);
        overlayTimeoutRef.current = null;
      }
    };
  }, [containerWidth]);

  useEffect(() => {
    return () => {
      overlays.forEach((overlay) => {
        overlay.fadeAnim.stopAnimation();
        overlay.positionAnim.stopAnimation();
      });
    };
  }, [overlays]);

  const renderDrops = () => {
    const elements: JSX.Element[] = [];
    const currentDrops = dropsRef.current;
    const matrixColor = getMatrixColor();
    const shadowColor = `${matrixColor.slice(0, 7)}80`;

    currentDrops.forEach((drop) => {
      for (let j = 0; j < trailLength; j++) {
        const offset = -j * fontSize;
        const trailAnim = drop.headAnim.interpolate({
          inputRange: [0, height + trailLength * fontSize],
          outputRange: [offset, height + trailLength * fontSize + offset],
        });
        const opacity = j === 0 ? 1 : Math.max(0, 1 - (j / trailLength) * 1.2);
        const char = drop.trailChars[j];

        elements.push(
          <Animated.View
            key={`${drop.id}-trail-${j}`}
            style={[
              styles.drop,
              {
                left: drop.x,
                transform: [{ translateY: trailAnim }],
                opacity,
              },
            ]}
          >
            <Text
              style={[
                styles.char,
                { color: matrixColor },
                {
                  textShadowColor: shadowColor,
                  textShadowOffset: { width: 0, height: 0 },
                  textShadowRadius: 2,
                },
              ]}
            >
              {char}
            </Text>
          </Animated.View>
        );
      }
    });
    return elements;
  };

  const renderOverlays = () => {
    return overlays.map((overlay) => (
      <Animated.View
        key={overlay.id}
        style={[
          styles.overlayText,
          {
            left: overlay.left,
            top: overlay.top,
            opacity: overlay.fadeAnim,
            transform: [{ translateY: overlay.positionAnim }],
          },
        ]}
      >
        <Text
          style={[
            styles.overlayTextContent,
            {
              color: overlay.color,
              fontSize: overlay.fontSize,
              fontFamily: Fonts.RubikGlitchRegular,
            },
          ]}
        >
          {overlay.text}
        </Text>
      </Animated.View>
    ));
  };

  const matrixColor = getMatrixColor();

  return (
    <View style={styles.outerContainer}>
      <Text
        style={[
          styles.title,
          {
            fontFamily: Fonts.RubikGlitchRegular,
            color: matrixColor,
          },
        ]}
      >
        Names & Attributes of the Lord Jesus Christ
      </Text>
      <View
        onLayout={(event) => setContainerWidth(event.nativeEvent.layout.width)}
        style={styles.container}
      >
        {renderDrops()}
        <View style={styles.overlayContainer}>{renderOverlays()}</View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  outerContainer: {
    backgroundColor: "black",
    borderRadius: 16,
    marginTop: 25,
    marginBottom: 24,
    padding: 5
  },
  title: {
    padding: 16,
    fontSize: 14,
    textAlign: "center",
  },
  container: {
    width: "100%",
    height,
    backgroundColor: "black",
    overflow: "hidden",
  },
  drop: {
    position: "absolute",
    top: 0,
    width: fontSize,
    height: fontSize,
    alignItems: "center",
    justifyContent: "center",
  },
  char: {
    fontSize,
    fontFamily: "monospace",
    includeFontPadding: false,
  },
  overlayContainer: {
    position: "absolute",
    top: 0,
    left: 0,
    width: "100%",
    height: "100%",
    pointerEvents: "none",
  },
  overlayText: {
    position: "absolute",
    zIndex: 10,
  },
  overlayTextContent: {
    fontWeight: "400",
    includeFontPadding: false,
    textShadowColor: "rgba(0, 0, 0, 0.8)",
    textShadowOffset: { width: 2, height: 2 },
    textShadowRadius: 4,
  },
});

export default MatrixNative;
