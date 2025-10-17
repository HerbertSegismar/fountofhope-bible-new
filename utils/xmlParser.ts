// file: src/utils/xmlParser.ts
import { TextStyle } from "react-native";
import { ThemeColors } from "./themeUtils";

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

// Build a tree structure from parsed nodes to handle nesting
export const buildTree = (nodes: ParsedNode[]): TreeNode[] => {
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

export const parseXmlTags = (text: string): ParsedNode[] => {
  if (!text) return [];

  const nodes: ParsedNode[] = [];
  let currentText = "";
  let i = 0;

  while (i < text.length) {
    if (text[i] === "<") {
      // Push any accumulated text before the tag
      if (currentText) {
        nodes.push({ type: "text", content: currentText });
        currentText = "";
      }

      // Find the end of the tag
      const tagEnd = text.indexOf(">", i);
      if (tagEnd === -1) {
        currentText += text.substring(i);
        break;
      }

      const fullTag = text.substring(i, tagEnd + 1);

      if (fullTag.startsWith("</")) {
        // Closing tag
        nodes.push({ type: "closing-tag", tag: fullTag });
      } else if (fullTag.endsWith("/>")) {
        // Self-closing tag
        const tagName = fullTag.slice(1, -2).trim();
        nodes.push({ type: "self-closing-tag", tag: tagName, fullTag });
      } else {
        // Opening tag
        const tagName = fullTag.slice(1, -1).trim().split(" ")[0];
        nodes.push({ type: "opening-tag", tag: tagName, fullTag });
      }

      i = tagEnd + 1;
    } else {
      currentText += text[i];
      i++;
    }
  }

  // Push any remaining text
  if (currentText) {
    nodes.push({ type: "text", content: currentText });
  }

  return nodes;
};

// Render the tree to React elements
export const renderTree = (
  tree: TreeNode[],
  baseFontSize: number,
  themeColors: ThemeColors,
  highlight?: string,
  fontFamily?: string,
  onTagPress?: (content: string) => void,
  textColor?: string
): React.ReactNode[] => {
  const elements: React.ReactNode[] = [];
  let key = 0;

  const renderNode = (
    node: TreeNode,
    overrideTextColor?: string
  ): React.ReactNode => {
    key++;

    if (node.type === "text") {
      return renderTextWithHighlight(
        node.content || "",
        themeColors,
        highlight,
        `text-${key}`,
        fontFamily,
        overrideTextColor || textColor
      );
    } else if (node.type === "self-closing-tag") {
      const content = extractContentFromTag(node.fullTag || "");
      const isNumber = /^\d+$/.test(content.trim());
      const tagContent = content.trim();
      return (
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
        </Text>
      );
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

      if (isTextContainer) {
        // For text containers like <t>, do not colorize plain text, render children with outer textColor
        const children = ch.map((child: TreeNode) =>
          renderNode(child, textColor)
        );
        return (
          <Text
            key={`elem-${key}`}
            style={{
              fontSize: baseFontSize * 0.95,
              fontFamily,
            }}
          >
            {children}
          </Text>
        );
      } else {
        // For marker elements, colorize and make clickable
        const children = ch.map((child: TreeNode) =>
          renderNode(child, themeColors.tagColor)
        );
        return (
          <Text
            key={`elem-${key}`}
            onPress={() => onTagPress?.(tagContent)}
            style={{
              fontSize: isNumber ? baseFontSize * 0.5 : baseFontSize * 0.95,
              color: themeColors.tagColor,
              fontFamily,
            }}
          >
            {children}
          </Text>
        );
      }
    }

    return null;
  };

  for (const node of tree) {
    elements.push(renderNode(node));
  }

  return elements;
};

// Extract content from between tags
export const extractContentFromTag = (tag: string): string => {
  const match = tag.match(/<[^>]+>([^<]*)<\/[^>]+>/);
  return match ? match[1] : "";
};

// Render text with highlighting
export const renderTextWithHighlight = (
  text: string,
  themeColors: ThemeColors,
  highlight?: string,
  keyPrefix?: string,
  fontFamily?: string,
  textColor?: string
): React.ReactNode => {
  const innerStyle = { fontFamily, color: textColor };

  if (!highlight || !text)
    return (
      <Text key={keyPrefix} style={innerStyle}>
        {text}
      </Text>
    );

  const cleanText = text.replace(/<[^>]+>/g, "");
  if (!cleanText)
    return (
      <Text key={keyPrefix} style={innerStyle}>
        {text}
      </Text>
    );

  const regex = new RegExp(`(${escapeRegex(highlight)})`, "gi");
  const parts = cleanText.split(regex);

  return (
    <Text key={keyPrefix} style={innerStyle}>
      {parts.map((part, i) =>
        part.toLowerCase() === highlight.toLowerCase() ? (
          <Text
            key={`${keyPrefix}-${i}`}
            style={{
              ...innerStyle,
              backgroundColor: themeColors.searchHighlightBg,
            }}
          >
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
};

// Helper to escape regex special characters
export const escapeRegex = (string: string) => {
  return string.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
};

// Improved verse text rendering
export const renderVerseTextWithXmlHighlight = (
  text: string,
  baseFontSize: number,
  themeColors: ThemeColors,
  highlight?: string,
  fontFamily?: string,
  onTagPress?: (content: string) => void,
  textColor?: string
): React.ReactNode[] => {
  if (!text) return [];

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
      textColor
    );
  } catch (error) {
    console.error("Error parsing XML tags:", error);
    return [
      renderTextWithHighlight(
        text,
        themeColors,
        highlight,
        "fallback",
        fontFamily,
        textColor
      ),
    ];
  }
};