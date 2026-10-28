import { beforeEach, describe, expect, it } from "vitest";
import type { Meeting, Section } from "../catalog/terms.ts";
import {
  add,
  conflicts,
  conflictsOn,
  lowestSections,
  missingTypes,
  occurrences,
  openingWeek,
  schedules,
  withChoice,
} from "./schedule.ts";

const section = (
  number: string,
  type: string,
  group: string | null = null,
  meetings: Meeting[] = [],
): Section => ({
  crn: `crn-${number}`,
  number,
  type,
  group,
  delivery: "Face-to-face",
  campus: null,
  meetings,
});

// ASTR 101's labs: a weekly Monday morning, and one Monday night.
const lab = section("B01", "Lab", null, [
  {
    days: [1],
    time: { start: 570, end: 680 },
    startDate: "2027-01-06",
    endDate: "2027-04-07",
  },
  {
    days: [1],
    time: { start: 1230, end: 1350 },
    startDate: "2027-03-22",
    endDate: "2027-03-22",
  },
]);
const astr = { ASTR101: [lab] };
const entries = [{ code: "ASTR101", crns: ["crn-B01"] }];

describe("add", () => {
  beforeEach(() => {
    schedules.value = {};
  });

  it("adds a course once, to its own term, with its lowest sections", () => {
    const course = [section("A01", "Lecture"), section("B01", "Lab")];
    add("202701", "CSC110", course);
    add("202701", "CSC110", course);
    add("202609", "CSC423", [section("A01", "Lecture")]);
    expect(schedules.value).toEqual({
      "202701": [{ code: "CSC110", crns: ["crn-A01", "crn-B01"] }],
      "202609": [{ code: "CSC423", crns: ["crn-A01"] }],
    });
  });
});

describe("lowestSections", () => {
  it("takes the first section of each type when nothing is linked", () => {
    expect(
      lowestSections([
        section("A01", "Lecture"),
        section("A02", "Lecture"),
        section("B01", "Lab"),
        section("B02", "Lab"),
      ]).map((pick) => pick.number),
    ).toEqual(["A01", "B01"]);
  });

  it("keeps every pick in the lowest section's link group", () => {
    expect(
      lowestSections([
        section("A01", "Lecture", "2"),
        section("A02", "Lecture", "1"),
        section("T01", "Tutorial", "1"),
        section("T02", "Tutorial", "2"),
      ]).map((pick) => pick.number),
    ).toEqual(["A01", "T02"]);
  });
});

describe("occurrences", () => {
  it("includes a one-time meeting only on its date", () => {
    const times = (date: string) =>
      occurrences(entries, astr, date).map((o) => o.time.start);
    expect(times("2027-03-15")).toEqual([570]);
    expect(times("2027-03-22")).toEqual([570, 1230]);
    expect(times("2027-03-23")).toEqual([]);
  });

  it("ends with the meeting's dates", () => {
    expect(occurrences(entries, astr, "2027-01-04")).toEqual([]);
    expect(occurrences(entries, astr, "2027-04-12")).toEqual([]);
  });
});

describe("openingWeek", () => {
  it("opens on this week while classes run, else the week they start", () => {
    expect(openingWeek(entries, astr, "2027-02-10")).toBe("2027-02-08");
    expect(openingWeek(entries, astr, "2026-10-28")).toBe("2027-01-04");
    expect(openingWeek([], astr, "2027-02-10")).toBe(null);
  });
});

describe("conflictsOn", () => {
  const at = (number: string, start: number, end: number) => ({
    date: "2027-03-22",
    code: "CSC110",
    section: section(number, "Lecture"),
    time: { start, end },
  });

  it("pairs occurrences whose times overlap", () => {
    const a = at("A01", 600, 680);
    const b = at("A02", 650, 700);
    expect(conflictsOn([a, b, at("A03", 900, 950)])).toEqual([[a, b]]);
  });

  it("lets one class end as the next starts", () => {
    expect(conflictsOn([at("A01", 600, 620), at("A02", 620, 670)])).toEqual([]);
  });

  it("never pairs a section with itself", () => {
    const lecture = section("A01", "Lecture");
    const twice = [600, 610].map((start) => ({
      date: "2027-03-22",
      code: "CSC110",
      section: lecture,
      time: { start, end: start + 50 },
    }));
    expect(conflictsOn(twice)).toEqual([]);
  });
});

describe("conflicts", () => {
  it("finds a one-time meeting's conflict on its date alone", () => {
    const night = section("A01", "Lecture", null, [
      {
        days: [1],
        time: { start: 1200, end: 1280 },
        startDate: "2027-01-06",
        endDate: "2027-04-07",
      },
    ]);
    const found = conflicts(
      [...entries, { code: "PHYS999", crns: ["crn-A01"] }],
      { ...astr, PHYS999: [night] },
    );
    expect(found.map(([a, b]) => [a.date, a.code, b.code])).toEqual([
      ["2027-03-22", "PHYS999", "ASTR101"],
    ]);
  });
});

describe("withChoice", () => {
  // CSC 110's shape: lectures and labs in two link groups.
  const csc110 = [
    section("A01", "Lecture", "1"),
    section("A16", "Lecture", "2"),
    section("B01", "Lab", "1"),
    section("B02", "Lab", "1"),
    section("B24", "Lab", "2"),
  ];
  const sections = { CSC110: csc110 };
  const [a01, a16, , b02, b24] = csc110;
  const start = [{ code: "CSC110", crns: ["crn-A01", "crn-B01"] }];
  const crns = (entries: { crns: string[] }[]) => entries[0].crns.toSorted();

  it("replaces the pick of the chosen section's type", () => {
    expect(crns(withChoice(start, "CSC110", b02, sections))).toEqual([
      "crn-A01",
      "crn-B02",
    ]);
  });

  it("drops picks a new lecture doesn't go with, instead of replacing them", () => {
    const moved = withChoice(start, "CSC110", a16, sections);
    expect(crns(moved)).toEqual(["crn-A16"]);
    expect(crns(withChoice(moved, "CSC110", b24, sections))).toEqual([
      "crn-A16",
      "crn-B24",
    ]);
  });

  it("refuses a section that doesn't go with the lecture", () => {
    expect(withChoice(start, "CSC110", b24, sections)).toEqual(start);
    expect(crns(withChoice(start, "CSC110", a01, sections))).toEqual([
      "crn-A01",
      "crn-B01",
    ]);
  });
});

describe("missingTypes", () => {
  // MECH 580's shape: each lecture's group has different other types.
  const mech580 = [
    section("A01", "Lecture", "1"),
    section("A02", "Lecture", "2"),
    section("A03", "Lecture"),
    section("B01", "Lab", "1"),
    section("T01", "Tutorial", "2"),
  ];
  const [a01, a02, a03, b01] = mech580;

  it("asks only for the types the lecture's group has", () => {
    expect(missingTypes([a01], mech580)).toEqual(["Lab"]);
    expect(missingTypes([a01, b01], mech580)).toEqual([]);
    expect(missingTypes([a02], mech580)).toEqual(["Tutorial"]);
    expect(missingTypes([a03], mech580)).toEqual([]);
  });
});
