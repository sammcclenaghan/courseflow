export const COLORS = [
  "blue",
  "orange",
  "green",
  "purple",
  "lime",
  "cyan",
] as const;

export type Color = (typeof COLORS)[number];

export function nextColor(used: readonly Color[]): Color {
  const uses = (color: Color) => used.filter((c) => c === color).length;
  return COLORS.toSorted((a, b) => uses(a) - uses(b))[0];
}
