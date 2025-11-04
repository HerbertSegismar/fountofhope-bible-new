import React from "react";
import {
  View,
  ImageBackground,
  ViewStyle,
  ImageResizeMode,
  StyleProp,
} from "react-native";

interface BackgroundTextureProps {
  children: React.ReactNode;
  source?: any;
  hasBg: boolean;
  overlayStyle: ViewStyle;
  overlayKey: string;
  style?: StyleProp<ViewStyle>;
  resizeMode?: ImageResizeMode;
}

export const BackgroundTexture: React.FC<BackgroundTextureProps> = ({
  children,
  source,
  hasBg,
  overlayStyle,
  overlayKey,
  style,
  resizeMode = "repeat",
}) => {
  if (!hasBg || !source) {
    return <View style={style}>{children}</View>;
  }

  return (
    <ImageBackground
      source={source}
      resizeMode={resizeMode}
      style={style}
    >
      <View key={overlayKey} style={overlayStyle}>
        {children}
      </View>
    </ImageBackground>
  );
};
