import { describe, expect, it } from "vitest";
import type { Section } from "../catalog/terms.ts";
import {
  byType,
  formatDays,
  formatMeeting,
  formatTime,
  termName,
} from "./sections.ts";

const section = (
  number: string,
  type: string,
  days: number[],
  time: { start: number; end: number } | null,
): Section => ({
  crn: number,
  number,
  type,
  group: null,
  delivery: "Face-to-face",
  campus: null,
  meetings: [{ days, time, startDate: "2027-01-06", endDate: "2027-04-07" }],
});

describe("byType", () => {
  it("counts each type's sections and keeps their distinct slots in order", () => {
    const tuesday = { start: 570, end: 620 };
    const monday = { start: 600, end: 680 };
    expect(
      byType([
        section("A01", "Lecture", [2, 3, 5], tuesday),
        section("A02", "Lecture", [2, 3, 5], tuesday),
        section("A03", "Lecture", [1, 4], monday),
        section("B01", "Lab", [3], null),
      ]),
    ).toEqual([
      {
        type: "Lecture",
        count: 3,
        slots: [
          { days: [1, 4], time: monday },
          { days: [2, 3, 5], time: tuesday },
        ],
      },
      { type: "Lab", count: 1, slots: [{ days: [3], time: null }] },
    ]);
  });
});

describe("formatTime", () => {
  it("names the half of the day once when both ends share it", () => {
    expect(formatTime({ start: 570, end: 620 })).toBe("9:30 – 10:20 AM");
    expect(formatTime({ start: 870, end: 920 })).toBe("2:30 – 3:20 PM");
  });

  it("names both halves across noon, and 12 PM as noon", () => {
    expect(formatTime({ start: 690, end: 740 })).toBe("11:30 AM – 12:20 PM");
    expect(formatTime({ start: 720, end: 770 })).toBe("12:00 – 12:50 PM");
  });

  it("says TBA without a time", () => {
    expect(formatTime(null)).toBe("TBA");
  });
});

describe("formatMeeting", () => {
  it("names the date of a meeting that happens once", () => {
    const meeting = {
      days: [1],
      time: { start: 1230, end: 1370 },
      startDate: "2027-03-22",
      endDate: "2027-04-07",
    };
    expect(formatMeeting(meeting)).toBe("M 8:30 – 10:50 PM");
    expect(formatMeeting({ ...meeting, endDate: "2027-03-22" })).toBe(
      "Mon, Mar 22 8:30 – 10:50 PM",
    );
  });
});

describe("formatDays and termName", () => {
  it("writes days and terms as UVic does", () => {
    expect(formatDays([1, 2, 3, 4, 5])).toBe("M T W R F");
    expect(termName("202609")).toBe("Fall 2026");
    expect(termName("202701")).toBe("Spring 2027");
  });
});
