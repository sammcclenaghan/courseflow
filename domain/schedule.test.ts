import { describe, expect, it } from "vitest";
import {
  addCourse,
  conflictingCourses,
  hasCourse,
  removeCourse,
  type Schedule,
  sectionSets,
  sectionsIn,
} from "./schedule.ts";
import type { Section } from "./section.ts";
import { course, meeting, section, term } from "./testing.ts";

const numbers = (sets: Section[][]) =>
  sets.map((set) => set.map((s) => s.number).join("+"));

describe("sectionSets", () => {
  it("pairs each lecture with every lab in its link group", () => {
    // CSC110: A16 and its labs are group 2; the rest are group 1.
    const csc110 = course("CSC110", [
      section("A01", [], { linkId: "A1" }),
      section("A16", [], { linkId: "A2" }),
      section("B01", [], { linkId: "B1" }),
      section("B02", [], { linkId: "B1" }),
      section("B24", [], { linkId: "B2" }),
    ]);
    expect(numbers(sectionSets(csc110))).toEqual([
      "A01+B01",
      "A01+B02",
      "A16+B24",
    ]);
  });

  it("takes one of each linked type, and leaves out types not in the group", () => {
    // MECH580 (Fall 2026): A01 has a lab but no tutorial; A03 is unlinked.
    const mech580 = course("MECH580", [
      section("A01", [], { linkId: "A1" }),
      section("A02", [], { linkId: "A2" }),
      section("A03"),
      section("B01", [], { linkId: "B1" }),
      section("T01", [], { linkId: "T2" }),
    ]);
    expect(numbers(sectionSets(mech580))).toEqual([
      "A01+B01",
      "A02+T01",
      "A03",
    ]);
  });

  it("treats sections without link IDs as one group", () => {
    // MUS345: every lecture needs one of the two labs.
    const mus345 = course("MUS345", [
      section("A01"),
      section("A02"),
      section("B01"),
      section("B02"),
    ]);
    expect(numbers(sectionSets(mus345))).toEqual([
      "A01+B01",
      "A01+B02",
      "A02+B01",
      "A02+B02",
    ]);
  });

  it("makes each section its own set when a course has one type", () => {
    const math = course("MATH100", [section("A01"), section("A02")]);
    expect(numbers(sectionSets(math))).toEqual(["A01", "A02"]);
  });
});

describe("addCourse", () => {
  const math100 = course("MATH100", [
    section("A01", [meeting("MR", "10:00-11:20")]),
  ]);
  const csc110 = course("CSC110", [
    section("A01", [meeting("TF", "13:00-14:20")], { linkId: "A1" }),
    section("B01", [meeting("M", "10:30-12:20")], { linkId: "B1" }),
    section("B02", [meeting("W", "10:30-12:20")], { linkId: "B1" }),
  ]);
  const catalog = term([math100, csc110]);
  const empty: Schedule = { term: "202609", crns: [] };
  const numbersIn = (schedule: Schedule | null) =>
    schedule &&
    sectionsIn(catalog, schedule).map(
      ({ course, section }) => `${course.code} ${section.number}`,
    );

  it("adds the lowest-numbered legal set", () => {
    expect(numbersIn(addCourse(catalog, empty, csc110))).toEqual([
      "CSC110 A01",
      "CSC110 B01",
    ]);
  });

  it("skips sections that conflict with the schedule", () => {
    const withMath = addCourse(catalog, empty, math100) as Schedule;
    // B01 overlaps MATH100 on Mondays, so CSC110 gets B02.
    expect(numbersIn(addCourse(catalog, withMath, csc110))).toEqual([
      "MATH100 A01",
      "CSC110 A01",
      "CSC110 B02",
    ]);
  });

  it("skips a set whose own sections conflict", () => {
    const clashing = course("PHYS110", [
      section("A01", [meeting("M", "09:00-10:00")]),
      section("B01", [meeting("M", "09:30-10:30")]),
      section("B02", [meeting("T", "09:30-10:30")]),
    ]);
    const add = addCourse(term([clashing]), empty, clashing) as Schedule;
    expect(
      sectionsIn(term([clashing]), add).map((p) => p.section.number),
    ).toEqual(["A01", "B02"]);
  });

  it("is null when no legal set fits", () => {
    const busy: Schedule = {
      term: "202609",
      crns: [math100.sections[0].crn],
    };
    const mondayOnly = course("CSC115", [
      section("A01", [meeting("M", "10:30-11:20")]),
    ]);
    expect(addCourse(term([math100, mondayOnly]), busy, mondayOnly)).toBeNull();
  });

  it("leaves a course that's already added alone", () => {
    const once = addCourse(catalog, empty, csc110) as Schedule;
    expect(addCourse(catalog, once, csc110)).toBe(once);
    expect(hasCourse(once, csc110)).toBe(true);
    expect(hasCourse(once, math100)).toBe(false);
  });
});

describe("removeCourse", () => {
  it("removes only that course's sections, keeping the rest in order", () => {
    const a = course("A100", [section("A01"), section("A02")]);
    const b = course("B100", [section("A01")]);
    const schedule: Schedule = {
      term: "202609",
      crns: [a.sections[0].crn, b.sections[0].crn],
    };
    expect(removeCourse(schedule, a).crns).toEqual([b.sections[0].crn]);
  });
});

describe("conflictingCourses", () => {
  const monday = course("MATH100", [
    section("A01", [meeting("M", "10:00-11:00")]),
  ]);
  const tuesday = course("MATH101", [
    section("A01", [meeting("T", "10:00-11:00")]),
  ]);
  const both = course("CSC110", [
    section("A01", [meeting("M", "10:30-11:30")]),
    section("A02", [meeting("T", "10:30-11:30")]),
  ]);
  const catalog = term([monday, tuesday, both]);

  it("names the course whose removal would make room", () => {
    const schedule: Schedule = {
      term: "202609",
      crns: [monday.sections[0].crn],
    };
    // Only one of CSC110's sections is blocked, so it still fits.
    expect(addCourse(catalog, schedule, both)).not.toBeNull();
    const full: Schedule = {
      term: "202609",
      crns: [monday.sections[0].crn, tuesday.sections[0].crn],
    };
    expect(addCourse(catalog, full, both)).toBeNull();
    // Removing either MATH course frees one of CSC110's sections.
    expect(conflictingCourses(catalog, full, both).map((c) => c.code)).toEqual([
      "MATH100",
      "MATH101",
    ]);
  });

  it("is empty when it would take removing more than one course", () => {
    const onlyMonday = course("CSC115", [
      section("A01", [
        meeting("M", "10:30-11:30"),
        meeting("T", "10:30-11:30"),
      ]),
    ]);
    const full: Schedule = {
      term: "202609",
      crns: [monday.sections[0].crn, tuesday.sections[0].crn],
    };
    expect(
      conflictingCourses(term([monday, tuesday, onlyMonday]), full, onlyMonday),
    ).toEqual([]);
  });
});
