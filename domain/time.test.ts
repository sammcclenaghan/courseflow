import { describe, expect, it } from "vitest";
import { datesBetween, weekday } from "./time.ts";

describe("weekday", () => {
  it("counts from Sunday", () => {
    expect(weekday("2026-09-13")).toBe(0); // Sunday
    expect(weekday("2026-09-09")).toBe(3); // Wednesday
  });
});

describe("datesBetween", () => {
  it("includes both ends", () => {
    expect(datesBetween("2026-09-30", "2026-10-02")).toEqual([
      "2026-09-30",
      "2026-10-01",
      "2026-10-02",
    ]);
  });

  it("gives each date once across a daylight saving change", () => {
    // Pacific time falls back on November 1, 2026.
    expect(datesBetween("2026-10-31", "2026-11-02")).toEqual([
      "2026-10-31",
      "2026-11-01",
      "2026-11-02",
    ]);
  });

  it("is a single date when both ends match, and empty when reversed", () => {
    expect(datesBetween("2026-10-07", "2026-10-07")).toEqual(["2026-10-07"]);
    expect(datesBetween("2026-10-08", "2026-10-07")).toEqual([]);
  });
});
