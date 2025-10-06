"use client";
import { useCallback, useEffect, useRef } from "react";
import { useTheme } from "../context/ThemeContext";

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

const Matrix = () => {
  const { theme, colorScheme } = useTheme();
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const overlayRef = useRef<HTMLDivElement>(null);

  // Memoized getMatrixColor function
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

  useEffect(() => {
    const canvas = canvasRef.current;
    const overlay = overlayRef.current;
    if (!canvas || !overlay) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    // Set canvas size
    canvas.width = canvas.offsetWidth;
    canvas.height = canvas.offsetHeight;

    // Matrix characters
    const matrixChars =
      "アァカサタナハマヤャラワガザダバパイィキシチニヒミリヰギジヂビピウゥクスツヌフムユュルグズブヅプエェケセテネヘメレヱゲゼデベペオォコソトノホモヨョロヲゴゾドボポヴッン0123456789abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ~!@#$%^&*()_-+=ᜀᜁᜂᜃᜄᜅᜆᜇᜈᜉᜊᜋᜌᜎᜏᜐᜑ";

    const fontSize = 14;
    const columns = Math.floor(canvas.width / fontSize);

    // Each column drops
    const drops: number[] = [];
    for (let i = 0; i < columns; i++) {
      drops[i] = 1;
    }

    // Dynamic interval variables
    let time = 0;
    let matrixIntervalId: NodeJS.Timeout;

    // Function to calculate dynamic interval
    const getDynamicInterval = () => {
      return 35 + 15 * Math.sin(time * 0.01);
    };

    // Draw the Matrix animation with dynamic interval
    const drawMatrix = () => {
      time++;

      // Semi-transparent black to create trail effect
      ctx.fillStyle = "rgba(0, 0, 0, 0.04)";
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      const matrixColor = getMatrixColor();
      ctx.fillStyle = matrixColor;
      ctx.font = `${fontSize}px monospace`;

      for (let i = 0; i < drops.length; i++) {
        const text = matrixChars.charAt(
          Math.floor(Math.random() * matrixChars.length)
        );
        ctx.fillText(text, i * fontSize, drops[i] * fontSize);

        if (drops[i] * fontSize > canvas.height && Math.random() > 0.975) {
          drops[i] = 0;
        }

        drops[i]++;
      }

      matrixIntervalId = setTimeout(drawMatrix, getDynamicInterval());
    };

    matrixIntervalId = setTimeout(drawMatrix, getDynamicInterval());

    // Handle text overlay animation
    const showRandomAttribute = () => {
      if (!overlay) return;

      const randomAttribute =
        JesusAttributes[Math.floor(Math.random() * JesusAttributes.length)];
      const matrixColor = getMatrixColor();

      const textElement = document.createElement("div");
      textElement.textContent = randomAttribute;
      textElement.style.position = "absolute";
      textElement.style.color = matrixColor;
      textElement.style.fontSize = `${Math.random() * 18 + 10}px`;
      textElement.style.fontWeight = "thin";
      textElement.style.fontFamily = "Rubik Glitch, Oswald, sans-serif";
      textElement.style.left = `${Math.random() * 80}%`;
      textElement.style.top = `${Math.random() * 80}%`;
      textElement.style.opacity = "0";
      textElement.style.transition = "opacity 1.5s ease-in-out";
      textElement.style.zIndex = "10";

      overlay.appendChild(textElement);

      setTimeout(() => {
        textElement.style.opacity = "1";
      }, 10);

      setTimeout(() => {
        textElement.style.opacity = "0";
        setTimeout(() => {
          if (overlay.contains(textElement)) {
            overlay.removeChild(textElement);
          }
        }, 1500);
      }, 2000);
    };

    const textInterval = setInterval(showRandomAttribute, 3000);

    const handleResize = () => {
      if (canvas) {
        canvas.width = canvas.offsetWidth;
        canvas.height = canvas.offsetHeight;
      }
    };

    window.addEventListener("resize", handleResize);

    return () => {
      clearTimeout(matrixIntervalId);
      clearInterval(textInterval);
      window.removeEventListener("resize", handleResize);
    };
  }, [theme, colorScheme, getMatrixColor]);

  return (
    <div className="bg-black rounded-2xl mt-8">
      <p className="p-2 glitched-text text-xs md:text-xl">
        Names & Attributes of the Lord Jesus Christ
      </p>
      <div className="relative mx-auto max-w-4xl h-128 overflow-hidden shadow-lg mb-6 rounded-2xl">
        <canvas
          ref={canvasRef}
          className="absolute top-0 left-0 w-full h-full opacity-90"
        />
        <div
          ref={overlayRef}
          className="absolute top-0 left-0 w-full h-full flex items-center justify-center pointer-events-none"
        />
      </div>
    </div>
  );
};

export default Matrix;
