import { describe, expect, it } from "vitest";
import { sideBySide } from "./layout.ts";

const at = (start: number, end: number) => ({ start, end });
const columns = (classes: { start: number; end: number }[]) =>
  sideBySide(classes).map(({ column, columns }) => `${column}/${columns}`);

describe("sideBySide", () => {
  it("gives classes that don't overlap the full width", () => {
    // Back-to-back classes don't overlap.
    expect(columns([at(600, 680), at(680, 740)])).toEqual(["0/1", "0/1"]);
  });

  it("puts overlapping classes side by side", () => {
    expect(columns([at(540, 620), at(570, 650)])).toEqual(["0/2", "1/2"]);
  });

  it("reuses a column once its class has ended", () => {
    // The third starts after the first ends but during the second.
    expect(columns([at(540, 600), at(570, 700), at(610, 660)])).toEqual([
      "0/2",
      "1/2",
      "0/2",
    ]);
  });

  it("starts a new group once every class has ended", () => {
    expect(columns([at(540, 600), at(570, 620), at(700, 760)])).toEqual([
      "0/2",
      "1/2",
      "0/1",
    ]);
  });
});
