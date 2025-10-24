import React, { useState, useEffect, useMemo, useRef } from "react";
import {
  View,
  Modal,
  TouchableWithoutFeedback,
  Text,
  TouchableOpacity,
  Dimensions,
  StyleSheet,
  TextInput,
  KeyboardAvoidingView,
  Platform,
  Alert,
} from "react-native";
import ColorPicker from "react-native-wheel-color-picker";
import { useTheme } from "../context/ThemeContext";
import { getThemeColors, getAccessibleTextColor } from "../utils/themeUtils";

const ColorWheelPicker = () => {
  const {
    theme,
    colorScheme,
    showColorPicker,
    setShowColorPicker,
    customColor,
    setCustomColor,
    setColorScheme,
  } = useTheme();

  const [screenDimensions, setScreenDimensions] = useState({
    width: Dimensions.get("window").width,
    height: Dimensions.get("window").height,
  });

  const themeColors = getThemeColors(theme, colorScheme, customColor);
  const [selectedColor, setSelectedColor] = useState(customColor);
  const [hexInput, setHexInput] = useState(customColor);
  const [isValidHex, setIsValidHex] = useState(true);
  const colorPickerRef = useRef<any>(null);
  const hexInputRef = useRef<TextInput>(null);

  const palette = [
    "#FF0000",
    "#00FF00",
    "#0000FF",
    "#FFFF00",
    "#FF00FF",
    "#00FFFF",
    "#FFA500",
    "#800080",
    "#FFC0CB",
    "#A52A2A",
    "#000000",
    "#FFFFFF",
  ];

  // Listen for dimension changes
  useEffect(() => {
    const subscription = Dimensions.addEventListener("change", ({ window }) => {
      setScreenDimensions({
        width: window.width,
        height: window.height,
      });
    });

    return () => subscription?.remove();
  }, []);

  useEffect(() => {
    if (showColorPicker) {
      setSelectedColor(customColor);
      setHexInput(customColor);
      setIsValidHex(true);
    }
  }, [showColorPicker, customColor]);

  // Validate hex color
  const validateHex = (hex: string): boolean => {
    const hexRegex = /^#?([0-9A-F]{3}|[0-9A-F]{6})$/i;
    return hexRegex.test(hex);
  };

  // Format hex color (ensure it has # and 6 digits)
  const formatHex = (hex: string): string => {
    let formatted = hex.replace("#", "").toUpperCase();

    // Handle 3-digit hex
    if (formatted.length === 3) {
      formatted = formatted
        .split("")
        .map((char) => char + char)
        .join("");
    }

    return `#${formatted}`;
  };

  // Handle color change from wheel or swatch
  const handleColorChange = (color: string) => {
    setSelectedColor(color);
    setHexInput(color);
    setIsValidHex(true);
  };

  // Handle hex input change
  const handleHexInputChange = (text: string) => {
    let newText = text;

    // Add # if user types without it and it's the first character
    if (text.length === 1 && text !== "#") {
      newText = `#${text}`;
    }

    // Allow deleting the # but then re-add it when typing
    if (text.length === 0) {
      newText = "#";
    }

    setHexInput(newText);

    // Validate as user types
    if (newText.length >= 4) {
      // Minimum: # + 3 digits
      const isValid = validateHex(newText);
      setIsValidHex(isValid);

      // Update color if valid and complete
      if (isValid && newText.length === 7) {
        // Full hex code
        const formattedHex = formatHex(newText);
        setSelectedColor(formattedHex);
        if (colorPickerRef.current) {
          colorPickerRef.current.setState({ currentColor: formattedHex });
        }
      }
    } else if (newText === "#") {
      setIsValidHex(true); // Reset validation when only # is present
    }
  };

  // Handle hex input submit
  const handleHexSubmit = () => {
    if (validateHex(hexInput)) {
      const formattedHex = formatHex(hexInput);
      setSelectedColor(formattedHex);
      setHexInput(formattedHex);
      setIsValidHex(true);

      if (colorPickerRef.current) {
        colorPickerRef.current.setState({ currentColor: formattedHex });
      }
    } else {
      setIsValidHex(false);
      Alert.alert(
        "Invalid Color",
        "Please enter a valid hex color code (e.g., #FF0000)"
      );
    }
  };

  // Focus hex input when preview is pressed
  const handlePreviewPress = () => {
    hexInputRef.current?.focus();
  };

  const handleSave = () => {
    if (!isValidHex) {
      Alert.alert("Invalid Color", "Please fix the color code before saving.");
      return;
    }

    setCustomColor(selectedColor);
    setColorScheme("custom");
    setShowColorPicker(false);
  };

  const handleClose = () => {
    setShowColorPicker(false);
    setSelectedColor(customColor);
    setHexInput(customColor);
    setIsValidHex(true);
  };

  const isPortrait = screenDimensions.height >= screenDimensions.width;
  const minDim = Math.min(screenDimensions.width, screenDimensions.height);

  const dynamicStyles = useMemo(
    () =>
      StyleSheet.create({
        modalOverlay: {
          flex: 1,
          backgroundColor: "rgba(0, 0, 0, 0.7)",
          justifyContent: "center",
          alignItems: "center",
          padding: 16,
        },
        colorPickerContainer: {
          backgroundColor: themeColors.card,
          borderRadius: 16,
          padding: 20,
          width: isPortrait
            ? Math.min(screenDimensions.width * 0.95, 400)
            : Math.min(screenDimensions.width * 0.95 * 0.8, 600 * 0.8),
          maxWidth: isPortrait ? 400 : 600,
          maxHeight: screenDimensions.height * 0.9,
          alignItems: "center",
          shadowColor: "#000",
          shadowOffset: { width: 0, height: 4 },
          shadowOpacity: 0.3,
          shadowRadius: 8,
          elevation: 8,
        },
        title: {
          fontSize: 20,
          fontWeight: "bold",
          marginBottom: 8,
          color: themeColors.textPrimary,
          textAlign: "center",
        },
        contentContainer: {
          flexDirection: isPortrait ? "column" : "row",
          width: "100%",
          alignItems: isPortrait ? "center" : "stretch",
        },
        leftContainer: {
          flex: isPortrait ? 0 : 1,
          width: isPortrait ? "100%" : undefined,
        },
        rightContainer: {
          width: isPortrait ? "100%" : 200,
          marginLeft: isPortrait ? 0 : 20,
          justifyContent: "space-between",
        },
        colorWheelContainer: {
          width: "100%",
          height: Math.min(
            minDim * 0.8 * (isPortrait ? 1 : 0.8),
            350 * (isPortrait ? 1 : 0.8)
          ),
          marginBottom: isPortrait ? 16 : 0,
        },
        previewSection: {
          width: "100%",
          marginBottom: 16,
        },
        previewText: {
          fontSize: 16,
          fontWeight: "600",
          marginBottom: 12,
          color: themeColors.textPrimary,
        },
        swatchesContainer: {
          flexDirection: "row",
          flexWrap: "wrap",
          justifyContent: "flex-start",
          marginBottom: 8,
        },
        swatch: {
          width: 20,
          height: 20,
          margin: 5,
          borderRadius: 1,
          borderWidth: 1,
          borderColor: themeColors.border,
        },
        // Combined preview and hex editor
        combinedPreviewContainer: {
          flexDirection: "row",
          alignItems: "center",
          backgroundColor: themeColors.surface,
          borderRadius: 12,
          padding: 4,
          borderWidth: 2,
          borderColor: isValidHex ? themeColors.border : "#FF3B30",
        },
        colorPreview: {
          width: 30,
          height: 30,
          borderRadius: 8,
          borderWidth: 1,
          borderColor: themeColors.border,
          backgroundColor: selectedColor,
          marginRight: 8,
        },
        hexInput: {
          flex: 1,
          fontSize: 16,
          fontWeight: "500",
          color: themeColors.textPrimary,
          fontFamily: Platform.OS === "ios" ? "Menlo" : "monospace",
          paddingVertical: 8,
          paddingHorizontal: 4,
        },
        invalidText: {
          color: "#FF3B30",
          fontSize: 12,
          marginTop: 6,
          marginLeft: 4,
        },
        buttonContainer: {
          flexDirection: "row",
          justifyContent: "space-between",
          width: "100%",
          gap: 12,
        },
        button: {
          flex: 1,
          paddingVertical: 6,
          borderRadius: 6,
          alignItems: "center",
          justifyContent: "center",
        },
        cancelButton: {
          backgroundColor: themeColors.surface,
          borderWidth: 1,
          borderColor: themeColors.border,
        },
        saveButton: {
          backgroundColor: themeColors.primary,
        },
        cancelButtonText: {
          color: themeColors.textSecondary,
          fontSize: 16,
          fontWeight: "600",
        },
        saveButtonText: {
          color: getAccessibleTextColor(themeColors.primary),
          fontSize: 16,
          fontWeight: "600",
        },
        instructions: {
          fontSize: 12,
          color: themeColors.textSecondary,
          textAlign: "center",
          marginTop: 12,
          fontStyle: "italic",
        },
        // Style for when hex input is focused
        focusedPreviewContainer: {
          borderColor: themeColors.primary,
          borderWidth: 2,
        },
      }),
    [
      themeColors,
      selectedColor,
      isValidHex,
      screenDimensions,
      isPortrait,
      minDim,
    ]
  );

  const [isInputFocused, setIsInputFocused] = useState(false);

  return (
    <Modal
      visible={showColorPicker}
      transparent
      animationType="fade"
      onRequestClose={handleClose}
      supportedOrientations={["portrait", "landscape"]}
    >
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        style={{ flex: 1 }}
      >
        <TouchableWithoutFeedback onPress={handleClose}>
          <View style={dynamicStyles.modalOverlay}>
            <TouchableWithoutFeedback>
              <View style={dynamicStyles.colorPickerContainer}>
                <Text style={dynamicStyles.title}>Choose Custom Color</Text>

                <View style={dynamicStyles.contentContainer}>
                  <View style={dynamicStyles.leftContainer}>
                    {/* Color Wheel */}
                    <View style={dynamicStyles.colorWheelContainer}>
                      <ColorPicker
                        ref={colorPickerRef}
                        color={selectedColor}
                        onColorChange={handleColorChange}
                        onColorChangeComplete={handleColorChange}
                        thumbSize={30}
                        sliderSize={25}
                        noSnap={true}
                        row={false}
                        swatches={isPortrait}
                        palette={palette}
                      />
                    </View>
                  </View>

                  <View style={dynamicStyles.rightContainer}>
                    <View>
                      {/* Combined Color Preview and Hex Editor */}
                      <View style={dynamicStyles.previewSection}>
                        <Text style={dynamicStyles.previewText}>
                          Selected Color:
                        </Text>

                        <TouchableOpacity
                          style={[
                            dynamicStyles.combinedPreviewContainer,
                            isInputFocused &&
                              dynamicStyles.focusedPreviewContainer,
                          ]}
                          onPress={handlePreviewPress}
                          activeOpacity={0.7}
                        >
                          <View style={dynamicStyles.colorPreview} />
                          <TextInput
                            ref={hexInputRef}
                            style={dynamicStyles.hexInput}
                            value={hexInput}
                            onChangeText={handleHexInputChange}
                            onSubmitEditing={handleHexSubmit}
                            placeholder="#FFFFFF"
                            placeholderTextColor={themeColors.textSecondary}
                            maxLength={7}
                            autoCapitalize="characters"
                            autoCorrect={false}
                            selectionColor={themeColors.primary}
                            onFocus={() => setIsInputFocused(true)}
                            onBlur={() => setIsInputFocused(false)}
                          />
                        </TouchableOpacity>

                        {!isValidHex && (
                          <Text style={dynamicStyles.invalidText}>
                            Invalid hex color code
                          </Text>
                        )}

                        <Text style={dynamicStyles.instructions}>
                          Drag the wheel to pick a color or tap above to type a
                          hex code
                        </Text>
                      </View>

                      {!isPortrait && (
                        <View style={dynamicStyles.swatchesContainer}>
                          {palette.map((color) => (
                            <TouchableOpacity
                              key={color}
                              style={[
                                dynamicStyles.swatch,
                                { backgroundColor: color },
                              ]}
                              onPress={() => handleColorChange(color)}
                            />
                          ))}
                        </View>
                      )}
                    </View>

                    {/* Action Buttons */}
                    <View style={dynamicStyles.buttonContainer}>
                      <TouchableOpacity
                        style={[
                          dynamicStyles.button,
                          dynamicStyles.cancelButton,
                        ]}
                        onPress={handleClose}
                      >
                        <Text style={dynamicStyles.cancelButtonText}>
                          Cancel
                        </Text>
                      </TouchableOpacity>
                      <TouchableOpacity
                        style={[dynamicStyles.button, dynamicStyles.saveButton]}
                        onPress={handleSave}
                      >
                        <Text style={dynamicStyles.saveButtonText}>Save</Text>
                      </TouchableOpacity>
                    </View>
                  </View>
                </View>
              </View>
            </TouchableWithoutFeedback>
          </View>
        </TouchableWithoutFeedback>
      </KeyboardAvoidingView>
    </Modal>
  );
};

export default ColorWheelPicker;
