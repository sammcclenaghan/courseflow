import { describe, expect, it } from "vitest";
import {
  addDays,
  datesBetween,
  formatDay,
  formatHour,
  formatTimeRange,
  formatWeek,
  mondayOf,
  weekday,
} from "./time.ts";

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

describe("addDays and mondayOf", () => {
  it("crosses months and years", () => {
    expect(addDays("2027-01-29", 3)).toBe("2027-02-01");
    expect(addDays("2027-01-01", -1)).toBe("2026-12-31");
  });

  it("finds the Monday on or before a date", () => {
    expect(mondayOf("2027-01-06")).toBe("2027-01-04"); // Wednesday
    expect(mondayOf("2027-01-11")).toBe("2027-01-11"); // Monday
    expect(mondayOf("2027-01-10")).toBe("2027-01-04"); // Sunday
  });
});

describe("formatting", () => {
  it("formats a day and a week", () => {
    expect(formatDay("2027-01-11")).toBe("Mon 11");
    expect(formatWeek("2027-01-11")).toBe("January 11 – 15, 2027");
    expect(formatWeek("2027-03-29")).toBe("March 29 – April 2, 2027");
  });

  it("formats times, with AM/PM once unless the range crosses noon", () => {
    expect(formatTimeRange(570, 620)).toBe("9:30–10:20 AM");
    expect(formatTimeRange(690, 740)).toBe("11:30 AM–12:20 PM");
    expect(formatTimeRange(780, 830)).toBe("1:00–1:50 PM");
    expect(formatTimeRange(1230, 1400)).toBe("8:30–11:20 PM");
  });

  it("formats hour lines", () => {
    expect(formatHour(480)).toBe("8 AM");
    expect(formatHour(720)).toBe("12 PM");
    expect(formatHour(780)).toBe("1 PM");
  });
});
