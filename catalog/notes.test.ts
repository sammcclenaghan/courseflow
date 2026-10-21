import { describe, expect, it } from "vitest";
import { noteFor, parseNotes } from "./notes.ts";

const notes = parseNotes({
  source: "test",
  scrapedAt: "2026-06-25T23:53:57.672Z",
  sections: {
    "10712": {
      course: "CSC110",
      number: "A01",
      note: "Reserved for students in a Computer Science program.",
    },
  },
});

const section = (crn: string, number: string) => ({ crn, number });

describe("noteFor", () => {
  it("finds the note scraped for that section", () => {
    expect(noteFor(notes, "CSC110", section("10712", "A01"))).toBe(
      "Reserved for students in a Computer Science program.",
    );
  });

  it("drops a note whose CRN now names another section", () => {
    expect(noteFor(notes, "MATH100", section("10712", "A01"))).toBeNull();
    expect(noteFor(notes, "CSC110", section("10712", "A05"))).toBeNull();
  });

  it("is null for a section without a note", () => {
    expect(noteFor(notes, "CSC110", section("99999", "A03"))).toBeNull();
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
