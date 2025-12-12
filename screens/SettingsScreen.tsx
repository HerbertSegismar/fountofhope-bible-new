import React, {
  useEffect,
  useState,
  useCallback,
  useMemo,
  useRef,
} from "react";
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  Alert,
  Dimensions,
  ActivityIndicator,
  Switch,
  Modal,
  FlatList,
  Image,
  TextInput,
  Linking,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useBibleDatabase } from "../context/BibleDatabaseContext";
import { useTheme, ColorScheme, FontFamily } from "../context/ThemeContext";
import { VersionSelector } from "../components/VersionSelector";
import { getVersionDisplayName } from "../utils/bibleVersionUtils";
import { Fonts } from "../utils/fonts";
import { getThemeColors, getContrastColor } from "../utils/themeUtils";
import Footer from "../components/Footer";
import { bgTextures } from "../assets/textures/bgTextures";

const { width: screenWidth, height: screenHeight } = Dimensions.get("window");

const SettingsScreen = () => {
  const {
    currentVersion,
    availableBibleVersions,
    switchVersion,
    isInitializing,
  } = useBibleDatabase();
  const {
    theme,
    colorScheme,
    fontFamily,
    customColor,
    colorSchemes,
    toggleTheme,
    setColorScheme,
    setFontFamily,
  } = useTheme();

  const [selectedVersion, setSelectedVersion] = useState(currentVersion);
  const [isSwitching, setIsSwitching] = useState(false);
  const [_isLandscape, setIsLandscape] = useState(screenWidth > screenHeight);
  const [fontSize, setFontSize] = useState(16);
  const [tempFontInput, setTempFontInput] = useState("16");
  const [showMultiVersion, setShowMultiVersion] = useState(false);
  const [secondaryVersion, setSecondaryVersion] = useState<string | null>(null);
  const [bgImageIndex, setBgImageIndex] = useState(0);
  const [showBgModal, setShowBgModal] = useState(false);
  const [showFontModal, setShowFontModal] = useState(false);
  const tempFontInputRef = useRef(tempFontInput);

  useEffect(() => {
    tempFontInputRef.current = tempFontInput;
  }, [tempFontInput]);

  const themeColors = getThemeColors(theme, colorScheme, customColor);

  useEffect(() => {
    const updateLayout = () => {
      const { width: newWidth, height: newHeight } = Dimensions.get("window");
      const newIsLandscape = newWidth > newHeight;
      setIsLandscape(newIsLandscape);
    };

    updateLayout();
    const subscription = Dimensions.addEventListener("change", updateLayout);
    return () => subscription?.remove();
  }, []);

  useEffect(() => {
    const loadSettings = async () => {
      try {
        const [fontStr, multiStr, secVer, bgStr] = await Promise.all([
          AsyncStorage.getItem("fontSize"),
          AsyncStorage.getItem("showMultiVersion"),
          AsyncStorage.getItem("secondaryVersion"),
          AsyncStorage.getItem("bgImageIndex"),
        ]);
        if (fontStr) {
          const fs = Math.max(8, Math.min(50, parseInt(fontStr, 10) || 16));
          setFontSize(fs);
          setTempFontInput(fs.toString());
        }
        if (multiStr === "true") setShowMultiVersion(true);
        if (secVer) setSecondaryVersion(secVer);
        if (bgStr) setBgImageIndex(parseInt(bgStr, 10) || 0);
      } catch (e) {
        console.error("Failed to load settings", e);
      }
    };
    loadSettings();
  }, []);

  useEffect(() => {
    AsyncStorage.setItem("fontSize", fontSize.toString()).catch(console.error);
  }, [fontSize]);

  useEffect(() => {
    AsyncStorage.setItem("showMultiVersion", showMultiVersion.toString()).catch(
      console.error
    );
  }, [showMultiVersion]);

  useEffect(() => {
    if (secondaryVersion) {
      AsyncStorage.setItem("secondaryVersion", secondaryVersion).catch(
        console.error
      );
    }
  }, [secondaryVersion]);

  useEffect(() => {
    AsyncStorage.setItem("bgImageIndex", bgImageIndex.toString()).catch(
      console.error
    );
  }, [bgImageIndex]);

  useEffect(() => {
    setSelectedVersion(currentVersion);
  }, [currentVersion]);

  // REMOVED: The useEffect that filtered versions for multiview

  useEffect(() => {
    setTempFontInput(fontSize.toString());
  }, [fontSize]);

  const handleVersionSelect = useCallback(
    async (version: string) => {
      if (version === currentVersion || isSwitching) return;
      setSelectedVersion(version);
      setIsSwitching(true);

      const maxRetries = 5;
      let lastError: unknown;

      for (let attempt = 0; attempt < maxRetries; attempt++) {
        try {
          await switchVersion(version);
          setIsSwitching(false);
          return;
        } catch (error: unknown) {
          lastError = error;
          console.error(`Version switch attempt ${attempt + 1} failed:`, error);

          if (attempt < maxRetries - 1) {
            const delay = 500 * Math.pow(2, attempt);
            await new Promise((resolve) => setTimeout(resolve, delay));
          }
        }
      }

      let errorMessage =
        "Failed to switch Bible version after multiple attempts. Please try another version.";
      if (lastError instanceof Error) {
        if (
          lastError.message.includes("verification") ||
          lastError.message.includes("not available")
        ) {
          errorMessage = `The ${getVersionDisplayName(version)} database appears to be corrupted or unavailable. Please try another version.`;
        }
      }

      Alert.alert("Error", errorMessage);
      setSelectedVersion(currentVersion);
      setIsSwitching(false);
    },
    [currentVersion, isSwitching, switchVersion]
  );

  const handleSecondaryVersionSelect = useCallback(
    (version: string) => {
      // REMOVED: The check that prevented same version selection
      setSecondaryVersion(version);
    },
    [] // REMOVED: currentVersion dependency
  );

  const commitFontSize = useCallback(() => {
    const text = tempFontInputRef.current;
    let num = parseInt(text, 10);
    if (isNaN(num)) num = fontSize;
    num = Math.max(8, Math.min(50, num));
    setFontSize(num);
    setTempFontInput(num.toString());
    setShowFontModal(false);
  }, [fontSize]);

  const handleFontInputChange = useCallback((text: string) => {
    const filtered = text.replace(/\D/g, "");
    setTempFontInput(filtered);
  }, []);

  const handleFontEndEditing = useCallback(() => {
    commitFontSize();
  }, [commitFontSize]);

  const handleFontSubmitEditing = useCallback(() => {
    commitFontSize();
  }, [commitFontSize]);

  const increaseFontSize = useCallback(() => {
    const current = parseInt(tempFontInputRef.current, 10) || fontSize;
    const newSize = Math.min(current + 1, 50);
    setTempFontInput(newSize.toString());
    setFontSize(newSize);
  }, [fontSize]);

  const decreaseFontSize = useCallback(() => {
    const current = parseInt(tempFontInputRef.current, 10) || fontSize;
    const newSize = Math.max(current - 1, 8);
    setTempFontInput(newSize.toString());
    setFontSize(newSize);
  }, [fontSize]);

  const openFontModal = useCallback(() => {
    setTempFontInput(fontSize.toString());
    setShowFontModal(true);
  }, [fontSize]);

  const selectBgImage = useCallback((index: number) => {
    setBgImageIndex(index);
    setShowBgModal(false);
  }, []);

  const memoizedBgTextures = useMemo(() => bgTextures, []);

  const BgOption = useMemo(
    () =>
      React.memo(
        ({
          item,
          isSelected,
          onPress,
          themeColors,
          bgTextures,
        }: {
          item: number;
          isSelected: boolean;
          onPress: () => void;
          themeColors: any;
          bgTextures: any;
        }) => {
          const imageSource = item > 0 ? bgTextures[item] : null;
          return (
            <TouchableOpacity
              className={`p-4 border-b ${isSelected ? "bg-gray-100" : ""}`}
              onPress={onPress}
              style={{
                borderBottomColor: themeColors.border,
                backgroundColor: isSelected
                  ? themeColors.primary + "10"
                  : undefined,
              }}
            >
              <View className="flex-row items-center justify-between">
                <View className="flex-row items-center">
                  {item === 0 ? (
                    <View
                      className="w-12 h-12 rounded-lg items-center justify-center mr-3 bg-gray-200"
                      style={{ backgroundColor: themeColors.card }}
                    >
                      <Ionicons
                        name="image-outline"
                        size={24}
                        color={themeColors.textMuted}
                      />
                    </View>
                  ) : (
                    <Image
                      source={imageSource}
                      style={{
                        width: 48,
                        height: 48,
                        borderRadius: 8,
                        marginRight: 12,
                      }}
                    />
                  )}
                  <Text
                    className="text-base"
                    style={{
                      color: themeColors.textPrimary,
                      fontWeight: isSelected ? "bold" : "normal",
                    }}
                  >
                    {item === 0 ? "None" : `Texture ${item}`}
                  </Text>
                </View>
                {isSelected && (
                  <Ionicons
                    name="checkmark-circle"
                    size={24}
                    color={themeColors.primary}
                  />
                )}
              </View>
            </TouchableOpacity>
          );
        }
      ),
    []
  );

  const renderBgOption = useCallback(
    ({ item }: { item: number }) => (
      <BgOption
        item={item}
        isSelected={item === bgImageIndex}
        onPress={() => selectBgImage(item)}
        themeColors={themeColors}
        bgTextures={memoizedBgTextures}
      />
    ),
    [bgImageIndex, selectBgImage, themeColors, memoizedBgTextures, BgOption]
  );

  const isLoading = isInitializing || isSwitching;
  const isDark = theme === "dark";

  const getFontFamilyStyle = (family: FontFamily): string | undefined => {
    switch (family) {
      case "system":
        return undefined;
      case "serif":
        return "Georgia, Times New Roman, serif";
      case "sans-serif":
        return "Helvetica, Arial, sans-serif";
      case "oswald":
        return Fonts.OswaldVariable;
      case "rubik-glitch":
        return Fonts.RubikGlitchRegular;
      case "poppins":
        return Fonts.PoppinsRegular;
      default:
        return undefined;
    }
  };

  const getFontDisplayName = (family: FontFamily): string => {
    switch (family) {
      case "system":
        return "System Default";
      case "serif":
        return "Serif";
      case "sans-serif":
        return "Sans Serif";
      case "oswald":
        return "Oswald";
      case "rubik-glitch":
        return "Rubik Glitch";
      case "poppins":
        return "Poppins";
      default:
        return family;
    }
  };

  const SettingSection = ({
    title,
    subtitle,
    children,
    icon,
  }: {
    title: string;
    subtitle?: string;
    children: React.ReactNode;
    icon?: string;
  }) => (
    <View
      className="mx-4 mb-4 rounded-2xl shadow-sm border overflow-hidden"
      style={{
        backgroundColor: themeColors.card,
        borderColor: themeColors.border,
      }}
    >
      <View
        className="p-5 border-b"
        style={{ borderColor: themeColors.border }}
      >
        <View className="flex-row items-center">
          {icon && (
            <Ionicons
              name={icon as any}
              size={20}
              color={themeColors.primary}
              className="mr-3"
            />
          )}
          <View className="flex-1">
            <Text
              className="text-lg font-bold"
              style={{
                color: themeColors.textPrimary,
                fontFamily: Fonts.OswaldVariable,
              }}
            >
              {title}
            </Text>
            {subtitle && (
              <Text
                className="text-sm mt-1"
                style={{ color: themeColors.textMuted }}
              >
                {subtitle}
              </Text>
            )}
          </View>
        </View>
      </View>
      <View className="p-5">{children}</View>
    </View>
  );

  const SettingItem = ({
    title,
    subtitle,
    children,
    icon,
    onPress,
  }: {
    title: string;
    subtitle?: string;
    children?: React.ReactNode;
    icon?: string;
    onPress?: () => void;
  }) => (
    <TouchableOpacity
      className={`flex-row items-center justify-between py-3 ${onPress ? "active:opacity-70" : ""}`}
      onPress={onPress}
      disabled={!onPress}
    >
      <View className="flex-row items-center flex-1">
        {icon && (
          <View
            className="w-10 h-10 rounded-full items-center justify-center mr-3"
            style={{ backgroundColor: themeColors.primary + "20" }}
          >
            <Ionicons
              name={icon as any}
              size={18}
              color={themeColors.primary}
            />
          </View>
        )}
        <View className="flex-1">
          <Text
            className="text-base font-medium"
            style={{ color: themeColors.textPrimary }}
          >
            {title}
          </Text>
          {subtitle && (
            <Text
              className="text-sm mt-1"
              style={{ color: themeColors.textMuted }}
            >
              {subtitle}
            </Text>
          )}
        </View>
      </View>
      {children}
    </TouchableOpacity>
  );

  const ColorButton = ({
    scheme,
    isSelected,
    onPress,
  }: {
    scheme: any;
    isSelected: boolean;
    onPress: () => void;
  }) => {
    const previewCustomColor =
      scheme.name === "custom"
        ? customColor
        : colorScheme === scheme.name
          ? customColor
          : undefined;
    const previewThemeColors = getThemeColors(
      theme,
      scheme.name as ColorScheme,
      previewCustomColor
    );
    const previewPrimary = previewThemeColors.primary;
    const previewBg = previewThemeColors.background;
    const previewText = previewThemeColors.textPrimary;
    const contrastColor = getContrastColor(previewPrimary, previewThemeColors);

    return (
      <TouchableOpacity
        onPress={onPress}
        className={`mr-3 p-3 rounded-xl border-2 items-center`}
        style={{
          minWidth: 90,
          borderColor: isSelected ? previewPrimary : themeColors.border,
          backgroundColor: previewBg,
        }}
      >
        <View
          className="w-full h-8 rounded mb-2"
          style={{ backgroundColor: previewPrimary }}
        />

        <Text
          className="text-center text-xs font-semibold"
          style={{
            color: previewText,
          }}
        >
          {scheme.name.charAt(0).toUpperCase() + scheme.name.slice(1)}
        </Text>

        {isSelected && (
          <View
            className="absolute top-2 right-2 w-5 h-5 rounded-full border-2 items-center justify-center"
            style={{
              backgroundColor: previewPrimary,
              borderColor: previewBg,
            }}
          >
            <Ionicons name="checkmark" size={12} color={contrastColor} />
          </View>
        )}
      </TouchableOpacity>
    );
  };

  const FontButton = ({
    font,
    isSelected,
    onPress,
  }: {
    font: FontFamily;
    isSelected: boolean;
    onPress: () => void;
  }) => {
    const fontStyle = getFontFamilyStyle(font);
    return (
      <TouchableOpacity
        onPress={onPress}
        className={`m-1 flex-1 min-w-[45%] p-3 rounded-xl border-2`}
        style={{
          borderColor: isSelected ? themeColors.primary : themeColors.border,
          backgroundColor: themeColors.card,
        }}
      >
        <Text
          className={`text-center text-sm font-medium`}
          style={{
            color: isSelected ? themeColors.primary : themeColors.textPrimary,
            fontFamily: fontStyle,
          }}
          numberOfLines={1}
        >
          {getFontDisplayName(font)}
        </Text>
        <Text
          className="text-xs text-center mt-1"
          style={{
            color: themeColors.textMuted,
            fontFamily: fontStyle,
          }}
          numberOfLines={1}
        >
          Aa
        </Text>
      </TouchableOpacity>
    );
  };

  // REMOVED: Version filtering for primary and secondary versions
  // Now both selectors can show all available versions including the current one
  const primaryAvailableVersions = availableBibleVersions;
  const secondaryAvailableVersions = availableBibleVersions;

  const contactEmail = "fountofhopedevotionals@gmail.com";

  return (
    <>
      <ScrollView
        className="flex-1"
        style={{ backgroundColor: themeColors.background }}
        contentContainerStyle={{ paddingVertical: 16 }}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode="none"
      >
        <View className="px-4 mb-6">
          <Text
            className="text-2xl font-bold"
            style={{
              color: themeColors.textPrimary,
              fontFamily: Fonts.RubikGlitchRegular,
              fontSize: 28,
            }}
          >
            Settings
          </Text>
          <Text
            className="text-sm mt-2"
            style={{ color: themeColors.textMuted }}
          >
            Customize your Bible reading experience
          </Text>
        </View>

        <SettingSection
          title="Reader Settings"
          subtitle="Customize reading experience"
          icon="reader-outline"
        >
          <SettingItem
            title="Dark Mode"
            subtitle="Toggle between light and dark themes"
            icon="moon-outline"
          >
            <Switch
              value={isDark}
              onValueChange={toggleTheme}
              thumbColor={isDark ? themeColors.primary : "#f4f3f4"}
              trackColor={{
                false: themeColors.textMuted,
                true: themeColors.primary + "80",
              }}
            />
          </SettingItem>

          <View
            className="border-t my-3"
            style={{ borderColor: themeColors.border }}
          />

          <View className="mb-4">
            <Text
              className="text-sm font-semibold mb-3"
              style={{ color: themeColors.textPrimary }}
            >
              Color Scheme
            </Text>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              className="flex-row"
              contentContainerStyle={{ paddingRight: 16 }}
            >
              {colorSchemes.map((scheme) => (
                <ColorButton
                  key={scheme.name}
                  scheme={scheme}
                  isSelected={colorScheme === scheme.name}
                  onPress={() => setColorScheme(scheme.name)}
                />
              ))}
            </ScrollView>
          </View>

          <View
            className="border-t my-3"
            style={{ borderColor: themeColors.border }}
          />

          <View>
            <Text
              className="text-sm font-semibold mb-3"
              style={{ color: themeColors.textPrimary }}
            >
              Font Family
            </Text>
            <View className="flex-row flex-wrap -mx-1">
              {["system", "oswald", "rubik-glitch", "poppins"].map(
                (familyStr) => {
                  const family = familyStr as FontFamily;
                  return (
                    <FontButton
                      key={familyStr}
                      font={family}
                      isSelected={fontFamily === family}
                      onPress={() => setFontFamily(family)}
                    />
                  );
                }
              )}
            </View>
          </View>

          <View
            className="border-t my-3"
            style={{ borderColor: themeColors.border }}
          />

          <SettingItem
            title="Background Texture"
            subtitle="Choose a subtle background for reading"
            icon="image-outline"
            onPress={() => setShowBgModal(true)}
          >
            <Text
              className="text-sm"
              style={{ color: themeColors.textPrimary }}
            >
              {bgImageIndex === 0 ? "None" : `Texture ${bgImageIndex}`}
            </Text>
            <Ionicons
              name="chevron-forward"
              size={20}
              color={themeColors.textMuted}
            />
          </SettingItem>

          <View
            className="border-t my-3"
            style={{ borderColor: themeColors.border }}
          />

          <View
            className="flex-row justify-between items-center py-3"
            style={{
              borderBottomWidth: 1,
              borderBottomColor: themeColors.border,
            }}
          >
            <Text
              className="text-base font-medium"
              style={{ color: themeColors.textPrimary }}
            >
              Font Size
            </Text>
            <View className="flex-row items-center">
              <TouchableOpacity
                onPress={decreaseFontSize}
                className="size-8 rounded-full items-center justify-center mr-4"
                style={{ backgroundColor: themeColors.card }}
              >
                <Text
                  className="font-bold text-lg"
                  style={{ color: themeColors.primary }}
                >
                  A-
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={openFontModal}
                style={{
                  width: 70,
                  paddingHorizontal: 8,
                  borderWidth: 1,
                  borderColor: themeColors.border,
                  borderRadius: 4,
                  backgroundColor: themeColors.card,
                  minHeight: 40,
                  justifyContent: "center",
                  alignItems: "center",
                }}
              >
                <Text
                  style={{
                    color: themeColors.textPrimary,
                    fontSize: 16,
                    fontWeight: "500",
                  }}
                >
                  {fontSize}
                </Text>
              </TouchableOpacity>
              <Text
                style={{
                  color: themeColors.textPrimary,
                  fontSize: 16,
                  fontWeight: "500",
                  marginLeft: 4,
                }}
              >
                px
              </Text>
              <TouchableOpacity
                onPress={increaseFontSize}
                className="size-8 rounded-full items-center justify-center ml-4"
                style={{ backgroundColor: themeColors.card }}
              >
                <Text
                  className="font-bold text-lg"
                  style={{ color: themeColors.primary }}
                >
                  A+
                </Text>
              </TouchableOpacity>
            </View>
          </View>

          <SettingItem
            title="Multi-Version Display"
            subtitle="Show two Bible versions side by side"
            icon="copy-outline"
          >
            <Switch
              value={showMultiVersion}
              onValueChange={setShowMultiVersion}
              thumbColor={showMultiVersion ? themeColors.primary : "#f4f3f4"}
              trackColor={{
                false: themeColors.textMuted,
                true: themeColors.primary + "80",
              }}
            />
          </SettingItem>
        </SettingSection>

        <SettingSection
          title="Bible Version"
          subtitle="Choose your preferred translation"
          icon="book-outline"
        >
          {isLoading && (
            <View
              className="mb-4 p-3 rounded-lg"
              style={{ backgroundColor: themeColors.primary + "20" }}
            >
              <View className="flex-row items-center">
                <ActivityIndicator size="small" color={themeColors.primary} />
                <Text
                  className="text-sm ml-3"
                  style={{ color: themeColors.primary }}
                >
                  Switching version... Please wait
                </Text>
              </View>
            </View>
          )}

          <VersionSelector
            currentVersion={currentVersion}
            selectedVersion={selectedVersion}
            availableVersions={primaryAvailableVersions}
            onVersionSelect={handleVersionSelect}
            title=""
            description=""
            showCurrentVersion={false}
            showActiveIndicator={true}
            disabled={isLoading}
          />

          <View
            className={`mt-4 p-3 rounded-lg ${showMultiVersion ? "mb-4" : ""}`}
            style={{ backgroundColor: themeColors.border }}
          >
            <Text
              className="text-sm font-medium"
              style={{ color: themeColors.textMuted }}
            >
              Current Version
            </Text>
            <Text
              className="text-lg font-bold mt-1"
              style={{
                color: themeColors.textPrimary,
                fontFamily: Fonts.OswaldVariable,
              }}
            >
              {getVersionDisplayName(currentVersion)}
            </Text>
          </View>

          {showMultiVersion && (
            <VersionSelector
              currentVersion={secondaryVersion || ""}
              selectedVersion={secondaryVersion || ""}
              availableVersions={secondaryAvailableVersions}
              onVersionSelect={handleSecondaryVersionSelect}
              title="Secondary Bible Version"
              description="Choose a different translation for comparison"
              showCurrentVersion={true}
              colors={{
                primary: themeColors.primary,
                background: themeColors.background,
                text: themeColors.textPrimary,
                muted: themeColors.textMuted,
                card: themeColors.card,
                border: themeColors.border,
              }}
            />
          )}
        </SettingSection>

        <SettingSection
          title="More Options"
          subtitle="Additional preferences"
          icon="settings-outline"
        >
          <SettingItem
            title="Data & Storage"
            subtitle="Manage app data and cache"
            icon="server-outline"
            onPress={() =>
              Alert.alert(
                "Coming Soon",
                "Data management features will be available in future updates."
              )
            }
          >
            <Ionicons
              name="chevron-forward"
              size={20}
              color={themeColors.textMuted}
            />
          </SettingItem>

          <View
            className="border-t my-3"
            style={{ borderColor: themeColors.border }}
          />

          <SettingItem
            title="About"
            subtitle="App version and information"
            icon="information-circle-outline"
            onPress={() =>
              Alert.alert("About", "Bible App v1.0.0\n\nFount of Hope Bible")
            }
          >
            <Ionicons
              name="chevron-forward"
              size={20}
              color={themeColors.textMuted}
            />
          </SettingItem>
        </SettingSection>

        <SettingSection
          title="Quick Actions"
          subtitle="Common tasks"
          icon="flash-outline"
        >
          <View className="flex-row flex-wrap -mx-1">
            <TouchableOpacity
              className="m-1 flex-1 min-w-[45%] p-4 rounded-xl items-center"
              style={{ backgroundColor: themeColors.primary }}
              onPress={() =>
                Alert.alert(
                  "Reset Settings",
                  "This will reset all settings to default."
                )
              }
            >
              <Ionicons name="refresh" size={20} color="white" />
              <Text
                className="text-white font-medium mt-2 text-center"
                style={{
                  color: "white",
                  fontFamily: Fonts.OswaldVariable,
                }}
              >
                Reset Settings
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              className="m-1 flex-1 min-w-[45%] p-4 rounded-xl items-center border"
              style={{
                borderColor: themeColors.primary,
                backgroundColor: themeColors.primary + "10",
              }}
              onPress={() =>
                Linking.openURL(
                  `mailto:${contactEmail}?subject=Bible App Feedback&body=Hi, I'd like to share some feedback about the Bible App:%0A%0APlease type your message here...`
                )
              }
            >
              <Ionicons
                name="chatbubble"
                size={20}
                color={themeColors.primary}
              />
              <Text
                className="font-medium mt-2 text-center"
                style={{
                  color: themeColors.primary,
                  fontFamily: Fonts.OswaldVariable,
                }}
              >
                Send Feedback
              </Text>
            </TouchableOpacity>
          </View>
        </SettingSection>
        <Footer />
      </ScrollView>

      <Modal visible={showBgModal} transparent animationType="slide">
        <View
          style={{
            flex: 1,
            backgroundColor: themeColors.background,
            marginBottom: 20,
          }}
        >
          <View
            style={{
              flexDirection: "row",
              justifyContent: "space-between",
              padding: 16,
              backgroundColor: themeColors.card,
              borderBottomWidth: 1,
              borderBottomColor: themeColors.border,
            }}
          >
            <TouchableOpacity
              onPress={() => setShowBgModal(false)}
              style={{ padding: 4 }}
            >
              <Ionicons name="close" size={24} color={themeColors.primary} />
            </TouchableOpacity>
            <Text
              style={{
                fontSize: 18,
                fontWeight: "bold",
                color: themeColors.textPrimary,
                fontFamily: Fonts.OswaldVariable,
              }}
            >
              Select Background Texture
            </Text>
            <View style={{ width: 24 }} />
          </View>
          <FlatList
            data={[0, ...Array.from({ length: 33 }, (_, i) => i + 1)]}
            keyExtractor={(item) => item.toString()}
            renderItem={renderBgOption}
            style={{ flex: 1 }}
            removeClippedSubviews={true}
            initialNumToRender={10}
            maxToRenderPerBatch={5}
            windowSize={10}
          />
        </View>
      </Modal>

      <Modal visible={showFontModal} transparent animationType="slide">
        <View
          style={{
            flex: 1,
            justifyContent: "center",
            alignItems: "center",
            backgroundColor: "#00000080",
          }}
        >
          <View
            style={{
              backgroundColor: themeColors.background,
              borderRadius: 12,
              padding: 20,
              width: "80%",
              maxWidth: 300,
            }}
          >
            <View
              style={{
                backgroundColor: themeColors.primary,
                marginBottom: 20,
                paddingTop: 12,
                borderRadius: 8,
              }}
            >
              <Text
                style={{
                  fontSize: 18,
                  fontWeight: "bold",
                  color: "white",
                  marginBottom: 16,
                  textAlign: "center",
                  fontFamily: Fonts.OswaldVariable,
                }}
              >
                Edit Font Size
              </Text>
            </View>
            <View className="flex-row items-center justify-center mb-4">
              <TouchableOpacity
                onPress={decreaseFontSize}
                style={{
                  width: 40,
                  height: 40,
                  borderRadius: 20,
                  backgroundColor: themeColors.card,
                  justifyContent: "center",
                  alignItems: "center",
                  marginRight: 16,
                }}
              >
                <Text
                  className="font-bold text-lg"
                  style={{ color: themeColors.primary }}
                >
                  A-
                </Text>
              </TouchableOpacity>
              <TextInput
                style={{
                  color: themeColors.textPrimary,
                  fontSize: 24,
                  fontWeight: "bold",
                  textAlign: "center",
                  width: 80,
                  paddingHorizontal: 12,
                  borderWidth: 1,
                  borderColor: themeColors.border,
                  borderRadius: 8,
                  backgroundColor: themeColors.background,
                }}
                value={tempFontInput}
                onChangeText={handleFontInputChange}
                onEndEditing={handleFontEndEditing}
                onSubmitEditing={handleFontSubmitEditing}
                keyboardType="numeric"
                returnKeyType="done"
                maxLength={2}
              />
              <Text
                style={{
                  color: themeColors.textPrimary,
                  fontSize: 24,
                  fontWeight: "bold",
                  marginLeft: 8,
                  marginBottom: 6,
                }}
              >
                px
              </Text>
              <TouchableOpacity
                onPress={increaseFontSize}
                style={{
                  width: 40,
                  height: 40,
                  borderRadius: 20,
                  backgroundColor: themeColors.card,
                  justifyContent: "center",
                  alignItems: "center",
                  marginLeft: 16,
                }}
              >
                <Text
                  className="font-bold text-lg"
                  style={{ color: themeColors.primary }}
                >
                  A+
                </Text>
              </TouchableOpacity>
            </View>
            <View className="flex-row justify-center">
              <TouchableOpacity
                onPress={() => setShowFontModal(false)}
                style={{
                  backgroundColor: themeColors.textMuted + "20",
                  paddingHorizontal: 20,
                  paddingVertical: 10,
                  borderRadius: 8,
                  marginRight: 10,
                }}
              >
                <Text style={{ color: themeColors.textMuted }}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={commitFontSize}
                style={{
                  backgroundColor: themeColors.primary,
                  paddingHorizontal: 20,
                  paddingVertical: 10,
                  borderRadius: 8,
                }}
              >
                <Text style={{ color: "white" }}>Apply</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </>
  );
};

export default SettingsScreen;
