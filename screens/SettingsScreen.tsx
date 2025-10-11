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
import { useTheme, ColorScheme } from "../context/ThemeContext";
import { VersionSelector } from "../components/VersionSelector";
import { getVersionDisplayName } from "../utils/bibleVersionUtils";
import { Fonts } from "../utils/fonts";

const { width: screenWidth, height: screenHeight } = Dimensions.get("window");

// Define primaryColors with proper typing
const primaryColors: Record<ColorScheme, { light: string; dark: string }> = {
  purple: { light: "#A855F7", dark: "#9333EA" },
  green: { light: "#10B981", dark: "#059669" },
  red: { light: "#bb3636ff", dark: "#a22c2cff" },
  yellow: { light: "#F59E0B", dark: "#D97706" },
};

const SettingsScreen = () => {
  const { currentVersion, availableVersions, switchVersion, isInitializing } =
    useBibleDatabase();
  const {
    theme,
    colorScheme,
    fontFamily,
    colorSchemes,
    toggleTheme,
    setColorScheme,
    setFontFamily,
  } = useTheme();

  const [selectedVersion, setSelectedVersion] = useState(currentVersion);
  const [isSwitching, setIsSwitching] = useState(false);
  const [isLandscape, setIsLandscape] = useState(screenWidth > screenHeight);

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

  // Get current color scheme configuration
  const currentColorScheme = colorSchemes.find(
    (scheme) => scheme.name === colorScheme
  );
  const schemeColors = currentColorScheme
    ? currentColorScheme[isDark ? "dark" : "light"]
    : colorSchemes[0][isDark ? "dark" : "light"];

  // Get primary color - now properly typed
  const primaryColor =
    primaryColors[colorScheme as ColorScheme][isDark ? "dark" : "light"];

  // Create a colors object based on theme
  const colors = {
    primary: primaryColor,
    background: schemeColors.bg || (isDark ? "#0f172a" : "#f8fafc"),
    text: isDark ? "#ffffff" : "#000000",
    muted: isDark ? "#9ca3af" : "#6b7280",
    card: isDark ? "#1e293b" : "#ffffff",
    border: isDark ? "#374151" : "#e5e7eb",
  };

  const getFontFamilyStyle = (family: string): string | undefined => {
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

  const getFontDisplayName = (family: string): string => {
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
        backgroundColor: colors.card,
        borderColor: colors.border,
      }}
    >
      <View className="p-5 border-b" style={{ borderColor: colors.border }}>
        <View className="flex-row items-center">
          {icon && (
            <Ionicons
              name={icon as any}
              size={20}
              color={colors.primary}
              className="mr-3"
            />
          )}
          <View className="flex-1">
            <Text
              className="text-lg font-bold"
              style={{ color: colors.text, fontFamily: Fonts.OswaldVariable }}
            >
              {title}
            </Text>
            {subtitle && (
              <Text className="text-sm mt-1" style={{ color: colors.muted }}>
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
            style={{ backgroundColor: colors.primary + "20" }} // 20% opacity
          >
            <Ionicons name={icon as any} size={18} color={colors.primary} />
          </View>
        )}
        <View className="flex-1">
          <Text
            className="text-base font-medium"
            style={{ color: colors.text }}
          >
            {title}
          </Text>
          {subtitle && (
            <Text className="text-sm mt-1" style={{ color: colors.muted }}>
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
    const previewColors = scheme[isDark ? "dark" : "light"];
    const previewPrimary =
      primaryColors[scheme.name as ColorScheme][isDark ? "dark" : "light"];
    const previewBg = previewColors.bg || (isDark ? "#0f172a" : "#f8fafc");
    const previewText = isDark ? "#ffffff" : "#000000";

    return (
      <TouchableOpacity
        onPress={onPress}
        className={`mr-3 p-3 rounded-xl border-2 items-center`}
        style={{
          minWidth: 90,
          borderColor: isSelected ? previewPrimary : "#CCCCCC",
          backgroundColor: previewBg,
        }}
      >
        {/* Simple color preview */}
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
            <Ionicons name="checkmark" size={12} color="#ffffff" />
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
    font: string;
    isSelected: boolean;
    onPress: () => void;
  }) => {
    const fontStyle = getFontFamilyStyle(font);
    return (
      <TouchableOpacity
        onPress={onPress}
        className={`m-1 flex-1 min-w-[45%] p-3 rounded-xl border-2`}
        style={{
          borderColor: isSelected ? colors.primary : colors.border,
          backgroundColor: colors.card,
        }}
      >
        <Text
          className={`text-center text-sm font-medium`}
          style={{
            color: isSelected ? colors.primary : colors.text,
            fontFamily: isSelected ? Fonts.RubikGlitchRegular : fontStyle,
          }}
          numberOfLines={1}
        >
          {getFontDisplayName(font)}
        </Text>
        <Text
          className="text-xs text-center mt-1"
          style={{
            color: colors.muted,
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
      style={{ backgroundColor: colors.background }}
      contentContainerStyle={{ paddingVertical: 16 }}
      showsVerticalScrollIndicator={false}
    >
      {/* Header */}
      <View className="px-4 mb-6">
        <Text
          className="text-2xl font-bold"
          style={{
            color: colors.text,
            fontFamily: Fonts.RubikGlitchRegular,
            fontSize: 28,
          }}
        >
          Settings
        </Text>
        <Text className="text-sm mt-2" style={{ color: colors.muted }}>
          Customize your Bible reading experience
        </Text>
      </View>

      {/* Bible Version Section */}
      <SettingSection
        title="Bible Version"
        subtitle="Choose your preferred translation"
        icon="book-outline"
      >
        {isLoading && (
          <View
            className="mb-4 p-3 rounded-lg"
            style={{ backgroundColor: colors.primary + "20" }}
          >
            <View className="flex-row items-center">
              <ActivityIndicator size="small" color={colors.primary} />
              <Text className="text-sm ml-3" style={{ color: colors.primary }}>
                Switching version... Please wait
              </Text>
            </View>
          </View>
        )}

        <VersionSelector
          currentVersion={currentVersion}
          selectedVersion={selectedVersion}
          availableVersions={availableVersions}
          onVersionSelect={handleVersionSelect}
          title=""
          description=""
          showCurrentVersion={false}
          showActiveIndicator={true}
          disabled={isLoading}
        />

        <View
          className="mt-4 p-3 rounded-lg"
          style={{ backgroundColor: colors.border }}
        >
          <Text className="text-sm font-medium" style={{ color: colors.muted }}>
            Current Version
          </Text>
          <Text
            className="text-lg font-bold mt-1"
            style={{
              color: colors.text,
              fontFamily: Fonts.OswaldVariable,
            }}
          >
            {getVersionDisplayName(currentVersion)}
          </Text>
        </View>
      </SettingSection>

      {/* Appearance Section */}
      <SettingSection
        title="Appearance"
        subtitle="Customize look and feel"
        icon="color-palette-outline"
      >
        {/* Theme Toggle */}
        <SettingItem
          title="Dark Mode"
          subtitle="Toggle between light and dark themes"
          icon="moon-outline"
        >
          <Switch
            value={isDark}
            onValueChange={toggleTheme}
            thumbColor={isDark ? colors.primary : "#f4f3f4"}
            trackColor={{ false: "#D1D5DB", true: colors.primary + "80" }}
          />
        </SettingItem>

        <View
          className="border-t my-3"
          style={{ borderColor: colors.border }}
        />

        {/* Color Scheme */}
        <View className="mb-4">
          <Text
            className="text-sm font-semibold mb-3"
            style={{ color: colors.text }}
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
          style={{ borderColor: colors.border }}
        />

        {/* Font Family */}
        <View>
          <Text
            className="text-sm font-semibold mb-3"
            style={{ color: colors.text }}
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
              const family = familyStr as any;
              return (
                <FontButton
                  key={familyStr}
                  font={familyStr}
                  isSelected={fontFamily === family}
                  onPress={() => setFontFamily(family)}
                />
              );
            })}
          </View>
        </View>
      </SettingSection>

      {/* Additional Settings Section */}
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
          <Ionicons name="chevron-forward" size={20} color={colors.muted} />
        </SettingItem>

        <View
          className="border-t my-3"
          style={{ borderColor: colors.border }}
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
          <Ionicons name="chevron-forward" size={20} color={colors.muted} />
        </SettingItem>

        <View
          className="border-t my-3"
          style={{ borderColor: colors.border }}
        />

        <SettingItem
          title="About"
          subtitle="App version and information"
          icon="information-circle-outline"
          onPress={() =>
            Alert.alert("About", "Bible App v1.0.0\n\nFount of Hope Studios")
          }
        >
          <Ionicons name="chevron-forward" size={20} color={colors.muted} />
        </SettingItem>
      </SettingSection>

      {/* Action Buttons */}
      <SettingSection
        title="Quick Actions"
        subtitle="Common tasks"
        icon="flash-outline"
      >
        <View className="flex-row flex-wrap -mx-1">
          <TouchableOpacity
            className="m-1 flex-1 min-w-[45%] p-4 rounded-xl items-center"
            style={{ backgroundColor: colors.primary }}
            onPress={() =>
              Alert.alert(
                "Reset Settings",
                "This will reset all settings to default."
              )
            }
          >
            <Ionicons name="refresh" size={20} color="#ffffff" />
            <Text
              className="text-white font-medium mt-2 text-center"
              style={{ fontFamily: Fonts.OswaldVariable }}
            >
              Reset Settings
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            className="m-1 flex-1 min-w-[45%] p-4 rounded-xl items-center border"
            style={{
              borderColor: colors.primary,
              backgroundColor: colors.primary + "10",
            }}
            onPress={() =>
              Alert.alert("Feedback", "Share your feedback with us.")
            }
          >
            <Ionicons name="chatbubble" size={20} color={colors.primary} />
            <Text
              className="font-medium mt-2 text-center"
              style={{
                color: colors.primary,
                fontFamily: Fonts.OswaldVariable,
              }}
            >
              Send Feedback
            </Text>
          </TouchableOpacity>
        </View>
      </SettingSection>

      {/* Footer */}
      <View className="px-4 mt-4 mb-8">
        <Text className="text-center text-xs" style={{ color: colors.muted }}>
          Made with ❤️ for Bible study
        </Text>
        <Text
          className="text-center text-xs mt-1"
          style={{ color: colors.muted }}
        >
          Version 1.0.0
        </Text>
      </View>
    </ScrollView>
  );
};

export default SettingsScreen;
