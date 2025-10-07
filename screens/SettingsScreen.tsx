import React, { useEffect, useState, useCallback } from "react";
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  Alert,
  Dimensions,
  ActivityIndicator,
} from "react-native";
import { useBibleDatabase } from "../context/BibleDatabaseContext";
import { VersionSelector } from "../components/VersionSelector";
import { getVersionDisplayName } from "../utils/bibleVersionUtils";

const { width: screenWidth, height: screenHeight } = Dimensions.get("window");

const SettingsScreen = () => {
  const { currentVersion, availableVersions, switchVersion, isInitializing } =
    useBibleDatabase();

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

      try {
        await switchVersion(version);
        // Success - no need for additional verification
      } catch (error: unknown) {
        console.error("Version switch failed:", error);

        let errorMessage = "Failed to switch Bible version. Please try again.";
        if (error instanceof Error) {
          if (
            error.message.includes("verification") ||
            error.message.includes("not available")
          ) {
            errorMessage = `The ${getVersionDisplayName(version)} database appears to be corrupted or unavailable. Please try another version.`;
          }
        }

        Alert.alert("Error", errorMessage);
        setSelectedVersion(currentVersion);
      } finally {
        setIsSwitching(false);
      }
    },
    [currentVersion, isSwitching, switchVersion]
  );

  const isLoading = isInitializing || isSwitching;

  return (
    <ScrollView
      className={`flex-1 bg-slate-50 ${isLandscape ? "mr-12" : "mr-0"}`}
    >
      {/* Bible Version Selection */}
      <View className="bg-white m-4 p-4 rounded-xl shadow-md">
        <Text className="text-lg font-bold text-slate-800 mb-1">
          Bible Version
        </Text>
        <Text className="text-sm text-slate-500 mb-4">
          Choose your preferred Bible translation
        </Text>

        {isLoading && (
          <View className="mb-4 items-center">
            <ActivityIndicator size="small" color="#3B82F6" />
            <Text className="text-sm italic text-slate-500 mt-2">
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
      <View className="bg-white m-4 p-4 rounded-xl shadow-md">
        <Text className="text-lg font-bold text-slate-800 mb-2">
          Current Version
        </Text>
        <View className="flex-row justify-between items-center py-2">
          <Text className="text-base text-slate-600">Active Translation</Text>
          <Text className="text-base font-medium text-slate-800">
            {getVersionDisplayName(currentVersion)}
          </Text>
        </View>
      </View>
    </ScrollView>
  );
};

export default SettingsScreen;
