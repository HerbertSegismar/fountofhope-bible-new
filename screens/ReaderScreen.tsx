import React, {
  useState,
  useRef,
  useMemo,
  useContext,
  useCallback,
  useEffect,
} from "react";
import {
  View,
  Text,
  TouchableOpacity,
  Dimensions,
  Animated,
  ActivityIndicator,
  Alert,
  LayoutChangeEvent,
  ScrollView,
  TextInput,
} from "react-native";
import {
  SafeAreaView,
  useSafeAreaInsets,
} from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { StatusBar } from "expo-status-bar";
import { useFocusEffect } from "@react-navigation/native";
import { BookmarksContext } from "../context/BookmarksContext";
import { useHighlights } from "../context/HighlightsContext";
import { useBibleDatabase } from "../context/BibleDatabaseContext";
import { BibleDatabase } from "../services/BibleDatabase";
import { NavigationModal } from "../components/NavigationModal";
import { useChapterLoader } from "../hooks/useChapterLoader";
import { useScrollSync } from "../hooks/useScrollSync";
import { useThemeColors } from "../hooks/useThemeColors";
import { getVersionDisplayName } from "../utils/bibleVersionUtils";
import { Verse } from "../types";
import { getBookInfo } from "../utils/testamentUtils";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useTheme } from "../context/ThemeContext";
import { useChapterMeasurements } from "../context/ChapterMeasurementsContext";
import { ReaderContent } from "../content/ReaderContent";

const initialDimensions = Dimensions.get("window");
type IconName = React.ComponentProps<typeof Ionicons>["name"];
type SelectorType = "primary" | "secondary" | null;
interface MenuItem {
  key: string;
  name: string;
  icon: IconName;
  onPress: () => void;
  color: string;
}
type MultiViewLayout = "horizontal" | "vertical";
interface Location {
  bookId: number;
  bookName: string;
  bookColor: string;
  chapter: number;
  verse?: number;
}
interface DropdownProps {
  visible: boolean;
  onClose: () => void;
  menuItems: MenuItem[];
  filteredMenuItems: MenuItem[];
  primaryTextColor: string;
  colors: any;
  onSetBgTextureOpacity: (value: number) => void;
  bgTextureOpacity: number;
  headerTotalHeight: number;
  bgImageIndex: number;
  onSetBgImageIndex: (value: number) => void;
  isLandscape: boolean;
}
const DropdownMenu: React.FC<DropdownProps> = ({
  visible,
  onClose,
  filteredMenuItems,
  primaryTextColor,
  colors,
  onSetBgTextureOpacity,
  bgTextureOpacity,
  headerTotalHeight,
  bgImageIndex,
  onSetBgImageIndex,
  isLandscape,
}) => {
  const [tempOpacity, setTempOpacity] = useState(bgTextureOpacity);

  useEffect(() => {
    setTempOpacity(bgTextureOpacity);
  }, [bgTextureOpacity]);

  if (!visible) return null;

  const handleClose = () => {
    onSetBgTextureOpacity(tempOpacity);
    AsyncStorage.setItem("bgTextureOpacity", tempOpacity.toString()).catch(
      console.error
    );
    onClose();
  };

  const handleOpacityChange = (text: string) => {
    const num = parseInt(text.replace(/[^0-9]/g, "")) || 0;
    const clampedNum = Math.min(100, Math.max(0, num));
    setTempOpacity(clampedNum / 100);
  };

  const handleOpacitySubmit = () => {
    onSetBgTextureOpacity(tempOpacity);
    AsyncStorage.setItem("bgTextureOpacity", tempOpacity.toString()).catch(
      console.error
    );
  };

  const maxBgIndex = 33;

  const handlePrevTexture = () => {
    if (bgImageIndex === 0) {
      onSetBgImageIndex(maxBgIndex);
    } else {
      onSetBgImageIndex(bgImageIndex - 1);
    }
  };

  const handleNextTexture = () => {
    if (bgImageIndex === maxBgIndex) {
      onSetBgImageIndex(0);
    } else {
      onSetBgImageIndex(bgImageIndex + 1);
    }
  };

  return (
    <TouchableOpacity
      style={{
        position: "absolute",
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        zIndex: 1000,
      }}
      activeOpacity={1}
      onPress={handleClose}
    >
      <TouchableOpacity
        activeOpacity={1}
        onPress={() => {}}
        style={{
          position: "absolute",
          top: headerTotalHeight,
          right: isLandscape ? 60 : 16,
          backgroundColor: colors.primary,
          borderRadius: 8,
          paddingVertical: 8,
          minWidth: 160,
          shadowColor: "#000",
          shadowOffset: { width: 0, height: 2 },
          shadowOpacity: 0.25,
          shadowRadius: 4,
          elevation: 5,
        }}
      >
        {/* ==================== MENU ITEMS ==================== */}
        {filteredMenuItems.slice(0, -1).map((item, index) => {
          const isBibleItem = item.key === "bible";

          return (
            <TouchableOpacity
              key={item.key}
              onPress={() => {
                item.onPress();
                if (item.key !== "close") {
                  handleClose();
                }
              }}
              style={{
                flexDirection: "row",
                alignItems: "center",
                paddingHorizontal: 12,
                paddingVertical: 8,
                borderBottomWidth: index < filteredMenuItems.length - 2 ? 1 : 0,
                borderBottomColor: colors.primary + "40",
                backgroundColor: isBibleItem ? "#FFFFFF44" : undefined,
              }}
            >
              <Ionicons
                name={item.icon}
                size={20}
                color={item.color}
                style={{ marginRight: 12 }}
              />
              <Text
                style={{
                  color: primaryTextColor,
                  fontSize: 16,
                }}
              >
                {item.name}
              </Text>
            </TouchableOpacity>
          );
        })}

        {/* ==================== BG & OPACITY SECTION ==================== */}
        <View
          style={{
            paddingHorizontal: 12,
            paddingVertical: 8,
            borderTopWidth: 1,
            borderTopColor: colors.primary + "40",
            marginBottom: 4,
          }}
        >
          <View className="h-[1px] w-full bg-white" />
          <Text
            style={{
              color: primaryTextColor,
              fontSize: 14,
              marginVertical: 8,
            }}
          >
            BG & Overlay Opacity
          </Text>
          <View
            style={{
              flexDirection: "row",
              alignItems: "center",
              justifyContent: "space-between",
            }}
          >
            <TouchableOpacity
              onPress={handlePrevTexture}
              style={{
                width: 32,
                height: 32,
                borderRadius: 16,
                backgroundColor: primaryTextColor + "20",
                justifyContent: "center",
                alignItems: "center",
              }}
            >
              <Ionicons
                name="chevron-back"
                size={16}
                color={primaryTextColor}
              />
            </TouchableOpacity>

            <View
              style={{
                flexDirection: "row",
                alignItems: "center",
                justifyContent: "center",
                flex: 1,
                marginHorizontal: 8,
              }}
            >
              <TextInput
                style={{
                  color: primaryTextColor,
                  fontSize: 14,
                  width: 40,
                  height: 32,
                  textAlign: "center",
                  borderWidth: 1,
                  borderColor: primaryTextColor,
                  borderRadius: 4,
                  paddingHorizontal: 4,
                  paddingVertical: 6,
                }}
                value={(tempOpacity * 100).toFixed(0)}
                onChangeText={handleOpacityChange}
                onSubmitEditing={handleClose}
                onBlur={handleOpacitySubmit}
                keyboardType="numeric"
                selectTextOnFocus={true}
                maxLength={3}
              />
              <Text
                style={{ color: primaryTextColor, fontSize: 14, marginLeft: 4 }}
              >
                %
              </Text>
            </View>

            <TouchableOpacity
              onPress={handleNextTexture}
              style={{
                width: 32,
                height: 32,
                borderRadius: 16,
                backgroundColor: primaryTextColor + "20",
                justifyContent: "center",
                alignItems: "center",
              }}
            >
              <Ionicons
                name="chevron-forward"
                size={16}
                color={primaryTextColor}
              />
            </TouchableOpacity>
          </View>
        </View>

        <View className="h-[1px] bg-white mx-3" />

        {/* ==================== CLOSE BUTTON ==================== */}
        <TouchableOpacity
          onPress={handleClose}
          style={{
            flexDirection: "row",
            alignItems: "center",
            paddingHorizontal: 12,
            paddingVertical: 4,
            borderTopWidth: 1,
            borderTopColor: colors.primary + "40",
          }}
        >
          <Ionicons
            name="close-outline"
            size={20}
            color={primaryTextColor}
            style={{ marginRight: 12 }}
          />
          <Text style={{ color: primaryTextColor, fontSize: 16 }}>Close</Text>
        </TouchableOpacity>
      </TouchableOpacity>
    </TouchableOpacity>
  );
};
export default function ReaderScreen({
  navigation,
  route,
}: {
  navigation: any;
  route: any;
}) {
  const insets = useSafeAreaInsets();
  const {
    bookId,
    chapter,
    bookName,
    verse: targetVerse,
    bookColor,
  } = route.params;
  const { addBookmark, bookmarks } = useContext(BookmarksContext);
  const {
    toggleVerseHighlight,
    getChapterHighlights,
    loading: highlightedVersesLoading,
  } = useHighlights();
  const { bibleDB, currentVersion, availableBibleVersions, switchVersion } =
    useBibleDatabase();
  const [primaryMaxChapter, setPrimaryMaxChapter] = useState(0);
  const [secondaryMaxChapter, setSecondaryMaxChapter] = useState(0);
  const [openSelector, setOpenSelector] = useState<SelectorType>(null);
  const [selectorLoading, _setSelectorLoading] = useState(false);
  const [multiViewLayout, setMultiViewLayout] =
    useState<MultiViewLayout>("horizontal");
  const [isLinked, setIsLinked] = useState(true);
  const [primaryTargetVerse, setPrimaryTargetVerse] = useState<
    number | undefined
  >(targetVerse);
  const [secondaryTargetVerse, setSecondaryTargetVerse] = useState<
    number | undefined
  >();
  const [primaryHeaderX, setPrimaryHeaderX] = useState(0);
  const [primaryHeaderY, setPrimaryHeaderY] = useState(0);
  const [primaryHeaderWidth, setPrimaryHeaderWidth] = useState(0);
  const [primaryHeaderHeight, setPrimaryHeaderHeight] = useState(0);
  const [secondaryHeaderX, setSecondaryHeaderX] = useState(0);
  const [secondaryHeaderY, setSecondaryHeaderY] = useState(0);
  const [secondaryHeaderWidth, setSecondaryHeaderWidth] = useState(0);
  const [secondaryHeaderHeight, setSecondaryHeaderHeight] = useState(0);
  const primaryHeaderRef = useRef<View>(null);
  const secondaryHeaderRef = useRef<View>(null);
  const [dimensions, setDimensions] = useState(initialDimensions);
  const screenWidth = dimensions.width;
  const themeColors = useThemeColors();
  const { colors, primaryTextColor, handleColorSchemePress, toggleTheme } =
    themeColors;
  const [primaryLocation, setPrimaryLocation] = useState<Location>({
    bookId,
    bookName,
    bookColor,
    chapter,
    verse: targetVerse,
  });
  const [secondaryLocation, setSecondaryLocation] =
    useState<Location>(primaryLocation);
  const primaryLoader = useChapterLoader(
    primaryLocation.bookId,
    primaryLocation.chapter,
    primaryTargetVerse
  );
  const {
    verses: primaryVerses,
    book: primaryBook,
    loading: primaryLoading,
    scrollViewRef: primaryScrollViewRef,
    ...primaryProps
  } = primaryLoader;
  const [showMultiVersion, setShowMultiVersion] = useState(false);
  const [secondaryVersion, setSecondaryVersion] = useState<string | null>(null);
  const [secondaryReady, setSecondaryReady] = useState(false);
  const [secondaryVerses, setSecondaryVerses] = useState<Verse[]>([]);
  const [secondaryLoading, setSecondaryLoading] = useState(false);
  const [secondaryContentHeight, setSecondaryContentHeight] = useState(0);
  const secondaryVerseMeasurementsRef = useRef<{ [key: number]: number }>({});
  const [secondaryScrollViewHeight, setSecondaryScrollViewHeight] = useState(0);
  const secondaryScrollViewRef = useRef<ScrollView>(null);
  const [_isSwitchingVersion, setIsSwitchingVersion] = useState(false);
  const secondaryDB = useRef<BibleDatabase | null>(null);
  const [fontSize, setFontSize] = useState(16);
  const [uiMode, setUiMode] = useState(0);
  const [isLandscape, setIsLandscape] = useState(
    initialDimensions.width > initialDimensions.height
  );
  const [_showEnd, setShowEnd] = useState(false);
  const [showDropdown, setShowDropdown] = useState(false);
  const [showNavigationModal, setShowNavigationModal] = useState(false);
  const [navigationTarget, setNavigationTarget] = useState<
    "primary" | "secondary"
  >("primary");
  const [bgTextureOpacity, setBgTextureOpacity] = useState(0.1);
  const [bgImageIndex, setBgImageIndex] = useState(0);
  const lastScrollYRef = useRef(0);
  const [scrollThreshold] = useState(50);
  const scrollY = useRef(new Animated.Value(0)).current;
  const secondaryScrollY = useRef(new Animated.Value(0)).current;
  const buttonOpacity = useRef(new Animated.Value(1)).current;
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const showMultiVersionRef = useRef(false);
  const isLinkedRef = useRef(true);
  const handleScrollRef = useRef<(event: any) => void>(() => {});
  const handleSecondaryScrollRef = useRef<(event: any) => void>(() => {});
  const effectiveLayout = useMemo(
    () => (isLandscape ? "horizontal" : multiViewLayout),
    [isLandscape, multiViewLayout]
  );
  const longPressTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(
    null
  );
  const isFullScreen = uiMode === 1;
  const scrollSync = useScrollSync(
    showMultiVersion && isLinked,
    primaryProps.scrollViewHeight,
    primaryProps.contentHeight,
    secondaryContentHeight,
    primaryVerses,
    secondaryVerses,
    isLandscape,
    isFullScreen,
    () => {},
    scrollThreshold,
    lastScrollYRef,
    scrollY,
    setShowEnd,
    primaryScrollViewRef,
    secondaryScrollViewRef
  );
  const {
    handleScroll,
    handleSecondaryScroll,
    updatePrimaryOffset,
    updateSecondaryOffset,
  } = scrollSync;
  const { setShowColorPicker } = useTheme();
  const { storeChapterMeasurement, getChapterMeasurement } =
    useChapterMeasurements();
  const primaryProgress = useMemo(
    () =>
      Animated.divide(
        scrollY,
        Math.max(primaryProps.contentHeight - primaryProps.scrollViewHeight, 1)
      ),
    [scrollY, primaryProps.contentHeight, primaryProps.scrollViewHeight]
  );
  const secondaryProgress = useMemo(
    () =>
      Animated.divide(
        secondaryScrollY,
        Math.max(secondaryContentHeight - secondaryScrollViewHeight, 1)
      ),
    [secondaryScrollY, secondaryContentHeight, secondaryScrollViewHeight]
  );
  const reloadSecondaryDB = useCallback(
    async (retries = 10): Promise<boolean> => {
      if (!secondaryVersion) return false;
      for (let attempt = 0; attempt < retries; attempt++) {
        try {
          if (secondaryDB.current) {
            await secondaryDB.current.close().catch(console.error);
            secondaryDB.current = null;
          }
          secondaryDB.current = new BibleDatabase(secondaryVersion);
          await secondaryDB.current.init();
          setSecondaryReady(true);
          return true;
        } catch (error) {
          console.error(
            `Secondary DB reload attempt ${attempt + 1} failed:`,
            error
          );
          if (secondaryDB.current) {
            await secondaryDB.current.close().catch(console.error);
            secondaryDB.current = null;
          }
          if (attempt < retries - 1) {
            await new Promise((resolve) =>
              setTimeout(resolve, 2000 * (attempt + 1))
            );
          }
        }
      }
      setSecondaryReady(false);
      Alert.alert(
        "Error",
        `Failed to load ${getVersionDisplayName(secondaryVersion)} after ${retries} attempts.`
      );
      return false;
    },
    [secondaryVersion]
  );
  useEffect(() => {
    if (!showMultiVersion || !secondaryVersion) {
      setSecondaryReady(false);
      if (secondaryDB.current) {
        secondaryDB.current.close().catch(console.error);
        secondaryDB.current = null;
      }
      return () => {
        if (secondaryDB.current) {
          secondaryDB.current.close().catch(console.error);
          secondaryDB.current = null;
        }
        setSecondaryReady(false);
      };
    }
    setSecondaryReady(false);
    const initSecondary = async () => {
      const success = await reloadSecondaryDB();
      if (!success) {
        setShowMultiVersion(false);
      }
    };
    initSecondary();
    return () => {
      if (secondaryDB.current) {
        secondaryDB.current.close().catch(console.error);
        secondaryDB.current = null;
      }
      setSecondaryReady(false);
    };
  }, [showMultiVersion, secondaryVersion, reloadSecondaryDB]);
  useEffect(() => {
    showMultiVersionRef.current = showMultiVersion;
  }, [showMultiVersion]);
  useEffect(() => {
    isLinkedRef.current = isLinked;
  }, [isLinked]);
  useEffect(() => {
    handleScrollRef.current = handleScroll;
  }, [handleScroll]);
  useEffect(() => {
    handleSecondaryScrollRef.current = handleSecondaryScroll;
  }, [handleSecondaryScroll]);
  const getHighlightVerse = useCallback(
    (isPrimary: boolean): number | undefined => {
      if (isLinked || !showMultiVersion) {
        return primaryTargetVerse;
      }
      return isPrimary ? primaryTargetVerse : secondaryTargetVerse;
    },
    [showMultiVersion, isLinked, primaryTargetVerse, secondaryTargetVerse]
  );
  const resetButtonOpacity = useCallback(() => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }
    Animated.timing(buttonOpacity, {
      toValue: 1,
      duration: 200,
      useNativeDriver: true,
    }).start();
    timeoutRef.current = setTimeout(() => {
      Animated.timing(buttonOpacity, {
        toValue: 0.2,
        duration: 500,
        useNativeDriver: true,
      }).start();
    }, 5000);
  }, [buttonOpacity]);
  const resetPrimaryScroll = useCallback(() => {
    scrollY.setValue(0);
    lastScrollYRef.current = 0;
    if (primaryScrollViewRef.current) {
      primaryScrollViewRef.current.scrollTo({ y: 0, animated: false });
      updatePrimaryOffset(0);
    }
  }, [scrollY, primaryScrollViewRef, updatePrimaryOffset]);
  const resetSecondaryScroll = useCallback(() => {
    secondaryScrollY.setValue(0);
    if (secondaryScrollViewRef.current) {
      secondaryScrollViewRef.current.scrollTo({ y: 0, animated: false });
      updateSecondaryOffset(0);
    }
  }, [secondaryScrollViewRef, updateSecondaryOffset, secondaryScrollY]);
  useEffect(() => {
    resetButtonOpacity();
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
      if (longPressTimeoutRef.current) {
        clearTimeout(longPressTimeoutRef.current);
      }
    };
  }, [resetButtonOpacity]);
  useEffect(() => {
    const load = async () => {
      if (bibleDB) {
        try {
          const chCount = await bibleDB.getChapterCount(primaryLocation.bookId);
          setPrimaryMaxChapter(chCount || 0);
        } catch (error) {
          console.error("Failed to load navigation data:", error);
          try {
            setIsSwitchingVersion(true);
            await switchVersion(currentVersion);
            const chCount = await bibleDB.getChapterCount(
              primaryLocation.bookId
            );
            setPrimaryMaxChapter(chCount || 0);
          } catch (reloadError) {
            console.error("Failed to reload primary database:", reloadError);
            setPrimaryMaxChapter(0);
            Alert.alert(
              "Error",
              "Failed to load book information. Please try switching versions or restart the app."
            );
          } finally {
            setIsSwitchingVersion(false);
          }
        }
      } else {
        setPrimaryMaxChapter(0);
      }
    };
    load();
  }, [
    bibleDB,
    primaryLocation.bookId,
    currentVersion,
    switchVersion,
    setIsSwitchingVersion,
  ]);
  useEffect(() => {
    const load = async () => {
      if (
        showMultiVersion &&
        secondaryVersion &&
        secondaryReady &&
        secondaryDB.current
      ) {
        try {
          const chCount = await secondaryDB.current.getChapterCount(
            secondaryLocation.bookId
          );
          setSecondaryMaxChapter(chCount || 0);
        } catch (error) {
          console.error("Failed to load secondary max chapter:", error);
          const success = await reloadSecondaryDB();
          if (success && secondaryDB.current) {
            try {
              const chCount = await secondaryDB.current.getChapterCount(
                secondaryLocation.bookId
              );
              setSecondaryMaxChapter(chCount || 0);
            } catch (retryError) {
              console.error("Retry load secondary max failed:", retryError);
              setSecondaryMaxChapter(0);
            }
          } else {
            setSecondaryMaxChapter(0);
          }
        }
      } else {
        setSecondaryMaxChapter(0);
      }
    };
    load();
  }, [
    showMultiVersion,
    secondaryVersion,
    secondaryLocation.bookId,
    secondaryReady,
    secondaryDB,
    reloadSecondaryDB,
  ]);
  const loadPreferences = useCallback(async () => {
    try {
      const [savedLayout, savedFontSize] = await Promise.all([
        AsyncStorage.getItem("multiViewLayout"),
        AsyncStorage.getItem("fontSize"),
      ]);
      if (savedLayout === "vertical" || savedLayout === "horizontal") {
        setMultiViewLayout(savedLayout);
      }
      if (savedFontSize !== null) {
        setFontSize(parseInt(savedFontSize, 10) || 16);
      }
    } catch (error) {
      console.error("Failed to load preferences:", error);
    }
  }, []);
  const loadReaderSettings = useCallback(async () => {
    try {
      const [showMultiStr, secVer, linkedStr] = await Promise.all([
        AsyncStorage.getItem("showMultiVersion"),
        AsyncStorage.getItem("secondaryVersion"),
        AsyncStorage.getItem("isLinked"),
      ]);
      if (showMultiStr === "true") {
        setShowMultiVersion(true);
      } else {
        setShowMultiVersion(false);
      }
      let initialSec = secVer;
      if (!initialSec) {
        const avail = availableBibleVersions.filter(
          (v) => v !== currentVersion
        );
        initialSec = avail[0] || availableBibleVersions[0];
      }
      setSecondaryVersion(initialSec);
      if (linkedStr !== null) {
        setIsLinked(linkedStr === "true");
      }
    } catch (e) {
      console.error("Failed to load reader settings", e);
    }
  }, [availableBibleVersions, currentVersion]);
  const loadBackgroundSettings = useCallback(async () => {
    try {
      const [savedOpacity, savedIndex] = await Promise.all([
        AsyncStorage.getItem("bgTextureOpacity"),
        AsyncStorage.getItem("bgImageIndex"),
      ]);
      if (savedOpacity !== null) {
        setBgTextureOpacity(parseFloat(savedOpacity) || 0.1);
      }
      if (savedIndex !== null) {
        setBgImageIndex(parseInt(savedIndex, 10) || 0);
      }
    } catch (error) {
      console.error("Failed to load background settings:", error);
    }
  }, []);
  useFocusEffect(
    useCallback(() => {
      loadPreferences();
      loadReaderSettings();
      loadBackgroundSettings();
      const currentDimensions = Dimensions.get("window");
      const currentIsLandscape =
        currentDimensions.width > currentDimensions.height;
      setDimensions(currentDimensions);
      setIsLandscape(currentIsLandscape);
    }, [loadPreferences, loadReaderSettings, loadBackgroundSettings])
  );
  useEffect(() => {
    AsyncStorage.setItem("multiViewLayout", multiViewLayout).catch((e) =>
      console.error("Failed to save layout preference", e)
    );
  }, [multiViewLayout]);
  useEffect(() => {
    AsyncStorage.setItem("isLinked", isLinked.toString()).catch((e) =>
      console.error("Failed to save isLinked", e)
    );
  }, [isLinked]);
  useEffect(() => {
    AsyncStorage.setItem("fontSize", fontSize.toString()).catch((e) =>
      console.error("Failed to save fontSize", e)
    );
  }, [fontSize]);
  useEffect(() => {
    AsyncStorage.setItem("bgTextureOpacity", bgTextureOpacity.toString()).catch(
      (e) => console.error("Failed to save bgTextureOpacity", e)
    );
  }, [bgTextureOpacity]);
  useEffect(() => {
    AsyncStorage.setItem("bgImageIndex", bgImageIndex.toString()).catch((e) =>
      console.error("Failed to save bgImageIndex", e)
    );
  }, [bgImageIndex]);
  const closeSelector = useCallback(() => setOpenSelector(null), []);
  const openPrimaryNavigation = useCallback(() => {
    if (showMultiVersion && !isLinked) {
      setNavigationTarget("primary");
      setShowNavigationModal(true);
    } else {
      navigation.navigate("BookList", {
        showMultiVersion,
        secondaryVersion,
      });
    }
  }, [showMultiVersion, isLinked, navigation, secondaryVersion]);
  const openSecondaryNavigation = useCallback(() => {
    if (showMultiVersion && !isLinked) {
      setNavigationTarget("secondary");
      setShowNavigationModal(true);
    } else {
      navigation.navigate("BookList", {
        showMultiVersion,
        secondaryVersion,
      });
    }
  }, [showMultiVersion, isLinked, navigation, secondaryVersion]);
  const openPrimaryVersionSelector = useCallback(
    () => setOpenSelector("primary"),
    []
  );
  const openSecondaryVersionSelector = useCallback(
    () => setOpenSelector("secondary"),
    []
  );
  const selectorTitle = useMemo(() => {
    switch (openSelector) {
      case "primary":
        return "Select Primary Version";
      case "secondary":
        return "Select Secondary Version";
      default:
        return "";
    }
  }, [openSelector]);
  const handleVersionSelect = useCallback(
    async (version: string) => {
      try {
        setIsSwitchingVersion(true);
        await switchVersion(version);
      } catch (error) {
        console.error("Switch version failed:", error);
        const originalVersion = currentVersion;
        try {
          await switchVersion(originalVersion);
        } catch (revertError) {
          console.error("Failed to revert version:", revertError);
          Alert.alert(
            "Error",
            "Version switch failed and revert failed. Please restart."
          );
          return;
        }
        try {
          await switchVersion(version);
        } catch (retryError) {
          console.error("Retry switch failed:", retryError);
          Alert.alert("Error", "Failed to switch Bible version after retry.");
        }
      } finally {
        setIsSwitchingVersion(false);
      }
    },
    [currentVersion, switchVersion]
  );
  
  const toggleMultiVersion = useCallback(() => {
    setShowMultiVersion((prev) => !prev);
    resetButtonOpacity();
  }, [resetButtonOpacity]);
  const handleToggleLongPress = useCallback(() => {
    setMultiViewLayout((prev) =>
      prev === "horizontal" ? "vertical" : "horizontal"
    );
    resetButtonOpacity();
  }, [resetButtonOpacity]);
  const primaryBookmarkedVerses = useMemo(() => {
    const chapterBookmarks = bookmarks.filter(
      (b) =>
        b.book_number === primaryLocation.bookId &&
        b.chapter === primaryLocation.chapter
    );
    return new Set(chapterBookmarks.map((b) => b.verse));
  }, [bookmarks, primaryLocation.bookId, primaryLocation.chapter]);
  const secondaryBookmarkedVerses = useMemo(() => {
    const chapterBookmarks = bookmarks.filter(
      (b) =>
        b.book_number === secondaryLocation.bookId &&
        b.chapter === secondaryLocation.chapter
    );
    return new Set(chapterBookmarks.map((b) => b.verse));
  }, [bookmarks, secondaryLocation.bookId, secondaryLocation.chapter]);
  const primaryHighlightedVerses = useMemo(
    () => getChapterHighlights(primaryLocation.bookId, primaryLocation.chapter),
    [primaryLocation.bookId, primaryLocation.chapter, getChapterHighlights]
  );
  const secondaryHighlightedVerses = useMemo(
    () =>
      getChapterHighlights(secondaryLocation.bookId, secondaryLocation.chapter),
    [secondaryLocation.bookId, secondaryLocation.chapter, getChapterHighlights]
  );
  const linkItem: MenuItem = useMemo(
    () => ({
      key: "link",
      name: isLinked ? "Stop Sync" : "Sync Scroll",
      icon: (isLinked ? "unlink-outline" : "link-outline") as IconName,
      onPress: () => {
        const newLinked = !isLinked;
        setIsLinked(newLinked);
      },
      color: primaryTextColor,
    }),
    [isLinked, primaryTextColor]
  );
  const menuItems: MenuItem[] = useMemo(
    () => [
      {
        key: "home",
        name: "Home",
        icon: "home-outline",
        onPress: () => navigation.navigate("Home"),
        color: primaryTextColor,
      },
      {
        key: "bible",
        name: "Bible",
        icon: "book-outline",
        onPress: () => navigation.navigate("BookList"),
        color: primaryTextColor,
      },
      {
        key: "search",
        name: "Search",
        icon: "search-outline",
        onPress: () => navigation.navigate("Search"),
        color: primaryTextColor,
      },
      {
        key: "bookmarks",
        name: "Bookmarks",
        icon: "bookmark-outline",
        onPress: () => navigation.navigate("Bookmarks"),
        color: primaryTextColor,
      },
      {
        key: "theme",
        name: themeColors.theme === "light" ? "Dark Mode" : "Light Mode",
        icon: themeColors.theme === "light" ? "moon-outline" : "sunny-outline",
        onPress: toggleTheme,
        color: primaryTextColor,
      },
      {
        key: "color",
        name: "Color Scheme",
        icon: "color-palette-outline",
        onPress: handleColorSchemePress,
        color: primaryTextColor,
      },
      {
        key: "multi",
        name: "Toggle Multi-Version",
        icon: effectiveLayout === "horizontal" ? "copy-outline" : "copy",
        onPress: toggleMultiVersion,
        color: showMultiVersion ? "#f6f0f0ff" : primaryTextColor,
      },
      ...(showMultiVersion ? [linkItem] : []),
      {
        key: "settings",
        name: "Settings",
        icon: "settings-outline",
        onPress: () => navigation.navigate("Settings"),
        color: primaryTextColor,
      },
      {
        key: "close",
        name: "Close",
        icon: "close-outline",
        onPress: () => setShowDropdown(false),
        color: primaryTextColor,
      },
    ],
    [
      themeColors.theme,
      primaryTextColor,
      showMultiVersion,
      effectiveLayout,
      toggleTheme,
      handleColorSchemePress,
      toggleMultiVersion,
      navigation,
      linkItem,
    ]
  );
  const filteredMenuItems = useMemo(
    () =>
      menuItems.filter(
        (item) =>
          item.key !== "multi" && item.key !== "theme" && item.key !== "color"
      ),
    [menuItems]
  );
  const themeItem = useMemo(
    () => menuItems.find((item) => item.key === "theme"),
    [menuItems]
  );
  const colorItem = useMemo(
    () => menuItems.find((item) => item.key === "color"),
    [menuItems]
  );
  const handleVersePress = useCallback(
    (verse: Verse) => {
      const isHighlighted = primaryHighlightedVerses.includes(verse.verse);
      Alert.alert(`${bookName} ${verse.chapter}:${verse.verse}`, "Options:", [
        { text: "Cancel", style: "cancel" },
        {
          text: isHighlighted ? "Remove Highlight" : "Highlight",
          onPress: () => toggleVerseHighlight(verse),
        },
        {
          text: "Bookmark",
          onPress: () => {
            addBookmark(verse);
            Alert.alert("Bookmarked!", "Verse added to bookmarks.");
          },
        },
        {
          text: "Share",
          onPress: () => Alert.alert("Share", "Coming soon!"),
        },
      ]);
    },
    [
      primaryHighlightedVerses,
      toggleVerseHighlight,
      addBookmark,
      setPrimaryTargetVerse,
    ]
  );
  const handleSecondaryVersePress = useCallback(
    (verse: Verse) => {
      const isHighlighted = secondaryHighlightedVerses.includes(verse.verse);
      Alert.alert(`${bookName} ${verse.chapter}:${verse.verse}`, "Options:", [
        { text: "Cancel", style: "cancel" },
        {
          text: isHighlighted ? "Remove Highlight" : "Highlight",
          onPress: () => toggleVerseHighlight(verse),
        },
        {
          text: "Bookmark",
          onPress: () => {
            addBookmark(verse);
            Alert.alert("Bookmarked!", "Verse added to bookmarks.");
          },
        },
        {
          text: "Share",
          onPress: () => Alert.alert("Share", "Coming soon!"),
        },
      ]);
    },
    [secondaryHighlightedVerses, toggleVerseHighlight, addBookmark]
  );
  const primaryOnVersePress = handleVersePress;
  const secondaryOnVersePress =
    showMultiVersion && !isLinked
      ? handleSecondaryVersePress
      : handleVersePress;
  const goToPrimaryPreviousChapter = useCallback(() => {
    if (primaryLocation.chapter > 1) {
      resetPrimaryScroll();
      const newChapter = primaryLocation.chapter - 1;
      setPrimaryLocation((prev) => ({
        ...prev,
        chapter: newChapter,
        verse: undefined,
      }));
      setPrimaryTargetVerse(undefined);
      if (showMultiVersion && isLinked) {
        setSecondaryLocation((prev) => ({
          ...prev,
          chapter: newChapter,
          verse: undefined,
        }));
        setSecondaryTargetVerse(undefined);
        resetSecondaryScroll();
      }
    }
    resetButtonOpacity();
  }, [
    primaryLocation,
    resetPrimaryScroll,
    showMultiVersion,
    isLinked,
    resetButtonOpacity,
  ]);
  const goToPrimaryNextChapter = useCallback(() => {
    if (primaryLocation.chapter < primaryMaxChapter) {
      resetPrimaryScroll();
      const newChapter = primaryLocation.chapter + 1;
      setPrimaryLocation((prev) => ({
        ...prev,
        chapter: newChapter,
        verse: undefined,
      }));
      setPrimaryTargetVerse(undefined);
      if (showMultiVersion && isLinked) {
        setSecondaryLocation((prev) => ({
          ...prev,
          chapter: newChapter,
          verse: undefined,
        }));
        setSecondaryTargetVerse(undefined);
        resetSecondaryScroll();
      }
    } else {
      Alert.alert("End of Book", "This is the last chapter.");
    }
    resetButtonOpacity();
  }, [
    primaryMaxChapter,
    primaryLocation,
    resetPrimaryScroll,
    showMultiVersion,
    isLinked,
    resetButtonOpacity,
  ]);
  const goToSecondaryPreviousChapter = useCallback(() => {
    if (secondaryLocation.chapter > 1) {
      resetSecondaryScroll();
      const newChapter = secondaryLocation.chapter - 1;
      setSecondaryLocation((prev) => ({
        ...prev,
        chapter: newChapter,
        verse: undefined,
      }));
      setSecondaryTargetVerse(undefined);
      if (showMultiVersion && isLinked) {
        setPrimaryLocation((prev) => ({
          ...prev,
          chapter: newChapter,
          verse: undefined,
        }));
        setPrimaryTargetVerse(undefined);
        resetPrimaryScroll();
      }
    }
    resetButtonOpacity();
  }, [
    secondaryLocation,
    resetSecondaryScroll,
    showMultiVersion,
    isLinked,
    resetButtonOpacity,
  ]);
  const goToSecondaryNextChapter = useCallback(() => {
    if (secondaryLocation.chapter < secondaryMaxChapter) {
      resetSecondaryScroll();
      const newChapter = secondaryLocation.chapter + 1;
      setSecondaryLocation((prev) => ({
        ...prev,
        chapter: newChapter,
        verse: undefined,
      }));
      setSecondaryTargetVerse(undefined);
      if (showMultiVersion && isLinked) {
        setPrimaryLocation((prev) => ({
          ...prev,
          chapter: newChapter,
          verse: undefined,
        }));
        setPrimaryTargetVerse(undefined);
        resetPrimaryScroll();
      }
    } else {
      Alert.alert("End of Book", "This is the last chapter.");
    }
    resetButtonOpacity();
  }, [
    secondaryMaxChapter,
    secondaryLocation,
    resetSecondaryScroll,
    showMultiVersion,
    isLinked,
    resetButtonOpacity,
  ]);
  const primaryHandleScroll = useCallback(
    (event: any) => {
      const y = event.nativeEvent.contentOffset.y;
      lastScrollYRef.current = y;
      scrollY.setValue(y);
      if (showMultiVersionRef.current && isLinkedRef.current) {
        handleScrollRef.current(event);
      }
    },
    [scrollY]
  );
  const secondaryHandleScrollCb = useCallback(
    (event: any) => {
      if (showMultiVersionRef.current && isLinkedRef.current) {
        handleSecondaryScrollRef.current(event);
      } else if (showMultiVersionRef.current) {
        const y = event.nativeEvent.contentOffset.y;
        secondaryScrollY.setValue(y);
      }
    },
    [secondaryScrollY]
  );
  useEffect(() => {
    const updateLayout = () => {
      const newDimensions = Dimensions.get("window");
      const newIsLandscape = newDimensions.width > newDimensions.height;
      setShowDropdown(false);
      setDimensions(newDimensions);
      setIsLandscape(newIsLandscape);
    };
    updateLayout();
    const subscription = Dimensions.addEventListener("change", updateLayout);
    return () => subscription?.remove();
  }, []);
  useEffect(() => {
    setPrimaryTargetVerse(targetVerse);
  }, [targetVerse]);
  useEffect(() => {
    if (showMultiVersion && isLinked) {
      setSecondaryLocation(primaryLocation);
      setSecondaryTargetVerse(primaryTargetVerse);
    } else if (!showMultiVersion) {
      setSecondaryTargetVerse(undefined);
    }
  }, [showMultiVersion, isLinked, primaryTargetVerse, primaryLocation]);
  useEffect(() => {
    if (!primaryLoading && primaryScrollViewRef.current) {
      const verseNum = primaryTargetVerse;
      if (verseNum) {
        const meas = primaryProps.verseMeasurements[verseNum];
        if (meas !== undefined) {
          const y = Math.max(0, meas - 100);
          primaryScrollViewRef.current.scrollTo({ y, animated: false });
          updatePrimaryOffset(y);
          lastScrollYRef.current = y;
          return;
        }
        return;
      }
      primaryScrollViewRef.current.scrollTo({ y: 0, animated: false });
      updatePrimaryOffset(0);
      lastScrollYRef.current = 0;
    }
  }, [
    primaryLoading,
    primaryTargetVerse,
    primaryScrollViewRef,
    updatePrimaryOffset,
    primaryProps.verseMeasurements,
  ]);
  const [secondaryMeasuredVerses, setSecondaryMeasuredVerses] = useState<
    Set<number>
  >(new Set());
  useEffect(() => {
    secondaryVerseMeasurementsRef.current = {};
    setSecondaryMeasuredVerses(new Set());
  }, [secondaryVerses]);
  useEffect(() => {
    if (
      showMultiVersion &&
      !secondaryLoading &&
      secondaryScrollViewRef.current &&
      secondaryMeasuredVerses.size >= secondaryVerses.length
    ) {
      const verseNum = getHighlightVerse(false);
      if (verseNum) {
        const meas = secondaryVerseMeasurementsRef.current[verseNum];
        if (meas !== undefined) {
          const y = Math.max(0, meas - secondaryScrollViewHeight / 2);
          secondaryScrollViewRef.current?.scrollTo({ y, animated: false });
          updateSecondaryOffset(y);
        }
      } else {
        secondaryScrollViewRef.current?.scrollTo({ y: 0, animated: false });
        updateSecondaryOffset(0);
      }
    }
  }, [
    showMultiVersion,
    secondaryLoading,
    secondaryScrollViewRef,
    updateSecondaryOffset,
    secondaryMeasuredVerses.size,
    secondaryVerses.length,
    getHighlightVerse,
    secondaryScrollViewHeight,
  ]);
  useEffect(() => {
    if (
      showMultiVersion &&
      !isLinked &&
      secondaryTargetVerse &&
      secondaryVerses.length > 0 &&
      !secondaryLoading &&
      secondaryScrollViewRef.current &&
      secondaryMeasuredVerses.size === 0
    ) {
      const version = secondaryVersion || currentVersion;
      const cached = getChapterMeasurement(
        version,
        secondaryLocation.bookId,
        secondaryLocation.chapter,
        fontSize
      );
      if (cached) {
        const approxY =
          ((secondaryTargetVerse - 0.5) / secondaryVerses.length) *
          cached.height;
        const centerOffset = approxY - secondaryScrollViewHeight / 2;
        const scrollPos = Math.max(0, centerOffset);
        secondaryScrollViewRef.current.scrollTo({
          y: scrollPos,
          animated: false,
        });
        updateSecondaryOffset(scrollPos);
      }
    }
  }, [
    showMultiVersion,
    isLinked,
    secondaryTargetVerse,
    secondaryVerses.length,
    secondaryLoading,
    secondaryScrollViewRef,
    secondaryMeasuredVerses.size,
    secondaryScrollViewHeight,
    getChapterMeasurement,
    secondaryLocation.bookId,
    secondaryLocation.chapter,
    fontSize,
    secondaryVersion,
    currentVersion,
    updateSecondaryOffset,
  ]);
  useEffect(() => {
    if (secondaryContentHeight > 0 && showMultiVersion && secondaryVersion) {
      const version = secondaryVersion;
      storeChapterMeasurement(
        version,
        secondaryLocation.bookId,
        secondaryLocation.chapter,
        { y: 0, height: secondaryContentHeight, fontSize }
      );
    }
  }, [
    secondaryContentHeight,
    showMultiVersion,
    secondaryVersion,
    secondaryLocation.bookId,
    secondaryLocation.chapter,
    fontSize,
    storeChapterMeasurement,
  ]);
  const handlePrimaryContentSizeChange = useCallback(
    (width: number, height: number) => {
      primaryProps.handleContentSizeChange(width, height);
    },
    [primaryProps.handleContentSizeChange]
  );
  const handleSecondaryContentSizeChange = useCallback(
    (width: number, height: number) => {
      setSecondaryContentHeight(height);
    },
    []
  );
  const handleSecondaryScrollViewLayout = useCallback((event: any) => {
    setSecondaryScrollViewHeight(event.nativeEvent.layout.height);
  }, []);
  const handleSecondaryVerseLayout = useCallback(
    (verseNumber: number, event: LayoutChangeEvent) => {
      const { y } = event.nativeEvent.layout;
      if (y >= 0) {
        secondaryVerseMeasurementsRef.current[verseNumber] = y;
        setSecondaryMeasuredVerses((prev) => {
          const newSet = new Set(prev);
          newSet.add(verseNumber);
          return newSet;
        });
      }
    },
    []
  );
  useEffect(() => {
    AsyncStorage.setItem(
      "showMultiVersion",
      showMultiVersion ? "true" : "false"
    ).catch((e) => console.error("Failed to save showMultiVersion", e));
  }, [showMultiVersion]);
  useEffect(() => {
    if (secondaryVersion) {
      AsyncStorage.setItem("secondaryVersion", secondaryVersion).catch((e) =>
        console.error("Failed to save secondaryVersion", e)
      );
    }
  }, [secondaryVersion]);
  const loadSecondaryVerses = useCallback(async () => {
    if (
      !showMultiVersion ||
      !secondaryVersion ||
      !secondaryReady ||
      !secondaryDB.current
    ) {
      setSecondaryVerses([]);
      setSecondaryLoading(false);
      return;
    }
    setSecondaryLoading(true);
    secondaryVerseMeasurementsRef.current = {};
    try {
      const verses = await secondaryDB.current.getVerses(
        secondaryLocation.bookId,
        secondaryLocation.chapter
      );
      setSecondaryVerses(verses);
    } catch (error) {
      console.error("Failed to load secondary verses:", error);
      const success = await reloadSecondaryDB();
      if (success && secondaryDB.current) {
        try {
          const verses = await secondaryDB.current.getVerses(
            secondaryLocation.bookId,
            secondaryLocation.chapter
          );
          setSecondaryVerses(verses);
        } catch (retryError) {
          console.error("Retry load secondary verses failed:", retryError);
          setSecondaryVerses([]);
        }
      } else {
        setSecondaryVerses([]);
      }
    } finally {
      setSecondaryLoading(false);
    }
  }, [
    showMultiVersion,
    secondaryVersion,
    secondaryReady,
    secondaryLocation.bookId,
    secondaryLocation.chapter,
    secondaryDB,
    reloadSecondaryDB,
  ]);
  useEffect(() => {
    loadSecondaryVerses();
  }, [loadSecondaryVerses]);
  const primaryBookInfo = useMemo(
    () => getBookInfo(primaryLocation.bookId),
    [primaryLocation.bookId]
  );
  const primaryDisplayBookName =
    primaryBookInfo?.long || primaryLocation.bookName;
  const secondaryBookInfo = useMemo(
    () => getBookInfo(secondaryLocation.bookId),
    [secondaryLocation.bookId]
  );
  const secondaryDisplayBookName =
    secondaryBookInfo?.long || secondaryLocation.bookName;
  const versionName = getVersionDisplayName(currentVersion);
  const handleSecondaryVersionSelect = useCallback(
    (version: string) => {
      if (version === currentVersion) return;
      setSecondaryVersion(version);
    },
    [currentVersion]
  );
  const versionHeaderPaddingVertical = isLandscape ? 4 : 8;
  const headerContentHeight = 60;
  const headerTotalHeight = insets.top + headerContentHeight;
  if (!bibleDB || highlightedVersesLoading) {
    return (
      <SafeAreaView
        style={{
          flex: 1,
          backgroundColor: colors.background?.default,
          justifyContent: "center",
          alignItems: "center",
        }}
      >
        <ActivityIndicator size="large" color={colors.primary} />
        <Text style={{ color: colors.text?.primary, marginTop: 8 }}>
          Loading
        </Text>
      </SafeAreaView>
    );
  }
  const overlaysOpen =
    showDropdown || openSelector !== null || showNavigationModal;
  const contentScrollEnabled = !overlaysOpen;
  let selectorTop = headerTotalHeight;
  let selectorLeft = (screenWidth - 200) / 2;
  if (openSelector === "primary") {
    if (primaryHeaderY > 0 && primaryHeaderHeight > 0) {
      selectorTop = primaryHeaderY + primaryHeaderHeight;
      selectorLeft = primaryHeaderX + primaryHeaderWidth / 2 - 100;
    }
  } else if (openSelector === "secondary") {
    if (secondaryHeaderY > 0 && secondaryHeaderHeight > 0) {
      selectorTop = secondaryHeaderY + secondaryHeaderHeight;
      if (isLandscape) {
        selectorLeft = secondaryHeaderX + secondaryHeaderWidth / 2 - 100;
      } else {
        selectorLeft = (screenWidth - 200) / 2;
      }
    }
  }
  const versionsToShow = useMemo(() => {
    if (openSelector === "primary" && showMultiVersion && secondaryVersion) {
      return availableBibleVersions.filter((v) => v !== secondaryVersion);
    } else if (openSelector === "secondary") {
      return availableBibleVersions.filter((v) => v !== currentVersion);
    }
    return availableBibleVersions;
  }, [
    openSelector,
    availableBibleVersions,
    currentVersion,
    showMultiVersion,
    secondaryVersion,
  ]);
  const renderProgressBar = useCallback(() => {
    if (!showMultiVersion || isLinked) {
      return (
        <View
          style={{
            marginTop: 8,
            marginHorizontal: 16,
            width: screenWidth - 32,
            height: 6,
            backgroundColor: colors.primary + "40",
            borderRadius: 2,
          }}
        >
          <Animated.View
            style={{
              height: 6,
              backgroundColor: "#FFFFFF80",
              borderRadius: 3,
              width: primaryProgress.interpolate({
                inputRange: [0, 1],
                outputRange: ["0%", "100%"],
                extrapolate: "clamp",
              }),
            }}
          />
        </View>
      );
    } else {
      const PrimaryBar = (
        <Animated.View
          style={{
            position: "absolute",
            left: 0,
            top: 0,
            height: 6,
            backgroundColor: "#FFFFFF80",
            borderRadius: 3,
            width: primaryProgress.interpolate({
              inputRange: [0, 1],
              outputRange: ["0%", "100%"],
              extrapolate: "clamp",
            }),
          }}
        />
      );
      const SecondaryBar = (
        <Animated.View
          style={{
            position: "absolute",
            left: 0,
            top: 0,
            height: 6,
            backgroundColor: "#31134480",
            borderRadius: 3,
            width: secondaryProgress.interpolate({
              inputRange: [0, 1],
              outputRange: ["0%", "100%"],
              extrapolate: "clamp",
            }),
          }}
        />
      );
      return (
        <View
          style={{
            marginTop: 8,
            marginHorizontal: 16,
            width: screenWidth - 32,
            height: 6,
            backgroundColor: colors.primary + "40",
            borderRadius: 2,
            position: "relative",
          }}
        >
          {SecondaryBar}
          {PrimaryBar}
        </View>
      );
    }
  }, [
    showMultiVersion,
    isLinked,
    screenWidth,
    colors.primary,
    primaryProgress,
    secondaryProgress,
  ]);
  const handleSetBgTextureOpacity = useCallback((value: number) => {
    setBgTextureOpacity(Math.round(value * 100) / 100);
  }, []);
  return (
    <SafeAreaView
      style={{ flex: 1, backgroundColor: colors.background?.default }}
    >
      <StatusBar backgroundColor={colors.primary} />
      {!isFullScreen && (
        <View
          style={{
            position: "absolute",
            top: 0,
            left: 0,
            right: 0,
            height: headerTotalHeight,
            backgroundColor: colors.primary,
            justifyContent: "flex-end",
            zIndex: 1,
          }}
        >
          <View
            style={{
              flexDirection: "row",
              justifyContent: "space-between",
              alignItems: "center",
              width: "100%",
              paddingHorizontal: 12,
            }}
          >
            <TouchableOpacity
              onPress={() => navigation.goBack()}
              style={{
                opacity: 0.8,
                marginLeft: isLandscape ? 40 : 8,
                padding: isLandscape ? 8 : 2,
              }}
            >
              <Ionicons name="arrow-back" size={24} color={primaryTextColor} />
            </TouchableOpacity>
            <View
              style={{ flex: 1, alignItems: "center", paddingHorizontal: 10 }}
            >
              <View
                style={{
                  flexDirection: "row",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: 10,
                }}
              >
                <TouchableOpacity
                  onPress={openPrimaryNavigation}
                  style={{
                    paddingHorizontal: 5,
                    paddingVertical: 4,
                    backgroundColor: "rgba(255,255,255,0.1)",
                    borderRadius: 4,
                  }}
                >
                  <Text
                    style={{
                      color: "white",
                      fontWeight: "500",
                      fontSize: 16,
                    }}
                    numberOfLines={1}
                  >
                    {`${primaryDisplayBookName} ${primaryLocation.chapter}`}
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  onPress={openPrimaryVersionSelector}
                  style={{
                    paddingHorizontal: 5,
                    paddingVertical: 4,
                    backgroundColor: "rgba(255,255,255,0.1)",
                    borderRadius: 4,
                  }}
                >
                  <Text
                    style={{
                      color: "white",
                      fontWeight: "500",
                      fontSize: 16,
                    }}
                    numberOfLines={1}
                  >
                    {versionName}
                  </Text>
                </TouchableOpacity>
              </View>
            </View>
            <View
              style={{ flexDirection: "row", alignItems: "center", gap: 4 }}
            >
              {isLandscape ? (
                <View
                  style={{
                    flexDirection: "row",
                    gap: 8,
                    marginRight: isLandscape ? 40 : 0,
                  }}
                >
                  {menuItems.slice(0, -1).map((item) => (
                    <TouchableOpacity
                      key={item.key}
                      onPress={item.onPress}
                      {...(item.key === "color" && {
                        onLongPress: () => setShowColorPicker(true),
                      })}
                      style={{ padding: 8 }}
                    >
                      <Ionicons
                        name={item.icon}
                        size={isLandscape ? 20 : 24}
                        color={item.color}
                      />
                    </TouchableOpacity>
                  ))}
                  <TouchableOpacity
                    onPress={() => setShowDropdown(true)}
                    style={{ padding: 8 }}
                  >
                    <Ionicons
                      name="ellipsis-horizontal"
                      size={20}
                      color={primaryTextColor}
                    />
                  </TouchableOpacity>
                </View>
              ) : (
                <View
                  style={{ flexDirection: "row", alignItems: "center", gap: 8 }}
                >
                  <TouchableOpacity
                    onPress={toggleMultiVersion}
                    onLongPress={handleToggleLongPress}
                    style={{ padding: 2 }}
                  >
                    <Ionicons
                      name={
                        effectiveLayout === "horizontal"
                          ? "copy-outline"
                          : "copy"
                      }
                      size={24}
                      color={showMultiVersion ? "#f6f0f0ff" : primaryTextColor}
                    />
                  </TouchableOpacity>
                  {themeItem && (
                    <TouchableOpacity
                      onPress={themeItem.onPress}
                      style={{ padding: 2 }}
                    >
                      <Ionicons
                        name={themeItem.icon}
                        size={24}
                        color={themeItem.color}
                      />
                    </TouchableOpacity>
                  )}
                  {colorItem && (
                    <TouchableOpacity
                      onPress={colorItem.onPress}
                      onLongPress={() => setShowColorPicker(true)}
                      style={{ padding: 2 }}
                    >
                      <Ionicons
                        name={colorItem.icon}
                        size={24}
                        color={colorItem.color}
                      />
                    </TouchableOpacity>
                  )}
                  <TouchableOpacity
                    onPress={() => setShowDropdown(true)}
                    style={{ padding: 2 }}
                  >
                    <Ionicons
                      name="ellipsis-vertical"
                      size={24}
                      color={primaryTextColor}
                    />
                  </TouchableOpacity>
                </View>
              )}
            </View>
          </View>
          {renderProgressBar()}
        </View>
      )}
      <NavigationModal
        visible={showNavigationModal}
        onClose={() => setShowNavigationModal(false)}
        colors={colors}
        primaryTextColor={primaryTextColor}
        navigationTarget={navigationTarget}
        currentVersion={currentVersion}
        onLocationSelect={(location) => {
          const bookInfo = getBookInfo(location.book.book_number);
          const newLocation: Location = {
            bookId: location.book.book_number,
            bookName:
              bookInfo?.long || location.book.long_name || "Unknown Book",
            bookColor: location.book.book_color || "#DC2626",
            chapter: location.chapter,
            verse: location.verse,
          };
          if (navigationTarget === "primary") {
            setPrimaryLocation(newLocation);
            setPrimaryTargetVerse(newLocation.verse);
          } else {
            setSecondaryLocation(newLocation);
            setSecondaryTargetVerse(newLocation.verse);
          }
        }}
        bibleDB={bibleDB}
        secondaryDB={secondaryDB}
      />
      <View
        style={{
          flex: 1,
          marginTop: isFullScreen ? 0 : headerTotalHeight - insets.top,
        }}
        pointerEvents={overlaysOpen ? "none" : "auto"}
      >
        <ReaderContent
          primaryVerses={primaryVerses}
          secondaryVerses={secondaryVerses}
          primaryLoading={primaryLoading}
          secondaryLoading={secondaryLoading}
          primaryLocation={primaryLocation}
          secondaryLocation={secondaryLocation}
          primaryDisplayBookName={primaryDisplayBookName}
          secondaryDisplayBookName={secondaryDisplayBookName}
          currentVersion={currentVersion}
          secondaryVersion={secondaryVersion}
          getVersionDisplayName={getVersionDisplayName}
          primaryOnVersePress={primaryOnVersePress}
          secondaryOnVersePress={secondaryOnVersePress}
          getHighlightVerse={getHighlightVerse}
          primaryHighlightedVerses={primaryHighlightedVerses}
          secondaryHighlightedVerses={secondaryHighlightedVerses}
          primaryBookmarkedVerses={primaryBookmarkedVerses}
          secondaryBookmarkedVerses={secondaryBookmarkedVerses}
          isFullScreen={isFullScreen}
          colors={colors}
          fontSize={fontSize}
          primaryProps={primaryProps}
          primaryHandleScroll={primaryHandleScroll}
          handlePrimaryContentSizeChange={handlePrimaryContentSizeChange}
          secondaryHandleScrollCb={secondaryHandleScrollCb}
          handleSecondaryContentSizeChange={handleSecondaryContentSizeChange}
          handleSecondaryScrollViewLayout={handleSecondaryScrollViewLayout}
          handleSecondaryVerseLayout={handleSecondaryVerseLayout}
          primaryHeaderRef={primaryHeaderRef}
          secondaryHeaderRef={secondaryHeaderRef}
          setPrimaryHeaderX={setPrimaryHeaderX}
          setPrimaryHeaderY={setPrimaryHeaderY}
          setPrimaryHeaderWidth={setPrimaryHeaderWidth}
          setPrimaryHeaderHeight={setPrimaryHeaderHeight}
          setSecondaryHeaderX={setSecondaryHeaderX}
          setSecondaryHeaderY={setSecondaryHeaderY}
          setSecondaryHeaderWidth={setSecondaryHeaderWidth}
          setSecondaryHeaderHeight={setSecondaryHeaderHeight}
          versionHeaderPaddingVertical={versionHeaderPaddingVertical}
          openPrimaryNavigation={openPrimaryNavigation}
          openSecondaryNavigation={openSecondaryNavigation}
          openPrimaryVersionSelector={openPrimaryVersionSelector}
          openSecondaryVersionSelector={openSecondaryVersionSelector}
          primaryTextColor={primaryTextColor}
          effectiveLayout={effectiveLayout}
          showMultiVersion={showMultiVersion}
          isLandscape={isLandscape}
          primaryScrollViewRef={primaryScrollViewRef}
          secondaryScrollViewRef={secondaryScrollViewRef}
          bgTextureOpacity={bgTextureOpacity}
          bgImageIndex={bgImageIndex}
          scrollEnabled={contentScrollEnabled}
          goToPrimaryPreviousChapter={goToPrimaryPreviousChapter}
          goToPrimaryNextChapter={goToPrimaryNextChapter}
          goToSecondaryPreviousChapter={goToSecondaryPreviousChapter}
          goToSecondaryNextChapter={goToSecondaryNextChapter}
          primaryMaxChapter={primaryMaxChapter}
          secondaryMaxChapter={secondaryMaxChapter}
          isLinked={isLinked}
          buttonOpacity={buttonOpacity}
          resetButtonOpacity={resetButtonOpacity}
          setUiMode={setUiMode}
        />
      </View>
      <DropdownMenu
        visible={showDropdown}
        onClose={() => setShowDropdown(false)}
        menuItems={menuItems}
        filteredMenuItems={filteredMenuItems}
        primaryTextColor={primaryTextColor}
        colors={colors}
        onSetBgTextureOpacity={handleSetBgTextureOpacity}
        bgTextureOpacity={bgTextureOpacity}
        headerTotalHeight={headerTotalHeight}
        bgImageIndex={bgImageIndex}
        onSetBgImageIndex={setBgImageIndex}
        isLandscape={isLandscape}
      />
      {openSelector && (
        <TouchableOpacity
          style={{
            position: "absolute",
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            zIndex: 999,
          }}
          activeOpacity={1}
          onPress={closeSelector}
        >
          <View
            style={{
              position: "absolute",
              top: selectorTop,
              left: selectorLeft,
              width: 200,
              backgroundColor: colors.primary,
              borderRadius: 8,
              paddingVertical: 8,
              shadowColor: "#000",
              shadowOffset: { width: 0, height: 2 },
              shadowOpacity: 0.25,
              shadowRadius: 4,
              elevation: 5,
              flexDirection: "column",
              alignItems: "center",
            }}
            onStartShouldSetResponder={() => true}
          >
            <View
              style={{
                borderBottomWidth: 1,
                borderBottomColor: "white",
                paddingBottom: 8,
                width: "100%",
                alignItems: "center",
              }}
            >
              <Text
                style={{ color: "white", fontSize: 16, fontWeight: "bold" }}
              >
                {selectorTitle}
              </Text>
            </View>
            <ScrollView
              showsVerticalScrollIndicator={true}
              style={{
                maxHeight: 300,
                width: "100%",
              }}
            >
              {selectorLoading ? (
                <View
                  style={{
                    paddingVertical: 20,
                    alignItems: "center",
                  }}
                >
                  <ActivityIndicator size="small" color={primaryTextColor} />
                </View>
              ) : openSelector ? (
                versionsToShow.map((v, index) => {
                  const isActive =
                    (openSelector === "primary" && v === currentVersion) ||
                    (openSelector === "secondary" && v === secondaryVersion);

                  return (
                    <TouchableOpacity
                      key={v}
                      onPress={async () => {
                        if (openSelector === "primary") {
                          await handleVersionSelect(v);
                        } else {
                          handleSecondaryVersionSelect(v);
                        }
                        closeSelector();
                      }}
                      style={{
                        paddingHorizontal: 16,
                        paddingVertical: 8,
                        backgroundColor: isActive
                          ? colors.secondary
                          : undefined, // ← ONLY CHANGE: active gets colors.secondary
                        borderBottomWidth:
                          index < versionsToShow.length - 1 ? 1 : 0,
                        borderBottomColor: colors.primary + "40",
                      }}
                      activeOpacity={0.7}
                    >
                      <Text
                        style={{
                          color: primaryTextColor,
                          fontWeight: "500",
                          fontSize: 16,
                        }}
                      >
                        {getVersionDisplayName(v)}
                      </Text>
                    </TouchableOpacity>
                  );
                })
              ) : null}
            </ScrollView>
          </View>
        </TouchableOpacity>
      )}
    </SafeAreaView>
  );
}
