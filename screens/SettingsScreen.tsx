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
import { useTheme } from "../context/ThemeContext";
import { VersionSelector } from "../components/VersionSelector";
import { getVersionDisplayName } from "../utils/bibleVersionUtils";
import { colorSchemes } from "../context/ThemeContext";

const { width: screenWidth, height: screenHeight } = Dimensions.get("window");

const SettingsScreen = () => {
  const { currentVersion, availableVersions, switchVersion, isInitializing } =
    useBibleDatabase();
  const {
    theme,
    colorScheme,
    fontFamily,
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

      // Always update landscape state
      setIsLandscape(newIsLandscape);
    };

    // Initial check
    updateLayout();

    const subscription = Dimensions.addEventListener("change", updateLayout);

    return () => {
      subscription?.remove();
    };
  }, []);

  // Sync with current version from context
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
          ); // Optional debug log
          setIsSwitching(false); // Reset on success
          return; // Success
        } catch (error: unknown) {
          lastError = error;
          console.error(`Version switch attempt ${attempt + 1} failed:`, error);

          if (attempt < maxRetries - 1) {
            const delay = 500 * Math.pow(2, attempt);
            await new Promise((resolve) => setTimeout(resolve, delay));
          }
        }
      }

      // All retries failed
      console.error("All version switch attempts failed:", lastError);

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

  const getFontFamilyStyle = (family: string): string | undefined => {
    switch (family) {
      case "system":
        return undefined;
      case "serif":
        return "Georgia, Times New Roman, serif";
      case "sans-serif":
        return "Helvetica, Arial, sans-serif";
      case "oswald":
        return "Oswald, sans-serif";
      case "poppins":
        return "Poppins, sans-serif";
      default:
        return undefined;
    }
  };

  return (
    <ScrollView
      className={`flex-1 bg-slate-50 dark:bg-gray-900 ${isLandscape ? "mr-12" : "mr-0"}`}
      contentContainerStyle={{ paddingBottom: 20 }}
    >
      {/* Bible Version Selection */}
      <View className="bg-white dark:bg-gray-800 m-4 p-4 rounded-xl shadow-md">
        <Text className="text-lg font-bold text-slate-800 dark:text-white mb-1">
          Bible Version
        </Text>
        <Text className="text-sm text-slate-500 dark:text-gray-400 mb-4">
          Choose your preferred Bible translation
        </Text>

        {isLoading && (
          <View className="mb-4 items-center">
            <ActivityIndicator size="small" color="#3B82F6" />
            <Text className="text-sm italic text-slate-500 dark:text-gray-400 mt-2">
              Switching version... Please wait
            </Text>
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
      </View>

      {/* Current Version Display */}
      <View className="bg-white dark:bg-gray-800 m-4 p-4 rounded-xl shadow-md">
        <Text className="text-lg font-bold text-slate-800 dark:text-white mb-2">
          Current Version
        </Text>
        <View className="flex-row justify-between items-center py-2">
          <Text className="text-base text-slate-600 dark:text-gray-300">
            Active Translation
          </Text>
          <Text className="text-base font-medium text-slate-800 dark:text-white">
            {getVersionDisplayName(currentVersion)}
          </Text>
        </View>
      </View>

      {/* Theme Toggle */}
      <View className="flex-row items-center justify-between mb-6 p-4 bg-gray-50 dark:bg-gray-800 rounded-lg mx-4">
        <View>
          <Text className="text-lg font-semibold text-gray-900 dark:text-white">
            Dark Mode
          </Text>
          <Text className="text-sm text-gray-600 dark:text-gray-300">
            Toggle between light and dark themes
          </Text>
        </View>
        <Switch
          value={isDark}
          onValueChange={toggleTheme}
          thumbColor={isDark ? "#f59e0b" : "#f4f3f4"}
          trackColor={{ false: "#767577", true: "#81b0ff" }}
        />
      </View>

      {/* Color Scheme Selection */}
      <View className="mb-6 mx-4">
        <Text className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
          Color Scheme
        </Text>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          className="flex-row"
        >
          {colorSchemes.map((scheme) => {
            const isSelected = colorScheme === scheme.name;
            const schemeConfig = scheme[isDark ? "dark" : "light"];
            return (
              <TouchableOpacity
                key={scheme.name}
                onPress={() => setColorScheme(scheme.name)}
                className={`mr-3 p-3 rounded-lg border-2 ${
                  isSelected
                    ? "border-blue-500 bg-blue-50 dark:bg-blue-900/20"
                    : "border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-800"
                }`}
                style={{ minWidth: 80 }}
              >
                <View className={`${schemeConfig.bg} h-12 rounded mb-2`} />
                <Text
                  className={`text-center font-medium ${
                    isSelected
                      ? "text-blue-600 dark:text-blue-400"
                      : "text-gray-700 dark:text-gray-300"
                  }`}
                >
                  {scheme.name.charAt(0).toUpperCase() + scheme.name.slice(1)}
                </Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      </View>

      {/* Font Family Selection */}
      <View className="mb-6 mx-4">
        <Text className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
          Font Family
        </Text>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          className="flex-row"
        >
          {["system", "serif", "sans-serif", "oswald", "poppins"].map(
            (familyStr) => {
              const family = familyStr as any;
              const isSelected = fontFamily === family;
              const fontStyle = getFontFamilyStyle(familyStr);
              return (
                <TouchableOpacity
                  key={familyStr}
                  onPress={() => setFontFamily(family)}
                  className={`mr-3 p-4 rounded-lg border-2 ${
                    isSelected
                      ? "border-blue-500 bg-blue-50 dark:bg-blue-900/20"
                      : "border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-800"
                  }`}
                  style={{ minWidth: 100 }}
                >
                  <Text
                    className={`text-center font-medium ${
                      isSelected
                        ? "text-blue-600 dark:text-blue-400"
                        : "text-gray-700 dark:text-gray-300"
                    }`}
                    style={{ fontFamily: fontStyle }}
                  >
                    {familyStr.charAt(0).toUpperCase() + familyStr.slice(1)}
                  </Text>
                  <Text
                    className="text-xs text-center text-gray-500 dark:text-gray-400 mt-1"
                    style={{ fontFamily: fontStyle }}
                  >
                    Sample text
                  </Text>
                </TouchableOpacity>
              );
            }
          )}
        </ScrollView>
      </View>
    </ScrollView>
  );
};

export default SettingsScreen;
