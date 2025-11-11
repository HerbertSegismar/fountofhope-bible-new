// Updated ChapterViewEnhanced.tsx
import React, {
  useMemo,
  useState,
  useCallback,
  useEffect,
  useRef,
} from "react";
import {
  View,
  Text,
  TouchableOpacity,
  StyleProp,
  ViewStyle,
  LayoutChangeEvent,
  DimensionValue,
  ScrollView,
  ActivityIndicator,
  TextStyle,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { Verse } from "../types";
import { useTheme } from "../context/ThemeContext";
import { BIBLE_BOOKS_MAP } from "../utils/testamentUtils";
import { useBibleDatabase } from "../context/BibleDatabaseContext";
import { BOOK_ABBREVS } from "../utils/bookAbbrevs";
import { getTestament } from "../utils/testamentUtils";
import { getDatabaseFilename } from "../utils/bibleDatabaseUtils";
import { parseVerseList } from "../utils/verseUtils";
import { getThemeColors, type ThemeColors } from "../utils/themeUtils";
import { useCommentary } from "../hooks/useCommentary";
import { useWordDictionary } from "../hooks/useWordDictionary";
import { BackgroundTexture } from "../components/BackgroundTexture";
import { useBackgroundTexture } from "../hooks/useBackgroundTexture";
import { Fonts } from "../utils/fonts";
import { EnhancedModal, type EnhancedModalRef } from "./EnhancedModal";

type ParsedNode = {
  type: "text" | "opening-tag" | "closing-tag" | "self-closing-tag";
  content?: string;
  tag?: string;
  fullTag?: string;
};

type TreeNode = {
  type: "text" | "element" | "self-closing-tag";
  content?: string;
  tag?: string;
  fullTag?: string;
  children?: TreeNode[];
};

type RenderResult = {
  header: React.ReactNode[];
  body: React.ReactNode[];
};

const buildTree = (nodes: ParsedNode[]): TreeNode[] => {
  const root: TreeNode[] = [];
  let current: TreeNode[] = root;
  const stack: TreeNode[][] = [];
  for (const node of nodes) {
    if (node.type === "opening-tag") {
      const element: TreeNode = {
        type: "element",
        tag: node.tag,
        fullTag: node.fullTag,
        children: [],
      };
      current.push(element);
      stack.push(current);
      current = element.children!;
    } else if (node.type === "closing-tag") {
      if (stack.length > 0) {
        current = stack.pop()!;
      }
    } else if (node.type === "self-closing-tag" || node.type === "text") {
      current.push(node as TreeNode);
    }
  }
  return root;
};

const parseXmlTags = (text: string): ParsedNode[] => {
  if (!text) return [];
  const nodes: ParsedNode[] = [];
  let currentText = "";
  let i = 0;
  while (i < text.length) {
    if (text[i] === "<") {
      if (currentText) {
        nodes.push({ type: "text", content: currentText });
        currentText = "";
      }
      const tagEnd = text.indexOf(">", i);
      if (tagEnd === -1) {
        currentText += text.substring(i);
        break;
      }
      const fullTag = text.substring(i, tagEnd + 1);
      if (fullTag.startsWith("</")) {
        nodes.push({ type: "closing-tag", tag: fullTag });
      } else if (fullTag.endsWith("/>")) {
        const tagName = fullTag.slice(1, -2).trim();
        nodes.push({ type: "self-closing-tag", tag: tagName, fullTag });
      } else {
        const tagName = fullTag.slice(1, -1).trim().split(" ")[0];
        nodes.push({ type: "opening-tag", tag: tagName, fullTag });
      }
      i = tagEnd + 1;
    } else {
      currentText += text[i];
      i++;
    }
  }
  if (currentText) {
    nodes.push({ type: "text", content: currentText });
  }
  return nodes;
};

const renderTree = (
  tree: TreeNode[],
  baseFontSize: number,
  themeColors: ThemeColors,
  highlight?: string,
  fontFamily?: string,
  onTagPress?: (content: string) => void,
  textColor?: string,
  onWordPress?: (word: string) => void
): RenderResult => {
  const result: RenderResult = { header: [], body: [] };
  let key = 0;
  const renderNode = (
    node: TreeNode,
    overrideTextColor?: string,
    nodeOnWordPress?: (word: string) => void
  ): RenderResult => {
    key++;
    if (node.type === "text") {
      return {
        header: [],
        body: [
          renderTextWithHighlight(
            node.content || "",
            themeColors,
            highlight,
            `text-${key}`,
            fontFamily,
            overrideTextColor || textColor,
            nodeOnWordPress
          ),
        ],
      };
    } else if (node.type === "self-closing-tag") {
      const content = extractContentFromTag(node.fullTag || "");
      const isNumber = /^\d+$/.test(content.trim());
      const tagContent = content.trim();
      return {
        header: [],
        body: [
          <Text
            key={`self-${key}`}
            onPress={() => onTagPress?.(tagContent)}
            style={{
              fontSize: isNumber ? baseFontSize * 0.5 : baseFontSize * 0.95,
              color: themeColors.tagColor,
              backgroundColor: themeColors.tagBg,
              fontFamily,
            }}
          >
            {content}
          </Text>,
        ],
      };
    } else if (node.type === "element") {
      const ch = node.children || [];
      const isTextContainer = node.tag === "t";
      const isNumber =
        node.tag === "S" &&
        ch.length === 1 &&
        ch[0].type === "text" &&
        /^\d+$/.test((ch[0].content || "").trim());
      const tagContent = ch
        .map((child: TreeNode) =>
          child.type === "text" ? child.content || "" : ""
        )
        .join("")
        .trim();
      const overrideTextColorForChildren = isTextContainer
        ? textColor
        : themeColors.tagColor;
      const childOnWordPress = isTextContainer ? onWordPress : undefined;
      const childResults = ch.map((child: TreeNode) =>
        renderNode(child, overrideTextColorForChildren, childOnWordPress)
      );
      let allHeaders: React.ReactNode[] = [];
      let allBodies: React.ReactNode[] = [];
      if (node.tag === "n") {
        childResults.forEach((res) => {
          allHeaders.push(...res.header, ...res.body);
        });
        return { header: allHeaders, body: [] };
      } else {
        childResults.forEach((res) => {
          allHeaders.push(...res.header);
          allBodies.push(...res.body);
        });
        const renderedChildren = allBodies;
        const elemStyle = isTextContainer
          ? {
              fontSize: baseFontSize * 0.95,
              fontFamily,
            }
          : {
              fontSize: isNumber ? baseFontSize * 0.5 : baseFontSize * 0.95,
              color: themeColors.tagColor,
              fontFamily,
            };
        const bodyNode = (
          <Text
            key={`elem-${key}`}
            style={elemStyle}
            onPress={
              !isTextContainer ? () => onTagPress?.(tagContent) : undefined
            }
          >
            {renderedChildren}
          </Text>
        );
        return { header: allHeaders, body: [bodyNode] };
      }
    }
    return { header: [], body: [] };
  };
  for (const node of tree) {
    const res = renderNode(node, undefined, onWordPress);
    result.header.push(...res.header);
    result.body.push(...res.body);
  }
  return result;
};

const extractContentFromTag = (tag: string): string => {
  const match = tag.match(/<[^>]+>([^<]*)<\/[^>]+>/);
  return match ? match[1] : "";
};

const renderTextWithHighlight = (
  text: string,
  themeColors: ThemeColors,
  highlight?: string,
  keyPrefix?: string,
  fontFamily?: string,
  textColor?: string,
  onWordPress?: (word: string) => void
): React.ReactNode => {
  const innerStyle = { fontFamily, color: textColor };
  const highlightStyle = {
    ...innerStyle,
    backgroundColor: themeColors.searchHighlightBg,
  };
  if (!onWordPress && (!highlight || !text)) {
    return (
      <Text key={keyPrefix} style={innerStyle}>
        {text}
      </Text>
    );
  }
  if (!onWordPress) {
    const regex = new RegExp(`(${escapeRegex(highlight!)})`, "gi");
    const parts = text.split(regex);
    return (
      <Text key={keyPrefix} style={innerStyle}>
        {parts.map((part, i) =>
          part.toLowerCase() === highlight!.toLowerCase() ? (
            <Text key={`${keyPrefix}-${i}`} style={highlightStyle}>
              {part}
            </Text>
          ) : (
            <Text key={`${keyPrefix}-${i}`} style={innerStyle}>
              {part}
            </Text>
          )
        )}
      </Text>
    );
  }
  const parts: React.ReactNode[] = [];
  let i = 0;
  let localKey = 0;
  const isAlpha = (char: string) => /[a-zA-Z\u00C0-\u00FF]/.test(char);
  while (i < text.length) {
    const char = text[i];
    if (isAlpha(char)) {
      let word = char;
      i++;
      while (i < text.length && isAlpha(text[i])) {
        word += text[i];
        i++;
      }
      let wordNode: React.ReactNode;
      const isClickable = /^[a-zA-Z\u00C0-\u00FF]{2,}$/.test(word);
      if (highlight && word.toLowerCase().includes(highlight.toLowerCase())) {
        const regex = new RegExp(`(${escapeRegex(highlight)})`, "gi");
        const wordParts = word.split(regex);
        const wordInner = wordParts.map((part, j) => {
          const isMatch = part.toLowerCase() === highlight.toLowerCase();
          return (
            <Text
              key={`${keyPrefix}-wordpart-${localKey++}-${j}`}
              style={isMatch ? highlightStyle : innerStyle}
            >
              {part}
            </Text>
          );
        });
        if (isClickable) {
          wordNode = (
            <Text
              key={`${keyPrefix}-word-${localKey++}`}
              onPress={() => onWordPress(word)}
              style={innerStyle}
            >
              {wordInner}
            </Text>
          );
        } else {
          wordNode = (
            <Text key={`${keyPrefix}-word-${localKey++}`} style={innerStyle}>
              {wordInner}
            </Text>
          );
        }
      } else {
        if (isClickable) {
          wordNode = (
            <Text
              key={`${keyPrefix}-word-${localKey++}`}
              onPress={() => onWordPress(word)}
              style={innerStyle}
            >
              {word}
            </Text>
          );
        } else {
          wordNode = (
            <Text key={`${keyPrefix}-word-${localKey++}`} style={innerStyle}>
              {word}
            </Text>
          );
        }
      }
      parts.push(wordNode);
    } else if (/\d/.test(char)) {
      let num = char;
      i++;
      while (i < text.length && /\d/.test(text[i])) {
        num += text[i];
        i++;
      }
      parts.push(
        <Text key={`${keyPrefix}-num-${localKey++}`} style={innerStyle}>
          {num}
        </Text>
      );
    } else if (/[^\s]/.test(char)) {
      let punct = char;
      i++;
      while (
        i < text.length &&
        /[^\s]/.test(text[i]) &&
        !isAlpha(text[i]) &&
        !/\d/.test(text[i])
      ) {
        punct += text[i];
        i++;
      }
      parts.push(
        <Text key={`${keyPrefix}-punct-${localKey++}`} style={innerStyle}>
          {punct}
        </Text>
      );
    } else {
      let ws = char;
      i++;
      while (i < text.length && /[\s\n\r]/.test(text[i])) {
        ws += text[i];
        i++;
      }
      parts.push(
        <Text key={`${keyPrefix}-ws-${localKey++}`} style={innerStyle}>
          {ws}
        </Text>
      );
    }
  }
  return (
    <Text key={keyPrefix} style={innerStyle}>
      {parts}
    </Text>
  );
};

const escapeRegex = (string: string) => {
  return string.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
};

const renderVerseTextWithXmlHighlight = (
  text: string,
  baseFontSize: number,
  themeColors: ThemeColors,
  highlight?: string,
  fontFamily?: string,
  onTagPress?: (content: string) => void,
  textColor?: string,
  onWordPress?: (word: string) => void
): RenderResult => {
  if (!text) return { header: [], body: [] };
  try {
    const nodes = parseXmlTags(text);
    const tree = buildTree(nodes);
    return renderTree(
      tree,
      baseFontSize,
      themeColors,
      highlight,
      fontFamily,
      onTagPress,
      textColor,
      onWordPress
    );
  } catch (error) {
    console.error("Error parsing XML tags:", error);
    return {
      header: [],
      body: [
        renderTextWithHighlight(
          text,
          themeColors,
          highlight,
          "fallback",
          fontFamily,
          textColor,
          onWordPress
        ),
      ],
    };
  }
};

type VerseDisplayProps = {
  verse: Verse;
  fontSize: number;
  themeColors: ThemeColors;
  fontFamily?: string;
  onTagPress?: (content: string, verse: Verse) => void;
  onWordPress?: (word: string) => void;
  textColor?: string;
  showVerseNumbers?: boolean;
  prefix?: string;
  showHeader?: boolean;
  isHighlighted?: boolean;
};

export const VerseDisplay: React.FC<VerseDisplayProps> = ({
  verse,
  fontSize,
  themeColors,
  fontFamily,
  onTagPress,
  onWordPress,
  textColor,
  showVerseNumbers = true,
  prefix,
  showHeader = true,
  isHighlighted = false,
}) => {
  const rendered = useMemo(
    () =>
      renderVerseTextWithXmlHighlight(
        verse.text,
        fontSize,
        themeColors,
        undefined,
        fontFamily,
        (content) => onTagPress?.(content, verse),
        textColor,
        onWordPress
      ),
    [
      verse.text,
      verse,
      fontSize,
      themeColors,
      fontFamily,
      onTagPress,
      textColor,
      onWordPress,
    ]
  );
  const { header, body } = rendered;
  const numberColor = isHighlighted
    ? themeColors.highlightIcon
    : themeColors.verseNumber;
  const numberStyle: TextStyle = useMemo(
    () => ({
      fontSize: fontSize * 0.8,
      fontWeight: "600" as const,
      color: numberColor,
      fontFamily,
    }),
    [fontSize, numberColor, fontFamily]
  );
  const headerStyle: TextStyle = useMemo(
    () => ({
      fontSize: fontSize * 0.9,
      fontWeight: "bold" as const,
      color: textColor,
      marginBottom: 4,
      fontFamily,
    }),
    [fontSize, textColor, fontFamily]
  );
  const mainContent = (
    <Text
      style={{
        fontSize,
        lineHeight: fontSize * 1.4,
        flexShrink: 1,
        flexWrap: "wrap",
        color: textColor,
        fontFamily,
      }}
      numberOfLines={0}
    >
      {prefix || showVerseNumbers ? (
        <Text style={numberStyle}>{prefix || verse.verse} </Text>
      ) : null}
      {body}
    </Text>
  );
  return (
    <View>
      {showHeader && header.length > 0 && (
        <Text style={headerStyle} numberOfLines={0}>
          {header}
        </Text>
      )}
      {mainContent}
    </View>
  );
};

const STYLES = {
  container: {
    borderRadius: 8,
    shadowOpacity: 0.1,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 2 },
    elevation: 2,
    minHeight: 400,
    alignSelf: "stretch" as const,
    width: "100%" as DimensionValue,
    overflow: "hidden",
  },
  verse: {
    flexDirection: "row" as const,
    alignItems: "flex-start" as const,
  },
  verseNumber: {
    includeFontPadding: false,
  },
  verseText: {
    textAlign: "left" as const,
    flex: 1,
    minWidth: 0,
  },
} as const;

interface ChapterViewProps {
  verses: Verse[];
  bookName: string;
  chapterNumber: number;
  onPress?: () => void;
  showVerseNumbers?: boolean;
  fontSize?: number;
  onVersePress?: (verse: Verse) => void;
  onVerseLayout?: (verseNumber: number, event: LayoutChangeEvent) => void;
  onVerseRef?: (verseNumber: number, ref: View | null) => void;
  highlightVerse?: number;
  highlightedVerses?: Set<number>;
  bookmarkedVerses?: Set<number>;
  style?: StyleProp<ViewStyle>;
  bookId?: number;
  isFullScreen?: boolean;
  displayVersion?: string;
  colors?: any;
  onNavigateToVerse?: (
    bookNumber: number,
    chapter: number,
    verse: number
  ) => void;
  bgImageIndex?: number;
  bgTextureOpacity?: number;
  noBackground?: boolean;
}

export const ChapterViewEnhanced: React.FC<ChapterViewProps> = ({
  verses,
  bookName,
  chapterNumber,
  onPress,
  showVerseNumbers = true,
  fontSize = 16,
  onVersePress,
  onVerseLayout,
  onVerseRef,
  highlightVerse,
  highlightedVerses = new Set(),
  bookmarkedVerses = new Set(),
  style,
  isFullScreen,
  displayVersion,
  colors,
  onNavigateToVerse,
  bgImageIndex: propBgImageIndex,
  bgTextureOpacity: propBgTextureOpacity,
  noBackground,
}) => {
  const { theme, colorScheme, fontFamily, customColor } = useTheme();
  const themeColors = getThemeColors(theme, colorScheme, customColor);
  const actualFontFamily = useMemo((): string | undefined => {
    switch (fontFamily) {
      case "system":
        return undefined;
      case "oswald":
        return Fonts.OswaldVariable;
      case "rubik-glitch":
        return Fonts.RubikGlitchRegular;
      case "poppins":
        return Fonts.PoppinsRegular;
      default:
        return undefined;
    }
  }, [fontFamily]);
  const { bibleDB, getDatabase } = useBibleDatabase();
  const effectiveNoBg = noBackground ?? false;
  const bgHook = useBackgroundTexture({
    index: propBgImageIndex,
    opacity: propBgTextureOpacity,
    noBackground: effectiveNoBg,
  });
  const hasBg = !effectiveNoBg && bgHook.hasSource;

  const modalRef = useRef<EnhancedModalRef>(null);

  const bookToNumber = useMemo(() => {
    const map: Record<string, number> = {};
    Object.entries(BIBLE_BOOKS_MAP).forEach(([dbNumStr, { long, short }]) => {
      const dbNum = parseInt(dbNumStr, 10);
      map[long] = dbNum;
      map[short] = dbNum;
      const abbrevs = BOOK_ABBREVS[long] || [];
      abbrevs.forEach((abb) => {
        if (!map[abb]) {
          map[abb] = dbNum;
        }
      });
    });
    return map;
  }, []);

  const sortedVerses = useMemo(
    () => [...verses].sort((a, b) => a.verse - b.verse),
    [verses]
  );

  const handleVerseLayout = (verseNumber: number, event: LayoutChangeEvent) => {
    onVerseLayout?.(verseNumber, event);
  };

  const handleVerseRef = (verseNumber: number, ref: View | null) => {
    if (ref) {
      onVerseRef?.(verseNumber, ref);
    }
  };

  const handleVersePress = (verse: Verse) => {
    onVersePress?.(verse);
  };

  const renderVerseItem = (verse: Verse) => {
    const isHighlighted =
      highlightedVerses.has(verse.verse) || verse.verse === highlightVerse;
    const verseTextColor = isHighlighted
      ? themeColors.highlightText
      : themeColors.textPrimary;
    const localOnTagPress = useCallback(
      (content: string) => {
        modalRef.current?.openCommentary(content, verse);
      },
      [verse]
    );
    const localOnWordPress = useCallback((word: string) => {
      modalRef.current?.openWord(word);
    }, []);
    const indicatorSize = isFullScreen ? fontSize * 0.7 : fontSize * 0.8;
    const starStyle = {
      fontSize: indicatorSize * 0.9,
      color: themeColors.highlightIcon,
      fontFamily: actualFontFamily,
    };
    return (
      <TouchableOpacity
        key={verse.verse}
        activeOpacity={1}
        onLongPress={() => handleVersePress(verse)}
      >
        <View
          style={[
            STYLES.verse,
            {
              backgroundColor: isHighlighted
                ? themeColors.highlightBg
                : "transparent",
              borderRadius: 6,
              padding: isHighlighted ? (isFullScreen ? 4 : 8) : 0,
              borderWidth: isHighlighted ? 1 : 0,
              borderColor: isHighlighted
                ? themeColors.highlightBorder
                : "transparent",
              marginBottom: isFullScreen ? 2 : 4,
            },
          ]}
          onLayout={(event) => handleVerseLayout(verse.verse, event)}
          ref={(ref) => handleVerseRef(verse.verse, ref)}
        >
          <View style={{ ...STYLES.verseText }}>
            <VerseDisplay
              verse={verse}
              fontSize={fontSize}
              themeColors={themeColors}
              fontFamily={actualFontFamily}
              onTagPress={localOnTagPress}
              onWordPress={localOnWordPress}
              textColor={verseTextColor}
              showVerseNumbers={showVerseNumbers}
              showHeader={true}
              isHighlighted={isHighlighted}
            />
            {bookmarkedVerses.has(verse.verse) && (
              <Ionicons
                name="bookmark-sharp"
                size={20}
                color={themeColors.primary}
              />
            )}
            {isHighlighted && <Text style={starStyle}>★</Text>}
            {(showVerseNumbers ||
              bookmarkedVerses.has(verse.verse) ||
              isHighlighted) && (
              <Text style={{ fontSize: indicatorSize * 0.5 }}> </Text>
            )}
          </View>
        </View>
      </TouchableOpacity>
    );
  };

  const renderVerses = () => {
    return (
      <View style={{ gap: isFullScreen ? 2 : 6 }}>
        {sortedVerses.map(renderVerseItem)}
      </View>
    );
  };

  const wrapperStyle = useMemo<ViewStyle>(
    () => ({
      ...STYLES.container,
      flex: isFullScreen ? 1 : undefined,
      backgroundColor: effectiveNoBg
        ? "transparent"
        : hasBg
          ? undefined
          : themeColors.card,
      shadowOpacity: effectiveNoBg || hasBg ? 0 : 0.1,
      shadowRadius: effectiveNoBg || hasBg ? 0 : 4,
      shadowOffset:
        effectiveNoBg || hasBg
          ? { width: 0, height: 0 }
          : { width: 0, height: 2 },
      elevation: effectiveNoBg || hasBg ? 0 : 2,
    }),
    [isFullScreen, effectiveNoBg, hasBg, themeColors.card]
  );

  const contentContainerStyle = useMemo(
    () => ({
      padding: isFullScreen ? 8 : 16,
      paddingTop: isFullScreen ? 6 : 12,
    }),
    [isFullScreen]
  );

  const footerStyle = useMemo(
    () => ({
      marginTop: isFullScreen ? 8 : 16,
      paddingTop: isFullScreen ? 6 : 12,
      borderTopWidth: 1,
      borderTopColor: themeColors.border,
    }),
    [isFullScreen, themeColors.border]
  );

  const innerContent = (
    <>
      {renderVerses()}
      <View style={footerStyle}>
        <Text
          style={{
            textAlign: "center",
            color: themeColors.textMuted,
            fontSize: 10,
            fontFamily: actualFontFamily,
          }}
          numberOfLines={1}
          ellipsizeMode="tail"
        >
          {sortedVerses.length} verse{sortedVerses.length !== 1 ? "s" : ""}
          {highlightedVerses.size > 0 &&
            ` • ${highlightedVerses.size} highlighted`}
          {bookmarkedVerses.size > 0 &&
            ` • ${bookmarkedVerses.size} bookmarked`}
        </Text>
      </View>
    </>
  );

  const scrollOrView = effectiveNoBg ? (
    <View style={contentContainerStyle}>{innerContent}</View>
  ) : (
    <ScrollView
      style={{ flex: 1 }}
      contentContainerStyle={contentContainerStyle}
      showsVerticalScrollIndicator={false}
    >
      {innerContent}
    </ScrollView>
  );

  const chapterContent = (
    <BackgroundTexture
      source={bgHook.source}
      hasBg={hasBg}
      overlayStyle={bgHook.overlayStyle}
      overlayKey={bgHook.overlayKey}
      style={[wrapperStyle, style]}
    >
      {scrollOrView}
    </BackgroundTexture>
  );

  if (onPress) {
    return (
      <TouchableOpacity onPress={onPress} activeOpacity={0.7}>
        {chapterContent}
      </TouchableOpacity>
    );
  }

  if (sortedVerses.length === 0) {
    return (
      <View
        style={[
          {
            backgroundColor: effectiveNoBg ? "transparent" : themeColors.card,
            padding: isFullScreen ? 8 : 16,
            borderRadius: 8,
            borderWidth: 1,
            borderColor: themeColors.border,
          },
          style,
        ]}
      >
        <Text
          style={{
            textAlign: "center",
            color: themeColors.textMuted,
            fontSize: isFullScreen ? 14 : 16,
            fontFamily: actualFontFamily,
          }}
        >
          No verses available
        </Text>
      </View>
    );
  }

  return (
    <>
      {chapterContent}
      <EnhancedModal
        ref={modalRef}
        themeColors={themeColors}
        actualFontFamily={actualFontFamily}
        displayVersion={displayVersion}
        bookToNumber={bookToNumber}
      />
    </>
  );
};
