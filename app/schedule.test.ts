import { beforeEach, describe, expect, it } from "vitest";
import type { Section } from "../catalog/terms.ts";
import { add, lowestSections, schedules } from "./schedule.ts";

const section = (
  number: string,
  type: string,
  linkId: string | null = null,
): Section => ({ crn: `crn-${number}`, number, type, linkId, meetings: [] });

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
        section("A01", "Lecture", "A2"),
        section("A02", "Lecture", "A1"),
        section("T01", "Tutorial", "T1"),
        section("T02", "Tutorial", "T2"),
      ]).map((pick) => pick.number),
    ).toEqual(["A01", "T02"]);
  });
});
