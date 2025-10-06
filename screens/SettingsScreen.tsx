import React, { useEffect, useState, useCallback } from "react";
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  Alert,
  Dimensions,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useBibleDatabase } from "../context/BibleDatabaseContext";

const { width: screenWidth, height: screenHeight } = Dimensions.get("window");

const SettingsScreen = () => {
  const { currentVersion, availableVersions, switchVersion, isInitializing } =
    useBibleDatabase();

  const [selectedVersion, setSelectedVersion] = useState(currentVersion);
  const [isSwitching, setIsSwitching] = useState(false);
  const [isLandscape, setIsLandscape] = useState(screenWidth > screenHeight);

  const getVersionDisplayName = (version: string) => {
    const versionMap: { [key: string]: string } = {
      "niv11.sqlite3": "NIV (2011)",
      "csb17.sqlite3": "CSB (2017)",
      "ylt.sqlite3": "Young's Literal Translation",
      "nlt15.sqlite3": "NLT (2015)",
      "nkjv.sqlite3": "NKJV",
      "nasb.sqlite3": "NASB",
      "logos.sqlite3": "Logos Edition",
      "kj2.sqlite3": "King James II",
      "esv.sqlite3": "ESV",
      "esvgsb.sqlite3": "ESV Gospel Study Bible",
    };
    return versionMap[version] || version;
  };

  const getVersionDescription = (version: string) => {
    const descriptionMap: { [key: string]: string } = {
      "niv11.sqlite3": "New International Version",
      "csb17.sqlite3": "Christian Standard Bible",
      "ylt.sqlite3": "Young's Literal Translation",
      "nlt15.sqlite3": "New Living Translation",
      "nkjv.sqlite3": "New King James Version",
      "nasb.sqlite3": "New American Standard Bible",
      "logos.sqlite3": "Logos Bible",
      "kj2.sqlite3": "King James 2",
      "esv.sqlite3": "English Standard Version",
      "esvgsb.sqlite3": "ESV Global Study Bible",
    };
    return descriptionMap[version] || "Bible translation";
  };

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

        <View className="rounded-md overflow-hidden">
          {availableVersions.map((version) => {
            const isSelected = selectedVersion === version;
            const isCurrentlyActive = currentVersion === version;

            return (
              <TouchableOpacity
                key={version}
                className={`p-4 border-b border-slate-200 ${
                  isSelected
                    ? "bg-blue-50 border-l-4 border-blue-800"
                    : "bg-slate-50"
                }`}
                onPress={() => handleVersionSelect(version)}
                disabled={isLoading}
              >
                <View className="flex-row justify-between items-center">
                  <View className="flex-1">
                    <Text className="text-base font-semibold text-slate-800">
                      {getVersionDisplayName(version)}
                    </Text>
                    <Text className="text-sm text-slate-500">
                      {getVersionDescription(version)}
                    </Text>
                    {isCurrentlyActive && !isSelected && (
                      <Text className="text-xs text-green-600 mt-1">
                        Currently active
                      </Text>
                    )}
                  </View>

                  <View className="ml-3">
                    {isLoading && isSelected ? (
                      <Text className="text-sm italic text-slate-500">
                        Switching...
                      </Text>
                    ) : (
                      isSelected && (
                        <Ionicons
                          name="checkmark-circle"
                          size={24}
                          color="#1e40af"
                        />
                      )
                    )}
                  </View>
                </View>
              </TouchableOpacity>
            );
          })}
        </View>

        {isLoading && (
          <View className="mt-2 items-center">
            <Text className="text-sm italic text-slate-500">
              Switching version... Please wait
            </Text>
          </View>
        )}
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
