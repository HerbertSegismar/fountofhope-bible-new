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

const { width: screenWidth } = Dimensions.get("window");

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

  const themeColors = getThemeColors(theme, colorScheme, customColor);
  const [selectedColor, setSelectedColor] = useState(customColor);
  const [hexInput, setHexInput] = useState(customColor);
  const [isValidHex, setIsValidHex] = useState(true);
  const colorPickerRef = useRef<any>(null);
  const hexInputRef = useRef<TextInput>(null);

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

  // Handle color change from wheel
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

  const dynamicStyles = useMemo(
    () =>
      StyleSheet.create({
        modalOverlay: {
          flex: 1,
          backgroundColor: "rgba(0, 0, 0, 0.7)",
          justifyContent: "center",
          alignItems: "center",
          padding: 20,
        },
        colorPickerContainer: {
          backgroundColor: themeColors.card,
          borderRadius: 16,
          padding: 24,
          width: screenWidth * 0.95,
          maxWidth: 400,
          maxHeight: 600,
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
          marginBottom: 20,
          color: themeColors.textPrimary,
          textAlign: "center",
        },
        colorWheelContainer: {
          width: "100%",
          height: 300,
          marginBottom: 20,
        },
        previewSection: {
          width: "100%",
          marginBottom: 20,
        },
        previewText: {
          fontSize: 16,
          fontWeight: "600",
          marginBottom: 12,
          color: themeColors.textPrimary,
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
          width: 44,
          height: 44,
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
          paddingVertical: 14,
          borderRadius: 8,
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
    [themeColors, selectedColor, isValidHex]
  );

  const [isInputFocused, setIsInputFocused] = useState(false);

  return (
    <Modal
      visible={showColorPicker}
      transparent
      animationType="fade"
      onRequestClose={handleClose}
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
                    swatches={true}
                    palette={[
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
                    ]}
                  />
                </View>

                {/* Combined Color Preview and Hex Editor */}
                <View style={dynamicStyles.previewSection}>
                  <Text style={dynamicStyles.previewText}>Selected Color:</Text>

                  <TouchableOpacity
                    style={[
                      dynamicStyles.combinedPreviewContainer,
                      isInputFocused && dynamicStyles.focusedPreviewContainer,
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
                    Drag the wheel to pick a color or tap above to type a hex
                    code
                  </Text>
                </View>

                {/* Action Buttons */}
                <View style={dynamicStyles.buttonContainer}>
                  <TouchableOpacity
                    style={[dynamicStyles.button, dynamicStyles.cancelButton]}
                    onPress={handleClose}
                  >
                    <Text style={dynamicStyles.cancelButtonText}>Cancel</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[dynamicStyles.button, dynamicStyles.saveButton]}
                    onPress={handleSave}
                  >
                    <Text style={dynamicStyles.saveButtonText}>Save</Text>
                  </TouchableOpacity>
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
