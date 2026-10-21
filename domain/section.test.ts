import { describe, expect, it } from "vitest";
import { linkGroup, type Meeting, meetsOn, type Section } from "./section.ts";
import { datesBetween } from "./time.ts";

const FULL_TERM = { startDate: "2026-09-09", endDate: "2026-12-07" };

describe("meetsOn", () => {
  // ADMN504 A01: Thursdays, though its dates start on a Wednesday.
  const thursdays: Meeting = {
    days: [4],
    time: { start: 780, end: 950 },
    ...FULL_TERM,
  };

  it("is true on the meeting's weekdays within its dates", () => {
    expect(meetsOn(thursdays, "2026-09-10")).toBe(true);
    expect(meetsOn(thursdays, "2026-12-03")).toBe(true);
  });

  it("is false on other weekdays, including the first date", () => {
    expect(meetsOn(thursdays, "2026-09-09")).toBe(false);
    expect(meetsOn(thursdays, "2026-09-11")).toBe(false);
  });

  it("is false outside the dates", () => {
    expect(meetsOn(thursdays, "2026-09-03")).toBe(false);
    expect(meetsOn(thursdays, "2026-12-10")).toBe(false);
  });

  it("is true only on the day of a one-day meeting", () => {
    // BME320 B01's first lab.
    const once: Meeting = {
      days: [3],
      time: { start: 1080, end: 1160 },
      startDate: "2026-10-07",
      endDate: "2026-10-07",
    };
    expect(meetsOn(once, "2026-10-07")).toBe(true);
    expect(meetsOn(once, "2026-10-14")).toBe(false);
  });

  it("includes weekends", () => {
    // ER312B A01's field trip, Wednesday to Sunday.
    const trip: Meeting = {
      days: [0, 3, 4, 5, 6],
      time: { start: 510, end: 980 },
      startDate: "2026-09-23",
      endDate: "2026-09-27",
    };
    expect(datesOf(trip, "2026-09-21", "2026-09-28")).toEqual([
      "2026-09-23",
      "2026-09-24",
      "2026-09-25",
      "2026-09-26",
      "2026-09-27",
    ]);
  });

  it("is never true for a TBA meeting", () => {
    expect(meetsOn({ ...thursdays, time: null }, "2026-09-10")).toBe(false);
  });
});

describe("linkGroup", () => {
  const section = (linkId: string | null): Section => ({
    crn: "10000",
    number: "A16",
    type: "Lecture",
    linkId,
    seats: { enrolled: 0, capacity: 0 },
    waitlist: { enrolled: 0, capacity: 0 },
    note: null,
    meetings: [],
  });

  it("is the link ID's number", () => {
    expect(linkGroup(section("A2"))).toBe("2");
  });

  it("is null for a section without a link ID", () => {
    expect(linkGroup(section(null))).toBeNull();
  });
});

const datesOf = (meeting: Meeting, from: string, to: string) =>
  datesBetween(from, to).filter((date) => meetsOn(meeting, date));
