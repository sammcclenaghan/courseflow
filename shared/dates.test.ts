import { describe, expect, it } from "vitest";
import { dayNumber, mondayOf, weekday } from "./dates";

describe("dates", () => {
  it("numbers days from 1970-01-01", () => {
    expect(dayNumber("1970-01-01")).toBe(0);
    expect(dayNumber("2026-09-09")).toBe(20705);
  });

  it("gives weekdays like Date.getDay()", () => {
    expect(weekday(dayNumber("1970-01-01"))).toBe(4); // Thursday
    expect(weekday(dayNumber("2026-09-09"))).toBe(3); // Wednesday
    expect(weekday(dayNumber("2026-09-13"))).toBe(0); // Sunday
  });

  it("finds the Monday on or before a day", () => {
    const monday = dayNumber("2026-09-07");
    expect(mondayOf(monday)).toBe(monday);
    expect(mondayOf(dayNumber("2026-09-09"))).toBe(monday);
    expect(mondayOf(dayNumber("2026-09-13"))).toBe(monday); // Sunday ends the week
  });
});
