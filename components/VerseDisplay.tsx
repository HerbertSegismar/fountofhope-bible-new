import React, { useMemo } from "react";
import { View, Text, TextStyle } from "react-native";
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

let globalKey = 0;

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
  const renderNode = (
    node: TreeNode,
    overrideTextColor?: string,
    nodeOnWordPress?: (word: string) => void
  ): RenderResult => {
    globalKey++;
    if (node.type === "text") {
      return {
        header: [],
        body: [
          renderTextWithHighlight(
            node.content || "",
            themeColors,
            highlight,
            `text-${globalKey}`,
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
            key={`self-${globalKey}`}
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
