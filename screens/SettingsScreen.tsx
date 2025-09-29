import React, { useState, useEffect } from "react";
import { View, Text, TouchableOpacity, ScrollView, Alert } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useBibleDatabase } from "../context/BibleDatabaseContext";

const SettingsScreen = () => {
  const { currentVersion, availableVersions, switchVersion, isInitializing } =
    useBibleDatabase();

  const [selectedVersion, setSelectedVersion] = useState(currentVersion);

  useEffect(() => {
    setSelectedVersion(currentVersion);
  }, [currentVersion]);

  const handleVersionSelect = async (version: string) => {
    if (version === currentVersion) return;

    setSelectedVersion(version);

    try {
      await switchVersion(version);
      Alert.alert(
        "Success",
        `Bible version switched to ${getVersionDisplayName(version)}`
      );
    } catch (error) {
      Alert.alert("Error", "Failed to switch Bible version");
      setSelectedVersion(currentVersion);
    }
  };

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

  return (
    <ScrollView className="flex-1 bg-slate-50">
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
            return (
              <TouchableOpacity
                key={version}
                className={`p-4 border-b border-slate-200 ${
                  isSelected
                    ? "bg-blue-50 border-l-4 border-blue-800"
                    : "bg-slate-50"
                }`}
                onPress={() => handleVersionSelect(version)}
                disabled={isInitializing}
              >
                <View className="flex-row justify-between items-center">
                  <View className="flex-1">
                    <Text className="text-base font-semibold text-slate-800">
                      {getVersionDisplayName(version)}
                    </Text>
                    <Text className="text-sm text-slate-500">
                      {getVersionDescription(version)}
                    </Text>
                  </View>

                  <View className="ml-3">
                    {isInitializing && isSelected ? (
                      <Text className="text-sm italic text-slate-500">
                        Loading...
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

        {isInitializing && (
          <View className="mt-2 items-center">
            <Text className="text-sm italic text-slate-500">
              Switching version...
            </Text>
          </View>
        )}
      </View>

      <View className="bg-white m-4 p-4 rounded-xl shadow-md">
        <Text className="text-lg font-bold text-slate-800 mb-2">About</Text>
        <View className="flex-row justify-between py-2">
          <Text className="text-base text-slate-500">Current Version</Text>
          <Text className="text-base font-medium text-slate-800">
            {getVersionDisplayName(currentVersion)}
          </Text>
        </View>
        <View className="flex-row justify-between py-2">
          <Text className="text-base text-slate-500">App Version</Text>
          <Text className="text-base font-medium text-slate-800">1.0.0</Text>
        </View>
      </View>
    </ScrollView>
  );
};

export default SettingsScreen;
