import React from "react";
import { Modal, TouchableOpacity, ScrollView, View, Text } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { VersionSelector } from "./VersionSelector";

interface SettingsModalProps {
  visible: boolean;
  onClose: () => void;
  fontSize: number;
  increaseFontSize: () => void;
  decreaseFontSize: () => void;
  colors: any;
  versionSelectorColors: any;
  primaryTextColor: string;
  isLandscape: boolean;
  showMultiVersion: boolean;
  toggleMultiVersion: () => void;
  currentVersion: string;
  availableBibleVersions: string[]; // Changed from availableVersions
  handleVersionSelect: (version: string) => void;
  handleSecondaryVersionSelect: (version: string) => void;
  secondaryVersion: string | null;
  isSwitchingVersion: boolean;
}

export const SettingsModal: React.FC<SettingsModalProps> = ({
  visible,
  onClose,
  fontSize,
  increaseFontSize,
  decreaseFontSize,
  colors,
  versionSelectorColors,
  primaryTextColor,
  isLandscape,
  showMultiVersion,
  toggleMultiVersion,
  currentVersion,
  availableBibleVersions, // Changed from availableVersions
  handleVersionSelect,
  handleSecondaryVersionSelect,
  secondaryVersion,
  isSwitchingVersion,
}) => {
  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <TouchableOpacity
        className="flex-1 justify-center items-center"
        activeOpacity={1}
        onPress={onClose}
        style={{ backgroundColor: colors.background?.default + "CC" }}
      >
        <SafeAreaView
          className="max-h-[90%] shadow shadow-black"
          style={{
            backgroundColor: colors.card,
            borderRadius: 12,
            flex: 1,
            width: "92%",
          }}
          onStartShouldSetResponder={() => true}
        >
          <View
            style={{
              padding: 16,
              borderBottomWidth: 1,
              borderBottomColor: colors.border?.default,
              backgroundColor: colors.primary,
            }}
          >
            <Text
              style={{
                color: primaryTextColor,
                fontSize: 18,
                fontWeight: "bold",
              }}
            >
              Settings
            </Text>
          </View>
          <ScrollView className="flex-1 mx-4">
            {/* Font Size Controls */}
            <View
              style={{
                paddingHorizontal: 16,
                paddingVertical: 8,
                borderBottomWidth: 1,
                borderBottomColor: colors.border?.default,
              }}
            >
              <Text
                style={{
                  color: colors.primary,
                  fontSize: 12,
                  fontWeight: "600",
                  marginBottom: 8,
                }}
              >
                Font Size
              </Text>
              <View className="flex-row justify-between items-center">
                <TouchableOpacity
                  onPress={decreaseFontSize}
                  className="size-8 rounded-full items-center justify-center"
                  style={{ backgroundColor: colors.card }}
                >
                  <Text
                    style={{
                      color: colors.primary,
                      fontWeight: "bold",
                      fontSize: 16,
                    }}
                  >
                    A-
                  </Text>
                </TouchableOpacity>
                <Text
                  style={{
                    color: colors.text?.primary,
                    fontSize: 12,
                    fontWeight: "500",
                  }}
                >
                  {fontSize}px
                </Text>
                <TouchableOpacity
                  onPress={increaseFontSize}
                  className="size-8 rounded-full items-center justify-center"
                  style={{ backgroundColor: colors.card }}
                >
                  <Text
                    style={{
                      color: colors.primary,
                      fontWeight: "bold",
                      fontSize: 16,
                    }}
                  >
                    A+
                  </Text>
                </TouchableOpacity>
              </View>
            </View>

            {/* Multi-Version Toggle */}
            <View
              style={{
                paddingHorizontal: 16,
                paddingTop: 8,
                borderBottomWidth: 1,
                borderBottomColor: colors.border?.default,
              }}
            >
              <Text
                style={{
                  color: colors.primary,
                  fontSize: 12,
                  fontWeight: "600",
                }}
              >
                Multi-Version Display
              </Text>
              <View className="flex-row justify-between items-center">
                <Text
                  style={{
                    color: colors.text?.primary,
                    flex: 1,
                    marginBottom: 8,
                  }}
                >
                  Show two Bible versions side by side
                </Text>
                <TouchableOpacity
                  onPress={toggleMultiVersion}
                  className="w-12 h-6 rounded-full justify-center -mt-8 bg-gray-200"
                >
                  <View
                    className={`w-5 h-5 rounded-full absolute z-50 ${showMultiVersion ? "right-1" : "left-1"}`}
                    style={{
                      backgroundColor: showMultiVersion
                        ? colors.primary
                        : colors.muted,
                    }}
                  />
                </TouchableOpacity>
              </View>
            </View>

            {/* Bible Version Selection */}
            {isLandscape && showMultiVersion ? (
              <View className="flex-row gap-4">
                <View className="flex-1">
                  <VersionSelector
                    currentVersion={currentVersion}
                    availableVersions={availableBibleVersions} // Changed
                    onVersionSelect={handleVersionSelect}
                    title="Primary Bible Version"
                    description="Choose your preferred Bible translation"
                    showCurrentVersion={true}
                    colors={versionSelectorColors}
                    disabled={isSwitchingVersion}
                    loading={isSwitchingVersion}
                  />
                </View>
                <View className="flex-1">
                  <VersionSelector
                    currentVersion={secondaryVersion || ""}
                    selectedVersion={secondaryVersion || ""}
                    availableVersions={availableBibleVersions.filter(
                      // Changed
                      (v) => v !== currentVersion
                    )}
                    onVersionSelect={handleSecondaryVersionSelect}
                    title="Secondary Bible Version"
                    description="Choose a different translation for comparison"
                    showCurrentVersion={true}
                    colors={versionSelectorColors}
                  />
                </View>
              </View>
            ) : (
              <>
                <VersionSelector
                  currentVersion={currentVersion}
                  availableVersions={availableBibleVersions} // Changed
                  onVersionSelect={handleVersionSelect}
                  title="Primary Bible Version"
                  description="Choose your preferred Bible translation"
                  showCurrentVersion={true}
                  colors={versionSelectorColors}
                  disabled={isSwitchingVersion}
                  loading={isSwitchingVersion}
                />
                {showMultiVersion && (
                  <VersionSelector
                    currentVersion={secondaryVersion || ""}
                    selectedVersion={secondaryVersion || ""}
                    availableVersions={availableBibleVersions.filter(
                      // Changed
                      (v) => v !== currentVersion
                    )}
                    onVersionSelect={handleSecondaryVersionSelect}
                    title="Secondary Bible Version"
                    description="Choose a different translation for comparison"
                    showCurrentVersion={true}
                    colors={versionSelectorColors}
                  />
                )}
              </>
            )}
          </ScrollView>
          <TouchableOpacity
            onPress={onClose}
            style={{
              padding: 16,
              borderTopWidth: 1,
              borderTopColor: colors.border?.default,
              alignItems: "center",
            }}
          >
            <Text
              style={{ color: colors.primary, fontSize: 16, fontWeight: "600" }}
            >
              Close
            </Text>
          </TouchableOpacity>
        </SafeAreaView>
      </TouchableOpacity>
    </Modal>
  );
};
