import React from "react";
import { View, Text } from "react-native";
import * as Font from "expo-font";
import * as SplashScreen from "expo-splash-screen";

import Oswald_VariableFont from "../assets/fonts/Oswald_VariableFont.ttf";
import RubikGlitch_Regular from "../assets/fonts/RubikGlitch_Regular.ttf";
import Poppins_Regular from "../assets/fonts/Poppins-Regular.ttf";

SplashScreen.preventAutoHideAsync();

export default function FontLoader({ children }) {
  const [appIsReady, setAppIsReady] = React.useState(false);
  const [fontsLoaded, setFontsLoaded] = React.useState(false);

  React.useEffect(() => {
    async function prepare() {
      try {
        await Font.loadAsync({
          "Oswald-Variable": Oswald_VariableFont,
          "RubikGlitch-Regular": RubikGlitch_Regular,
          "Poppins-Regular": Poppins_Regular,
        });
        setFontsLoaded(true);
      } catch (e) {
        console.warn(
          "⚠️ Font loading failed (continuing with system fonts):",
          e
        );
        setFontsLoaded(true);
      } finally {
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
