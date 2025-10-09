// components/VersionSelector.tsx
import React from "react";
import { View, Text, TouchableOpacity } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import {
  getVersionDisplayName,
  getVersionDescription,
} from "../utils/bibleVersionUtils";

interface VersionSelectorProps {
  currentVersion: string;
  selectedVersion?: string;
  availableVersions: string[];
  onVersionSelect: (version: string) => void;
  title?: string;
  description?: string;
  showCurrentVersion?: boolean;
  showActiveIndicator?: boolean;
  disabled?: boolean;
}

export const VersionSelector: React.FC<VersionSelectorProps> = ({
  currentVersion,
  selectedVersion,
  availableVersions,
  onVersionSelect,
  title = "Bible Version",
  description = "Choose your preferred Bible translation",
  showCurrentVersion = true,
  showActiveIndicator = false,
  disabled = false,
}) => {
  // Use selectedVersion if provided, otherwise use currentVersion
  const activeSelectedVersion = selectedVersion || currentVersion;

  return (
    <View className="px-4 mb-4">
      <View className="bg-blue-500 rounded-t-xl">
        {title && (
          <Text className="text-base font-semibold text-white mt-2 mx-4">
            {title}
          </Text>
        )}
        {description && (
          <Text className="text-sm text-slate-100 mb-2 mx-4">{description}</Text>
        )}
      </View>

      <View className="rounded-b-xl  overflow-hidden border border-gray-200">
        {availableVersions.map((version) => {
          const isSelected = activeSelectedVersion === version;
          const isCurrentlyActive = currentVersion === version;

          return (
            <TouchableOpacity
              key={version}
              className={`p-4 border-b border-gray-100 ${
                isSelected
                  ? "bg-blue-50 border-l-4 border-blue-500"
                  : "bg-white"
              } ${disabled ? "opacity-60" : ""}`}
              onPress={() => !disabled && onVersionSelect(version)}
              disabled={disabled}
            >
              <View className="flex-row justify-between items-center">
                <View className="flex-1">
                  <Text
                    className={`text-base font-semibold ${
                      isSelected ? "text-blue-800" : "text-slate-800"
                    }`}
                  >
                    {getVersionDisplayName(version)}
                  </Text>
                  <Text className="text-sm text-slate-500">
                    {getVersionDescription(version)}
                  </Text>
                  {showActiveIndicator && isCurrentlyActive && !isSelected && (
                    <Text className="text-xs text-green-600 mt-1">
                      Currently active
                    </Text>
                  )}
                  {isSelected && (
                    <Text className="text-xs text-green-600 mt-1">
                      {disabled ? "Switching..." : "Currently active"}
                    </Text>
                  )}
                </View>

                <View className="ml-3">
                  {isSelected && (
                    <Ionicons
                      name="checkmark-circle"
                      size={24}
                      color="#3b82f6"
                    />
                  )}
                </View>
              </View>
            </TouchableOpacity>
          );
        })}
      </View>
    </View>
  );
};
