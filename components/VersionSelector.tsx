// components/VersionSelector.tsx
import React from "react";
import { View, Text, TouchableOpacity } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useTheme, getColorClasses } from "../context/ThemeContext";
import {
  getVersionDisplayName,
  getVersionDescription,
} from "../utils/bibleVersionUtils";

interface Colors {
  primary: string;
  background: string;
  text: string;
  muted: string;
  card: string;
  border: string;
}

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
  colors?: Colors;
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
  colors, // Optional colors prop
}) => {
  const { theme, navTheme } = useTheme();
  const colorClasses = getColorClasses(navTheme.colors.primary); // Approximate based on primary, but since getColorClasses takes scheme string, need adjustment if needed
  const primaryColor = navTheme.colors.primary;
  const textColor = theme === "dark" ? "#e5e7eb" : "#374151";
  const mutedColor = theme === "dark" ? "#9ca3af" : "#6b7280";
  const cardBg = theme === "dark" ? "#1e293b" : "#ffffff";
  const borderColor = theme === "dark" ? "#374151" : "#e5e7eb";
  const itemBorderColor = theme === "dark" ? "#4b5563" : "#f3f4f6";
  const selectedBg = theme === "dark" ? "#374151" : "#f0f9ff"; // Adjust for primary, but simple

  // Use provided colors if available, otherwise fallback to theme-derived
  const effectiveColors = colors || {
    primary: primaryColor,
    background: cardBg,
    text: textColor,
    muted: mutedColor,
    card: cardBg,
    border: borderColor,
  };

  // Use selectedVersion if provided, otherwise use currentVersion
  const activeSelectedVersion = selectedVersion || currentVersion;

  return (
    <View className="px-4 mb-4">
      {title || description ? (
        <View
          className="rounded-t-xl"
          style={{ backgroundColor: effectiveColors.primary }}
        >
          {title && (
            <Text
              className="text-base font-semibold mt-2 mx-4"
              style={{ color: "#ffffff" }}
            >
              {title}
            </Text>
          )}
          {description && (
            <Text className="text-sm mb-2 mx-4" style={{ color: "#f8fafc" }}>
              {description}
            </Text>
          )}
        </View>
      ) : null}

      <View
        className="rounded-b-xl overflow-hidden border"
        style={{
          borderColor: effectiveColors.border,
          backgroundColor: effectiveColors.card,
        }}
      >
        {availableVersions.map((version) => {
          const isSelected = activeSelectedVersion === version;
          const isCurrentlyActive = currentVersion === version;

          return (
            <TouchableOpacity
              key={version}
              className={`p-4 border-b ${disabled ? "opacity-60" : ""}`}
              style={{
                borderBottomColor: itemBorderColor,
                backgroundColor: isSelected ? selectedBg : effectiveColors.card,
                borderLeftWidth: isSelected ? 4 : 0,
                borderLeftColor: isSelected
                  ? effectiveColors.primary
                  : undefined,
              }}
              onPress={() => !disabled && onVersionSelect(version)}
              disabled={disabled}
            >
              <View className="flex-row justify-between items-center">
                <View className="flex-1">
                  <Text
                    className="text-base font-semibold"
                    style={{
                      color: isSelected
                        ? effectiveColors.primary
                        : effectiveColors.text,
                    }}
                  >
                    {getVersionDisplayName(version)}
                  </Text>
                  <Text
                    className="text-sm mt-1"
                    style={{ color: effectiveColors.muted }}
                  >
                    {getVersionDescription(version)}
                  </Text>
                  {showActiveIndicator && isCurrentlyActive && !isSelected && (
                    <Text
                      className="text-xs mt-1"
                      style={{ color: effectiveColors.primary }}
                    >
                      Currently active
                    </Text>
                  )}
                  {isSelected && (
                    <Text
                      className="text-xs mt-1"
                      style={{ color: effectiveColors.primary }}
                    >
                      {disabled ? "Switching..." : "Selected"}
                    </Text>
                  )}
                </View>

                <View className="ml-3">
                  {isSelected && (
                    <Ionicons
                      name="checkmark-circle"
                      size={24}
                      color={effectiveColors.primary}
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
