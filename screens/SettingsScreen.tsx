import React, { useEffect, useState, useCallback } from "react";
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  Alert,
  Dimensions,
  ActivityIndicator,
  Switch,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useBibleDatabase } from "../context/BibleDatabaseContext";
import {
  useTheme,
  ColorScheme,
  FontFamily,
} from "../context/ThemeContext";
import { VersionSelector } from "../components/VersionSelector";
import { getVersionDisplayName } from "../utils/bibleVersionUtils";
import { Fonts } from "../utils/fonts";
import { getThemeColors, getContrastColor } from "../utils/themeUtils";
import Footer from "../components/Footer";

const { width: screenWidth, height: screenHeight } = Dimensions.get("window");

const SettingsScreen = () => {
  const {
    currentVersion,
    availableBibleVersions,
    switchVersion,
    isInitializing,
  } = useBibleDatabase();
  const {
    theme,
    colorScheme,
    fontFamily,
    customColor,
    colorSchemes,
    toggleTheme,
    setColorScheme,
    setFontFamily,
  } = useTheme();

  const [selectedVersion, setSelectedVersion] = useState(currentVersion);
  const [isSwitching, setIsSwitching] = useState(false);
  const [isLandscape, setIsLandscape] = useState(screenWidth > screenHeight);

  const themeColors = getThemeColors(theme, colorScheme, customColor);

  useEffect(() => {
    const updateLayout = () => {
      const { width: newWidth, height: newHeight } = Dimensions.get("window");
      const newIsLandscape = newWidth > newHeight;
      setIsLandscape(newIsLandscape);
    };

    updateLayout();
    const subscription = Dimensions.addEventListener("change", updateLayout);
    return () => subscription?.remove();
  }, []);

  useEffect(() => {
    setSelectedVersion(currentVersion);
  }, [currentVersion]);

  const handleVersionSelect = useCallback(
    async (version: string) => {
      if (version === currentVersion || isSwitching) return;

      setSelectedVersion(version);
      setIsSwitching(true);

      const maxRetries = 3;
      let lastError: unknown;

      for (let attempt = 0; attempt < maxRetries; attempt++) {
        try {
          await switchVersion(version);
          console.log(
            `Version switch to ${version} succeeded on attempt ${attempt + 1}`
          );
          setIsSwitching(false);
          return;
        } catch (error: unknown) {
          lastError = error;
          console.error(`Version switch attempt ${attempt + 1} failed:`, error);

          if (attempt < maxRetries - 1) {
            const delay = 500 * Math.pow(2, attempt);
            await new Promise((resolve) => setTimeout(resolve, delay));
          }
        }
      }

      let errorMessage =
        "Failed to switch Bible version after multiple attempts. Please try another version.";
      if (lastError instanceof Error) {
        if (
          lastError.message.includes("verification") ||
          lastError.message.includes("not available")
        ) {
          errorMessage = `The ${getVersionDisplayName(version)} database appears to be corrupted or unavailable. Please try another version.`;
        }
      }

      Alert.alert("Error", errorMessage);
      setSelectedVersion(currentVersion);
      setIsSwitching(false);
    },
    [currentVersion, isSwitching, switchVersion]
  );

  const isLoading = isInitializing || isSwitching;
  const isDark = theme === "dark";

  const getFontFamilyStyle = (family: FontFamily): string | undefined => {
    switch (family) {
      case "system":
        return undefined;
      case "serif":
        return "Georgia, Times New Roman, serif";
      case "sans-serif":
        return "Helvetica, Arial, sans-serif";
      case "oswald":
        return Fonts.OswaldVariable;
      case "rubik-glitch":
        return Fonts.RubikGlitchRegular;
      case "poppins":
        return "Poppins, sans-serif";
      default:
        return undefined;
    }
  };

  const getFontDisplayName = (family: FontFamily): string => {
    switch (family) {
      case "system":
        return "System Default";
      case "serif":
        return "Serif";
      case "sans-serif":
        return "Sans Serif";
      case "oswald":
        return "Oswald";
      case "rubik-glitch":
        return "Rubik Glitch";
      case "poppins":
        return "Poppins";
      default:
        return family;
    }
  };

  const SettingSection = ({
    title,
    subtitle,
    children,
    icon,
  }: {
    title: string;
    subtitle?: string;
    children: React.ReactNode;
    icon?: string;
  }) => (
    <View
      className="mx-4 mb-4 rounded-2xl shadow-sm border overflow-hidden"
      style={{
        backgroundColor: themeColors.card,
        borderColor: themeColors.border,
      }}
    >
      <View
        className="p-5 border-b"
        style={{ borderColor: themeColors.border }}
      >
        <View className="flex-row items-center">
          {icon && (
            <Ionicons
              name={icon as any}
              size={20}
              color={themeColors.primary}
              className="mr-3"
            />
          )}
          <View className="flex-1">
            <Text
              className="text-lg font-bold"
              style={{
                color: themeColors.textPrimary,
                fontFamily: Fonts.OswaldVariable,
              }}
            >
              {title}
            </Text>
            {subtitle && (
              <Text
                className="text-sm mt-1"
                style={{ color: themeColors.textMuted }}
              >
                {subtitle}
              </Text>
            )}
          </View>
        </View>
      </View>
      <View className="p-5">{children}</View>
    </View>
  );

  const SettingItem = ({
    title,
    subtitle,
    children,
    icon,
    onPress,
  }: {
    title: string;
    subtitle?: string;
    children?: React.ReactNode;
    icon?: string;
    onPress?: () => void;
  }) => (
    <TouchableOpacity
      className={`flex-row items-center justify-between py-3 ${onPress ? "active:opacity-70" : ""}`}
      onPress={onPress}
      disabled={!onPress}
    >
      <View className="flex-row items-center flex-1">
        {icon && (
          <View
            className="w-10 h-10 rounded-full items-center justify-center mr-3"
            style={{ backgroundColor: themeColors.primary + "20" }}
          >
            <Ionicons
              name={icon as any}
              size={18}
              color={themeColors.primary}
            />
          </View>
        )}
        <View className="flex-1">
          <Text
            className="text-base font-medium"
            style={{ color: themeColors.textPrimary }}
          >
            {title}
          </Text>
          {subtitle && (
            <Text
              className="text-sm mt-1"
              style={{ color: themeColors.textMuted }}
            >
              {subtitle}
            </Text>
          )}
        </View>
      </View>
      {children}
    </TouchableOpacity>
  );

  const ColorButton = ({
    scheme,
    isSelected,
    onPress,
  }: {
    scheme: any;
    isSelected: boolean;
    onPress: () => void;
  }) => {
    const previewThemeColors = getThemeColors(
      theme,
      scheme.name as ColorScheme,
      colorScheme === scheme.name ? customColor : undefined
    );
    const previewPrimary = previewThemeColors.primary;
    const previewBg = previewThemeColors.background;
    const previewText = previewThemeColors.textPrimary;
    const contrastColor = getContrastColor(previewPrimary, previewThemeColors);

    return (
      <TouchableOpacity
        onPress={onPress}
        className={`mr-3 p-3 rounded-xl border-2 items-center`}
        style={{
          minWidth: 90,
          borderColor: isSelected ? previewPrimary : themeColors.border,
          backgroundColor: previewBg,
        }}
      >
        <View
          className="w-full h-8 rounded mb-2"
          style={{ backgroundColor: previewPrimary }}
        />

        <Text
          className="text-center text-xs font-semibold"
          style={{
            color: previewText,
          }}
        >
          {scheme.name.charAt(0).toUpperCase() + scheme.name.slice(1)}
        </Text>

        {isSelected && (
          <View
            className="absolute top-2 right-2 w-5 h-5 rounded-full border-2 items-center justify-center"
            style={{
              backgroundColor: previewPrimary,
              borderColor: previewBg,
            }}
          >
            <Ionicons name="checkmark" size={12} color={contrastColor} />
          </View>
        )}
      </TouchableOpacity>
    );
  };

  const FontButton = ({
    font,
    isSelected,
    onPress,
  }: {
    font: FontFamily;
    isSelected: boolean;
    onPress: () => void;
  }) => {
    const fontStyle = getFontFamilyStyle(font);
    return (
      <TouchableOpacity
        onPress={onPress}
        className={`m-1 flex-1 min-w-[45%] p-3 rounded-xl border-2`}
        style={{
          borderColor: isSelected ? themeColors.primary : themeColors.border,
          backgroundColor: themeColors.card,
        }}
      >
        <Text
          className={`text-center text-sm font-medium`}
          style={{
            color: isSelected ? themeColors.primary : themeColors.textPrimary,
            fontFamily: isSelected ? Fonts.RubikGlitchRegular : fontStyle,
          }}
          numberOfLines={1}
        >
          {getFontDisplayName(font)}
        </Text>
        <Text
          className="text-xs text-center mt-1"
          style={{
            color: themeColors.textMuted,
            fontFamily: fontStyle,
          }}
          numberOfLines={1}
        >
          Aa
        </Text>
      </TouchableOpacity>
    );
  };

  return (
    <ScrollView
      className="flex-1"
      style={{ backgroundColor: themeColors.background }}
      contentContainerStyle={{ paddingVertical: 16 }}
      showsVerticalScrollIndicator={false}
    >
      <View className="px-4 mb-6">
        <Text
          className="text-2xl font-bold"
          style={{
            color: themeColors.textPrimary,
            fontFamily: Fonts.RubikGlitchRegular,
            fontSize: 28,
          }}
        >
          Settings
        </Text>
        <Text className="text-sm mt-2" style={{ color: themeColors.textMuted }}>
          Customize your Bible reading experience
        </Text>
      </View>

      <SettingSection
        title="Bible Version"
        subtitle="Choose your preferred translation"
        icon="book-outline"
      >
        {isLoading && (
          <View
            className="mb-4 p-3 rounded-lg"
            style={{ backgroundColor: themeColors.primary + "20" }}
          >
            <View className="flex-row items-center">
              <ActivityIndicator size="small" color={themeColors.primary} />
              <Text
                className="text-sm ml-3"
                style={{ color: themeColors.primary }}
              >
                Switching version... Please wait
              </Text>
            </View>
          </View>
        )}

        <VersionSelector
          currentVersion={currentVersion}
          selectedVersion={selectedVersion}
          availableVersions={availableBibleVersions}
          onVersionSelect={handleVersionSelect}
          title=""
          description=""
          showCurrentVersion={false}
          showActiveIndicator={true}
          disabled={isLoading}
        />

        <View
          className="mt-4 p-3 rounded-lg"
          style={{ backgroundColor: themeColors.border }}
        >
          <Text
            className="text-sm font-medium"
            style={{ color: themeColors.textMuted }}
          >
            Current Version
          </Text>
          <Text
            className="text-lg font-bold mt-1"
            style={{
              color: themeColors.textPrimary,
              fontFamily: Fonts.OswaldVariable,
            }}
          >
            {getVersionDisplayName(currentVersion)}
          </Text>
        </View>
      </SettingSection>

      <SettingSection
        title="Appearance"
        subtitle="Customize look and feel"
        icon="color-palette-outline"
      >
        <SettingItem
          title="Dark Mode"
          subtitle="Toggle between light and dark themes"
          icon="moon-outline"
        >
          <Switch
            value={isDark}
            onValueChange={toggleTheme}
            thumbColor={isDark ? themeColors.primary : "#f4f3f4"}
            trackColor={{
              false: themeColors.textMuted,
              true: themeColors.primary + "80",
            }}
          />
        </SettingItem>

        <View
          className="border-t my-3"
          style={{ borderColor: themeColors.border }}
        />

        <View className="mb-4">
          <Text
            className="text-sm font-semibold mb-3"
            style={{ color: themeColors.textPrimary }}
          >
            Color Scheme
          </Text>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            className="flex-row"
            contentContainerStyle={{ paddingRight: 16 }}
          >
            {colorSchemes.map((scheme) => (
              <ColorButton
                key={scheme.name}
                scheme={scheme}
                isSelected={colorScheme === scheme.name}
                onPress={() => setColorScheme(scheme.name)}
              />
            ))}
          </ScrollView>
        </View>

        <View
          className="border-t my-3"
          style={{ borderColor: themeColors.border }}
        />

        <View>
          <Text
            className="text-sm font-semibold mb-3"
            style={{ color: themeColors.textPrimary }}
          >
            Font Family
          </Text>
          <View className="flex-row flex-wrap -mx-1">
            {[
              "system",
              "serif",
              "sans-serif",
              "oswald",
              "rubik-glitch",
              "poppins",
            ].map((familyStr) => {
              const family = familyStr as FontFamily;
              return (
                <FontButton
                  key={familyStr}
                  font={family}
                  isSelected={fontFamily === family}
                  onPress={() => setFontFamily(family)}
                />
              );
            })}
          </View>
        </View>
      </SettingSection>

      <SettingSection
        title="More Options"
        subtitle="Additional preferences"
        icon="settings-outline"
      >
        <SettingItem
          title="Data & Storage"
          subtitle="Manage app data and cache"
          icon="server-outline"
          onPress={() =>
            Alert.alert(
              "Coming Soon",
              "Data management features will be available in the next update."
            )
          }
        >
          <Ionicons
            name="chevron-forward"
            size={20}
            color={themeColors.textMuted}
          />
        </SettingItem>

        <View
          className="border-t my-3"
          style={{ borderColor: themeColors.border }}
        />

        <SettingItem
          title="Reading Preferences"
          subtitle="Customize reading experience"
          icon="reader-outline"
          onPress={() =>
            Alert.alert(
              "Coming Soon",
              "Reading preferences will be available in the next update."
            )
          }
        >
          <Ionicons
            name="chevron-forward"
            size={20}
            color={themeColors.textMuted}
          />
        </SettingItem>

        <View
          className="border-t my-3"
          style={{ borderColor: themeColors.border }}
        />

        <SettingItem
          title="About"
          subtitle="App version and information"
          icon="information-circle-outline"
          onPress={() =>
            Alert.alert("About", "Bible App v1.0.0\n\nFount of Hope Bible")
          }
        >
          <Ionicons
            name="chevron-forward"
            size={20}
            color={themeColors.textMuted}
          />
        </SettingItem>
      </SettingSection>

      <SettingSection
        title="Quick Actions"
        subtitle="Common tasks"
        icon="flash-outline"
      >
        <View className="flex-row flex-wrap -mx-1">
          <TouchableOpacity
            className="m-1 flex-1 min-w-[45%] p-4 rounded-xl items-center"
            style={{ backgroundColor: themeColors.primary }}
            onPress={() =>
              Alert.alert(
                "Reset Settings",
                "This will reset all settings to default."
              )
            }
          >
            <Ionicons
              name="refresh"
              size={20}
              color="white"
            />
            <Text
              className="text-white font-medium mt-2 text-center"
              style={{
                color: "white",
                fontFamily: Fonts.OswaldVariable,
              }}
            >
              Reset Settings
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            className="m-1 flex-1 min-w-[45%] p-4 rounded-xl items-center border"
            style={{
              borderColor: themeColors.primary,
              backgroundColor: themeColors.primary + "10",
            }}
            onPress={() =>
              Alert.alert("Feedback", "Share your feedback with us.")
            }
          >
            <Ionicons name="chatbubble" size={20} color={themeColors.primary} />
            <Text
              className="font-medium mt-2 text-center"
              style={{
                color: themeColors.primary,
                fontFamily: Fonts.OswaldVariable,
              }}
            >
              Send Feedback
            </Text>
          </TouchableOpacity>
        </View>
      </SettingSection>
      <Footer />
    </ScrollView>
  );
};

export default SettingsScreen;
