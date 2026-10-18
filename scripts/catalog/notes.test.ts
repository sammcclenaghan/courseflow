import { describe, expect, it } from "vitest";
import type { BannerSection } from "../../shared/model.ts";
import { testSection } from "../../shared/testing.ts";
import { attachNotes, parseNotes } from "./notes.ts";

const section = (crn: string, code: string, number: string) =>
  testSection(crn, {
    subject: code.replace(/\d.*/, ""),
    courseNumber: code.replace(/^\D+/, ""),
    number,
  });

const notes = parseNotes({
  source: "test",
  scrapedAt: "2026-06-25T23:53:57.672Z",
  sections: {
    "10712": {
      course: "CSC110",
      number: "A01",
      note: "Reserved for students in a Computer Science program.",
    },
    "10713": { course: "CSC110", number: "A02", note: "Engineering only." },
  },
});

const attached = (sections: BannerSection[]) =>
  attachNotes(sections, notes).map((s) => s.note);

describe("attachNotes", () => {
  it("attaches a note to the section it was scraped from", () => {
    expect(attached([section("10712", "CSC110", "A01")])).toEqual([
      "Reserved for students in a Computer Science program.",
    ]);
  });

  it("drops a note whose CRN now names another section", () => {
    expect(
      attached([
        section("10712", "MATH100", "A01"),
        section("10713", "CSC110", "A05"),
      ]),
    ).toEqual([null, null]);
  });

  it("leaves sections without a note, or without a notes file, at null", () => {
    expect(attached([section("99999", "CSC110", "A03")])).toEqual([null]);
    expect(
      attachNotes([section("10712", "CSC110", "A01")], null).map((s) => s.note),
    ).toEqual([null]);
  });
});

describe("parseNotes", () => {
  it("rejects fields it hasn't seen", () => {
    expect(() =>
      parseNotes({
        source: "x",
        scrapedAt: notes.scrapedAt,
        sections: {},
        extra: 1,
      }),
    ).toThrow();
  });
});
