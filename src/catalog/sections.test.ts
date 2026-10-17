import { describe, expect, it } from "vitest";
import type { Section, TermCourse } from "./model";
import { checkLinks, defaultSections } from "./sections";

const TYPES: Record<string, string> = { A: "Lecture", B: "Lab", T: "Tutorial" };

// "A01" or "A01=A1" for a section linked to group 1.
const section = (spec: string): Section => {
  const [code, linkId = null] = spec.split("=");
  return {
    term: "202609",
    crn: `crn-${code}`,
    subject: "MECH",
    courseNumber: "580",
    section: code,
    title: "Topics",
    scheduleType: TYPES[code[0]],
    instructionalMethod: "Face-to-face",
    partOfTerm: "1",
    credits: 1.5,
    linkId,
    crossList: null,
    crossListAvailable: null,
    seats: { enrolled: 0, capacity: 0, available: 0 },
    waitlist: { enrolled: 0, capacity: 0, available: 0 },
    meetings: [],
    note: null,
  };
};

const course = (specs: string) =>
  ({
    code: "MECH580",
    title: "Topics",
    sections: specs.split(" ").map(section),
  }) satisfies TermCourse;

const picked = (specs: string) =>
  defaultSections(course(specs)).map((s) => s.section);

describe("defaultSections", () => {
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

describe("checkLinks", () => {
  it("accepts courses that follow the convention", () => {
    expect(() =>
      checkLinks(course("A01=A1 A16=A2 B01=B1 B24=B2 A03")),
    ).not.toThrow();
  });

  it("rejects a link ID whose letter isn't the section's", () => {
    expect(() => checkLinks(course("A01=B1 B01=B1"))).toThrow("A01");
  });

  it("rejects a link group with only one type", () => {
    expect(() => checkLinks(course("A01=A1 A02=A2 B01=B1"))).toThrow("group 2");
  });
});
