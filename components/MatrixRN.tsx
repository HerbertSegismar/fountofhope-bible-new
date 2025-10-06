// components/MatrixRN.tsx
import React, { useEffect, useState } from "react";
import { View, Text, Dimensions, StyleSheet, Animated } from "react-native";
import { useTheme } from "../context/ThemeContext";

const { width: screenWidth, height: screenHeight } = Dimensions.get("window");

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
const MatrixRN = () => {
  const { theme, colorScheme } = useTheme();
  const [drops, setDrops] = useState<
    {
      id: string;
      text: string;
      position: Animated.Value;
      opacity: Animated.Value;
      left: number;
    }[]
  >([]);

  const getMatrixColor = () => {
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
  };

  useEffect(() => {
    // Create initial drops
    const initialDrops = Array.from({ length: 15 }, (_, i) => ({
      id: `drop-${i}`,
      text: JesusAttributes[Math.floor(Math.random() * JesusAttributes.length)],
      position: new Animated.Value(-100),
      opacity: new Animated.Value(0),
      left: Math.random() * (screenWidth - 150),
    }));

    setDrops(initialDrops);

    // Animate drops
    const animations = initialDrops.map((drop, index) => {
      const delay = index * 300 + Math.random() * 1000;

      return Animated.sequence([
        Animated.delay(delay),
        Animated.parallel([
          Animated.timing(drop.position, {
            toValue: 400,
            duration: 3000 + Math.random() * 2000,
            useNativeDriver: true,
          }),
          Animated.sequence([
            Animated.timing(drop.opacity, {
              toValue: 1,
              duration: 500,
              useNativeDriver: true,
            }),
            Animated.delay(2000),
            Animated.timing(drop.opacity, {
              toValue: 0,
              duration: 500,
              useNativeDriver: true,
            }),
          ]),
        ]),
      ]);
    });

    Animated.parallel(animations).start();

    // Continuous rain effect
    const interval = setInterval(() => {
      const newDrop = {
        id: `drop-${Date.now()}-${Math.random()}`,
        text: JesusAttributes[
          Math.floor(Math.random() * JesusAttributes.length)
        ],
        position: new Animated.Value(-50),
        opacity: new Animated.Value(0),
        left: Math.random() * (screenWidth - 150),
      };

      setDrops((prev) => [...prev.slice(-20), newDrop]); // Keep only last 20 drops

      Animated.sequence([
        Animated.delay(100),
        Animated.parallel([
          Animated.timing(newDrop.position, {
            toValue: 400,
            duration: 4000 + Math.random() * 2000,
            useNativeDriver: true,
          }),
          Animated.sequence([
            Animated.timing(newDrop.opacity, {
              toValue: 1,
              duration: 800,
              useNativeDriver: true,
            }),
            Animated.delay(1500),
            Animated.timing(newDrop.opacity, {
              toValue: 0,
              duration: 800,
              useNativeDriver: true,
            }),
          ]),
        ]),
      ]).start();
    }, 800);

    return () => {
      clearInterval(interval);
      // Clean up animations
      drops.forEach((drop) => {
        drop.position.stopAnimation();
        drop.opacity.stopAnimation();
      });
    };
  }, []);

  const matrixColor = getMatrixColor();

  return (
    <View style={styles.container}>
      <Text style={styles.title}>
        Names & Attributes of the Lord Jesus Christ
      </Text>
      <View style={styles.matrixContainer}>
        <View style={[styles.background, { backgroundColor: "#000000" }]} />

        {/* Raining text drops */}
        {drops.map((drop) => (
          <Animated.Text
            key={drop.id}
            style={[
              styles.dropText,
              {
                color: matrixColor,
                left: drop.left,
                transform: [{ translateY: drop.position }],
                opacity: drop.opacity,
                fontSize: 12 + Math.random() * 8,
              },
            ]}
          >
            {drop.text}
          </Animated.Text>
        ))}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: "black",
    borderRadius: 16,
    marginTop: 32,
    padding: 8,
    marginHorizontal: 8,
  },
  title: {
    color: "white",
    textAlign: "center",
    fontSize: 16,
    fontWeight: "600",
    padding: 8,
    marginBottom: 8,
  },
  matrixContainer: {
    position: "relative",
    height: 300,
    width: "100%",
    overflow: "hidden",
    borderRadius: 16,
    marginBottom: 8,
    backgroundColor: "#000000",
  },
  background: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
  dropText: {
    position: "absolute",
    fontWeight: "300",
    fontFamily: "System",
    textShadowColor: "rgba(0, 255, 0, 0.8)",
    textShadowOffset: { width: 0, height: 0 },
    textShadowRadius: 10,
  },
});

export default MatrixRN;
