import React, { useMemo } from "react";
import { View, Text, TextStyle } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { Verse } from "../types";
import { type ThemeColors } from "../utils/themeUtils";

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
        const parent = stack[stack.length - 1];
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
        const tagName = fullTag.slice(2, -1).trim().split(" ")[0];
        nodes.push({ type: "closing-tag", tag: tagName });
      } else if (fullTag.endsWith("/>")) {
        const tagName = fullTag.slice(1, -2).trim().split(" ")[0];
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

let globalKey = 0;

const renderTree = (
  tree: TreeNode[],
  baseFontSize: number,
  themeColors: ThemeColors,
  highlight?: string,
  fontFamily?: string,
  onTagPress?: (content: string) => void,
  textColor?: string,
  onWordPress?: (word: string) => void,
  isHighlighted?: boolean
): RenderResult => {
  const result: RenderResult = { header: [], body: [] };

  // Function to detect if text contains encircled letters
  const hasEncircledLetters = (text: string): boolean => {
    return /[ⓐ-ⓩⓐ-ⓩ]/.test(text);
  };

  const renderNode = (
    node: TreeNode,
    overrideTextColor?: string,
    nodeOnWordPress?: (word: string) => void,
    _parentIsHighlighted?: boolean
  ): RenderResult => {
    globalKey++;
    if (node.type === "text") {
      const content = node.content || "";

      // Check if this text contains encircled letters
      if (hasEncircledLetters(content)) {
        // Split the text and apply larger font size to encircled letters
        const parts: React.ReactNode[] = [];
        const regex = /([ⓐ-ⓩⓐ-ⓩ])/g;
        const textParts = content.split(regex);

        textParts.forEach((part, index) => {
          if (regex.test(part)) {
            // Encircled letter - use larger font size
            parts.push(
              <Text
                key={`encircled-${globalKey}-${index}`}
                style={{
                  fontSize: baseFontSize * 1.2,
                  fontFamily,
                  color: overrideTextColor || textColor,
                  lineHeight: baseFontSize * 1.4, // Maintain line height consistency
                }}
              >
                {" "}
                {part}{" "}
              </Text>
            );
          } else if (part) {
            // Regular text
            parts.push(
              renderTextWithHighlight(
                part,
                themeColors,
                highlight,
                `text-${globalKey}-${index}`,
                fontFamily,
                overrideTextColor || textColor,
                nodeOnWordPress
              )
            );
          }
        });

        return {
          header: [],
          body: [
            <Text
              key={`encircled-container-${globalKey}`}
              style={{ fontFamily }}
            >
              {parts}
            </Text>,
          ],
        };
      } else {
        // No encircled letters, use normal rendering
        return {
          header: [],
          body: [
            renderTextWithHighlight(
              content,
              themeColors,
              highlight,
              `text-${globalKey}`,
              fontFamily,
              overrideTextColor || textColor,
              nodeOnWordPress
            ),
          ],
        };
      }
    } else if (node.type === "self-closing-tag") {
      const content = extractContentFromTag(node.fullTag || "");
      const tagContent = content.trim();

      // Check if this tag content contains encircled letters
      if (hasEncircledLetters(tagContent)) {
        const parts: React.ReactNode[] = [];
        const regex = /([ⓐ-ⓩⓐ-ⓩ])/g;
        const textParts = tagContent.split(regex);

        textParts.forEach((part, index) => {
          if (regex.test(part)) {
            // Encircled letter in tag - use larger font size
            parts.push(
              <Text
                key={`tag-encircled-${globalKey}-${index}`}
                style={{
                  fontSize: baseFontSize * 1.2,
                  color: themeColors.tagColor,
                  backgroundColor: themeColors.tagBg,
                  fontFamily,
                  lineHeight: baseFontSize * 1.4,
                }}
                onPress={() => onTagPress?.(tagContent)}
              >
                {part}
              </Text>
            );
          } else if (part) {
            // Regular text in tag
            parts.push(
              <Text
                key={`tag-normal-${globalKey}-${index}`}
                style={{
                  fontSize: baseFontSize * 0.8,
                  color: themeColors.tagColor,
                  backgroundColor: themeColors.tagBg,
                  fontFamily,
                }}
                onPress={() => onTagPress?.(tagContent)}
              >
                {part}
              </Text>
            );
          }
        });

        return {
          header: [],
          body: [
            <Text key={`tag-container-${globalKey}`} style={{ fontFamily }}>
              {parts}
            </Text>,
          ],
        };
      } else {
        // No encircled letters in tag, use normal rendering
        return {
          header: [],
          body: [
            <Text
              key={`self-${globalKey}`}
              onPress={() => onTagPress?.(tagContent)}
              style={{
                fontSize: baseFontSize * 0.8,
                color: themeColors.tagColor,
                backgroundColor: themeColors.tagBg,
                fontFamily,
              }}
            >
              {content}
            </Text>,
          ],
        };
      }
    } else if (node.type === "element") {
      const ch = node.children || [];
      const isTextContainer = node.tag === "t" || node.tag === "J";
      const tagContent = ch
        .map((child: TreeNode) =>
          child.type === "text" ? child.content || "" : ""
        )
        .join("")
        .trim();

      // FIX: Only use wordsOfJesus color if we're NOT highlighted
      let childTextColor: string | undefined = overrideTextColor || textColor;
      if (node.tag === "J" && !isHighlighted) {
        // Only apply wordsOfJesus if not highlighted
        childTextColor = themeColors.wordsOfJesus;
      }

      const overrideTextColorForChildren = isTextContainer
        ? childTextColor
        : themeColors.tagColor;
      const childOnWordPress = isTextContainer ? onWordPress : undefined;
      const childResults = ch.map((child: TreeNode) =>
        renderNode(
          child,
          overrideTextColorForChildren,
          childOnWordPress,
          isHighlighted
        )
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
              fontSize: baseFontSize,
              fontFamily,
              color: childTextColor, // Use the determined color
            }
          : {
              fontSize: baseFontSize * 0.9,
              color: themeColors.tagColor,
              fontFamily,
            };
        const bodyNode = (
          <Text
            key={`elem-${globalKey}`}
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
    const res = renderNode(node, undefined, onWordPress, isHighlighted);
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
  onWordPress?: (word: string) => void,
  isHighlighted?: boolean // Add this parameter
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
      onWordPress,
      isHighlighted // Pass it through
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
  bookmarked?: boolean;
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
  isHighlighted = false, // This tells us if the verse is highlighted
  bookmarked = false,
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
        onWordPress,
        isHighlighted // Pass the highlight state
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
      isHighlighted, // Add to dependencies
    ]
  );
  const { header, body } = rendered;
  const numberColor = isHighlighted
    ? themeColors.highlightIcon
    : themeColors.verseNumber;
  const numberStyle: TextStyle = useMemo(
    () => ({
      fontSize: fontSize * 0.9,
      fontWeight: "600" as const,
      color: numberColor,
      fontFamily,
    }),
    [fontSize, numberColor, fontFamily]
  );
  const headerStyle: TextStyle = useMemo(
    () => ({
      fontSize: fontSize,
      fontWeight: "bold" as const,
      color: textColor,
      marginBottom: 4,
      fontFamily,
    }),
    [fontSize, textColor, fontFamily]
  );

  const indicatorPart = (() => {
    if (prefix || showVerseNumbers) {
      return (
        <>
          <Text style={numberStyle}>{prefix || verse.verse}</Text>
          {bookmarked && (
            <Ionicons
              name="bookmark-sharp"
              size={fontSize}
              color={themeColors.primary}
            />
          )}{" "}
        </>
      );
    } else if (bookmarked) {
      return (
        <>
          <Ionicons
            name="bookmark-sharp"
            size={fontSize}
            color={themeColors.primary}
          />{" "}
        </>
      );
    }
    return null;
  })();

  const mainContent = (
    <Text
      style={{
        fontSize,
        lineHeight: fontSize * 1.4,
        flexShrink: 1,
        color: textColor,
        fontFamily,
      }}
      numberOfLines={0}
    >
      {indicatorPart}
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
