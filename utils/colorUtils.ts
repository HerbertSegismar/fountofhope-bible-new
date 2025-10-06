// utils/colorUtils.ts
export const lightenColor = (
  color: string,
  amount = 0.15
): string | undefined => {
  if (!color) return undefined;
  if (color.startsWith("#") && (color.length === 7 || color.length === 4)) {
    let r, g, b;
    if (color.length === 7) {
      r = parseInt(color.slice(1, 3), 16);
      g = parseInt(color.slice(3, 5), 16);
      b = parseInt(color.slice(5, 7), 16);
    } else {
      r = parseInt(color[1] + color[1], 16);
      g = parseInt(color[2] + color[2], 16);
      b = parseInt(color[3] + color[3], 16);
    }
    return `rgba(${r}, ${g}, ${b}, ${amount})`;
  }
  return color;
};
