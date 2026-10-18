import { describe, expect, it } from "vitest";
import { dayNumber, forEachDate, mondayOf, weekday } from "./dates";

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

const datesIn = (first: string, last: string, weekdays: number[]) => {
  const dates: number[] = [];
  forEachDate(dayNumber(first), dayNumber(last), weekdays, (day) => {
    dates.push(day);
  });
  return dates.sort((a, b) => a - b);
};

describe("forEachDate", () => {
  it("includes matching start and end dates", () => {
    expect(datesIn("2026-09-09", "2026-09-16", [3])).toEqual(
      ["2026-09-09", "2026-09-16"].map(dayNumber),
    );
  });

  it("starts at the next matching weekday and visits multiple weekdays", () => {
    expect(datesIn("2026-09-09", "2026-09-21", [1, 4])).toEqual(
      ["2026-09-10", "2026-09-14", "2026-09-17", "2026-09-21"].map(dayNumber),
    );
  });

  it("includes weekends and crosses a year boundary", () => {
    expect(datesIn("2026-12-31", "2027-01-04", [6, 0])).toEqual(
      ["2027-01-02", "2027-01-03"].map(dayNumber),
    );
  });

  it("visits a matching one-day range once", () => {
    expect(datesIn("2026-09-09", "2026-09-09", [3])).toEqual([
      dayNumber("2026-09-09"),
    ]);
  });

  it("visits nothing for nonmatching, reversed, or weekday-free ranges", () => {
    expect(datesIn("2026-09-09", "2026-09-10", [1])).toEqual([]);
    expect(datesIn("2026-09-10", "2026-09-09", [3, 4])).toEqual([]);
    expect(datesIn("2026-09-09", "2026-09-16", [])).toEqual([]);
  });
});
