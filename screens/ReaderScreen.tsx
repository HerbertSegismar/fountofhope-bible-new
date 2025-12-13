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
  FlatList,
  LayoutChangeEvent,
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
import { useThemeColors } from "../hooks/useThemeColors";
import { getVersionDisplayName } from "../utils/bibleVersionUtils";
import { Verse } from "../types";
import { getBookInfo } from "../utils/testamentUtils";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useTheme } from "../context/ThemeContext";
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
    flatListRef: primaryFlatListRef,
    ...primaryProps
  } = primaryLoader;
  const defaultVerseHeight = 80;
  const [showMultiVersion, setShowMultiVersion] = useState(false);
  const [secondaryVersion, setSecondaryVersion] = useState<string | null>(null);
  const [secondaryReady, setSecondaryReady] = useState(false);
  const [secondaryVerses, setSecondaryVerses] = useState<Verse[]>([]);
  const [secondaryLoading, setSecondaryLoading] = useState(false);
  const [, setPrimaryContentHeight] = useState(0);
  const [, setSecondaryContentHeight] = useState(0);
  const [secondaryVerseMeasurements, setSecondaryVerseMeasurements] = useState<
    Record<number, number>
  >({});
  const secondaryFlatListRef = useRef<FlatList<Verse>>(null);
  const [_isSwitchingVersion, setIsSwitchingVersion] = useState(false);
  const secondaryDB = useRef<BibleDatabase | null>(null);
  const [fontSize, setFontSize] = useState(16);
  const [uiMode, setUiMode] = useState(0);
  const [isLandscape, setIsLandscape] = useState(
    initialDimensions.width > initialDimensions.height
  );
  const [showDropdown, setShowDropdown] = useState(false);
  const [showNavigationModal, setShowNavigationModal] = useState(false);
  const [navigationTarget, setNavigationTarget] = useState<
    "primary" | "secondary"
  >("primary");
  // Scroll state tracking
  const hasScrolledToInitialVerse = useRef(false);
  const shouldScrollToPrimaryVerse = useRef(false);
  const shouldScrollToSecondaryVerse = useRef(false);
  const initialScrollDone = useRef(false);
  const primaryScrollRetryCount = useRef(0);
  const secondaryScrollRetryCount = useRef(0);
  const maxScrollRetries = 5;
  const handleSecondaryVerseLayout = useCallback(
    (verse: number, event: LayoutChangeEvent) => {
      const { height } = event.nativeEvent.layout;
      setSecondaryVerseMeasurements((prev) => ({
        ...prev,
        [verse]: height,
      }));
    },
    []
  );
  const [bgTextureOpacity, setBgTextureOpacity] = useState(0.1);
  const [bgImageIndex, setBgImageIndex] = useState(0);
  const lastScrollYRef = useRef(0);
  const scrollY = useRef(new Animated.Value(0)).current;
  const buttonOpacity = useRef(new Animated.Value(1)).current;
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const showMultiVersionRef = useRef(false);
  const isLinkedRef = useRef(true);
  const effectiveLayout = useMemo(
    () => (isLandscape ? "horizontal" : multiViewLayout),
    [isLandscape, multiViewLayout]
  );
  const longPressTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(
    null
  );
  const isFullScreen = uiMode === 1;
  const { setShowColorPicker } = useTheme();
  const ignorePrimaryScroll = useRef(false);
  const ignoreSecondaryScroll = useRef(false);
  const isPrimaryUserScrolling = useRef(false);
  const isSecondaryUserScrolling = useRef(false);
  const scrollToPrimaryVerse = useCallback(
    (verseNum: number, animated = true) => {
      // Check if FlatList ref exists and has current
      if (!primaryFlatListRef || !primaryFlatListRef.current) {
        console.log("Primary scroll: FlatList ref is not available");
        return false;
      }
      // Store ref in variable for TypeScript
      const flatList = primaryFlatListRef.current;
      // Check if we have verses
      if (!primaryVerses || primaryVerses.length === 0) {
        console.log("Primary scroll: No verses loaded yet");
        return false;
      }
      const verseIndex = primaryVerses.findIndex((v) => v.verse === verseNum);
      if (verseIndex === -1) {
        console.log(`Primary scroll: Verse ${verseNum} not found`);
        return false;
      }
      console.log(
        `Primary: Scrolling to verse ${verseNum} at index ${verseIndex}`
      );
      try {
        // First try scrollToIndex
        flatList.scrollToIndex({
          index: verseIndex,
          animated,
          viewPosition: 0.1,
          viewOffset: 20,
        });
        console.log("scrollToIndex called successfully");
        return true;
      } catch (error) {
        console.log("scrollToIndex failed, trying scrollToOffset:", error);
        // Fallback: use scrollToOffset
        try {
          const spacing = isFullScreen ? 2 : 4;
          let cumulativeHeight = 0;
          // Calculate cumulative height up to this verse
          for (let i = 0; i < verseIndex; i++) {
            const verse = primaryVerses[i];
            if (verse) {
              const verseHeight =
                primaryProps.verseMeasurements?.[verse.verse] ||
                defaultVerseHeight;
              cumulativeHeight += verseHeight + spacing;
            }
          }
          // Scroll to calculated offset
          flatList.scrollToOffset({
            offset: Math.max(0, cumulativeHeight - 50),
            animated: true,
          });
          console.log("scrollToOffset called successfully");
          return true;
        } catch (offsetError) {
          console.log("scrollToOffset also failed:", offsetError);
          // Last resort: scroll to item
          try {
            const targetVerseObj = primaryVerses[verseIndex];
            if (targetVerseObj) {
              flatList.scrollToItem({
                item: targetVerseObj,
                animated: true,
                viewPosition: 0.1,
              });
              console.log("scrollToItem called successfully");
              return true;
            }
          } catch (itemError) {
            console.log("All scroll methods failed:", itemError);
          }
          return false;
        }
      }
    },
    [
      primaryFlatListRef,
      primaryVerses,
      primaryProps.verseMeasurements,
      isFullScreen,
      defaultVerseHeight,
    ]
  );
  const scrollToVerseWhenReady = useCallback(
    async (verseNum: number, maxWaitTime = 5000) => {
      console.log(`Waiting to scroll to verse ${verseNum}...`);
      const startTime = Date.now();
      let lastRetryTime = 0;
      const retryInterval = 200;
      const checkAndScroll = () => {
        const currentTime = Date.now();
        // Check if timeout reached
        if (currentTime - startTime > maxWaitTime) {
          console.log("Timeout reached, trying final scroll attempt...");
          // Final attempt
          if (
            primaryFlatListRef &&
            primaryFlatListRef.current &&
            primaryVerses.length > 0
          ) {
            const verseIndex = primaryVerses.findIndex(
              (v) => v.verse === verseNum
            );
            if (verseIndex !== -1) {
              primaryFlatListRef.current.scrollToIndex({
                index: verseIndex,
                animated: true,
                viewPosition: 0.1,
              });
              console.log("Final scroll attempt made");
              return true;
            }
          }
          console.log("Failed to scroll after waiting");
          return false;
        }
        // Only retry every retryInterval ms
        if (currentTime - lastRetryTime < retryInterval) {
          setTimeout(checkAndScroll, retryInterval);
          return false;
        }
        lastRetryTime = currentTime;
        // Check conditions
        const conditions = {
          flatListRef: !!(primaryFlatListRef && primaryFlatListRef.current),
          verses: primaryVerses.length > 0,
          loading: !primaryLoading,
          measurements:
            primaryProps.verseMeasurements &&
            Object.keys(primaryProps.verseMeasurements).length > 0,
        };
        console.log("Waiting for:", conditions);
        if (conditions.flatListRef && conditions.verses && conditions.loading) {
          console.log("Conditions met, attempting scroll...");
          const verseIndex = primaryVerses.findIndex(
            (v) => v.verse === verseNum
          );
          if (verseIndex !== -1 && primaryFlatListRef.current) {
            try {
              primaryFlatListRef.current.scrollToIndex({
                index: verseIndex,
                animated: true,
                viewPosition: 0.1,
              });
              console.log("Scroll successful!");
              return true;
            } catch (error) {
              console.log("Scroll error:", error);
            }
          }
        }
        // Continue waiting
        setTimeout(checkAndScroll, retryInterval);
        return false;
      };
      return checkAndScroll();
    },
    [
      primaryFlatListRef,
      primaryVerses,
      primaryLoading,
      primaryProps.verseMeasurements,
    ]
  );
  // Function to scroll to a specific verse in the secondary view
  const scrollToSecondaryVerse = useCallback(
    (verseNum: number, animated = true) => {
      if (!secondaryFlatListRef.current || !secondaryVerses.length) {
        console.log("Secondary scroll: No list ref or verses available");
        return false;
      }
      const verseIndex = secondaryVerses.findIndex((v) => v.verse === verseNum);
      if (verseIndex === -1) {
        console.log(
          `Secondary scroll: Verse ${verseNum} not found in secondary verses`
        );
        return false;
      }
      console.log(
        `Secondary: Scrolling to verse ${verseNum} at index ${verseIndex}`
      );
      try {
        // Use scrollToIndex with better parameters
        secondaryFlatListRef.current.scrollToIndex({
          index: verseIndex,
          animated,
          viewPosition: 0.1,
          viewOffset: 20,
        });
        return true;
      } catch (error) {
        console.log("Secondary scroll error:", error);
        // Fallback: use scrollToOffset with measurements
        const spacing = isFullScreen ? 2 : 4;
        let cumulativeHeight = 0;
        // Calculate cumulative height up to this verse
        for (let i = 0; i < verseIndex; i++) {
          const verse = secondaryVerses[i];
          if (verse) {
            const verseHeight =
              secondaryVerseMeasurements[verse.verse] || defaultVerseHeight;
            cumulativeHeight += verseHeight + spacing;
          }
        }
        // Scroll to calculated offset
        secondaryFlatListRef.current.scrollToOffset({
          offset: Math.max(0, cumulativeHeight - 50),
          animated: true,
        });
        return true;
      }
    },
    [
      secondaryFlatListRef,
      secondaryVerses,
      secondaryVerseMeasurements,
      isFullScreen,
      defaultVerseHeight,
    ]
  );
  const scrollToPrimaryVerseWithRetry = useCallback(
    async (verseNum: number, maxRetries = 3) => {
      console.log(`scrollToPrimaryVerseWithRetry called for verse ${verseNum}`);
      for (let attempt = 0; attempt < maxRetries; attempt++) {
        // Check if FlatList is ready
        if (
          !primaryFlatListRef ||
          !primaryFlatListRef.current ||
          !primaryVerses.length
        ) {
          console.log(`Attempt ${attempt + 1}: FlatList not ready, waiting...`);
          await new Promise((resolve) => setTimeout(resolve, 300));
          continue;
        }
        console.log(`Attempt ${attempt + 1} to scroll to verse ${verseNum}`);
        const success = scrollToPrimaryVerse(verseNum);
        if (success) {
          console.log(`Successfully scrolled to verse ${verseNum}`);
          return true;
        }
        // Wait before retry with exponential backoff
        const retryDelay = 300 * Math.pow(2, attempt);
        console.log(`Retrying in ${retryDelay}ms...`);
        await new Promise((resolve) => setTimeout(resolve, retryDelay));
      }
      console.log(
        `Failed to scroll to verse ${verseNum} after ${maxRetries} attempts`
      );
      return false;
    },
    [scrollToPrimaryVerse, primaryVerses, primaryFlatListRef]
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
  // Add this useEffect to track when the ref becomes available
  useEffect(() => {
    console.log("Primary FlatList ref updated:", {
      hasRef: !!primaryFlatListRef,
      hasCurrent: !!primaryFlatListRef?.current,
      refType: typeof primaryFlatListRef,
      isRefObject: primaryFlatListRef && "current" in primaryFlatListRef,
    });
  }, [primaryFlatListRef?.current]);
  // Add this to check when ChapterViewEnhanced mounts
  useEffect(() => {
    console.log("ChapterViewEnhanced mounted with ref:", {
      refExists: !!primaryFlatListRef,
      refCurrent: !!primaryFlatListRef?.current,
      versesLength: primaryVerses.length,
    });
  }, [primaryFlatListRef, primaryVerses.length]);
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
    if (primaryFlatListRef && primaryFlatListRef.current) {
      primaryFlatListRef.current.scrollToOffset({ offset: 0, animated: false });
    }
  }, [scrollY, primaryFlatListRef]);
  const resetSecondaryScroll = useCallback(() => {
    if (secondaryFlatListRef.current) {
      secondaryFlatListRef.current.scrollToOffset({
        offset: 0,
        animated: false,
      });
    }
  }, [secondaryFlatListRef]);
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
        initialSec = availableBibleVersions[0];
      }
      setSecondaryVersion(initialSec);
      if (linkedStr !== null) {
        setIsLinked(linkedStr === "true");
      }
    } catch (e) {
      console.error("Failed to load reader settings", e);
    }
  }, [availableBibleVersions]);
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
      // Reset scroll state when screen comes into focus
      hasScrolledToInitialVerse.current = false;
      shouldScrollToPrimaryVerse.current = true;
      shouldScrollToSecondaryVerse.current = false;
      initialScrollDone.current = false;
      primaryScrollRetryCount.current = 0;
      secondaryScrollRetryCount.current = 0;
      // Set target verse from route params
      if (targetVerse) {
        setPrimaryTargetVerse(targetVerse);
      }
    }, [
      loadPreferences,
      loadReaderSettings,
      loadBackgroundSettings,
      targetVerse,
    ])
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
    setNavigationTarget("primary");
    setShowNavigationModal(true);
  }, []);
  const openSecondaryNavigation = useCallback(() => {
    setNavigationTarget("secondary");
    setShowNavigationModal(true);
  }, []);
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
        onPress: () => setShowNavigationModal(true),
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
  const safeScrollToVerse = useCallback(
    (verseNum: number, isPrimary = true) => {
      console.log(
        `safeScrollToVerse called for verse ${verseNum}, primary: ${isPrimary}`
      );
      if (isPrimary) {
        // Check if ref exists and has current
        if (!primaryFlatListRef || !primaryFlatListRef.current) {
          console.log("Primary FlatList ref is null, cannot scroll");
          return false;
        }
        const flatList = primaryFlatListRef.current;
        if (primaryVerses.length === 0) {
          console.log("No primary verses loaded yet");
          return false;
        }
        // Find the verse
        const verseIndex = primaryVerses.findIndex((v) => v.verse === verseNum);
        if (verseIndex === -1) {
          console.log(`Verse ${verseNum} not found in primary verses`);
          return false;
        }
        console.log(`Found verse ${verseNum} at index ${verseIndex}`);
        // Try multiple scrolling methods
        const tryScroll = () => {
          try {
            // Method 1: scrollToIndex
            flatList.scrollToIndex({
              index: verseIndex,
              animated: true,
              viewPosition: 0.1,
            });
            return true;
          } catch (error1) {
            console.log("Method 1 failed:", error1);
            try {
              // Method 2: scrollToOffset (calculate approximate offset)
              const estimatedOffset = verseIndex * (defaultVerseHeight + 4);
              flatList.scrollToOffset({
                offset: Math.max(0, estimatedOffset - 100),
                animated: true,
              });
              return true;
            } catch (error2) {
              console.log("Method 2 failed:", error2);
              // Method 3: scroll to item
              try {
                const targetVerseObj = primaryVerses[verseIndex];
                if (targetVerseObj) {
                  flatList.scrollToItem({
                    item: targetVerseObj,
                    animated: true,
                    viewPosition: 0.1,
                  });
                  return true;
                }
              } catch (error3) {
                console.log("Method 3 failed:", error3);
              }
              return false;
            }
          }
        };
        return tryScroll();
      }
      // Handle secondary view scrolling similarly
      return false;
    },
    [primaryFlatListRef, primaryVerses, defaultVerseHeight]
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
      Alert.alert(
        `${primaryLocation.bookName} ${verse.chapter}:${verse.verse}`,
        "Options:",
        [
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
            text: "Scroll to Verse",
            onPress: () => {
              console.log(`User requested scroll to verse ${verse.verse}`);
              const success = safeScrollToVerse(verse.verse, true);
              if (success) {
                Alert.alert("Success", `Scrolled to verse ${verse.verse}`);
              } else {
                Alert.alert(
                  "Error",
                  "Could not scroll to verse. Please try again."
                );
              }
            },
          },
          {
            text: "Share",
            onPress: () => Alert.alert("Share", "Coming soon!"),
          },
        ]
      );
    },
    [
      primaryHighlightedVerses,
      primaryLocation.bookName,
      toggleVerseHighlight,
      addBookmark,
      safeScrollToVerse,
    ]
  );
  const handleSecondaryVersePress = useCallback(
    (verse: Verse) => {
      const isHighlighted = secondaryHighlightedVerses.includes(verse.verse);
      Alert.alert(
        `${secondaryLocation.bookName} ${verse.chapter}:${verse.verse}`,
        "Options:",
        [
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
            text: "Scroll to Verse",
            onPress: () => {
              setSecondaryTargetVerse(verse.verse);
              setTimeout(() => {
                scrollToSecondaryVerse(verse.verse, true);
              }, 0);
            },
          },
          {
            text: "Share",
            onPress: () => Alert.alert("Share", "Coming soon!"),
          },
        ]
      );
    },
    [
      secondaryHighlightedVerses,
      secondaryLocation.bookName,
      toggleVerseHighlight,
      addBookmark,
      setSecondaryTargetVerse,
      scrollToSecondaryVerse,
    ]
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
      const newLocation = {
        ...secondaryLocation,
        chapter: newChapter,
        verse: undefined,
      };
      setSecondaryLocation(newLocation);
      setSecondaryTargetVerse(undefined);
      if (showMultiVersion && isLinked) {
        setPrimaryLocation(newLocation);
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
    resetPrimaryScroll,
  ]);
  const goToSecondaryNextChapter = useCallback(() => {
    if (secondaryLocation.chapter < secondaryMaxChapter) {
      resetSecondaryScroll();
      const newChapter = secondaryLocation.chapter + 1;
      const newLocation = {
        ...secondaryLocation,
        chapter: newChapter,
        verse: undefined,
      };
      setSecondaryLocation(newLocation);
      setSecondaryTargetVerse(undefined);
      if (showMultiVersion && isLinked) {
        setPrimaryLocation(newLocation);
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
    resetPrimaryScroll,
  ]);
  // In ReaderContent component
  useEffect(() => {
    console.log("ReaderContent: primaryFlatListRef received:", {
      refExists: !!primaryFlatListRef,
      refCurrent: !!primaryFlatListRef?.current,
    });
  }, [primaryFlatListRef]);
  useEffect(() => {
    console.log("Primary FlatList ref state:", {
      refExists: !!primaryFlatListRef,
      refCurrent: !!(primaryFlatListRef && primaryFlatListRef.current),
      versesLength: primaryVerses.length,
      loading: primaryLoading,
      targetVerse: primaryTargetVerse,
    });
  }, [
    primaryFlatListRef,
    primaryFlatListRef?.current,
    primaryVerses,
    primaryLoading,
    primaryTargetVerse,
  ]);
  // Update the useEffect for initial scroll:
  useEffect(() => {
    if (
      primaryTargetVerse &&
      primaryFlatListRef.current &&
      !primaryLoading &&
      primaryVerses.length > 0
    ) {
      // Wait for measurements if available
      const hasMeasurements =
        primaryProps.verseMeasurements &&
        Object.keys(primaryProps.verseMeasurements).length > 0;
      const delay = hasMeasurements ? 100 : 300;
      const timer = setTimeout(() => {
        if (shouldScrollToPrimaryVerse.current && primaryFlatListRef.current) {
          console.log(`Scrolling to primary verse ${primaryTargetVerse}`);
          // Use the retry function instead of manual retry logic
          scrollToPrimaryVerseWithRetry(
            primaryTargetVerse,
            maxScrollRetries
          ).then((success) => {
            if (success) {
              console.log("Scroll successful");
            } else {
              console.log("Scroll failed after retries");
            }
            shouldScrollToPrimaryVerse.current = false;
          });
        }
      }, delay);
      return () => clearTimeout(timer);
    } else if (
      primaryTargetVerse === undefined &&
      primaryFlatListRef.current &&
      !primaryLoading
    ) {
      // Scroll to top if no target verse
      primaryFlatListRef.current.scrollToOffset({ offset: 0, animated: true });
      lastScrollYRef.current = 0;
    }
  }, [
    primaryTargetVerse,
    primaryLoading,
    primaryVerses,
    primaryProps.verseMeasurements,
    scrollToPrimaryVerseWithRetry,
    maxScrollRetries,
    primaryFlatListRef,
  ]);
  useEffect(() => {
    if (
      primaryFlatListRef &&
      primaryFlatListRef.current &&
      primaryVerses.length > 0
    ) {
      console.log("Primary FlatList is READY! Ref and verses available");
      console.log("Verse count:", primaryVerses.length);
      console.log("First verse:", primaryVerses[0]?.verse);
      console.log(
        "Last verse:",
        primaryVerses[primaryVerses.length - 1]?.verse
      );
    }
  }, [primaryFlatListRef, primaryFlatListRef?.current, primaryVerses]);
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
  // Effect to handle initial scroll to target verse
  useEffect(() => {
    if (
      targetVerse &&
      !hasScrolledToInitialVerse.current &&
      primaryVerses.length > 0
    ) {
      console.log(`Attempting to scroll to verse ${targetVerse}`);
      // Set a flag so we know we need to scroll
      shouldScrollToPrimaryVerse.current = true;
      setPrimaryTargetVerse(targetVerse);
      // Start the scrolling process after a short delay
      const timer = setTimeout(() => {
        scrollToVerseWhenReady(targetVerse).then((success) => {
          if (success) {
            hasScrolledToInitialVerse.current = true;
            console.log("Initial scroll completed successfully");
          } else {
            console.log("Initial scroll failed, will retry on next render");
          }
        });
      }, 500);
      return () => clearTimeout(timer);
    }
  }, [
    targetVerse,
    primaryVerses,
    scrollToVerseWhenReady,
    setPrimaryTargetVerse,
  ]);
  useEffect(() => {
    if (showMultiVersion && isLinked) {
      if (
        primaryLocation.bookId !== secondaryLocation.bookId ||
        primaryLocation.chapter !== secondaryLocation.chapter
      ) {
        setSecondaryLocation(primaryLocation);
        setSecondaryTargetVerse(primaryTargetVerse);
      }
    } else if (!showMultiVersion) {
      setSecondaryTargetVerse(undefined);
    }
  }, [showMultiVersion, isLinked, primaryTargetVerse, primaryLocation]);
  // Effect to scroll to primary target verse when it changes
  useEffect(() => {
    if (
      primaryTargetVerse &&
      primaryFlatListRef.current &&
      !primaryLoading &&
      primaryVerses.length > 0
    ) {
      // Wait for measurements if available
      const hasMeasurements =
        primaryProps.verseMeasurements &&
        Object.keys(primaryProps.verseMeasurements).length > 0;
      const delay = hasMeasurements ? 100 : 300;
      const timer = setTimeout(() => {
        if (shouldScrollToPrimaryVerse.current) {
          console.log(`Scrolling to primary verse ${primaryTargetVerse}`);
          // Use the retry function instead of manual retry logic
          scrollToPrimaryVerseWithRetry(
            primaryTargetVerse,
            maxScrollRetries
          ).then((success) => {
            if (success) {
              console.log("Scroll successful");
            } else {
              console.log("Scroll failed after retries");
            }
            shouldScrollToPrimaryVerse.current = false;
          });
        }
      }, delay);
      return () => clearTimeout(timer);
    } else if (
      primaryTargetVerse === undefined &&
      primaryFlatListRef.current &&
      !primaryLoading
    ) {
      // Scroll to top if no target verse
      primaryFlatListRef.current.scrollToOffset({ offset: 0, animated: true });
      lastScrollYRef.current = 0;
    }
  }, [
    primaryTargetVerse,
    primaryLoading,
    primaryVerses,
    primaryProps.verseMeasurements,
    scrollToPrimaryVerseWithRetry, // Add this to dependencies
    maxScrollRetries,
  ]);
  // Effect to scroll to secondary target verse when it changes
  useEffect(() => {
    if (
      secondaryTargetVerse &&
      secondaryFlatListRef.current &&
      !secondaryLoading &&
      secondaryVerses.length > 0
    ) {
      const hasMeasurements =
        Object.keys(secondaryVerseMeasurements).length > 0;
      const delay = hasMeasurements ? 100 : 300;
      const timer = setTimeout(() => {
        if (shouldScrollToSecondaryVerse.current) {
          console.log(
            `Scrolling to secondary verse ${secondaryTargetVerse}, retry count: ${secondaryScrollRetryCount.current}`
          );
          const success = scrollToSecondaryVerse(secondaryTargetVerse);
          if (
            !success &&
            secondaryScrollRetryCount.current < maxScrollRetries
          ) {
            // Retry with exponential backoff
            secondaryScrollRetryCount.current += 1;
            const retryDelay =
              200 * Math.pow(2, secondaryScrollRetryCount.current);
            setTimeout(() => {
              scrollToSecondaryVerse(secondaryTargetVerse);
            }, retryDelay);
          } else if (success) {
            secondaryScrollRetryCount.current = 0;
          }
          shouldScrollToSecondaryVerse.current = false;
        }
      }, delay);
      return () => clearTimeout(timer);
    } else if (
      secondaryTargetVerse === undefined &&
      secondaryFlatListRef.current &&
      !secondaryLoading &&
      secondaryVerses.length > 0
    ) {
      // Scroll to top if no target verse
      secondaryFlatListRef.current.scrollToOffset({
        offset: 0,
        animated: true,
      });
    }
  }, [
    secondaryTargetVerse,
    secondaryLoading,
    secondaryVerses,
    secondaryVerseMeasurements,
    scrollToSecondaryVerse,
  ]);
  useEffect(() => {
    setSecondaryVerseMeasurements({});
  }, [secondaryVerses]);
  const handlePrimaryContentSizeChange = useCallback(
    (width: number, height: number) => {
      primaryProps.handleContentSizeChange(width, height);
      setPrimaryContentHeight(height);
    },
    [primaryProps.handleContentSizeChange]
  );
  const handleSecondaryContentSizeChange = useCallback(
    (_width: number, height: number) => {
      setSecondaryContentHeight(height);
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
    setSecondaryVerseMeasurements({});
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
  const handleSecondaryVersionSelect = useCallback((version: string) => {
    setSecondaryVersion(version);
  }, []);
  const versionHeaderPaddingVertical = isLandscape ? 4 : 8;
  const headerContentHeight = 60;
  const headerTotalHeight = insets.top + headerContentHeight;
  const versionsToShow = availableBibleVersions;
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
  const handleSetBgTextureOpacity = useCallback((value: number) => {
    setBgTextureOpacity(Math.round(value * 100) / 100);
  }, []);
  const handlePrimaryScrollBeginDrag = useCallback(() => {
    isPrimaryUserScrolling.current = true;
  }, []);

  const handlePrimaryScrollEndDrag = useCallback(() => {
    isPrimaryUserScrolling.current = false;
  }, []);

  const handlePrimaryMomentumBegin = useCallback(() => {
    isPrimaryUserScrolling.current = true;
  }, []);

  const handlePrimaryMomentumEnd = useCallback(() => {
    isPrimaryUserScrolling.current = false;
  }, []);
  const handleSecondaryScrollBeginDrag = useCallback(() => {
    isSecondaryUserScrolling.current = true;
  }, []);
  const handleSecondaryScrollEndDrag = useCallback(() => {
    isSecondaryUserScrolling.current = false;
  }, []);
  const handleSecondaryMomentumBegin = useCallback(() => {
    isSecondaryUserScrolling.current = true;
  }, []);
  const handleSecondaryMomentumEnd = useCallback(() => {
    isSecondaryUserScrolling.current = false;
  }, []);

  // Add this with your other refs
  const scrollSyncTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(
    null
  );

  // Cleanup in useEffect
  useEffect(() => {
    return () => {
      if (scrollSyncTimeoutRef.current) {
        clearTimeout(scrollSyncTimeoutRef.current);
      }
    };
  }, []);

  // Add these refs at the top with your other refs
  const primaryScrollSyncTimeoutRef = useRef<ReturnType<
    typeof setTimeout
  > | null>(null);
  const secondaryScrollSyncTimeoutRef = useRef<ReturnType<
    typeof setTimeout
  > | null>(null);

  // Update the handlePrimaryScroll function:
  const handlePrimaryScroll = useCallback(
    (event: { nativeEvent: { contentOffset: { y: number } } }) => {
      const y = event.nativeEvent.contentOffset.y;
      console.log(
        `Primary scroll: ${y}, userScrolling: ${isPrimaryUserScrolling.current}, ignore: ${ignorePrimaryScroll.current}`
      );

      lastScrollYRef.current = y;

      // Only sync if linked, multi-version is shown, and this is NOT an ignored scroll
      if (isLinked && showMultiVersion && !ignorePrimaryScroll.current) {
        console.log(`Syncing from primary to secondary: ${y}`);

        // Set ignore flag to prevent feedback loop
        ignoreSecondaryScroll.current = true;

        // Scroll secondary list
        if (secondaryFlatListRef.current) {
          secondaryFlatListRef.current.scrollToOffset({
            offset: y,
            animated: false,
          });
        }

        // Clear any existing timeout
        if (secondaryScrollSyncTimeoutRef.current) {
          clearTimeout(secondaryScrollSyncTimeoutRef.current);
        }

        // Reset ignore flag after delay
        secondaryScrollSyncTimeoutRef.current = setTimeout(() => {
          ignoreSecondaryScroll.current = false;
          console.log("Secondary ignore flag reset");
        }, 100);
      }
    },
    [isLinked, showMultiVersion]
  );

  // Update the handleSecondaryScroll function:
  const handleSecondaryScroll = useCallback(
    (event: { nativeEvent: { contentOffset: { y: number } } }) => {
      const y = event.nativeEvent.contentOffset.y;
      console.log(
        `Secondary scroll: ${y}, userScrolling: ${isSecondaryUserScrolling.current}, ignore: ${ignoreSecondaryScroll.current}`
      );

      // Only sync if linked, multi-version is shown, and this is NOT an ignored scroll
      if (isLinked && showMultiVersion && !ignoreSecondaryScroll.current) {
        console.log(`Syncing from secondary to primary: ${y}`);

        // Set ignore flag to prevent feedback loop
        ignorePrimaryScroll.current = true;

        // Scroll primary list
        if (primaryFlatListRef.current) {
          primaryFlatListRef.current.scrollToOffset({
            offset: y,
            animated: false,
          });
        }

        // Clear any existing timeout
        if (primaryScrollSyncTimeoutRef.current) {
          clearTimeout(primaryScrollSyncTimeoutRef.current);
        }

        // Reset ignore flag after delay
        primaryScrollSyncTimeoutRef.current = setTimeout(() => {
          ignorePrimaryScroll.current = false;
          console.log("Primary ignore flag reset");
        }, 100);
      }
    },
    [isLinked, showMultiVersion]
  );

  // Add this useEffect for cleanup
  useEffect(() => {
    return () => {
      if (primaryScrollSyncTimeoutRef.current) {
        clearTimeout(primaryScrollSyncTimeoutRef.current);
      }
      if (secondaryScrollSyncTimeoutRef.current) {
        clearTimeout(secondaryScrollSyncTimeoutRef.current);
      }
    };
  }, []);

  // Fix the initial sync useEffect
  useEffect(() => {
    if (isLinked && showMultiVersion && secondaryFlatListRef.current) {
      const currentY = lastScrollYRef.current;
      console.log(`Initial sync: Setting secondary to Y: ${currentY}`);

      // Use a small delay to ensure component is mounted
      const timer = setTimeout(() => {
        ignoreSecondaryScroll.current = true;
        secondaryFlatListRef.current?.scrollToOffset({
          offset: currentY,
          animated: false,
        });

        setTimeout(() => {
          ignoreSecondaryScroll.current = false;
        }, 200);
      }, 300);

      return () => clearTimeout(timer);
    }
  }, [isLinked, showMultiVersion]);

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
              marginBottom: 5,
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
            shouldScrollToPrimaryVerse.current = true;
            primaryScrollRetryCount.current = 0;
          } else {
            setSecondaryLocation(newLocation);
            setSecondaryTargetVerse(newLocation.verse);
            shouldScrollToSecondaryVerse.current = true;
            secondaryScrollRetryCount.current = 0;
            if (showMultiVersion && isLinked) {
              setPrimaryLocation(newLocation);
              setPrimaryTargetVerse(newLocation.verse);
              shouldScrollToPrimaryVerse.current = true;
              primaryScrollRetryCount.current = 0;
              resetPrimaryScroll();
            }
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
          handlePrimaryContentSizeChange={handlePrimaryContentSizeChange}
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
          handleSecondaryContentSizeChange={handleSecondaryContentSizeChange}
          handleSecondaryVerseLayout={handleSecondaryVerseLayout}
          primaryFlatListRef={primaryFlatListRef}
          secondaryFlatListRef={secondaryFlatListRef}
          onPrimaryScroll={handlePrimaryScroll}
          onPrimaryScrollBeginDrag={handlePrimaryScrollBeginDrag}
          onPrimaryScrollEndDrag={handlePrimaryScrollEndDrag}
          onPrimaryMomentumScrollBegin={handlePrimaryMomentumBegin}
          onPrimaryMomentumScrollEnd={handlePrimaryMomentumEnd}
          onSecondaryScroll={handleSecondaryScroll}
          onSecondaryScrollBeginDrag={handleSecondaryScrollBeginDrag}
          onSecondaryScrollEndDrag={handleSecondaryScrollEndDrag}
          onSecondaryMomentumScrollBegin={handleSecondaryMomentumBegin}
          onSecondaryMomentumScrollEnd={handleSecondaryMomentumEnd}
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
            <FlatList
              key={`selector-${openSelector}`}
              showsVerticalScrollIndicator={true}
              style={{
                maxHeight: 300,
                width: "100%",
              }}
              data={versionsToShow}
              keyExtractor={(item) => item}
              renderItem={({ item: v, index }) => {
                const isActive =
                  (openSelector === "primary" && v === currentVersion) ||
                  (openSelector === "secondary" && v === secondaryVersion);
                return (
                  <TouchableOpacity
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
                      backgroundColor: isActive ? colors.secondary : undefined,
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
              }}
              ListEmptyComponent={
                selectorLoading ? (
                  <View
                    style={{
                      paddingVertical: 20,
                      alignItems: "center",
                    }}
                  >
                    <ActivityIndicator size="small" color={primaryTextColor} />
                  </View>
                ) : null
              }
            />
          </View>
        </TouchableOpacity>
      )}
    </SafeAreaView>
  );
}