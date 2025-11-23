import { View, Text, TouchableOpacity, ActivityIndicator } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useTheme } from "../context/ThemeContext";
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
  loading?: boolean;
  colors?: Colors;
}

export const VersionSelector: React.FC<VersionSelectorProps> = ({
  currentVersion,
  selectedVersion,
  availableVersions,
  onVersionSelect,
  title = "Bible Version",
  description = "Choose your preferred Bible translation",
  showActiveIndicator = false,
  disabled = false,
  loading = false,
  colors,
}) => {
  const { theme, navTheme } = useTheme();
  const primaryColor = navTheme.colors.primary;
  const textColor = theme === "dark" ? "#e5e7eb" : "#374151";
  const mutedColor = theme === "dark" ? "#9ca3af" : "#6b7280";
  const cardBg = theme === "dark" ? "#1e293b" : "#ffffff";
  const borderColor = theme === "dark" ? "#374151" : "#e5e7eb";
  const itemBorderColor = theme === "dark" ? "#4b5563" : "#f3f4f6";
  const selectedBg = theme === "dark" ? "#374151" : "#f0f9ff";
  const effectiveColors = colors || {
    primary: primaryColor,
    background: cardBg,
    text: textColor,
    muted: mutedColor,
    card: cardBg,
    border: borderColor,
  };
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
              onPress={() => !disabled && !loading && onVersionSelect(version)}
              disabled={disabled || loading}
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
                  {/* REMOVED: The check that showed "Currently active" only when not selected */}
                  {showActiveIndicator && isCurrentlyActive && (
                    <Text
                      className="text-xs mt-1"
                      style={{ color: effectiveColors.primary }}
                    >
                      Currently active
                    </Text>
                  )}
                  {isSelected && (
                    <View className="flex-row items-center mt-1">
                      <Text
                        className="text-xs mr-2"
                        style={{ color: effectiveColors.primary }}
                      >
                        {loading ? "Switching..." : "Selected"}
                      </Text>
                      {loading && (
                        <ActivityIndicator
                          size="small"
                          color={effectiveColors.primary}
                        />
                      )}
                    </View>
                  )}
                </View>

                <View className="ml-3">
                  {isSelected && !loading && (
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
