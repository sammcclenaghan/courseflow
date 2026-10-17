import { describe, expect, it } from "vitest";
import { COLORS, nextColor, type Color } from "./colours";

describe("nextColour", () => {
  it("hands out every colour once before repeating", () => {
    const used: Color[] = [];
    for (let i = 0; i < COLORS.length; i++) used.push(nextColor(used));
    expect(used).toEqual([...COLORS]);
    expect(nextColor(used)).toBe("blue");
  });

  it("refills the gap a removed course leaves", () => {
    // Orange's course was removed; the others keep their colours.
    expect(nextColor(["blue", "green", "purple"])).toBe("orange");
  });

  it("picks the least used colour once every colour is taken", () => {
    const used = [...COLORS, "blue", "orange", "green"] as const;
    expect(nextColor(used)).toBe("purple");
  });
});
