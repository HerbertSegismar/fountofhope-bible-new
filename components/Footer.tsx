import React from "react";
import { Text, View, TouchableOpacity, Linking } from "react-native";
import {
  useTheme,
  type ColorScheme,
  type Theme,
  type FontFamily,
} from "../context/ThemeContext";
import { getThemeColors, type ThemeColors } from "../utils/themeUtils";

export const Footer = () => {
  const { theme, colorScheme, customColor } = useTheme();
  const themeColors = getThemeColors(theme, colorScheme, customColor);

  // Get the appropriate color based on theme and color scheme
  const getPrimaryColor = () => {
    if (colorScheme === "custom") {
      return customColor;
    }

    const primaryColors = {
      purple: { light: "#A855F7", dark: "#9333EA" },
      green: { light: "#10B981", dark: "#059669" },
      red: { light: "#EF4444", dark: "#DC2626" },
      yellow: { light: "#F59E0B", dark: "#D97706" },
    };

    return primaryColors[colorScheme][theme === "dark" ? "dark" : "light"];
  };

  const primaryColor = getPrimaryColor();

  const myBibleUrl = "https://mybible.zone/us/";
  const contactEmail = "fountofhopedevotionals@gmail.com";

  return (
    <View className="px-4 mt-4 mb-20">
      <Text
        className="text-center text-xs"
        style={{ color: themeColors.textMuted }}
      >
        Made with ❤️ For All Believers Worldwide
      </Text>
      <Text
        className="text-center text-xs mt-1"
        style={{ color: themeColors.textMuted }}
      >
        &copy; Copyright {new Date().getFullYear()}
      </Text>
      <Text
        className="text-center text-xs mt-1"
        style={{ color: themeColors.textMuted }}
      >
        App Created By: Herbert Segismar
      </Text>
      <View className="mt-1">
        <View
          style={{
            flexDirection: "row",
            justifyContent: "center",
            alignItems: "baseline",
          }}
        >
          <Text className="text-xs" style={{ color: themeColors.textMuted }}>
            Contact:{" "}
          </Text>
          <TouchableOpacity
            onPress={() => Linking.openURL(`mailto:${contactEmail}`)}
          >
            <Text
              className="text-xs"
              style={{
                color: themeColors.primary,
                textDecorationLine: "underline",
              }}
            >
              {contactEmail}
            </Text>
          </TouchableOpacity>
        </View>
      </View>
      <View
        className="mt-4"
        style={{
          borderWidth: 1,
          borderColor: themeColors.border,
          borderRadius: 4,
          padding: 8,
        }}
      >
        <View
          style={{
            flexDirection: "column",
            alignItems: "center",
          }}
        >
          <View
            style={{
              flexDirection: "row",
              justifyContent: "center",
              alignItems: "baseline",
            }}
          >
            <Text
              className="text-center text-xs"
              style={{ color: themeColors.textMuted }}
            >
              Special thanks to the{" "}
            </Text>
            <TouchableOpacity onPress={() => Linking.openURL(myBibleUrl)}>
              <Text
                className="text-xs"
                style={{
                  color: themeColors.primary,
                  textDecorationLine: "underline",
                }}
              >
                MyBible
              </Text>
            </TouchableOpacity>
            <Text
              className="text-center text-xs"
              style={{ color: themeColors.textMuted }}
            >
              {" "}
              team
            </Text>
          </View>
          <Text
            className="text-center text-xs mt-1"
            style={{ color: themeColors.textMuted }}
          >
            for making their modules available.
          </Text>
        </View>
      </View>
    </View>
  );
};

export default Footer;
