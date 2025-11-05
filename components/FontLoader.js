import React from "react";
import { View, Text } from "react-native";
import * as Font from "expo-font";
import * as SplashScreen from "expo-splash-screen";

// Import your font assets (adjust paths as needed)
import Oswald_VariableFont from "../assets/Oswald_VariableFont.ttf";
import RubikGlitch_Regular from "../assets/RubikGlitch_Regular.ttf";
import Poppins_Regular from "../assets/Poppins-Regular.ttf";
// Add variants if needed, e.g.,
// import Poppins_Bold from '../assets/fonts/Poppins-Bold.ttf';
// Then include in loadAsync: 'poppins-bold': Poppins_Bold,

SplashScreen.preventAutoHideAsync();

export default function FontLoader({ children }) {
  const [appIsReady, setAppIsReady] = React.useState(false);
  const [fontsLoaded, setFontsLoaded] = React.useState(false);

  React.useEffect(() => {
    async function prepare() {
      try {
        console.log("🔄 Loading custom fonts...");
        await Font.loadAsync({
          "Oswald-Variable": Oswald_VariableFont,
          "RubikGlitch-Regular": RubikGlitch_Regular,
          "Poppins-Regular": Poppins_Regular,
          // Add more as needed, e.g.,
          // 'poppins-bold': Poppins_Bold,
        });
        setFontsLoaded(true);
        console.log("✅ Custom fonts loaded successfully");
      } catch (e) {
        console.warn(
          "⚠️ Font loading failed (continuing with system fonts):",
          e
        );
        setFontsLoaded(true); // Proceed even on failure to avoid indefinite loading
      } finally {
        // Remove artificial delay; let natural loading time handle it
        // If needed for splash screen minimum display, keep a short one (e.g., 1000ms)
        await new Promise((resolve) => setTimeout(resolve, 1000));
        setAppIsReady(true);
        await SplashScreen.hideAsync();
      }
    }

    prepare();
  }, []);

  if (!appIsReady || !fontsLoaded) {
    return (
      <View style={{ flex: 1, justifyContent: "center", alignItems: "center" }}>
        <Text>Loading fonts...</Text>
      </View>
    );
  }

  return children;
}
