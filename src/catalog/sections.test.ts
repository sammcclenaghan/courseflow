import { describe, expect, it } from "vitest";
import type { Section, TermCourse } from "./model";
import { checkLinks, defaultSectionSet } from "./sections";
import { meeting, testSection } from "./testing";

const TYPES: Record<string, string> = { A: "Lecture", B: "Lab", T: "Tutorial" };

// "A01", or "A01=A1" for a section linked to group 1, optionally with a time:
// section("B01=B1", "Tue", "08:30-10:20").
const section = (spec: string, days?: string, time?: string): Section => {
  const [code, linkId = null] = spec.split("=");
  return testSection(`crn-${code}`, {
    number: code,
    type: TYPES[code[0]],
    linkId,
    meetings: days && time ? [meeting(days, time)] : [],
  });
};

const course = (...sections: Section[]): TermCourse => ({
  code: "CSC110",
  title: "Fundamentals of Programming I",
  sections,
});

const codes = (sections: Section[]) => sections.map((s) => s.number);
const picked = (specs: string) =>
  codes(
    defaultSectionSet(course(...specs.split(" ").map((spec) => section(spec)))),
  );

describe("defaultSectionSet", () => {
  it("picks the one section of a lecture-only course", () => {
    expect(picked("A01")).toEqual(["A01"]);
  });

  it("picks the lowest of each type when nothing is linked", () => {
    expect(picked("B02 A02 T01 B01 A01")).toEqual(["A01", "B01", "T01"]);
  });

  it("compares section numbers past 9 correctly", () => {
    expect(picked("A10 A09")).toEqual(["A09"]);
  });

  // CSC110 in 202609: A16-A18 go with B24-B27, everything else with group 1.
  it("keeps CSC110's lecture and lab in the same link group", () => {
    expect(picked("A01=A1 A16=A2 B01=B1 B24=B2")).toEqual(["A01", "B01"]);
  });

  it("skips a lower-numbered section from another link group", () => {
    expect(picked("A01=A1 B01=B2 B02=B1 A02=A2")).toEqual(["A01", "B02"]);
  });

  // MECH580 in 202609, exactly as Banner lists it.
  it("leaves out types the lecture's link group doesn't have", () => {
    const mech580 =
      "A01=A1 A02=A2 A03 A04=A3 A05 A06 A07=A4 B01=B1 B03=B3 T01=T2 T02=T4 T03=T3";
    expect(picked(mech580)).toEqual(["A01", "B01"]);
  });

  // ART401: a linked lab and tutorial, no lecture.
  it("starts from the lowest section even when it isn't a lecture", () => {
    expect(picked("T01=T1 B01=B1")).toEqual(["B01", "T01"]);
  });
});

// Real 202609 timetables where the lowest lab or tutorial overlaps the lecture.
describe("defaultSectionSet around conflicts", () => {
  it("skips a lab that overlaps its own lecture (CSC110)", () => {
    const csc110 = course(
      section("A01=A1", "Tue Wed Fri", "09:30-10:20"),
      section("B01=B1", "Tue", "08:30-10:20"),
      section("B02=B1", "Tue", "10:30-12:20"),
    );
    expect(codes(defaultSectionSet(csc110))).toEqual(["A01", "B02"]);
  });

  it("skips a tutorial that overlaps its own lecture (MATH100)", () => {
    const math100 = course(
      section("A01=A1", "Mon Thu", "11:30-12:50"),
      section("T01=T1", "Mon", "12:30-13:20"),
      section("T02=T1", "Mon", "08:30-09:20"),
    );
    expect(codes(defaultSectionSet(math100))).toEqual(["A01", "T02"]);
  });

  it("backtracks when the first lab leaves no tutorial that fits", () => {
    const c = course(
      section("A01", "Wed", "09:30-10:20"),
      section("B01", "Mon", "10:30-12:20"),
      section("B02", "Tue", "10:30-12:20"),
      section("T01", "Mon", "11:30-12:20"),
    );
    expect(codes(defaultSectionSet(c))).toEqual(["A01", "B02", "T01"]);
  });

  it("moves to the next lecture when nothing fits the lowest one", () => {
    const c = course(
      section("A01", "Tue", "10:30-11:20"),
      section("A02", "Wed", "10:30-11:20"),
      section("B01", "Tue", "10:30-12:20"),
    );
    expect(codes(defaultSectionSet(c))).toEqual(["A02", "B01"]);
  });

  it("falls back to the lowest sections when nothing can avoid a conflict", () => {
    const c = course(
      section("A01", "Tue", "10:30-11:20"),
      section("B01", "Tue", "10:30-12:20"),
      section("B02", "Tue", "11:00-12:00"),
    );
    expect(codes(defaultSectionSet(c))).toEqual(["A01", "B01"]);
  });

  const csc110 = course(
    section("A01=A1", "Tue Wed Fri", "09:30-10:20"),
    section("A02=A1", "Mon Thu", "13:00-14:20"),
    section("B01=B1", "Tue", "08:30-10:20"),
    section("B02=B1", "Tue", "10:30-12:20"),
    section("B03=B1", "Tue", "12:30-14:20"),
  );

  it("prefers sections that fit around the rest of the schedule", () => {
    const math = testSection("20001", {
      meetings: [meeting("Tue", "11:00-11:50")],
    });
    expect(codes(defaultSectionSet(csc110, [math]))).toEqual(["A01", "B03"]);
    const early = testSection("20002", {
      meetings: [meeting("Wed", "09:30-10:20")],
    });
    // A01 conflicts, so A02 (Mon/Thu) leads, and B01 no longer overlaps it.
    expect(codes(defaultSectionSet(csc110, [early]))).toEqual(["A02", "B01"]);
  });

  it("still adds the course when nothing fits around the schedule", () => {
    const busy = testSection("20003", {
      meetings: [meeting("Mon Tue Wed Thu Fri", "08:00-15:00")],
    });
    expect(codes(defaultSectionSet(csc110, [busy]))).toEqual(["A01", "B02"]);
  });
});

describe("checkLinks", () => {
  const linked = (specs: string) =>
    course(...specs.split(" ").map((spec) => section(spec)));

  it("accepts courses that follow the convention", () => {
    expect(() =>
      checkLinks(linked("A01=A1 A16=A2 B01=B1 B24=B2 A03")),
    ).not.toThrow();
  });

  it("rejects a link ID whose letter isn't the section's", () => {
    expect(() => checkLinks(linked("A01=B1 B01=B1"))).toThrow("A01");
  });

  it("rejects a link group with only one type", () => {
    expect(() => checkLinks(linked("A01=A1 A02=A2 B01=B1"))).toThrow("group 2");
  });
});
