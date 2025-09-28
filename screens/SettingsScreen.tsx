// screens/SettingsScreen.tsx
import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Alert,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useBibleDatabase } from "../lib/useBibleDatabase";

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
      Alert.alert("Success", `Bible version switched to ${version}`);
    } catch (error) {
      Alert.alert("Error", "Failed to switch Bible version");
      setSelectedVersion(currentVersion); // Revert on error
    }
  };

  const getVersionDisplayName = (version: string) => {
    const versionMap: { [key: string]: string } = {
      "niv11.sqlite3": "NIV (2011)",
      "csb17.sqlite3": "CSB (2017)",
    };
    return versionMap[version] || version;
  };

  return (
    <ScrollView style={styles.container}>
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Bible Version</Text>
        <Text style={styles.sectionDescription}>
          Choose your preferred Bible translation
        </Text>

        <View style={styles.optionsContainer}>
          {availableVersions.map((version) => (
            <TouchableOpacity
              key={version}
              style={[
                styles.option,
                selectedVersion === version && styles.optionSelected,
              ]}
              onPress={() => handleVersionSelect(version)}
              disabled={isInitializing}
            >
              <View style={styles.optionContent}>
                <View style={styles.optionTextContainer}>
                  <Text style={styles.optionTitle}>
                    {getVersionDisplayName(version)}
                  </Text>
                  <Text style={styles.optionDescription}>
                    {version === "niv11.sqlite3"
                      ? "New International Version"
                      : "Christian Standard Bible"}
                  </Text>
                </View>

                <View style={styles.optionRight}>
                  {isInitializing && selectedVersion === version ? (
                    <Text style={styles.loadingText}>Loading...</Text>
                  ) : (
                    selectedVersion === version && (
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
          ))}
        </View>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>About</Text>
        <View style={styles.aboutItem}>
          <Text style={styles.aboutLabel}>Current Version</Text>
          <Text style={styles.aboutValue}>
            {getVersionDisplayName(currentVersion)}
          </Text>
        </View>
        <View style={styles.aboutItem}>
          <Text style={styles.aboutLabel}>App Version</Text>
          <Text style={styles.aboutValue}>1.0.0</Text>
        </View>
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#f8fafc",
  },
  section: {
    backgroundColor: "#ffffff",
    marginHorizontal: 16,
    marginVertical: 8,
    padding: 16,
    borderRadius: 12,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 2,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "bold",
    color: "#1e293b",
    marginBottom: 4,
  },
  sectionDescription: {
    fontSize: 14,
    color: "#64748b",
    marginBottom: 16,
  },
  optionsContainer: {
    borderRadius: 8,
    overflow: "hidden",
  },
  option: {
    backgroundColor: "#f8fafc",
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: "#e2e8f0",
  },
  optionSelected: {
    backgroundColor: "#eff6ff",
    borderLeftWidth: 3,
    borderLeftColor: "#1e40af",
  },
  optionContent: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  optionTextContainer: {
    flex: 1,
  },
  optionTitle: {
    fontSize: 16,
    fontWeight: "600",
    color: "#1e293b",
    marginBottom: 2,
  },
  optionDescription: {
    fontSize: 14,
    color: "#64748b",
  },
  optionRight: {
    marginLeft: 12,
  },
  loadingText: {
    fontSize: 14,
    color: "#64748b",
    fontStyle: "italic",
  },
  aboutItem: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 8,
  },
  aboutLabel: {
    fontSize: 16,
    color: "#64748b",
  },
  aboutValue: {
    fontSize: 16,
    fontWeight: "500",
    color: "#1e293b",
  },
});

export default SettingsScreen;
