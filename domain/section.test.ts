import { describe, expect, it } from "vitest";
import {
  conflicts,
  linkGroup,
  type Meeting,
  meetingsOverlap,
  meetsOn,
} from "./section.ts";
import { meeting, section } from "./testing.ts";
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

describe("meetingsOverlap", () => {
  it("is true for overlapping times on a shared day, either way round", () => {
    const a = meeting("MR", "10:00-11:20");
    const b = meeting("R", "11:00-12:20");
    expect(meetingsOverlap(a, b)).toBe(true);
    expect(meetingsOverlap(b, a)).toBe(true);
  });

  it("is false for back-to-back classes", () => {
    expect(
      meetingsOverlap(meeting("M", "10:00-10:20"), meeting("M", "10:20-11:20")),
    ).toBe(false);
  });

  it("is false for the same time on different days", () => {
    expect(
      meetingsOverlap(
        meeting("MR", "10:00-11:20"),
        meeting("TW", "10:00-11:20"),
      ),
    ).toBe(false);
  });

  it("is false for partial-term meetings whose dates never meet", () => {
    const first = meeting("M", "10:00-11:20", "2026-09-09", "2026-10-23");
    const second = meeting("M", "10:00-11:20", "2026-10-26", "2026-12-07");
    expect(meetingsOverlap(first, second)).toBe(false);
  });

  it("is false when the dates overlap but never on a shared weekday", () => {
    // Mondays until Fri Sep 18, against Mon/Wed from Wed Sep 16: the only
    // dates both run, Sep 16–18, hold no Monday.
    const a = meeting("M", "10:00-11:20", "2026-09-09", "2026-09-18");
    const b = meeting("MW", "10:00-11:20", "2026-09-16", "2026-12-07");
    expect(meetingsOverlap(a, b)).toBe(false);
  });

  it("is true for a one-day meeting, only on its own weekday", () => {
    // BME320 B01's first lab: Wednesday, October 7.
    const once = meeting("W", "18:00-19:20", "2026-10-07", "2026-10-07");
    expect(meetingsOverlap(once, meeting("MW", "18:30-19:50"))).toBe(true);
    expect(meetingsOverlap(once, meeting("TR", "18:30-19:50"))).toBe(false);
  });

  it("includes weekends", () => {
    // ER312B A01's field trip runs Wednesday to Sunday.
    const trip = meeting("UWRFS", "08:30-16:20", "2026-09-23", "2026-09-27");
    expect(meetingsOverlap(trip, meeting("U", "13:00-14:00"))).toBe(true);
  });

  it("is never true for a TBA meeting", () => {
    expect(
      meetingsOverlap(meeting("M", null), meeting("M", "10:00-11:00")),
    ).toBe(false);
  });
});

describe("conflicts", () => {
  it("checks every meeting of each section", () => {
    // ANTH398 A01: Tuesdays, plus a shorter Friday meeting.
    const anth = section("A01", [
      meeting("T", "14:30-16:20"),
      meeting("F", "14:30-15:20"),
    ]);
    expect(conflicts(anth, section("A01", [meeting("F", "15:00-16:00")]))).toBe(
      true,
    );
    expect(conflicts(anth, section("A01", [meeting("W", "15:00-16:00")]))).toBe(
      false,
    );
  });

  it("never conflicts a section with itself", () => {
    // ASTR101 B08: its observing night overlaps its own weekly lab.
    const astr = section("B08", [
      meeting("T", "18:30-21:20"),
      meeting("T", "20:30-23:20", "2026-09-22", "2026-09-22"),
    ]);
    expect(conflicts(astr, astr)).toBe(false);
  });
});

describe("linkGroup", () => {
  it("is the link ID's number", () => {
    expect(linkGroup(section("A16", [], { linkId: "A2" }))).toBe("2");
  });

  it("is null for a section without a link ID", () => {
    expect(linkGroup(section("A16"))).toBeNull();
  });
});

const datesOf = (meeting: Meeting, from: string, to: string) =>
  datesBetween(from, to).filter((date) => meetsOn(meeting, date));
